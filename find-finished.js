// Find finished matches from goldstats home
const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function findFinishedMatches() {
    console.log('=== FINDING FINISHED MATCHES ===\n');

    const homeRes = await fetch(`${API_BASE}/goldstats/home`);
    const homeData = await homeRes.json();

    console.log('Home data keys:', Object.keys(homeData.data || homeData));

    // Check all categories
    const categories = ['live', 'featured', 'upcoming', 'recent'];
    for (const cat of categories) {
        const matches = homeData.data?.[cat] || [];
        console.log(`\n${cat.toUpperCase()}: ${matches.length} matches`);
        for (const m of matches.slice(0, 10)) {
            console.log(`  - ID: ${m.id} | Status: ${m.status} | ${m.home_team?.name} vs ${m.away_team?.name} | Score: ${m.home_team?.score}-${m.away_team?.score}`);
        }
    }

    // Also try fixtures/today
    console.log('\n\n=== FIXTURES TODAY ===');
    const todayRes = await fetch(`${API_BASE}/fixtures/today`);
    if (todayRes.ok) {
        const todayData = await todayRes.json();
        const fixtures = todayData.data?.fixtures || todayData.data || [];
        console.log(`Found ${fixtures.length} fixtures`);

        for (const f of fixtures.slice(0, 20)) {
            const status = f.state?.state || f.status;
            if (['FT', 'AET', 'PEN'].includes(status)) {
                console.log(`FINISHED: ID ${f.id} - ${f.name} - Status: ${status}`);
            }
        }
    }
}

findFinishedMatches().catch(console.error);
