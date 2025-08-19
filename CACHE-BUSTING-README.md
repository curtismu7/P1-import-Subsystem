# 🚀 Cache Busting & Server Restart Guide

This guide provides comprehensive solutions for ensuring you always see the latest code and UI changes in your PingOne Import application.

## 🎯 Quick Start

### **Option 1: Full Cache Bust & Restart (Recommended)**
```bash
npm run restart:bust
# or
node scripts/restart-and-cache-bust.js
```

### **Option 2: Simple Restart (Most Reliable)**
```bash
npm run restart:simple
# or
node scripts/simple-restart.js
```

### **Option 3: Quick Restart**
```bash
npm run restart:quick
# or
node scripts/quick-restart.js
```

### **Option 4: Troubleshoot Issues**
```bash
npm run troubleshoot
# or
node scripts/troubleshoot-restart.js
```

### **Option 3: Browser Bookmarklet**
Open `browser-bookmarklet.html` in your browser and drag the bookmarklets to your bookmarks bar.

## 🔧 Server-Side Cache Busting

### **Complete Restart & Cache Bust Script**
The `restart-and-cache-bust.js` script performs a comprehensive cache clearing:

1. **Stops all server processes** with proper cleanup
2. **Clears server-side caches** (Node.js modules, temp files, logs)
3. **Updates cache busting values** in HTML, CSS, JS, and import maps
4. **Restarts the server** with fresh code
5. **Generates browser script** for client-side cache clearing

```bash
# Run the comprehensive script
node scripts/restart-and-cache-bust.js

# Or use npm script
npm run restart:bust
```

### **Quick Restart Script**
For faster restarts when you only need basic cache busting:

```bash
# Run quick restart
node scripts/quick-restart.js

# Or use npm script
npm run restart:quick
```

## 🌐 Browser-Side Cache Busting

### **Browser Bookmarklets**
Open `browser-bookmarklet.html` in your browser to get drag-and-drop bookmarklets:

- **🧹 Full Cache Bust** - Clears all caches and reloads (Recommended)
- **⚡ Quick Cache Clear** - Clears basic caches without reload
- **💥 Force Hard Reload** - Nuclear option for stubborn caches
- **🔍 Debug Cache Status** - Shows current cache state

### **Manual Console Commands**
Run these directly in your browser's developer console:

#### **Full Cache Bust & Reload**
```javascript
// Clear all storage and force reload
localStorage.clear();
sessionStorage.clear();
window.location.reload(true);
```

#### **Selective Cache Clear**
```javascript
// Clear only app-related caches
Object.keys(localStorage).forEach(key => {
    if (key.includes('cache') || key.includes('token') || key.includes('app_')) {
        localStorage.removeItem(key);
    }
});
```

#### **Force Reload with Cache Bust**
```javascript
// Add timestamp to URL and reload
const url = new URL(window.location.href);
url.searchParams.set('v', Date.now());
window.location.href = url.toString();
```

### **Standalone Browser Script**
Copy and paste the contents of `browser-cache-bust.js` into your browser console for immediate cache clearing.

## 📱 Available NPM Scripts

```json
{
  "restart:bust": "Full restart with comprehensive cache busting",
  "restart:simple": "Simple restart with basic cache busting (most reliable)",
  "restart:quick": "Quick restart with basic cache busting",
  "restart:troubleshoot": "Diagnose restart issues",
  "cache:bust": "Alias for restart:bust",
  "cache:simple": "Alias for restart:simple",
  "cache:quick": "Alias for restart:quick",
  "troubleshoot": "Alias for restart:troubleshoot"
}
```

## 🎯 When to Use Each Method

### **Use `restart:bust` when:**
- You've made server-side code changes
- You've updated CSS or JavaScript files
- You're experiencing persistent caching issues
- You want to ensure complete freshness

### **Use `restart:simple` when:**
- You want the most reliable restart option
- You're experiencing issues with other restart methods
- You need a robust restart that handles errors gracefully

### **Use `restart:quick` when:**
- You only need a basic server restart
- You're in development and want fast iteration
- You haven't made significant file changes

### **Use browser bookmarklets when:**
- You only need client-side cache clearing
- The server is running fine
- You want to test UI changes quickly
- You're debugging client-side issues

## 🔍 Troubleshooting

### **Server Won't Start**
```bash
# Check if port is in use
lsof -ti:4000

# Kill processes using the port
kill -9 $(lsof -ti:4000)

# Check server logs
tail -f logs/app.log
```

### **Caches Still Persist**
1. **Use the "Force Hard Reload" bookmarklet**
2. **Hold Shift while clicking browser reload**
3. **Clear browser data manually in settings**
4. **Restart the server using the server scripts**

### **Bookmarklets Don't Work**
1. Ensure JavaScript is enabled
2. Check browser console for errors
3. Try running console commands manually
4. Verify you're on the correct domain

## 🏗️ How It Works

### **Cache Busting Strategy**
1. **Timestamp-based URLs** - Adds unique timestamps to resource URLs
2. **File modification** - Updates cache busting values in source files
3. **Import map updates** - Ensures ES modules are reloaded
4. **Storage clearing** - Removes localStorage, sessionStorage, and IndexedDB data

### **Server Restart Process**
1. **Process termination** - Kills existing Node.js processes
2. **Port cleanup** - Ensures port 4000 is free
3. **Cache clearing** - Removes temporary files and logs
4. **Server startup** - Starts fresh server instance
5. **Health check** - Verifies server is responding

## 🚨 Important Notes

- **Save your work** before running cache busting scripts
- **Server restart** will disconnect all active users
- **localStorage clearing** will remove user preferences
- **Import maps** are updated automatically
- **CSS/JS files** get cache busting comments added

## 📋 Best Practices

1. **Use `restart:bust` for major deployments**
2. **Use `restart:quick` for development iterations**
3. **Use bookmarklets for client-side testing**
4. **Check server logs** if restart fails
5. **Verify changes** after cache busting
6. **Test functionality** after server restart

## 🔗 Related Files

- `scripts/restart-and-cache-bust.js` - Comprehensive restart script
- `scripts/quick-restart.js` - Quick restart script
- `browser-cache-bust.js` - Browser console script
- `browser-bookmarklet.html` - Bookmarklet collection
- `package.json` - NPM scripts

## 💡 Pro Tips

- **Bookmark the bookmarklets** for quick access
- **Use `npm run restart:bust`** as your go-to command
- **Check the browser console** for cache busting feedback
- **Combine server + browser** cache busting for complete freshness
- **Monitor server logs** during restart process

---

**Happy coding! 🚀** Your PingOne Import application will now always show the latest code and UI changes.
