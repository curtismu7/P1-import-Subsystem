// File: scripts/analyze-bundle.js
// Description: Analyzes the current bundle size and composition
// This script provides detailed metrics about the bundle size and its dependencies

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

/**
 * Get the latest bundle file
 * @returns {string} Path to the latest bundle file
 */
function getLatestBundle() {
  try {
    // Check if bundle-manifest.json exists
    const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return path.join(projectRoot, 'public', 'js', manifest.bundleFile);
    }
    
    // If no manifest, find the latest bundle file
    const jsDir = path.join(projectRoot, 'public', 'js');
    const files = fs.readdirSync(jsDir);
    const bundleFiles = files.filter(file => file.startsWith('bundle-') && file.endsWith('.js'));
    
    if (bundleFiles.length === 0) {
      throw new Error('No bundle files found');
    }
    
    // Sort by modification time (newest first)
    bundleFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(jsDir, a));
      const statB = fs.statSync(path.join(jsDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    
    return path.join(jsDir, bundleFiles[0]);
  } catch (error) {
    console.error('Error finding latest bundle:', error.message);
    return path.join(projectRoot, 'public', 'js', 'bundle.js');
  }
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Analyze bundle size and composition
 */
async function analyzeBundle() {
  console.log('🔍 Analyzing bundle size and composition...');
  
  try {
    // Get the latest bundle file
    const bundlePath = getLatestBundle();
    console.log(`📦 Bundle file: ${path.basename(bundlePath)}`);
    
    // Read the bundle file
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const bundleSize = fs.statSync(bundlePath).size;
    
    // Compress the bundle to estimate gzipped size
    const gzippedSize = zlib.gzipSync(bundleContent).length;
    const brotliSize = zlib.brotliCompressSync(bundleContent).length;
    
    console.log('\n📊 Bundle Size Metrics:');
    console.log('┌─────────────────┬────────────┬───────────┐');
    console.log('│ Metric          │ Size       │ % of Raw  │');
    console.log('├─────────────────┼────────────┼───────────┤');
    console.log(`│ Raw Size        │ ${formatSize(bundleSize).padEnd(10)} │ 100.00%   │`);
    console.log(`│ Gzipped Size    │ ${formatSize(gzippedSize).padEnd(10)} │ ${(gzippedSize / bundleSize * 100).toFixed(2)}%   │`);
    console.log(`│ Brotli Size     │ ${formatSize(brotliSize).padEnd(10)} │ ${(brotliSize / bundleSize * 100).toFixed(2)}%   │`);
    console.log('└─────────────────┴────────────┴───────────┘');
    
    // Analyze module patterns to estimate composition
    const moduleAnalysis = analyzeModulePatterns(bundleContent);
    
    console.log('\n📦 Bundle Composition (Estimated):');
    console.log('┌─────────────────────┬────────────┬───────────┐');
    console.log('│ Component           │ Size       │ % of Raw  │');
    console.log('├─────────────────────┼────────────┼───────────┤');
    
    Object.entries(moduleAnalysis).sort((a, b) => b[1] - a[1]).forEach(([name, size]) => {
      const percentage = (size / bundleSize * 100).toFixed(2);
      console.log(`│ ${name.padEnd(19)} │ ${formatSize(size).padEnd(10)} │ ${percentage}%   │`);
    });
    
    console.log('└─────────────────────┴────────────┴───────────┘');
    
    // Generate recommendations
    generateRecommendations(bundleContent, moduleAnalysis);
    
    return {
      bundlePath,
      bundleSize,
      gzippedSize,
      brotliSize,
      moduleAnalysis
    };
  } catch (error) {
    console.error('Error analyzing bundle:', error);
    return null;
  }
}

/**
 * Analyze module patterns to estimate composition
 * @param {string} bundleContent - Bundle content
 * @returns {Object} Module size estimates
 */
function analyzeModulePatterns(bundleContent) {
  const analysis = {
    'Core App': 0,
    'Subsystems': 0,
    'UI Components': 0,
    'Utilities': 0,
    'API Clients': 0,
    'Third-party': 0,
    'Other': 0
  };
  
  // Simple pattern matching to estimate composition
  // This is not 100% accurate but gives a rough idea
  
  // Count subsystem code
  const subsystemMatches = bundleContent.match(/class\s+\w+Subsystem|subsystem|Subsystem\.prototype/gi);
  analysis['Subsystems'] = subsystemMatches ? subsystemMatches.length * 200 : 0;
  
  // Count UI component code
  const uiMatches = bundleContent.match(/class\s+\w+Component|UI|Component\.prototype|querySelector|getElementById/gi);
  analysis['UI Components'] = uiMatches ? uiMatches.length * 150 : 0;
  
  // Count utility code
  const utilMatches = bundleContent.match(/util|helper|format|parse|validate|check|is[A-Z]/gi);
  analysis['Utilities'] = utilMatches ? utilMatches.length * 100 : 0;
  
  // Count API client code
  const apiMatches = bundleContent.match(/api|client|fetch|axios|http|request|response/gi);
  analysis['API Clients'] = apiMatches ? apiMatches.length * 120 : 0;
  
  // Count third-party code (rough estimate)
  const thirdPartyMatches = bundleContent.match(/node_modules|require\(|import\s+.*\s+from|socket\.io|winston|axios/gi);
  analysis['Third-party'] = thirdPartyMatches ? thirdPartyMatches.length * 250 : 0;
  
  // Calculate core app size (remaining code)
  const totalEstimated = Object.values(analysis).reduce((sum, size) => sum + size, 0);
  const bundleSize = bundleContent.length;
  
  // Adjust estimates to match total bundle size
  const scaleFactor = bundleSize / (totalEstimated || 1);
  
  Object.keys(analysis).forEach(key => {
    analysis[key] = Math.round(analysis[key] * scaleFactor);
  });
  
  // Ensure core app has a reasonable value
  analysis['Core App'] = Math.max(
    bundleSize - Object.values(analysis).reduce((sum, size) => sum + size, 0) + analysis['Core App'],
    Math.round(bundleSize * 0.1) // At least 10% of bundle
  );
  
  return analysis;
}

/**
 * Generate optimization recommendations
 * @param {string} bundleContent - Bundle content
 * @param {Object} moduleAnalysis - Module size analysis
 */
function generateRecommendations(bundleContent, moduleAnalysis) {
  console.log('\n🚀 Optimization Recommendations:');
  
  const recommendations = [];
  
  // Check for large third-party dependencies
  if (moduleAnalysis['Third-party'] > moduleAnalysis['Core App']) {
    recommendations.push('Consider reducing third-party dependencies or using lighter alternatives');
  }
  
  // Check for duplicate code patterns
  const duplicatePatterns = [
    { pattern: /import\s+.*\s+from\s+['"].*['"]/g, name: 'import statements' },
    { pattern: /class\s+\w+/g, name: 'class definitions' },
    { pattern: /function\s+\w+\s*\(/g, name: 'function definitions' }
  ];
  
  duplicatePatterns.forEach(({ pattern, name }) => {
    const matches = bundleContent.match(pattern);
    if (matches) {
      const uniqueMatches = new Set(matches);
      const duplicationRate = 1 - (uniqueMatches.size / matches.length);
      
      if (duplicationRate > 0.1) { // More than 10% duplication
        recommendations.push(`High duplication detected in ${name} (${(duplicationRate * 100).toFixed(1)}% duplicate)`);
      }
    }
  });
  
  // Check for minification potential
  const whitespaceRatio = (bundleContent.match(/\s/g) || []).length / bundleContent.length;
  if (whitespaceRatio > 0.2) {
    recommendations.push('Bundle has high whitespace content, minification would help significantly');
  }
  
  // Check for code splitting potential
  if (bundleContent.length > 500000) {
    recommendations.push('Bundle is large, code splitting would improve initial load time');
  }
  
  // Check for lazy loading potential
  const viewPatterns = bundleContent.match(/view|page|screen|component/gi);
  if (viewPatterns && viewPatterns.length > 100) {
    recommendations.push('Multiple views detected, lazy loading would improve initial load time');
  }
  
  // Print recommendations
  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  } else {
    console.log('No specific recommendations found. Consider general optimization techniques.');
  }
}

// Run the analysis
analyzeBundle()
  .then(result => {
    if (result) {
      console.log('\n✅ Bundle analysis completed successfully');
      
      // Save analysis to file
      const analysisPath = path.join(projectRoot, 'docs', 'bundle-analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify(result, null, 2));
      console.log(`📄 Analysis saved to: ${analysisPath}`);
    }
  })
  .catch(error => {
    console.error('Error running bundle analysis:', error);
  });