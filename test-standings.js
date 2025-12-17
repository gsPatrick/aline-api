// Test league standings API
// Run with: node test-standings.js

const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testStandings() {
    console.log('=== TESTING STANDINGS API ===\n');

    // Test with league 82 (Bundesliga - from previous test)
    const leagueId = 82;

    try {
        // Test /leagues/:id/details endpoint
        console.log(`Testing /leagues/${leagueId}/details...`);
        const detailsRes = await fetch(`${API_BASE}/leagues/${leagueId}/details`);
        console.log('Status:', detailsRes.status);

        if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            console.log('\nTop level keys:', Object.keys(detailsData));
            console.log('standings count:', detailsData.standings?.length || 0);

            if (detailsData.standings && detailsData.standings.length > 0) {
                console.log('\nFirst standing entry keys:', Object.keys(detailsData.standings[0]));
                console.log('\nFirst standing entry:', JSON.stringify(detailsData.standings[0], null, 2));
            }

            // Save full response
            const fs = await import('fs');
            fs.writeFileSync('./standings-response.json', JSON.stringify(detailsData, null, 2));
            console.log('\nFull response saved to: standings-response.json');
        } else {
            console.log('Response not OK, trying text...');
            const text = await detailsRes.text();
            console.log('Body:', text.substring(0, 500));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testStandings();
