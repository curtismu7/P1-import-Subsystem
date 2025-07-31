// Import Validation Test Script
// This script can be injected into the main import page console

console.log('🧪 IMPORT VALIDATION TEST STARTING...');

// Step 1: Check if elements exist
const startBtn = document.getElementById('start-import');
const fileInput = document.getElementById('csv-file');
const populationSelect = document.getElementById('import-population-select');

console.log('📋 ELEMENT CHECK:');
console.log('✅ Start Import Button:', !!startBtn);
console.log('✅ File Input:', !!fileInput);
console.log('✅ Population Select:', !!populationSelect);

if (startBtn) {
    console.log('🔘 BUTTON STATE:');
    console.log('- Disabled:', startBtn.disabled);
    console.log('- Classes:', startBtn.className);
    console.log('- Text:', startBtn.textContent.trim());
}

// Step 2: Check current selections
if (fileInput) {
    console.log('📁 FILE STATE:');
    console.log('- Files selected:', fileInput.files.length);
    console.log('- Value:', fileInput.value);
}

if (populationSelect) {
    console.log('👥 POPULATION STATE:');
    console.log('- Selected value:', populationSelect.value);
    console.log('- Selected index:', populationSelect.selectedIndex);
    console.log('- Options count:', populationSelect.options.length);
}

// Step 3: Check for app and subsystems
console.log('🏗️ APP STRUCTURE:');
console.log('- window.app exists:', !!window.app);
if (window.app) {
    console.log('- subsystems exists:', !!window.app.subsystems);
    if (window.app.subsystems) {
        console.log('- Available subsystems:', Object.keys(window.app.subsystems));
        console.log('- import subsystem:', !!window.app.subsystems.import);
        console.log('- importManager subsystem:', !!window.app.subsystems.importManager);
        
        // Try to find the validation function
        if (window.app.subsystems.import && window.app.subsystems.import.validateAndUpdateButtonState) {
            console.log('✅ Found validateAndUpdateButtonState in import subsystem');
        } else if (window.app.subsystems.importManager && window.app.subsystems.importManager.validateAndUpdateButtonState) {
            console.log('✅ Found validateAndUpdateButtonState in importManager subsystem');
        } else {
            console.log('❌ validateAndUpdateButtonState not found');
        }
    }
}

// Step 4: Test validation function
function testValidation() {
    console.log('🔄 TESTING VALIDATION FUNCTION...');
    
    if (window.app && window.app.subsystems) {
        if (window.app.subsystems.import && window.app.subsystems.import.validateAndUpdateButtonState) {
            console.log('🔄 Calling import.validateAndUpdateButtonState...');
            window.app.subsystems.import.validateAndUpdateButtonState();
        } else if (window.app.subsystems.importManager && window.app.subsystems.importManager.validateAndUpdateButtonState) {
            console.log('🔄 Calling importManager.validateAndUpdateButtonState...');
            window.app.subsystems.importManager.validateAndUpdateButtonState();
        } else {
            console.log('❌ No validation function found');
        }
    }
    
    // Check button state after validation
    if (startBtn) {
        console.log('🔘 BUTTON STATE AFTER VALIDATION:');
        console.log('- Disabled:', startBtn.disabled);
        console.log('- Classes:', startBtn.className);
    }
}

// Step 5: Simulate file selection
function simulateFileSelection() {
    console.log('🔄 SIMULATING FILE SELECTION...');
    
    if (fileInput) {
        try {
            // Create a mock file
            const mockFile = new File(['email,firstName,lastName\ntest@example.com,Test,User'], 'test-users.csv', {
                type: 'text/csv'
            });
            
            // Create a FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(mockFile);
            fileInput.files = dataTransfer.files;
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);
            
            console.log('✅ File selection simulated');
            console.log('- Mock file name:', mockFile.name);
            console.log('- Files count:', fileInput.files.length);
            
            // Test validation after file selection
            setTimeout(testValidation, 500);
            
        } catch (error) {
            console.error('❌ Error simulating file selection:', error);
        }
    } else {
        console.log('❌ File input not found');
    }
}

// Step 6: Simulate population selection
function simulatePopulationSelection() {
    console.log('🔄 SIMULATING POPULATION SELECTION...');
    
    if (populationSelect && populationSelect.options.length > 1) {
        try {
            // Select the first non-empty option
            populationSelect.selectedIndex = 1;
            populationSelect.value = populationSelect.options[1].value;
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            populationSelect.dispatchEvent(changeEvent);
            
            console.log('✅ Population selection simulated');
            console.log('- Selected value:', populationSelect.value);
            console.log('- Selected text:', populationSelect.options[populationSelect.selectedIndex].text);
            
            // Test validation after population selection
            setTimeout(testValidation, 500);
            
        } catch (error) {
            console.error('❌ Error simulating population selection:', error);
        }
    } else {
        console.log('❌ Population select not found or no options available');
    }
}

// Step 7: Full test sequence
function runFullTest() {
    console.log('🚀 RUNNING FULL VALIDATION TEST...');
    
    // Initial state
    testValidation();
    
    // Simulate file selection
    setTimeout(() => {
        simulateFileSelection();
        
        // Then simulate population selection
        setTimeout(() => {
            simulatePopulationSelection();
            
            // Final validation check
            setTimeout(() => {
                console.log('🏁 FINAL VALIDATION CHECK...');
                testValidation();
                
                if (startBtn) {
                    console.log('🎯 FINAL RESULT:');
                    console.log('- Button enabled:', !startBtn.disabled);
                    console.log('- Button classes:', startBtn.className);
                    
                    if (!startBtn.disabled) {
                        console.log('🎉 SUCCESS: Start Import button is now ENABLED!');
                    } else {
                        console.log('❌ FAILED: Start Import button is still DISABLED');
                    }
                }
            }, 1000);
        }, 1000);
    }, 1000);
}

// Make functions available globally for manual testing
window.testImportValidation = testValidation;
window.simulateFileSelection = simulateFileSelection;
window.simulatePopulationSelection = simulatePopulationSelection;
window.runFullTest = runFullTest;

console.log('🧪 IMPORT VALIDATION TEST READY!');
console.log('📋 Available functions:');
console.log('- testImportValidation() - Test validation function');
console.log('- simulateFileSelection() - Simulate file selection');
console.log('- simulatePopulationSelection() - Simulate population selection');
console.log('- runFullTest() - Run complete test sequence');
console.log('');
console.log('🚀 To run the full test, type: runFullTest()');
