// Test getting fixtures for a specific round
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testRoundFixtures() {
    const seasonId = 25659; // La Liga 2025/2026
    const roundId = 373226; // Current round

    console.log('=== TESTING ROUND FIXTURES ===\n');

    // 1. Try season fixtures with round filter
    console.log('1. GET /fixtures/season/:seasonId');
    const seasonFixturesRes = await fetch(`${API_BASE}/fixtures/season/${seasonId}`);
    if (seasonFixturesRes.ok) {
        const data = await seasonFixturesRes.json();
        console.log('Keys:', Object.keys(data));
        console.log('Sample:', JSON.stringify(data).slice(0, 500));
    } else {
        console.log('Status:', seasonFixturesRes.status);
    }

    // 2. Try rounds endpoint directly
    console.log('\n2. GET /rounds/:roundId/fixtures');
    const roundRes = await fetch(`${API_BASE}/rounds/${roundId}/fixtures`);
    if (roundRes.ok) {
        const data = await roundRes.json();
        console.log('Round fixtures:', JSON.stringify(data).slice(0, 500));
    } else {
        console.log('Status:', roundRes.status);
    }

    // 3. Check league schedule
    console.log('\n3. GET /leagues/:id/schedule');
    const scheduleRes = await fetch(`${API_BASE}/leagues/564/schedule`);
    if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        console.log('Schedule keys:', Object.keys(data));
        console.log('Sample:', JSON.stringify(data).slice(0, 1000));
    } else {
        console.log('Status:', scheduleRes.status);
    }
}

testRoundFixtures().catch(console.error);
