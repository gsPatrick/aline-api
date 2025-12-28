/**
 * _debug_finished_match.js
 * Tests if events and statistics are being returned for finished matches
 */
import 'dotenv/config';

const API_BASE = 'http://127.0.0.1:3333/api';

async function debugFinishedMatch() {
    // Find a finished match ID from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`\n🔍 Finding finished matches from ${dateStr}...\n`);

    // Step 1: Get matches from yesterday to find a finished one
    const homeRes = await fetch(`${API_BASE}/goldstats/home?date=${dateStr}`);
    const homeData = await homeRes.json();

    let finishedMatch = null;
    for (const league of (homeData.data || [])) {
        for (const match of (league.matches || [])) {
            if (match.status === 'FT') {
                finishedMatch = match;
                break;
            }
        }
        if (finishedMatch) break;
    }

    if (!finishedMatch) {
        console.log('❌ No finished matches found for yesterday. Trying today...');
        const todayRes = await fetch(`${API_BASE}/goldstats/home`);
        const todayData = await todayRes.json();
        for (const league of (todayData.data || [])) {
            for (const match of (league.matches || [])) {
                if (match.status === 'FT') {
                    finishedMatch = match;
                    break;
                }
            }
            if (finishedMatch) break;
        }
    }

    if (!finishedMatch) {
        console.log('❌ No finished matches found at all!');
        return;
    }

    console.log(`✅ Found finished match: ${finishedMatch.home_team.name} vs ${finishedMatch.away_team.name}`);
    console.log(`   ID: ${finishedMatch.id}`);
    console.log(`   Score: ${finishedMatch.home_team.score} - ${finishedMatch.away_team.score}\n`);

    // Step 2: Test /matches/:id/stats endpoint
    console.log(`📊 Testing /matches/${finishedMatch.id}/stats endpoint...\n`);

    try {
        const statsRes = await fetch(`${API_BASE}/matches/${finishedMatch.id}/stats`);
        const statsData = await statsRes.json();

        console.log('=== EVENTS ===');
        const events = statsData.events || statsData.timeline || [];
        console.log(`Total events: ${events.length}`);
        if (events.length > 0) {
            console.log('Sample events:');
            events.slice(0, 5).forEach(e => {
                console.log(`  - ${e.minute}' : ${e.type?.name || e.type} - ${e.player_name || e.player?.name || 'N/A'}`);
            });
        } else {
            console.log('⚠️ NO EVENTS RETURNED! Check API mapping.');
        }

        console.log('\n=== STATISTICS ===');
        const detailedStats = statsData.analysis?.detailedStats;
        if (detailedStats) {
            console.log('✅ detailedStats object found');
            console.log('Keys:', Object.keys(detailedStats));
            if (detailedStats.fulltime) {
                console.log('Fulltime possession:', detailedStats.fulltime?.possession);
                console.log('Fulltime shots:', detailedStats.fulltime?.shots);
            }
        } else {
            console.log('⚠️ No detailedStats! Check API mapping.');
            console.log('Available keys in statsData:', Object.keys(statsData));
        }

        console.log('\n=== LINEUPS ===');
        const lineups = statsData.lineups;
        if (lineups) {
            console.log(`Home starters: ${lineups.home?.starters?.length || 0}`);
            console.log(`Away starters: ${lineups.away?.starters?.length || 0}`);
        } else {
            console.log('⚠️ No lineups data.');
        }

    } catch (e) {
        console.log(`❌ Error fetching stats: ${e.message}`);
    }
}

debugFinishedMatch().catch(console.error);
