// Test stats with finished match 19439407
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testStats() {
    const matchId = 19439407; // La Liga FT match
    console.log(`Fetching stats for match ${matchId}...`);

    const res = await fetch(`${API_BASE}/matches/${matchId}/stats`);
    const data = await res.json();

    console.log('\n=== TOP LEVEL KEYS ===');
    console.log(Object.keys(data));

    console.log('\n=== MATCH INFO ===');
    console.log(JSON.stringify({
        status: data.matchInfo?.status,
        homeTeam: data.matchInfo?.home_team?.name,
        awayTeam: data.matchInfo?.away_team?.name,
        score: data.matchInfo?.home_team?.score + '-' + data.matchInfo?.away_team?.score
    }, null, 2));

    console.log('\n=== ANALYSIS DETAILED STATS ===');
    console.log(JSON.stringify(data.analysis?.detailedStats, null, 2));

    console.log('\n=== LINEUPS ===');
    console.log(JSON.stringify(data.lineups, null, 2));

    console.log('\n=== EVENTS (first 10) ===');
    console.log(JSON.stringify((data.events || data.timeline || []).slice(0, 10), null, 2));

    // Check for statistics array directly
    if (data.statistics) {
        console.log('\n=== STATISTICS ===');
        console.log(JSON.stringify(data.statistics, null, 2));
    }
}

testStats().catch(console.error);
