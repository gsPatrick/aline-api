// Test script to check for predicted lineups for future matches
// Run with: node test-predicted-lineups.js

const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testPredictedLineups() {
    console.log('=== TESTING PREDICTED LINEUPS FOR FUTURE MATCH ===\n');

    // Use a future match ID
    const futureMatchId = 19433604; // Borussia Dortmund vs Borussia Mönchengladbach

    // 1. Check goldstats/match endpoint
    console.log('1. Testing /goldstats/match/:id...');
    const matchRes = await fetch(`${API_BASE}/goldstats/match/${futureMatchId}`);
    const matchData = await matchRes.json();
    console.log('Keys:', Object.keys(matchData.data || matchData));

    // 2. Check matches/:id/stats endpoint
    console.log('\n2. Testing /matches/:id/stats...');
    const statsRes = await fetch(`${API_BASE}/matches/${futureMatchId}/stats`);
    const statsData = await statsRes.json();
    console.log('Top level keys:', Object.keys(statsData));
    console.log('\nLineups:', JSON.stringify(statsData.lineups, null, 2));
    console.log('\nPredictions:', JSON.stringify(statsData.predictions, null, 2));

    // 3. Check if there's a dedicated predictions endpoint
    console.log('\n3. Testing /predictions/fixture/:id...');
    const predRes = await fetch(`${API_BASE}/predictions/fixture/${futureMatchId}`);
    if (predRes.ok) {
        const predData = await predRes.json();
        console.log('Predictions data:', JSON.stringify(predData, null, 2));
    } else {
        console.log('Status:', predRes.status);
    }

    // 4. Check team squads in homeTeam/awayTeam
    console.log('\n4. Checking team squads in stats response...');
    console.log('Home Team squad:', JSON.stringify(statsData.homeTeam?.squad?.slice(0, 5), null, 2));
    console.log('Away Team squad:', JSON.stringify(statsData.awayTeam?.squad?.slice(0, 5), null, 2));

    // 5. Try to get team details for predicted lineup
    const homeTeamId = matchData.data?.home_team?.id;
    const awayTeamId = matchData.data?.away_team?.id;
    console.log('\nHome Team ID:', homeTeamId);
    console.log('Away Team ID:', awayTeamId);

    if (homeTeamId) {
        console.log('\n5. Testing /teams/:id...');
        const teamRes = await fetch(`${API_BASE}/teams/${homeTeamId}`);
        if (teamRes.ok) {
            const teamData = await teamRes.json();
            console.log('Team data keys:', Object.keys(teamData.data || teamData));
            if (teamData.data?.squad) {
                console.log('Squad length:', teamData.data.squad.length);
                console.log('First 3 players:', JSON.stringify(teamData.data.squad.slice(0, 3), null, 2));
            }
        } else {
            console.log('Status:', teamRes.status);
        }
    }
}

testPredictedLineups().catch(console.error);
