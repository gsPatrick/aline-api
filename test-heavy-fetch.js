import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Use the token from test-api.js if env is not set, or rely on env
const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462; // Same test fixture

const run = async () => {
    try {
        console.log(`\n🚀 Starting Heavy Fetch Test for Fixture ${FIXTURE_ID}...`);

        // 1. Fetch Data
        console.log("📡 Fetching external match data (this might take a while with heavy fetch)...");
        const startTime = Date.now();
        const mergedData = await fetchExternalMatchData(FIXTURE_ID, API_TOKEN);
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Data fetched in ${duration.toFixed(2)}s`);

        // 2. Inspect History Depth
        const homeHistory = mergedData.homeTeam?.detailedHistory || [];
        const awayHistory = mergedData.awayTeam?.detailedHistory || [];

        console.log(`\n📊 History Check:`);
        console.log(`   Home Detailed History: ${homeHistory.length} matches`);
        console.log(`   Away Detailed History: ${awayHistory.length} matches`);

        if (homeHistory.length > 0) {
            const sample = homeHistory[0];
            console.log(`   Sample Match Events: ${sample.events?.length || 0}`);
            // Debug Event Types
            if (sample.events && sample.events.length > 0) {
                console.log("   DEBUG: Event Types Sample:", sample.events.slice(0, 5).map(e => ({ type: e.type?.name, min: e.minute })));
            }
            console.log(`   Sample Match Stats: ${sample.statistics?.length || 0}`);
        }

        // 3. Calculate Stats
        console.log("\n🧮 Calculating Stats...");
        const stats = calculateMatchStats(mergedData);

        // 4. Verify Corner Analysis
        console.log("\n🚩 Corner Analysis Results:");
        if (stats.cornerAnalysis) {
            const home = stats.cornerAnalysis.home;
            console.log(`   Home Avg Total: ${home.avgTotal}`);

            console.log(`   Home Races:`);
            console.log(`     Race 3: ${home.races?.race3}%`);
            console.log(`     Race 5: ${home.races?.race5}%`);
            console.log(`     Race 7: ${home.races?.race7}%`);

            console.log(`   Home Intervals (Sample):`);
            console.log(`     0-10: ${JSON.stringify(home.intervals?.['0-10'])}`);
            console.log(`     87-FT: ${JSON.stringify(home.intervals?.['87-FT'])}`);
        } else {
            console.log("   ❌ No Corner Analysis found");
        }

        // 5. Verify Goal Analysis
        console.log("\n⚽ Goal Analysis Results:");
        if (stats.goalAnalysis) {
            // Check if it's split by home/away
            if (stats.goalAnalysis.home) {
                console.log("   --- Home Team History ---");
                console.log(`   BTTS: ${stats.goalAnalysis.home.btts}%`);
                console.log(`   First to Score: ${stats.goalAnalysis.home.firstToScore}%`);
                console.log(`   Over 1.5: ${stats.goalAnalysis.home.over15}%`);

                console.log("   --- Away Team History ---");
                console.log(`   BTTS: ${stats.goalAnalysis.away.btts}%`);
                console.log(`   First to Score: ${stats.goalAnalysis.away.firstToScore}%`);
                console.log(`   Over 1.5: ${stats.goalAnalysis.away.over15}%`);
            } else {
                // Flat structure?
                console.log(`   BTTS: ${stats.goalAnalysis.btts}%`);
                console.log(`   First to Score: ${stats.goalAnalysis.firstToScore}%`);
                console.log(`   First to Score & Win: ${stats.goalAnalysis.firstToScoreAndWin}%`);
                console.log(`   Over 1.5: ${stats.goalAnalysis.over15}%`);
            }
        } else {
            console.log("   ❌ No Goal Analysis found");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
        if (error.response) {
            console.error("   API Response:", error.response.data);
        }
    }
};

run();
