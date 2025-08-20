#!/usr/bin/env node

/**
 * Always Background Starter with Cache Busting
 * 
 * This script ensures the server always starts in background mode
 * by intercepting the standard start command and redirecting to
 * the background start process. It also includes cache busting
 * to ensure fresh code and UI deployment.
 * 
 * It serves as a wrapper around the start-background.js script
 * to make background mode the default behavior.
 */

import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Cache busting function to update timestamps in files
 */
async function bustCache() {
  try {
    console.log(`${colors.cyan}🔄 Busting cache...${colors.reset}`);
    
    const timestamp = Date.now();
    
    // Update HTML cache busting (comprehensive)
    const htmlPath = path.join(process.cwd(), 'public', 'index.html');
    if (await fs.access(htmlPath).then(() => true).catch(() => false)) {
      let htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      // Update CSS cache busting
      htmlContent = htmlContent.replace(
        /href="([^"]*\.css)(\?v=[^"]*)?"/g,
        `href="$1?v=${timestamp}"`
      );
      
      // Update JS cache busting
      htmlContent = htmlContent.replace(
        /src="([^"]*\.js)(\?v=[^"]*)?"/g,
        `src="$1?v=${timestamp}"`
      );
      
      // Update import map cache busting for file targets only (not folder aliases ending with /)
      htmlContent = htmlContent.replace(
        /"([^"]*\.js)":\s*"([^"]*\.js)(\?v=[^"]*)?"/g,
        `"$1": "$2?v=${timestamp}"`
      );
      // Ensure folder aliases keep trailing slash and have no ?v fragments
      htmlContent = htmlContent.replace(
        /"(@?\/[^"]*\/)":\s*"([^"]*\/?)(\?v=[^"]*)*"/g,
        (m, key, addr) => `"${key}": "${addr.endsWith('/') ? addr : addr + '/'}"`
      );
      
      // Update all timestamp-based cache busting patterns
      // 1. Import map URLs (?v=v1234567890) for files only
      htmlContent = htmlContent.replace(/(\.js\?v=v)\d+/g, `$1${timestamp}`);
      
      // 2. External CDN URLs (?v=1234567890)
      htmlContent = htmlContent.replace(
        /(https:\/\/[^"]*\.css\?v=)\d+/g,
        `$1${timestamp}`
      );
      
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
      console.log(`${colors.green}✅ HTML cache busting updated (comprehensive)${colors.reset}`);
    }
    
    // Update CSS cache busting comment
    const cssPath = path.join(process.cwd(), 'public', 'css', 'main.css');
    if (await fs.access(cssPath).then(() => true).catch(() => false)) {
      let cssContent = await fs.readFile(cssPath, 'utf8');
      
      // Add or update cache busting comment
      const cacheComment = `/* Cache bust: ${timestamp} */\n`;
      if (cssContent.includes('/* Cache bust:')) {
        cssContent = cssContent.replace(
          /\/\* Cache bust: \d+ \*\/\n/,
          cacheComment
        );
      } else {
        cssContent = cacheComment + cssContent;
      }
      
      await fs.writeFile(cssPath, cssContent, 'utf8');
      console.log(`${colors.green}✅ CSS cache busting updated${colors.reset}`);
    }
    
    console.log(`${colors.green}✅ Cache busting completed (timestamp: ${timestamp})${colors.reset}`);
    
  } catch (error) {
    console.warn(`${colors.yellow}⚠️ Cache busting failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}   Continuing with server start...${colors.reset}`);
  }
}

/**
 * Main function to start the server in background mode
 */
async function startInBackground() {
  console.log(`${colors.blue}🚀 PingOne Import Tool - Always Background Mode with Cache Busting${colors.reset}`);
  console.log('================================================================');
  console.log('');
  
  // Check if --foreground flag is provided
  const args = process.argv.slice(2);
  if (args.includes('--foreground')) {
    console.log(`${colors.yellow}⚠️ Foreground mode requested - starting in standard mode${colors.reset}`);
    await startInForeground();
    return;
  }
  
  // Check if --no-cache-bust flag is provided
  if (args.includes('--no-cache-bust')) {
    console.log(`${colors.yellow}⚠️ Cache busting disabled${colors.reset}`);
  } else {
    // Perform cache busting
    await bustCache();
  }
  
  // Validate settings configuration before starting
  if (!args.includes('--skip-validation')) {
    console.log(`${colors.blue}🔍 Validating settings configuration...${colors.reset}`);
    try {
      const { validateSettings } = await import('./validate-settings.js');
      const validation = await validateSettings();
      
      if (!validation.isValid) {
        console.log(`${colors.red}❌ Configuration validation failed!${colors.reset}`);
        console.log(`${colors.yellow}💡 Run: npm run validate:settings --fix${colors.reset}`);
        console.log(`${colors.yellow}💡 Or use: npm start --skip-validation${colors.reset}`);
        process.exit(1);
      }
      
      console.log(`${colors.green}✅ Settings validation passed${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠️ Settings validation failed: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}   Continuing with server start...${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠️ Settings validation skipped${colors.reset}`);
  }
  
  console.log(`${colors.blue}Starting server in background mode...${colors.reset}`);
  
  // Path to the background starter script
  const backgroundScript = path.join(__dirname, 'start-background.js');
  
  // Start the background process
  const backgroundProcess = spawn('node', [
    backgroundScript,
    'start'
  ], {
    stdio: 'inherit'
  });
  
  // Handle process events
  backgroundProcess.on('error', (error) => {
    console.error(`${colors.red}❌ Failed to start background process:${colors.reset}`, error.message);
    process.exit(1);
  });
  
  backgroundProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}❌ Background process exited with code ${code}${colors.reset}`);
      process.exit(code);
    }
  });
}

/**
 * Start the server in foreground mode (standard behavior)
 */
async function startInForeground() {
  console.log(`${colors.blue}Starting server in foreground mode...${colors.reset}`);
  
  // Check if --no-cache-bust flag is provided
  const args = process.argv.slice(2);
  if (!args.includes('--no-cache-bust')) {
    // Perform cache busting
    await bustCache();
  }
  
  // Path to the server script
  const serverScript = path.join(process.cwd(), 'server.js');
  
  // Start the server process
  const serverProcess = spawn('node', [
    '--experimental-modules',
    '--experimental-json-modules',
    serverScript
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      FOREGROUND_MODE: 'true'
    }
  });
  
  // Handle process events
  serverProcess.on('error', (error) => {
    console.error(`${colors.red}❌ Failed to start server:${colors.reset}`, error.message);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}❌ Server process exited with code ${code}${colors.reset}`);
      process.exit(code);
    }
  });
}

// Run the main function
startInBackground().catch((error) => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error.message);
  process.exit(1);
});