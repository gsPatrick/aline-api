// Test script to get match IDs from home API and test one finished match
// Run with: node test-home.js

const API_BASE = 'https://10stats-api-10stats.ebl0ff.easypanel.host/api';

async function testHomeAndMatch() {
    console.log('=== FETCHING HOME DATA ===\n');

    try {
        // 1. Get matches from home
        const homeRes = await fetch(`${API_BASE}/goldstats/home`);
        const homeData = await homeRes.json();

        console.log('Home API Status:', homeRes.status);
        console.log('Leagues count:', homeData.data?.length || 0);

        if (homeData.data && homeData.data.length > 0) {
            const firstLeague = homeData.data[0];
            console.log('\nFirst League:', firstLeague.league_name);
            console.log('Matches count:', firstLeague.matches?.length || 0);

            if (firstLeague.matches && firstLeague.matches.length > 0) {
                // Find a finished match (FT) if possible
                let testMatch = firstLeague.matches.find(m => m.status === 'FT');

                // If no finished match, just use first one
                if (!testMatch) {
                    testMatch = firstLeague.matches[0];
                }

                console.log('\n=== TEST MATCH ===');
                console.log('ID:', testMatch.id);
                console.log('Status:', testMatch.status);
                console.log('Date:', testMatch.date);
                console.log('Home:', testMatch.home_team?.name);
                console.log('Away:', testMatch.away_team?.name);
                console.log('Score:', testMatch.home_team?.score, '-', testMatch.away_team?.score);

                // 2. Now fetch this match's full data
                console.log('\n=== FETCHING MATCH STATS ===');
                const matchRes = await fetch(`${API_BASE}/matches/${testMatch.id}/stats`);
                const matchData = await matchRes.json();

                console.log('Match API Status:', matchRes.status);
                console.log('matchInfo.status:', matchData.matchInfo?.status);
                console.log('matchInfo.home_team:', JSON.stringify(matchData.matchInfo?.home_team));
                console.log('events count:', matchData.events?.length || 0);
                console.log('standings count:', matchData.standings?.length || 0);
                console.log('history.home count:', matchData.history?.home?.length || 0);
                console.log('lineups.home.starters:', matchData.lineups?.home?.starters?.length || 0);

                // Save to file
                const fs = await import('fs');
                fs.writeFileSync('./match-' + testMatch.id + '.json', JSON.stringify(matchData, null, 2));
                console.log('\nFull response saved to: match-' + testMatch.id + '.json');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testHomeAndMatch();
