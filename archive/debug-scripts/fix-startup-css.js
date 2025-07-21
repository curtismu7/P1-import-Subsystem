import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSS file
const cssPath = path.join(__dirname, 'public/css/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

console.log('Original CSS file size:', cssContent.length, 'characters');

// Function to remove all duplicate startup-wait-content rules and replace with compact version
function fixStartupCSS(css) {
    // Remove all existing startup-wait-content rules
    let cleaned = css.replace(/\.startup-wait-content\s*\{[^}]*\}/g, '');
    
    // Remove all existing startup-wait-screen rules
    cleaned = cleaned.replace(/\.startup-wait-screen\s*\{[^}]*\}/g, '');
    
    // Remove all existing startup-related rules
    cleaned = cleaned.replace(/\.startup-wait-logo\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-logo\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-wait-spinner\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-wait-text\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-wait-text h2\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-wait-text p\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-progress\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-progress-bar\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-progress-fill\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-progress-text\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-auto-dismiss\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-auto-dismiss small\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\.show\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\.error\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status \.token-status-content\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status \.token-status-icon\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\.success \.token-status-icon\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\.error \.token-status-icon\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status \.token-status-text\s*\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\.startup-token-status\.error \.token-status-text\s*\{[^}]*\}/g, '');
    
    // Remove all @media rules for startup
    cleaned = cleaned.replace(/@media \(max-width: 768px\)\s*\{[^}]*\.startup-wait-content[^}]*\}/g, '');
    cleaned = cleaned.replace(/@media \(max-width: 480px\)\s*\{[^}]*\.startup-wait-content[^}]*\}/g, '');
    
    // Add the new compact startup CSS at the end
    const newStartupCSS = `

/* Startup Wait Screen - Compact Version */
.startup-wait-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    transition: opacity 0.5s ease-out;
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.startup-wait-screen.fade-out {
    opacity: 0;
    pointer-events: none;
}

.startup-wait-content {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 200px;
    width: 80%;
    margin: 0 auto;
    position: relative;
}

.startup-wait-logo {
    margin-bottom: 0.5rem;
}

.startup-logo {
    height: 20px;
    width: auto;
}

.startup-wait-spinner {
    margin-bottom: 0.5rem;
}

.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.startup-wait-text h2 {
    color: #333;
    margin-bottom: 0.2rem;
    font-size: 0.8rem;
    font-weight: 600;
}

.startup-wait-text p {
    color: #666;
    margin-bottom: 0.3rem;
    font-size: 0.65rem;
}

.startup-progress {
    margin-bottom: 0.3rem;
}

.startup-progress-bar {
    width: 100%;
    height: 4px;
    background: #f0f0f0;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.2rem;
}

.startup-progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #007bff, #0056b3);
    border-radius: 2px;
    transition: width 0.5s ease;
}

.startup-progress-text {
    color: #007bff;
    font-weight: 600;
    font-size: 0.7rem;
}

.startup-auto-dismiss {
    margin-top: 0.2rem;
    text-align: center;
    opacity: 0.7;
}

.startup-auto-dismiss small {
    color: #666;
    font-size: 0.4rem;
}

.startup-token-status {
    margin-top: 0.3rem;
    padding: 0.2rem;
    background: rgba(40, 167, 69, 0.1);
    border: 1px solid rgba(40, 167, 69, 0.3);
    border-radius: 4px;
    display: none;
}

.startup-token-status.show {
    display: block;
}

.startup-token-status.error {
    background: rgba(220, 53, 69, 0.1);
    border-color: rgba(220, 53, 69, 0.3);
}

.startup-token-status .token-status-content {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.5rem;
}

.startup-token-status .token-status-icon {
    font-size: 0.8rem;
}

.startup-token-status.success .token-status-icon {
    color: #28a745;
}

.startup-token-status.error .token-status-icon {
    color: #dc3545;
}

.startup-token-status .token-status-text {
    color: #333;
}

.startup-token-status.error .token-status-text {
    color: #721c24;
}

/* Responsive design for startup screen */
@media (max-width: 768px) {
    .startup-wait-content {
        padding: 0.75rem;
        max-width: 180px;
    }
    
    .startup-wait-text h2 {
        font-size: 0.75rem;
    }
    
    .startup-wait-text p {
        font-size: 0.6rem;
    }
    
    .startup-logo {
        height: 18px;
    }
    
    .spinner {
        width: 18px;
        height: 18px;
    }
}

@media (max-width: 480px) {
    .startup-wait-content {
        padding: 0.5rem;
        max-width: 160px;
        width: 85%;
    }
    
    .startup-wait-text h2 {
        font-size: 0.7rem;
    }
    
    .startup-wait-text p {
        font-size: 0.55rem;
    }
    
    .startup-logo {
        height: 16px;
    }
    
    .spinner {
        width: 16px;
        height: 16px;
    }
    
    .startup-progress-bar {
        height: 3px;
    }
    
    .startup-progress-text {
        font-size: 0.6rem;
    }
}`;

    return cleaned + newStartupCSS;
}

// Apply the fix
const fixedCSS = fixStartupCSS(cssContent);

// Write the fixed CSS back to the file
fs.writeFileSync(cssPath, fixedCSS);

console.log('Fixed CSS file size:', fixedCSS.length, 'characters');
console.log('CSS cleanup complete! Startup screen is now compact and properly positioned.'); 