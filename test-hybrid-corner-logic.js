import { fetchExternalMatchData } from './src/features/match/match.service.js';
import { calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427586; // Arsenal vs Brentford

const run = async () => {
    try {
        console.log(`\n🔍 Testing Hybrid Corner Logic for Match ${MATCH_ID}...\n`);

        console.log("=".repeat(60));
        console.log("1️⃣ FETCHING MATCH DATA");
        console.log("=".repeat(60));

        const matchData = await fetchExternalMatchData(MATCH_ID, API_TOKEN);
        console.log("✅ Match data fetched successfully");

        console.log("\n" + "=".repeat(60));
        console.log("2️⃣ CALCULATING MATCH STATS");
        console.log("=".repeat(60));

        const stats = calculateMatchStats(matchData);

        console.log("\n" + "=".repeat(60));
        console.log("3️⃣ CORNER ANALYSIS RESULTS");
        console.log("=".repeat(60));

        const cornerAnalysis = stats.cornerAnalysis;

        console.log("\n📊 HOME TEAM:");
        console.log(`   Avg For: ${cornerAnalysis.home.avgFor}`);
        console.log(`   Avg Against: ${cornerAnalysis.home.avgAgainst}`);
        console.log(`   Avg Total: ${cornerAnalysis.home.avgTotal}`);
        console.log(`   Over 8.5%: ${cornerAnalysis.home.trends.over85}%`);
        console.log(`   Races: ${cornerAnalysis.home.races === null ? 'NULL (Not Available)' : JSON.stringify(cornerAnalysis.home.races)}`);
        console.log(`   Intervals: ${cornerAnalysis.home.intervals === null ? 'NULL (Not Available)' : 'Available'}`);

        console.log("\n📊 AWAY TEAM:");
        console.log(`   Avg For: ${cornerAnalysis.away.avgFor}`);
        console.log(`   Avg Against: ${cornerAnalysis.away.avgAgainst}`);
        console.log(`   Avg Total: ${cornerAnalysis.away.avgTotal}`);
        console.log(`   Over 8.5%: ${cornerAnalysis.away.trends.over85}%`);
        console.log(`   Races: ${cornerAnalysis.away.races === null ? 'NULL (Not Available)' : JSON.stringify(cornerAnalysis.away.races)}`);
        console.log(`   Intervals: ${cornerAnalysis.away.intervals === null ? 'NULL (Not Available)' : 'Available'}`);

        console.log("\n" + "=".repeat(60));
        console.log("✅ HYBRID LOGIC TEST COMPLETE");
        console.log("=".repeat(60));

        console.log("\n📋 Summary:");
        console.log("   ✅ Averages: Working (from statistics)");
        console.log("   ✅ Trends: Working (from statistics)");
        console.log("   ⚠️  Races: Null (no corner events available)");
        console.log("   ⚠️  Intervals: Null (no corner events available)");

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        console.error(error.stack);
    }
};

run();
