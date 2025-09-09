// HydroTrack - Smart Water Intake Reminder
// Version: 1.0.0

// Global variables
let userData = JSON.parse(localStorage.getItem('hydroTrackData')) || {
    profile: null,
    currentIntake: 0,
    dailyGoal: 2000,
    history: [],
    lastResetDate: new Date().toDateString(),
    streak: 0,
    remindersEnabled: false,
    reminderInterval: 60
};

let reminderTimer = null;

// Check if we need to reset for a new day
function checkNewDay() {
    const today = new Date().toDateString();
    if (userData.lastResetDate !== today) {
        // Check if goal was met yesterday for streak
        if (userData.currentIntake >= userData.dailyGoal) {
            userData.streak++;
        } else {
            userData.streak = 0;
        }
        
        // Reset for new day
        userData.currentIntake = 0;
        userData.history = [];
        userData.lastResetDate = today;
        saveData();
    }
}

// Initialize app
function init() {
    checkNewDay();
    
    if (userData.profile) {
        showMainPanel();
        updateDisplay();
        loadHistory();
        
        // Restore reminder settings
        document.getElementById('reminderToggle').checked = userData.remindersEnabled;
        document.getElementById('reminderInterval').value = userData.reminderInterval;
        if (userData.remindersEnabled) {
            startReminders();
        }
    } else {
        showSetupPanel();
    }
}

function showSetupPanel() {
    document.getElementById('setupPanel').classList.add('active');
    document.getElementById('mainPanel').classList.remove('active');
}

function showMainPanel() {
    document.getElementById('setupPanel').classList.remove('active');
    document.getElementById('mainPanel').classList.add('active');
}

function saveProfile() {
    const weight = parseFloat(document.getElementById('weight').value) || 70;
    const activity = parseFloat(document.getElementById('activity').value);
    const climate = parseFloat(document.getElementById('climate').value);
    
    // Calculate daily goal: base 35ml per kg, adjusted by activity and climate
    const baseGoal = weight * 35;
    userData.dailyGoal = Math.round(baseGoal * activity * climate);
    
    userData.profile = {
        weight,
        activity,
        climate
    };
    
    saveData();
    showMainPanel();
    updateDisplay();
    showNotification('Profile saved! Your daily goal is ' + userData.dailyGoal + 'ml');
    
    // Ask for notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function changeProfile() {
    if (userData.profile) {
        document.getElementById('weight').value = userData.profile.weight;
        document.getElementById('activity').value = userData.profile.activity;
        document.getElementById('climate').value = userData.profile.climate;
    }
    showSetupPanel();
}

function addWater(amount) {
    userData.currentIntake += amount;
    userData.history.push({
        time: new Date().toLocaleTimeString(),
        amount: amount
    });
    
    saveData();
    updateDisplay();
    loadHistory();
    
    // Celebrate if goal reached
    if (userData.currentIntake >= userData.dailyGoal && userData.currentIntake - amount < userData.dailyGoal) {
        showNotification('🎉 Congratulations! You\'ve reached your daily goal!');
        celebrate();
    } else {
        showNotification(`Added ${amount}ml. Keep it up!`);
    }
}

function addCustomWater() {
    const amount = parseInt(document.getElementById('customAmount').value);
    if (amount && amount > 0) {
        addWater(amount);
        document.getElementById('customAmount').value = '';
    }
}

function updateDisplay() {
    const percentage = Math.min(100, Math.round((userData.currentIntake / userData.dailyGoal) * 100));
    
    document.getElementById('currentIntake').textContent = userData.currentIntake + ' ml';
    document.getElementById('dailyGoal').textContent = userData.dailyGoal + ' ml';
    document.getElementById('streakDays').textContent = userData.streak;
    
    const waterFill = document.getElementById('waterFill');
    waterFill.style.height = percentage + '%';
    document.getElementById('percentageText').textContent = percentage + '%';
    
    // Change water color based on progress
    if (percentage < 30) {
        waterFill.style.background = 'linear-gradient(180deg, #ffcdd2 0%, #f44336 100%)';
    } else if (percentage < 60) {
        waterFill.style.background = 'linear-gradient(180deg, #fff9c4 0%, #ffc107 100%)';
    } else if (percentage < 100) {
        waterFill.style.background = 'linear-gradient(180deg, #64b5f6 0%, #1976d2 100%)';
    } else {
        waterFill.style.background = 'linear-gradient(180deg, #81c784 0%, #4caf50 100%)';
    }
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (userData.history.length === 0) {
        historyList.innerHTML = '<p style="color: #999;">No entries yet today</p>';
    } else {
        userData.history.slice().reverse().forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <span>${entry.time}</span>
                <span>${entry.amount}ml</span>
            `;
            historyList.appendChild(item);
        });
    }
}

function resetDay() {
    if (confirm('Are you sure you want to reset today\'s progress?')) {
        userData.currentIntake = 0;
        userData.history = [];
        saveData();
        updateDisplay();
        loadHistory();
        showNotification('Progress reset for today');
    }
}

function saveData() {
    localStorage.setItem('hydroTrackData', JSON.stringify(userData));
}

function toggleReminders() {
    userData.remindersEnabled = document.getElementById('reminderToggle').checked;
    userData.reminderInterval = parseInt(document.getElementById('reminderInterval').value);
    
    if (userData.remindersEnabled) {
        startReminders();
        showNotification('Reminders enabled!');
    } else {
        stopReminders();
        showNotification('Reminders disabled');
    }
    
    saveData();
}

function startReminders() {
    stopReminders(); // Clear any existing timer
    
    const interval = (userData.reminderInterval || 60) * 60 * 1000; // Convert to milliseconds
    
    reminderTimer = setInterval(() => {
        if (userData.currentIntake < userData.dailyGoal) {
            const remaining = userData.dailyGoal - userData.currentIntake;
            const message = `Time to hydrate! You need ${remaining}ml more to reach your goal.`;
            
            showNotification(message);
            
            // Browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('HydroTrack Reminder 💧', {
                    body: message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>'
                });
            }
        }
    }, interval);
}

function stopReminders() {
    if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function celebrate() {
    // Create confetti effect
    const colors = ['#667eea', '#764ba2', '#64b5f6', '#1976d2', '#4caf50'];
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '50%';
        confetti.style.zIndex = '9999';
        document.body.appendChild(confetti);
        
        confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: 3000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => confetti.remove();
    }
}

// Update reminder interval when changed
document.addEventListener('DOMContentLoaded', function() {
    const reminderIntervalInput = document.getElementById('reminderInterval');
    if (reminderIntervalInput) {
        reminderIntervalInput.addEventListener('change', function() {
            userData.reminderInterval = parseInt(this.value);
            if (userData.remindersEnabled) {
                startReminders(); // Restart with new interval
            }
            saveData();
        });
    }
    
    // Initialize the app
    init();
});
