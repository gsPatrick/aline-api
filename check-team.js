// Check full team response
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function checkTeam() {
    const teamId = 68;
    const res = await fetch(`${API_BASE}/teams/${teamId}`);
    const data = await res.json();

    console.log('=== FULL RESPONSE STRUCTURE ===\n');
    console.log('Top level keys:', Object.keys(data));

    if (data.data) {
        console.log('data keys:', Object.keys(data.data));
    }

    // Check for squad in different locations
    console.log('\ndata.squad:', data.squad ? 'EXISTS (length: ' + data.squad.length + ')' : 'undefined');
    console.log('data.data?.squad:', data.data?.squad ? 'EXISTS' : 'undefined');

    // Print first 2000 chars of response
    console.log('\n=== FIRST 2000 CHARS ===\n');
    console.log(JSON.stringify(data).slice(0, 2000));
}

checkTeam().catch(console.error);
