let userData = {
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

// Configuration constants
const CONFIG = {
    BASE_WATER_PER_KG: 35,
    MIN_REMINDER_INTERVAL: 15,
    MAX_REMINDER_INTERVAL: 240,
    NOTIFICATION_DURATION: 3000,
    CONFETTI_COUNT: 20,
    STORAGE_KEY: 'hydroTrackData'
};

// ===================================
// Initialization & Setup
// ===================================

/**
 * Initialize the application
 */
function init() {
    loadUserData();
    checkNewDay();
    
    if (userData.profile) {
        showMainPanel();
        updateDisplay();
        loadHistory();
        restoreReminderSettings();
    } else {
        showSetupPanel();
    }
    
    // Add event listeners
    setupEventListeners();
}

/**
 * Load user data from localStorage
 */
function loadUserData() {
    const savedData = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedData) {
        try {
            userData = JSON.parse(savedData);
        } catch (e) {
            console.error('Failed to load user data:', e);
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Reminder interval change
    const reminderIntervalInput = document.getElementById('reminderInterval');
    if (reminderIntervalInput) {
        reminderIntervalInput.addEventListener('change', handleReminderIntervalChange);
    }
    
    // Custom amount enter key
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
        customAmountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCustomWater();
            }
        });
    }
    
    // Visibility change for reminders
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// ===================================
// Panel Management
// ===================================

/**
 * Show setup panel
 */
function showSetupPanel() {
    document.getElementById('setupPanel').classList.add('active');
    document.getElementById('mainPanel').classList.remove('active');
}

/**
 * Show main panel
 */
function showMainPanel() {
    document.getElementById('setupPanel').classList.remove('active');
    document.getElementById('mainPanel').classList.add('active');
}

// ===================================
// Profile Management
// ===================================

/**
 * Save user profile and calculate daily goal
 */
function saveProfile() {
    const weight = parseFloat(document.getElementById('weight').value) || 70;
    const activity = parseFloat(document.getElementById('activity').value);
    const climate = parseFloat(document.getElementById('climate').value);
    
    // Validate inputs
    if (weight <= 0 || weight > 500) {
        showNotification('Please enter a valid weight');
        return;
    }
    
    // Calculate daily goal
    const baseGoal = weight * CONFIG.BASE_WATER_PER_KG;
    userData.dailyGoal = Math.round(baseGoal * activity * climate);
    
    userData.profile = {
        weight,
        activity,
        climate
    };
    
    saveData();
    showMainPanel();
    updateDisplay();
    showNotification(`Profile saved! Your daily goal is ${userData.dailyGoal}ml`);
    
    // Request notification permission
    requestNotificationPermission();
}

/**
 * Change profile - load existing values
 */
function changeProfile() {
    if (userData.profile) {
        document.getElementById('weight').value = userData.profile.weight;
        document.getElementById('activity').value = userData.profile.activity;
        document.getElementById('climate').value = userData.profile.climate;
    }
    showSetupPanel();
}

// ===================================
// Water Tracking
// ===================================

/**
 * Add water to daily intake
 * @param {number} amount - Amount in ml
 */
function addWater(amount) {
    if (amount <= 0) return;
    
    const previousIntake = userData.currentIntake;
    userData.currentIntake += amount;
    
    // Add to history
    userData.history.push({
        time: new Date().toLocaleTimeString(),
        amount: amount,
        timestamp: Date.now()
    });
    
    saveData();
    updateDisplay();
    loadHistory();
    
    // Check if goal reached
    if (userData.currentIntake >= userData.dailyGoal && previousIntake < userData.dailyGoal) {
        handleGoalReached();
    } else {
        showNotification(`Added ${amount}ml. Keep it up! 💪`);
    }
}

/**
 * Add custom amount of water
 */
function addCustomWater() {
    const input = document.getElementById('customAmount');
    const amount = parseInt(input.value);
    
    if (amount && amount > 0 && amount <= 5000) {
        addWater(amount);
        input.value = '';
    } else {
        showNotification('Please enter a valid amount (1-5000ml)');
    }
}

/**
 * Handle goal reached celebration
 */
function handleGoalReached() {
    showNotification('🎉 Congratulations! You\'ve reached your daily goal!');
    celebrate();
    
    // Send browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('HydroTrack Achievement! 🎉', {
            body: 'Congratulations! You\'ve reached your daily hydration goal!',
            icon: createIconDataUrl('🏆')
        });
    }
}

// ===================================
// Display Updates
// ===================================

/**
 * Update all display elements
 */
function updateDisplay() {
    const percentage = Math.min(100, Math.round((userData.currentIntake / userData.dailyGoal) * 100));
    
    // Update text displays
    document.getElementById('currentIntake').textContent = `${userData.currentIntake} ml`;
    document.getElementById('dailyGoal').textContent = `${userData.dailyGoal} ml`;
    document.getElementById('streakDays').textContent = userData.streak;
    
    // Update water fill
    const waterFill = document.getElementById('waterFill');
    waterFill.style.height = `${percentage}%`;
    document.getElementById('percentageText').textContent = `${percentage}%`;
    
    // Update water color based on progress
    updateWaterColor(percentage);
}

/**
 * Update water color based on progress
 * @param {number} percentage - Progress percentage
 */
function updateWaterColor(percentage) {
    const waterFill = document.getElementById('water
