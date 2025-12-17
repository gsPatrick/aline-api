// Test league API for rounds and fixtures
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testLeagueAPI() {
    const leagueId = 564; // La Liga

    console.log('=== TESTING LEAGUE API ===\n');

    // 1. League details (standings, rounds, etc)
    console.log('1. GET /leagues/:id/details');
    const detailsRes = await fetch(`${API_BASE}/leagues/${leagueId}/details`);
    const details = await detailsRes.json();

    console.log('Keys:', Object.keys(details));
    console.log('data keys:', Object.keys(details.data || {}));

    if (details.data?.rounds) {
        console.log('\nRounds (first 5):', details.data.rounds.slice(0, 5));
        console.log('Current round ID:', details.data.currentRoundId);
    }

    if (details.data?.leagueInfo) {
        console.log('\nLeague Info:', JSON.stringify(details.data.leagueInfo, null, 2));
    }

    // 2. Check if there's a fixtures by round endpoint
    console.log('\n\n2. Checking for round fixtures...');
    const currentRoundId = details.data?.currentRoundId;
    if (currentRoundId) {
        console.log('Current Round ID:', currentRoundId);

        // Try to find fixtures for this round
        const fixturesRes = await fetch(`${API_BASE}/fixtures/round/${currentRoundId}`);
        if (fixturesRes.ok) {
            const fixturesData = await fixturesRes.json();
            console.log('Round fixtures:', JSON.stringify(fixturesData).slice(0, 500));
        } else {
            console.log('No round endpoint, status:', fixturesRes.status);
        }
    }

    // 3. Sample standings
    console.log('\n\n3. Standings (first 3):');
    console.log(JSON.stringify(details.data?.standings?.slice(0, 3), null, 2));
}

testLeagueAPI().catch(console.error);
