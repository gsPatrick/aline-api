
import axios from 'axios';

const TOKEN = "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const BASE_URL = "https://api.sportmonks.com/v3/football";

// Includes requested by the user
const INCLUDES = [
    "participants",
    "venue",
    // "weather_report", // Causing 404 - Include does not exist
    "league",
    "lineups.player", // Critical for LineupsTab
    "events",         // Critical for EventsTab and Intervals
    "statistics",     // Critical for MatchStatsView
    "odds",           // Critical for GoalsAnalysis and Predictions
    "referees",       // Critical for CardsAnalysis
    "scores"          // Basic score info
].join(";");

async function runTest() {
    console.log("🚀 Starting SportMonks API Test...");
    console.log(`🔑 Token: ${TOKEN.substring(0, 10)}...`);
    console.log(`🔗 Base URL: ${BASE_URL}`);

    try {
        // 1. Get a recent finished match to test full data availability
        // We'll search for a match from yesterday or today to ensure it has data
        const today = new Date().toISOString().split('T')[0];
        console.log(`\n📅 Fetching fixtures for today (${today}) to find a suitable match ID...`);

        const fixturesUrl = `${BASE_URL}/fixtures/date/${today}?api_token=${TOKEN}&include=league`;
        const fixturesRes = await axios.get(fixturesUrl);

        let matchId = null;
        const fixtures = fixturesRes.data.data || [];

        // Try to find a finished match first (FT), if not, take LIVE, if not, take NS
        const finishedMatch = fixtures.find(f => f.state?.state === 'FT');
        const liveMatch = fixtures.find(f => f.state?.state === 'LIVE');

        if (finishedMatch) {
            matchId = finishedMatch.id;
            console.log(`✅ Found FINISHED match: ${finishedMatch.name} (ID: ${matchId})`);
        } else if (liveMatch) {
            matchId = liveMatch.id;
            console.log(`✅ Found LIVE match: ${liveMatch.name} (ID: ${matchId})`);
        } else {
            console.log("⚠️ No finished/live matches found today. Checking yesterday...");
            // Fallback to yesterday
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            console.log(`📅 Fetching fixtures for yesterday (${yesterday})...`);
            const yFixturesRes = await axios.get(`${BASE_URL}/fixtures/date/${yesterday}?api_token=${TOKEN}&include=league`);
            const yFixtures = yFixturesRes.data.data || [];

            const yFinished = yFixtures.find(f => f.state?.state === 'FT');

            if (yFinished) {
                matchId = yFinished.id;
                console.log(`✅ Found FINISHED match yesterday: ${yFinished.name} (ID: ${matchId})`);
            } else if (yFixtures.length > 0) {
                matchId = yFixtures[0].id;
                console.log(`⚠️ Using any match from yesterday: ${yFixtures[0].name} (ID: ${matchId})`);
            } else {
                throw new Error("Could not find any match to test.");
            }
        }

        // 2. Fetch Full Match Details with requested includes
        console.log(`\n🔍 Fetching FULL details for Match ID: ${matchId}...`);
        console.log(`📝 Includes: ${INCLUDES}`);

        const detailUrl = `${BASE_URL}/fixtures/${matchId}?api_token=${TOKEN}&include=${INCLUDES}`;
        const detailRes = await axios.get(detailUrl);
        const data = detailRes.data.data;

        if (!data) {
            throw new Error("No data returned for match details.");
        }

        console.log("\n📊 ANALYSIS OF RESPONSE DATA:");

        // 2.1 Basic Info
        console.log(`\n[1] Basic Info:`);
        console.log(`   - ID: ${data.id}`);
        console.log(`   - Name: ${data.name}`);
        console.log(`   - Venue: ${data.venue ? '✅ Present' : '❌ Missing'}`);
        console.log(`   - Weather: ${data.weather_report ? '✅ Present' : '❌ Missing'}`);
        console.log(`   - League: ${data.league ? '✅ Present' : '❌ Missing'}`);

        // 2.2 Lineups
        console.log(`\n[2] Lineups (Critical for 'Onzes Iniciais'):`);
        const lineups = data.lineups || [];
        console.log(`   - Count: ${lineups.length}`);
        if (lineups.length > 0) {
            const player = lineups[0];
            console.log(`   - Sample Player: ${player.player_name} (${player.player?.display_name})`);
            console.log(`   - Fields check:`);
            console.log(`     - formation_position: ${player.formation_position || '❌ Missing'}`);
            console.log(`     - formation_field: ${player.formation_field || '❌ Missing'}`);
            console.log(`     - type_id: ${player.type_id || '❌ Missing'}`);
            // Check if we can distinguish GK, DF, etc.
        } else {
            console.log("   ⚠️ No lineups available (Match might be NS or data missing)");
        }

        // 2.3 Events
        console.log(`\n[3] Events (Critical for 'Eventos' & Intervals):`);
        const events = data.events || [];
        console.log(`   - Count: ${events.length}`);
        if (events.length > 0) {
            const goals = events.filter(e => e.type?.name === 'Goal');
            const cards = events.filter(e => e.type?.name?.includes('Card'));
            const corners = events.filter(e => e.type?.name?.includes('Corner'));

            console.log(`   - Goals: ${goals.length}`);
            console.log(`   - Cards: ${cards.length}`);
            console.log(`   - Corners (in events): ${corners.length}`);

            if (corners.length === 0) {
                console.log("   ⚠️ No corners in events. Checking comments/commentaries might be needed (as per previous analysis).");
            }
        }

        // 2.4 Stats
        console.log(`\n[4] Stats (Critical for 'Dados do Jogo'):`);
        const stats = data.statistics || [];
        console.log(`   - Count: ${stats.length}`);
        if (stats.length > 0) {
            const homeStats = stats.filter(s => s.location === 'home' || s.participant_id === data.participants[0]?.id);
            console.log(`   - Home Stats Count: ${homeStats.length}`);
            // Check for specific stats
            const shots = homeStats.find(s => s.type?.name === 'Shots Total');
            const possession = homeStats.find(s => s.type?.name === 'Possession');
            console.log(`   - Shots Total: ${shots ? shots.data?.value : '❌ Missing'}`);
            console.log(`   - Possession: ${possession ? possession.data?.value : '❌ Missing'}`);
        }

        // 2.5 Odds
        console.log(`\n[5] Odds (Critical for 'Golos' & Predictions):`);
        const odds = data.odds || [];
        console.log(`   - Count: ${odds.length}`);
        if (odds.length > 0) {
            // Check for Bet365 (ID 2 usually, or check names)
            const bookmakers = [...new Set(odds.map(o => o.bookmaker_id))];
            console.log(`   - Bookmaker IDs present: ${bookmakers.join(', ')}`);

            const overUnder = odds.find(o => o.market_description === 'Goals Over/Under');
            console.log(`   - Over/Under Market: ${overUnder ? '✅ Present' : '❌ Missing'}`);
        } else {
            console.log("   ⚠️ No odds available.");
        }

        // 2.6 Referees
        console.log(`\n[6] Referees (Critical for 'Cartões'):`);
        const referees = data.referees || [];
        console.log(`   - Count: ${referees.length}`);
        if (referees.length > 0) {
            console.log(`   - First Referee: ${referees[0].common_name}`);
        } else {
            console.log("   ⚠️ No referee data.");
        }

        // 2.7 Standings (Check if included)
        console.log(`\n[7] Standings (Critical for 'Tabela'):`);
        // Standings usually not included in fixture directly in v3, often needs separate call
        // But let's see if 'standings' include works or if it's nested in league
        if (data.standings) {
            console.log("   ✅ Standings data found in fixture response.");
        } else {
            console.log("   ❌ Standings NOT found in fixture response (Likely needs separate call).");
        }

        console.log("\n✅ Test Complete.");

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        if (error.response) {
            console.error("   Status:", error.response.status);
            console.error("   Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

runTest();
