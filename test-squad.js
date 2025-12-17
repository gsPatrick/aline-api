// Get squad data from teams endpoint
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function getSquad() {
    const teamId = 68; // Borussia Dortmund

    const res = await fetch(`${API_BASE}/teams/${teamId}`);
    const data = await res.json();

    console.log('=== SQUAD DATA ===\n');
    console.log('Squad length:', data.data?.squad?.length);

    if (data.data?.squad) {
        const squad = data.data.squad;

        // Group by position
        const goalkeepers = squad.filter(p => p.position === 'Goalkeeper' || p.detailedPosition?.includes(' goalkeeper'));
        const defenders = squad.filter(p => p.position === 'Defender' || p.detailedPosition?.includes('back'));
        const midfielders = squad.filter(p => p.position === 'Midfielder' || p.detailedPosition?.includes('Midfielder'));
        const forwards = squad.filter(p => p.position === 'Attacker' || p.detailedPosition?.includes('forward') || p.detailedPosition?.includes('Striker'));

        console.log('\nGoalkeepers:', goalkeepers.length);
        console.log('Defenders:', defenders.length);
        console.log('Midfielders:', midfielders.length);
        console.log('Forwards:', forwards.length);

        console.log('\n=== SAMPLE PLAYERS ===\n');
        console.log('First 5 players:');
        for (const p of squad.slice(0, 5)) {
            console.log(`- ${p.name} | ${p.position} | ${p.detailedPosition} | #${p.jerseyNumber} | ${p.image}`);
        }

        console.log('\n=== FULL STRUCTURE ===\n');
        console.log(JSON.stringify(squad[0], null, 2));
    }
}

getSquad().catch(console.error);
