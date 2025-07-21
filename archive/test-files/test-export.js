const fetch = require('node-fetch');

async function testExport() {
    try {
        console.log('Testing export functionality...');
        
        // Replace with a valid population ID from your PingOne environment
        const populationId = 'YOUR_POPULATION_ID';
        
        const response = await fetch('http://localhost:4000/api/export-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                populationId: populationId,
                format: 'json',
                fields: 'basic' // or 'all' or 'custom'
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Export successful!');
            console.log(`Found ${data.length} users`);
            if (data.length > 0) {
                console.log('Sample user:', JSON.stringify(data[0], null, 2));
            }
        } else {
            console.error('❌ Export failed:', data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testExport();
