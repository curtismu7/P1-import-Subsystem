#!/usr/bin/env node
/**
 * audit-legacy-ui.js
 *
 * Script to scan for legacy UI logic (direct DOM manipulation, alerts, direct status/progress updates)
 * that should be routed through the new ui-subsystem and uiManager.
 *
 * Usage: node scripts/audit-legacy-ui.js
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../public/js/modules');
const LEGACY_PATTERNS = [
  // Direct DOM manipulation
  /document\.getElementById\s*\(/g,
  /document\.querySelector\s*\(/g,
  /document\.querySelectorAll\s*\(/g,
  /document\.createElement\s*\(/g,
  /element\.innerHTML\s*=\s*/g,
  /element\.style\./g,
  /element\.classList\./g,
  /\.appendChild\s*\(/g,
  /\.removeChild\s*\(/g,
  /\.insertBefore\s*\(/g,
  // Alerts and prompts
  /window\.alert\s*\(/g,
  /window\.confirm\s*\(/g,
  /window\.prompt\s*\(/g,
  /alert\s*\(/g,
  /confirm\s*\(/g,
  /prompt\s*\(/g,
  // Legacy progress/status
  /progressContainer\s*\./g,
  /statusBar\s*\./g,
  // Direct notification
  /showNotification\s*\(/g,
  // Direct modal
  /showModal\s*\(/g,
  // Inline error
  /showError\s*\(/g
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];
  LEGACY_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.push({
        line: content.substr(0, match.index).split('\n').length,
        match: match[0],
        pattern: pattern.toString()
      });
    }
  });
  return results;
}

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

function main() {
  const jsFiles = walk(TARGET_DIR);
  let totalFindings = 0;
  jsFiles.forEach(file => {
    const findings = scanFile(file);
    if (findings.length) {
      totalFindings += findings.length;
      console.log(`\n[${file}]`);
      findings.forEach(f => {
        console.log(`  Line ${f.line}: ${f.match} (pattern: ${f.pattern})`);
      });
    }
  });
  if (totalFindings === 0) {
    console.log('No legacy UI logic found.');
  } else {
    console.log(`\nTotal legacy UI findings: ${totalFindings}`);
  }
}

if (require.main === module) {
  main();
}
