// Test /teams/:id/squad endpoint
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testSquadEndpoint() {
    const teamId = 68; // Borussia Dortmund

    console.log('=== TESTING /teams/:id/squad ===\n');
    const res = await fetch(`${API_BASE}/teams/${teamId}/squad`);

    console.log('Status:', res.status);

    if (res.ok) {
        const data = await res.json();
        console.log('Type:', Array.isArray(data) ? 'Array' : typeof data);
        console.log('Length:', Array.isArray(data) ? data.length : 'N/A');

        if (Array.isArray(data) && data.length > 0) {
            console.log('\n=== FIRST 5 PLAYERS ===');
            for (const p of data.slice(0, 5)) {
                console.log(`- ${p.name} | #${p.jersey_number} | ${p.position} | ${p.detailed_position || p.detailedPosition}`);
            }
            console.log('\n=== FULL PLAYER STRUCTURE ===');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('Data:', JSON.stringify(data).slice(0, 500));
        }
    }
}

testSquadEndpoint().catch(console.error);
