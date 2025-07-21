// File: scripts/minify-bundle.js
// Description: Minifies the bundle using Terser
// This script provides a quick optimization by minifying the bundle

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
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
 * Minify the bundle using Terser
 */
async function minifyBundle() {
  console.log('🔍 Finding bundle to minify...');
  
  try {
    // Get the latest bundle file
    const bundlePath = getLatestBundle();
    const bundleFilename = path.basename(bundlePath);
    console.log(`📦 Found bundle: ${bundleFilename}`);
    
    // Read the bundle file
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const originalSize = fs.statSync(bundlePath).size;
    console.log(`📊 Original size: ${formatSize(originalSize)}`);
    
    console.log('⚙️ Minifying bundle with Terser...');
    
    // Minify the bundle
    const minifyOptions = {
      compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        keep_classnames: true,
        keep_fnames: true
      },
      mangle: {
        keep_classnames: true,
        keep_fnames: true
      },
      format: {
        comments: false
      }
    };
    
    const minified = await minify(bundleContent, minifyOptions);
    
    if (!minified.code) {
      throw new Error('Minification failed to produce output');
    }
    
    // Generate the minified filename
    const minifiedFilename = bundleFilename.replace('.js', '.min.js');
    const minifiedPath = path.join(path.dirname(bundlePath), minifiedFilename);
    
    // Write the minified bundle
    fs.writeFileSync(minifiedPath, minified.code);
    const minifiedSize = fs.statSync(minifiedPath).size;
    
    // Generate gzipped version for comparison
    const gzippedOriginal = zlib.gzipSync(bundleContent).length;
    const gzippedMinified = zlib.gzipSync(minified.code).length;
    
    // Generate brotli version for comparison
    const brotliOriginal = zlib.brotliCompressSync(bundleContent).length;
    const brotliMinified = zlib.brotliCompressSync(minified.code).length;
    
    // Update the manifest to use the minified bundle
    const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.bundleFile = minifiedFilename;
      manifest.originalBundleFile = bundleFilename;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('📝 Updated bundle manifest to use minified version');
    }
    
    // Print results
    console.log('\n📊 Minification Results:');
    console.log('┌─────────────────┬────────────┬────────────┬───────────┐');
    console.log('│ Metric          │ Original   │ Minified   │ Reduction │');
    console.log('├─────────────────┼────────────┼────────────┼───────────┤');
    console.log(`│ Raw Size        │ ${formatSize(originalSize).padEnd(10)} │ ${formatSize(minifiedSize).padEnd(10)} │ ${(100 - minifiedSize / originalSize * 100).toFixed(2)}%   │`);
    console.log(`│ Gzipped Size    │ ${formatSize(gzippedOriginal).padEnd(10)} │ ${formatSize(gzippedMinified).padEnd(10)} │ ${(100 - gzippedMinified / gzippedOriginal * 100).toFixed(2)}%   │`);
    console.log(`│ Brotli Size     │ ${formatSize(brotliOriginal).padEnd(10)} │ ${formatSize(brotliMinified).padEnd(10)} │ ${(100 - brotliMinified / brotliOriginal * 100).toFixed(2)}%   │`);
    console.log('└─────────────────┴────────────┴────────────┴───────────┘');
    
    console.log(`\n✅ Minification complete! Minified bundle saved to: ${minifiedFilename}`);
    console.log(`💡 To use the minified bundle, make sure your HTML references the minified file.`);
    
    return {
      originalPath: bundlePath,
      minifiedPath,
      originalSize,
      minifiedSize,
      reduction: 100 - minifiedSize / originalSize * 100,
      gzippedOriginal,
      gzippedMinified,
      gzippedReduction: 100 - gzippedMinified / gzippedOriginal * 100,
      brotliOriginal,
      brotliMinified,
      brotliReduction: 100 - brotliMinified / brotliOriginal * 100
    };
  } catch (error) {
    console.error('Error minifying bundle:', error);
    return null;
  }
}

// Run the minification
minifyBundle()
  .then(result => {
    if (result) {
      // Save results to file
      const resultsPath = path.join(projectRoot, 'docs', 'minification-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2));
      console.log(`📄 Results saved to: ${resultsPath}`);
    }
  })
  .catch(error => {
    console.error('Error running minification:', error);
  });