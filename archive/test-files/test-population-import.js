import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testPopulationImport() {
    console.log('🧪 Testing Population Selection Fix...\n');
    
    // Test with TEST population (non-default)
    const testPopulation = {
        id: '48af9c64-24fd-4eea-a8eb-16b7e4744fc8',
        name: 'TEST'
    };
    
    console.log(`📋 Testing import with population: ${testPopulation.name} (${testPopulation.id})`);
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream('test-users.csv'));
        formData.append('populationId', testPopulation.id);
        formData.append('populationName', testPopulation.name);
        formData.append('totalUsers', '3');
        
        // Make the request
        const response = await fetch('http://127.0.0.1:4000/api/import', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        console.log('📊 Import Response:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            const populationMatch = result.populationId === testPopulation.id;
            console.log(`\n🎯 Population Match: ${populationMatch ? '✅ YES' : '❌ NO'}`);
            console.log(`   Selected: ${testPopulation.name} (${testPopulation.id})`);
            console.log(`   Used: ${result.populationName} (${result.populationId})`);
            
            if (populationMatch) {
                console.log('\n✅ SUCCESS: Population selection fix is working!');
                console.log('   The system is now using the selected population instead of the default.');
            } else {
                console.log('\n❌ ISSUE: Population selection is still not working.');
                console.log('   The system is using a different population than selected.');
            }
        } else {
            console.log('\n❌ Import failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testPopulationImport(); 