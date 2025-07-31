// Simple Import Test - Step by step debugging
console.log('🔍 IMPORT DEBUG TEST STARTING...');

// Step 1: Check basic elements
console.log('=== STEP 1: ELEMENT CHECK ===');
const startBtn = document.getElementById('start-import');
const fileInput = document.getElementById('csv-file');
const populationSelect = document.getElementById('import-population-select');

console.log('start-import button:', startBtn ? 'FOUND' : 'NOT FOUND');
console.log('csv-file input:', fileInput ? 'FOUND' : 'NOT FOUND');
console.log('import-population-select:', populationSelect ? 'FOUND' : 'NOT FOUND');

// Step 2: If elements not found, search for them differently
if (!startBtn || !fileInput || !populationSelect) {
    console.log('=== STEP 2: SEARCHING FOR ELEMENTS ===');
    
    // Search for buttons containing "import" text
    const allButtons = document.querySelectorAll('button');
    console.log('Total buttons found:', allButtons.length);
    
    allButtons.forEach((btn, index) => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('import') || text.includes('start')) {
            console.log(`Button ${index}: "${btn.textContent.trim()}" (id: ${btn.id}, classes: ${btn.className})`);
        }
    });
    
    // Search for file inputs
    const allFileInputs = document.querySelectorAll('input[type="file"]');
    console.log('File inputs found:', allFileInputs.length);
    allFileInputs.forEach((input, index) => {
        console.log(`File input ${index}: id="${input.id}", name="${input.name}"`);
    });
    
    // Search for select elements
    const allSelects = document.querySelectorAll('select');
    console.log('Select elements found:', allSelects.length);
    allSelects.forEach((select, index) => {
        console.log(`Select ${index}: id="${select.id}", options=${select.options.length}`);
    });
}

// Step 3: Check app structure
console.log('=== STEP 3: APP STRUCTURE ===');
console.log('window.app exists:', typeof window.app);
if (window.app) {
    console.log('app.subsystems exists:', typeof window.app.subsystems);
    if (window.app.subsystems) {
        console.log('Available subsystems:', Object.keys(window.app.subsystems));
        
        // Check import subsystem
        if (window.app.subsystems.import) {
            console.log('import subsystem methods:', Object.getOwnPropertyNames(window.app.subsystems.import));
        }
        
        // Check importManager subsystem
        if (window.app.subsystems.importManager) {
            console.log('importManager subsystem methods:', Object.getOwnPropertyNames(window.app.subsystems.importManager));
        }
    }
}

// Step 4: If we found the button, check its current state
if (startBtn) {
    console.log('=== STEP 4: BUTTON STATE ===');
    console.log('Button disabled:', startBtn.disabled);
    console.log('Button classes:', startBtn.className);
    console.log('Button text:', startBtn.textContent.trim());
    console.log('Button style.display:', startBtn.style.display);
    console.log('Button computed display:', window.getComputedStyle(startBtn).display);
}

// Step 5: Manual validation test
console.log('=== STEP 5: MANUAL VALIDATION ===');
function manualValidation() {
    console.log('Running manual validation...');
    
    // Check file selection
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    console.log('Has file selected:', hasFile);
    
    // Check population selection  
    const hasPopulation = populationSelect && populationSelect.value && populationSelect.value !== '';
    console.log('Has population selected:', hasPopulation);
    console.log('Population value:', populationSelect ? populationSelect.value : 'N/A');
    
    // Expected button state
    const shouldEnable = hasFile && hasPopulation;
    console.log('Button should be enabled:', shouldEnable);
    
    if (startBtn) {
        console.log('Button is actually enabled:', !startBtn.disabled);
        
        if (shouldEnable !== !startBtn.disabled) {
            console.log('⚠️ MISMATCH: Button state does not match expected state!');
        } else {
            console.log('✅ Button state matches expected state');
        }
    }
}

// Run manual validation
manualValidation();

// Make function available globally
window.manualValidation = manualValidation;

console.log('🏁 DEBUG TEST COMPLETE');
console.log('💡 To re-run validation: manualValidation()');

// Return a summary object instead of undefined
return {
    elements: {
        startButton: !!startBtn,
        fileInput: !!fileInput,
        populationSelect: !!populationSelect
    },
    app: {
        exists: !!window.app,
        hasSubsystems: !!(window.app && window.app.subsystems),
        subsystems: window.app && window.app.subsystems ? Object.keys(window.app.subsystems) : []
    },
    buttonState: startBtn ? {
        disabled: startBtn.disabled,
        classes: startBtn.className,
        text: startBtn.textContent.trim()
    } : null
};
