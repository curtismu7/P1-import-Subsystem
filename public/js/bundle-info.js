// Browser console script to display loaded bundle information
(function() {
    console.log('=== Bundle Information ===');
    
    // Get all script tags
    const scripts = document.querySelectorAll('script[src]');
    
    // Find bundle scripts
    const bundleScripts = Array.from(scripts).filter(script => 
        script.src.includes('bundle-')
    );
    
    if (bundleScripts.length > 0) {
        console.log('Loaded bundle scripts:');
        bundleScripts.forEach((script, index) => {
            console.log(`  ${index + 1}. ${script.src}`);
            
            // Extract bundle number
            const match = script.src.match(/bundle-(\d+)\.js/);
            if (match) {
                console.log(`      Bundle Number: ${match[1]}`);
            }
        });
        
        // Get the last (most recent) bundle script
        const lastBundle = bundleScripts[bundleScripts.length - 1];
        const match = lastBundle.src.match(/bundle-(\d+)\.js/);
        
        if (match) {
            console.log(`\nCurrent active bundle: ${match[1]}`);
            
            // Update the bundle display in the UI if element exists
            const bundleNumberElement = document.getElementById('bundle-number');
            if (bundleNumberElement) {
                bundleNumberElement.textContent = match[1];
                console.log('Updated bundle number display in UI');
            }
            
            // Update the footer bundle indicator
            const bundleFooterElement = document.getElementById('bundle-footer-number');
            if (bundleFooterElement) {
                bundleFooterElement.textContent = match[1];
                console.log('Updated footer bundle indicator');
            }
        }
    } else {
        console.log('No bundle scripts found');
    }
    
    // Check if required UI elements exist
    console.log('\n=== UI Element Status ===');
    const requiredElements = [
        'notification-area',
        'global-status-bar',
        'bundle-version',
        'bundle-number',
        'token-status'
    ];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        console.log(`  ${elementId}: ${element ? 'FOUND' : 'MISSING'}`);
    });
    
    console.log('\n=== Token Status ===');
    // Try to get token status
    try {
        const tokenElement = document.getElementById('token-status');
        if (tokenElement) {
            const statusText = tokenElement.querySelector('.status-text');
            console.log(`  Token Status: ${statusText ? statusText.textContent : 'Unknown'}`);
        } else {
            console.log('  Token status element not found');
        }
    } catch (error) {
        console.log(`  Error getting token status: ${error.message}`);
    }
    
    console.log('\nRun this script anytime to check bundle and UI status');
})();
