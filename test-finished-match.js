// Test script to fetch match stats and lineups for a finished match
// Run with: node test-finished-match.js

const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testFinishedMatch() {
    console.log('=== TESTING FINISHED MATCH STATS ===\n');

    // First get some matches from home endpoint
    console.log('Fetching live/recent matches...');
    const homeRes = await fetch(`${API_BASE}/goldstats/home`);
    const homeData = await homeRes.json();

    // Find a finished match
    let finishedMatchId = null;
    const allMatches = [...(homeData.data?.live || []), ...(homeData.data?.featured || [])];

    for (const match of allMatches) {
        if (['FT', 'AET', 'PEN'].includes(match.status)) {
            finishedMatchId = match.id;
            console.log(`Found finished match: ${match.home_team?.name} vs ${match.away_team?.name} (ID: ${match.id})`);
            break;
        }
    }

    if (!finishedMatchId) {
        // Try hardcoded ID from Brazilian league
        console.log('No finished match found in home, trying a known match...');
        finishedMatchId = 19475000; // Try a recent ID
    }

    // Fetch stats for this match
    console.log(`\nFetching stats for match ${finishedMatchId}...`);
    const statsRes = await fetch(`${API_BASE}/matches/${finishedMatchId}/stats`);

    if (!statsRes.ok) {
        console.log('Stats response not ok, status:', statsRes.status);
        return;
    }

    const statsData = await statsRes.json();

    // Check what data we have
    console.log('\n=== TOP LEVEL KEYS ===');
    console.log(Object.keys(statsData));

    console.log('\n=== ANALYSIS DETAILED STATS ===');
    console.log(JSON.stringify(statsData.analysis?.detailedStats?.fulltime, null, 2));

    console.log('\n=== LINEUPS ===');
    console.log(JSON.stringify(statsData.lineups, null, 2));

    console.log('\n=== EVENTS (first 5) ===');
    console.log(JSON.stringify((statsData.events || statsData.timeline || []).slice(0, 5), null, 2));

    // Also try statistics if different
    if (statsData.statistics) {
        console.log('\n=== STATISTICS ARRAY ===');
        console.log(JSON.stringify(statsData.statistics, null, 2));
    }
}

testFinishedMatch().catch(console.error);
