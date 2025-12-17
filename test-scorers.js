// Test script to fetch top scorers from league API
// Run with: node test-scorers.js

const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testScorers() {
    console.log('=== TESTING TOP SCORERS API ===\n');

    // Test with league 82 (Bundesliga)
    const leagueId = 82;

    try {
        // The league details already include topscorers based on the service
        console.log(`Testing /leagues/${leagueId}/details...`);
        const detailsRes = await fetch(`${API_BASE}/leagues/${leagueId}/details`);
        const detailsData = await detailsRes.json();

        console.log('Status:', detailsRes.status);
        console.log('Top level keys:', Object.keys(detailsData.data || detailsData));

        // Check if topscorers exists
        if (detailsData.data?.topScorers || detailsData.topScorers) {
            console.log('\ntopScorers found!');
            console.log(JSON.stringify(detailsData.data?.topScorers || detailsData.topScorers, null, 2));
        }

        // Also try direct endpoint if exists
        console.log('\nTrying /leagues/${leagueId}/topscorers...');
        const scorersRes = await fetch(`${API_BASE}/leagues/${leagueId}/topscorers`);
        console.log('Status:', scorersRes.status);
        if (scorersRes.ok) {
            const scorersData = await scorersRes.json();
            console.log('Top scorers:', JSON.stringify(scorersData, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testScorers();
