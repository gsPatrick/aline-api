// Check detailed stats structure
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function checkDetailedStats() {
    const matchId = 19439407;
    const res = await fetch(`${API_BASE}/matches/${matchId}/stats`);
    const data = await res.json();

    console.log('=== ANALYSIS KEYS ===');
    console.log(Object.keys(data.analysis || {}));

    console.log('\n=== DETAILED STATS ===');
    if (data.analysis?.detailedStats) {
        console.log(JSON.stringify(data.analysis.detailedStats, null, 2));
    } else {
        console.log('No detailedStats');
    }

    console.log('\n=== SHOT STATS ===');
    console.log(JSON.stringify(data.shotStats, null, 2));

    console.log('\n=== XG ===');
    console.log(JSON.stringify(data.xG, null, 2));

    console.log('\n=== BASIC INFO ===');
    console.log(JSON.stringify(data.basicInfo, null, 2));

    console.log('\n=== GENERAL STATS ANALYSIS ===');
    console.log(JSON.stringify(data.generalStatsAnalysis, null, 2));

    // Check for statistics array
    console.log('\n=== STATISTICS ===');
    console.log(JSON.stringify(data.statistics, null, 2));
}

checkDetailedStats().catch(console.error);
