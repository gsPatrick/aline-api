// Test script to capture API response structure
// Run with: node test-api.js

const matchId = '19433604';
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testMatchAPI() {
    console.log(`Testing API for match ID: ${matchId}\n`);

    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}/stats`);
        console.log('Status:', response.status);

        if (!response.ok) {
            console.log('Response not OK');
            const text = await response.text();
            console.log('Body:', text.substring(0, 500));
            return;
        }

        const data = await response.json();

        // Write full response to file
        const fs = await import('fs');
        fs.writeFileSync('./api-response.json', JSON.stringify(data, null, 2));
        console.log('\nFull response saved to: api-response.json');

        // Log structure
        console.log('\n=== TOP LEVEL KEYS ===');
        console.log(Object.keys(data));

        if (data.matchInfo) {
            console.log('\n=== matchInfo keys ===');
            console.log(Object.keys(data.matchInfo));
        }

        if (data.home) {
            console.log('\n=== home keys ===');
            console.log(Object.keys(data.home));
        }

        if (data.events) {
            console.log('\n=== events sample ===');
            console.log(data.events.slice(0, 2));
        }

        if (data.standings) {
            console.log('\n=== standings length ===');
            console.log(data.standings?.length || 0);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMatchAPI();
