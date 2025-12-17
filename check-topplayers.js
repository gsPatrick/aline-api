// Check topPlayers structure
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function checkTopPlayers() {
    const leagueId = 82;
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/details`);
    const data = await res.json();

    console.log('=== topPlayers structure ===');
    console.log(JSON.stringify(data.data?.topPlayers, null, 2));
}

checkTopPlayers();
