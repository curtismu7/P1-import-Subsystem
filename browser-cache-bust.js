// Browser Cache Bust Script - Generated: 2025-08-21T00:04:27.237Z
// Run this in your browser console to clear all client-side caches

console.log('🧹 Starting browser cache bust...');

// Clear localStorage
try {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('cache') || key.includes('settings') || key.includes('token')) {
      localStorage.removeItem(key);
      console.log('🗑️  Cleared localStorage:', key);
    }
  });
} catch (e) {
  console.warn('⚠️  Could not clear localStorage:', e.message);
}

// Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('🗑️  Cleared sessionStorage');
} catch (e) {
  console.warn('⚠️  Could not clear sessionStorage:', e.message);
}

// Clear IndexedDB (if available)
if ('indexedDB' in window) {
  try {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        indexedDB.deleteDatabase(db.name);
        console.log('🗑️  Cleared IndexedDB:', db.name);
      });
    });
  } catch (e) {
    console.warn('⚠️  Could not clear IndexedDB:', e.message);
  }
}

// Clear fetch cache (if available)
if ('caches' in window) {
  try {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
        console.log('🗑️  Cleared cache:', cacheName);
      });
    });
  } catch (e) {
    console.warn('⚠️  Could not clear caches:', e.message);
  }
}

// Force reload with cache busting
const timestamp = Date.now();
const currentUrl = new URL(window.location.href);
currentUrl.searchParams.set('cb', timestamp);
currentUrl.searchParams.set('v', timestamp);

console.log('🔄 Reloading page with cache busting...');
console.log('📱 New URL:', currentUrl.toString());

// Small delay to ensure console messages are visible
setTimeout(() => {
  window.location.href = currentUrl.toString();
}, 1000);

console.log('✅ Browser cache bust completed!');
