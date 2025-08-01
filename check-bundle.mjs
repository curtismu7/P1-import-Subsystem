import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the most recent bundle file in the public/js directory
const jsDir = path.join(__dirname, 'public', 'js');
const files = fs.readdirSync(jsDir);

// Filter for bundle files
const bundleFiles = files.filter(file => file.startsWith('bundle-') && file.endsWith('.js'));

if (bundleFiles.length === 0) {
  console.log('No bundle files found');
  process.exit(1);
}

// Sort by modification time to get the most recent
const sortedFiles = bundleFiles.sort((a, b) => {
  const aStat = fs.statSync(path.join(jsDir, a));
  const bStat = fs.statSync(path.join(jsDir, b));
  return bStat.mtime - aStat.mtime;
});

const latestBundle = sortedFiles[0];
const latestBundlePath = path.join(jsDir, latestBundle);
const bundleStats = fs.statSync(latestBundlePath);

console.log('Latest bundle file on disk:');
console.log(`  Name: ${latestBundle}`);
console.log(`  Path: ${latestBundlePath}`);
console.log(`  Size: ${bundleStats.size} bytes`);
console.log(`  Modified: ${bundleStats.mtime}`);

// Extract bundle number
const match = latestBundle.match(/bundle-(\d+)\.js/);
if (match) {
  console.log(`  Bundle Number: ${match[1]}`);
}
