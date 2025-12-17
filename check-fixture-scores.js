// Check fixture structure for scores
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function checkFixtureScores() {
    const leagueId = 564;
    const roundId = 373225; // Previous round (should have results)

    console.log('Testing round with finished matches...');
    const res = await fetch(`${API_BASE}/leagues/${leagueId}/rounds/${roundId}/fixtures`);
    const data = await res.json();

    // Check first fixture
    const fixture = data.data?.[0];
    if (fixture) {
        console.log('\n=== FIXTURE STRUCTURE ===');
        console.log('ID:', fixture.id);
        console.log('Name:', fixture.name);
        console.log('State ID:', fixture.state_id);
        console.log('Starting At:', fixture.starting_at);
        console.log('\nParticipants:');
        fixture.participants?.forEach(p => {
            console.log(`  - ${p.name} (${p.meta?.location}): winner=${p.meta?.winner}`);
        });
        console.log('\nScores:', JSON.stringify(fixture.scores, null, 2));
        console.log('\nResult Info:', fixture.result_info);
    }
}

checkFixtureScores().catch(console.error);
