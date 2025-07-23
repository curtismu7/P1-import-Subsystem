// Emergency startup screen fix
// This script manually hides the startup screen and enables navigation

console.log('🚨 Emergency startup screen fix loading...');

function hideStartupScreen() {
    const startupScreen = document.getElementById('startup-wait-screen');
    if (startupScreen) {
        startupScreen.style.display = 'none';
        console.log('✅ Startup screen hidden manually');
        return true;
    }
    return false;
}

function showSettingsView() {
    // Hide all views first
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    
    // Show settings view
    const settingsView = document.getElementById('settings-view');
    if (settingsView) {
        settingsView.style.display = 'block';
        settingsView.classList.add('active');
        console.log('✅ Settings view shown');
        return true;
    }
    return false;
}

function updateNavigation() {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to settings nav item
    const settingsNavItems = document.querySelectorAll('.nav-item[data-view="settings"]');
    settingsNavItems.forEach(item => item.classList.add('active'));
    
    console.log('✅ Navigation updated for settings');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            console.log('🔧 Attempting emergency fix...');
            hideStartupScreen();
            showSettingsView();
            updateNavigation();
        }, 1000);
    });
} else {
    setTimeout(() => {
        console.log('🔧 Attempting emergency fix...');
        hideStartupScreen();
        showSettingsView();
        updateNavigation();
    }, 1000);
}

// Also expose functions globally for manual testing
window.emergencyFix = {
    hideStartupScreen,
    showSettingsView,
    updateNavigation
};

console.log('🚨 Emergency startup screen fix loaded. Use window.emergencyFix.hideStartupScreen() to manually hide startup screen.');
