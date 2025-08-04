#!/usr/bin/env node

console.log('🔍 Testing Import Maps detection...');
console.log('process.argv:', process.argv);
console.log('Has --import-maps:', process.argv.includes('--import-maps'));

const useImportMaps = process.argv.includes('--import-maps');
if (useImportMaps) {
    console.log('✅ Import Maps mode detected!');
} else {
    console.log('❌ Bundle mode detected');
}
