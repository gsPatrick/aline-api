// Check squad structure
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function getSquadDetails() {
    const teamId = 68;
    const res = await fetch(`${API_BASE}/teams/${teamId}`);
    const data = await res.json();

    console.log('=== SQUAD STRUCTURE ===\n');
    const squad = data.squad;

    if (squad && squad.length > 0) {
        console.log('Squad length:', squad.length);
        console.log('\nFirst 5 players:');
        for (const p of squad.slice(0, 5)) {
            console.log(`- ${p.name} | Pos: ${p.position} | Detail: ${p.detailedPosition} | #${p.jerseyNumber}`);
        }

        console.log('\n=== FULL PLAYER OBJECT ===\n');
        console.log(JSON.stringify(squad[0], null, 2));

        // Group by position
        const positions = {};
        for (const p of squad) {
            const pos = p.position || 'Unknown';
            positions[pos] = (positions[pos] || 0) + 1;
        }
        console.log('\n=== POSITION COUNTS ===');
        console.log(positions);
    } else {
        console.log('No squad data');
        console.log('Response:', JSON.stringify(data).slice(0, 500));
    }
}

getSquadDetails().catch(console.error);
