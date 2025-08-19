// Browser Cache Bust Script
// Run this in your browser console to clear all client-side caches and force a refresh
// This ensures you always see the latest code and UI changes

console.log('🧹 Starting browser cache bust...');

// Function to clear all caches
async function clearAllCaches() {
    try {
        // Clear localStorage (keep essential data)
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('cache') || key.includes('settings') || key.includes('token') || key.includes('app_')) {
                localStorage.removeItem(key);
                console.log('🗑️  Cleared localStorage:', key);
            }
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('🗑️  Cleared sessionStorage');
        
        // Clear IndexedDB (if available)
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    await indexedDB.deleteDatabase(db.name);
                    console.log('🗑️  Cleared IndexedDB:', db.name);
                }
            } catch (e) {
                console.warn('⚠️  Could not clear IndexedDB:', e.message);
            }
        }
        
        // Clear fetch cache (if available)
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                    console.log('🗑️  Cleared cache:', cacheName);
                }
            } catch (e) {
                console.warn('⚠️  Could not clear caches:', e.message);
            }
        }
        
        // Clear service worker registrations
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                    console.log('🗑️  Unregistered service worker');
                }
            } catch (e) {
                console.warn('⚠️  Could not unregister service workers:', e.message);
            }
        }
        
        // Force reload with cache busting
        const timestamp = Date.now();
        const currentUrl = new URL(window.location.href);
        
        // Add cache busting parameters
        currentUrl.searchParams.set('cb', timestamp);
        currentUrl.searchParams.set('v', timestamp);
        currentUrl.searchParams.set('_t', timestamp);
        
        console.log('🔄 Reloading page with cache busting...');
        console.log('📱 New URL:', currentUrl.toString());
        console.log('✅ Browser cache bust completed!');
        
        // Small delay to ensure console messages are visible
        setTimeout(() => {
            window.location.href = currentUrl.toString();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error during cache bust:', error);
        // Fallback: force reload
        window.location.reload(true);
    }
}

// Alternative: Quick cache clear without reload
function quickCacheClear() {
    console.log('⚡ Quick cache clear...');
    
    // Clear basic storage
    sessionStorage.clear();
    
    // Clear localStorage selectively
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('cache') || key.includes('token') || key.includes('app_')) {
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Quick cache clear completed');
}

// Alternative: Force hard reload
function forceHardReload() {
    console.log('💥 Force hard reload...');
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force reload bypassing cache
    window.location.reload(true);
}

// Execute the main cache bust
clearAllCaches();

// Export functions for manual use
window.cacheBust = {
    clearAll: clearAllCaches,
    quick: quickCacheClear,
    hardReload: forceHardReload
};

console.log('💡 Manual cache bust functions available:');
console.log('  - window.cacheBust.clearAll() - Full cache clear with reload');
console.log('  - window.cacheBust.quick() - Quick cache clear without reload');
console.log('  - window.cacheBust.hardReload() - Force hard reload');
