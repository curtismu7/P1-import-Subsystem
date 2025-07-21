/**
 * Simple Subsystem Test
 * 
 * A minimal test to verify that the testing environment is working correctly
 */

const { JSDOM } = require('jsdom');

// Create a simple DOM structure
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Simple Subsystem Test</title>
</head>
<body>
    <div id="test-container">
        <button id="test-button">Click Me</button>
        <div id="test-output"></div>
    </div>
</body>
</html>
`);

// Setup global DOM environment
global.window = dom.window;
global.document = dom.window.document;

describe('Simple Subsystem Test', () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = dom.window.document.body.innerHTML;
    });
    
    test('should update output when button is clicked', () => {
        const button = document.getElementById('test-button');
        const output = document.getElementById('test-output');
        
        // Add click handler
        button.addEventListener('click', () => {
            output.textContent = 'Button clicked!';
        });
        
        // Simulate click using a proper Event object
        const clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent('click', true, true);
        button.dispatchEvent(clickEvent);
        
        // Check result
        expect(output.textContent).toBe('Button clicked!');
    });
});