// Find yesterday's finished matches
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function findYesterdayMatches() {
    console.log('=== FINDING YESTERDAY MATCHES ===\n');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    console.log('Yesterday:', dateStr);

    const res = await fetch(`${API_BASE}/fixtures/date/${dateStr}`);
    if (res.ok) {
        const data = await res.json();
        const fixtures = data.data?.fixtures || data.data || data || [];
        console.log(`Found ${Array.isArray(fixtures) ? fixtures.length : Object.keys(fixtures).length} fixtures`);

        // Check if array or object with league keys
        if (Array.isArray(fixtures)) {
            for (const f of fixtures.slice(0, 30)) {
                const status = f.state?.state || f.status;
                console.log(`ID ${f.id} - Status: ${status} - ${f.name || f.home_team?.name + ' vs ' + f.away_team?.name}`);
            }
        } else {
            // Object with league keys
            for (const leagueKey of Object.keys(fixtures).slice(0, 5)) {
                const league = fixtures[leagueKey];
                if (league.fixtures) {
                    for (const f of league.fixtures.slice(0, 5)) {
                        const status = f.state?.state || f.status;
                        console.log(`ID ${f.id} - Status: ${status} - ${f.name || 'match'}`);
                    }
                }
            }
        }
    } else {
        console.log('Error fetching yesterday:', res.status);
    }

    // Also try 2 days ago
    console.log('\n=== 2 DAYS AGO ===\n');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateStr2 = twoDaysAgo.toISOString().split('T')[0];
    console.log('Date:', dateStr2);

    const res2 = await fetch(`${API_BASE}/fixtures/date/${dateStr2}`);
    if (res2.ok) {
        const data2 = await res2.json();
        console.log('Response keys:', Object.keys(data2));
        console.log('Sample:', JSON.stringify(data2).slice(0, 500));
    }
}

findYesterdayMatches().catch(console.error);
