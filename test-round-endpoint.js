// Test the actual round fixtures endpoint
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testRoundEndpoint() {
    const leagueId = 564;
    const roundId = 373226; // Current round La Liga

    console.log(`Testing /leagues/${leagueId}/rounds/${roundId}/fixtures...`);
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/rounds/${roundId}/fixtures`);
    console.log('Status:', res.status);

    if (res.ok) {
        const data = await res.json();
        console.log('Keys:', Object.keys(data));
        console.log('Data (first 2000 chars):');
        console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    }
}

testRoundEndpoint().catch(console.error);
