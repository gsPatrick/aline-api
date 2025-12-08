import { fetchExternalMatchData } from './src/features/match/match.service.js';
import { calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427586; // Arsenal vs Brentford

const run = async () => {
    try {
        console.log(`\n🔍 Testing Commentary-Based Corner Extraction\n`);
        console.log("Match ID:", MATCH_ID);
        console.log("=".repeat(60));

        console.log("\n1️⃣ Fetching match data with commentaries...");
        const matchData = await fetchExternalMatchData(MATCH_ID, API_TOKEN);

        console.log("✅ Match data fetched");
        console.log(`   Home: ${matchData.participants?.find(p => p.meta?.location === 'home')?.name}`);
        console.log(`   Away: ${matchData.participants?.find(p => p.meta?.location === 'away')?.name}`);
        console.log(`   Comments in first home match: ${matchData.homeTeam?.detailedHistory?.[0]?.comments?.length || 0}`);
        console.log(`   Comments in first away match: ${matchData.awayTeam?.detailedHistory?.[0]?.comments?.length || 0}`);

        console.log("\n2️⃣ Calculating match stats with commentary corners...");
        const stats = calculateMatchStats(matchData);

        console.log("\n" + "=".repeat(60));
        console.log("📊 CORNER ANALYSIS RESULTS");
        console.log("=".repeat(60));

        const cornerAnalysis = stats.cornerAnalysis;

        console.log("\n🏠 HOME TEAM:");
        console.log(`   Avg For: ${cornerAnalysis.home.avgFor}`);
        console.log(`   Avg Against: ${cornerAnalysis.home.avgAgainst}`);
        console.log(`   Avg Total: ${cornerAnalysis.home.avgTotal}`);
        console.log(`   Over 8.5%: ${cornerAnalysis.home.trends.over85}%`);

        if (cornerAnalysis.home.races === null) {
            console.log(`   Races: NULL (no corner data available)`);
        } else {
            console.log(`   Races:`);
            console.log(`      Race 3: ${cornerAnalysis.home.races.race3}%`);
            console.log(`      Race 5: ${cornerAnalysis.home.races.race5}%`);
            console.log(`      Race 7: ${cornerAnalysis.home.races.race7}%`);
            console.log(`      Race 9: ${cornerAnalysis.home.races.race9}%`);
        }

        if (cornerAnalysis.home.intervals === null) {
            console.log(`   Intervals: NULL (no corner data available)`);
        } else {
            console.log(`   Intervals: Available ✅`);
            console.log(`      0-10: ${cornerAnalysis.home.intervals['0-10']?.frequency}% frequency`);
            console.log(`      11-20: ${cornerAnalysis.home.intervals['11-20']?.frequency}% frequency`);
        }

        console.log("\n✈️  AWAY TEAM:");
        console.log(`   Avg For: ${cornerAnalysis.away.avgFor}`);
        console.log(`   Avg Against: ${cornerAnalysis.away.avgAgainst}`);
        console.log(`   Avg Total: ${cornerAnalysis.away.avgTotal}`);
        console.log(`   Over 8.5%: ${cornerAnalysis.away.trends.over85}%`);

        if (cornerAnalysis.away.races === null) {
            console.log(`   Races: NULL (no corner data available)`);
        } else {
            console.log(`   Races:`);
            console.log(`      Race 3: ${cornerAnalysis.away.races.race3}%`);
            console.log(`      Race 5: ${cornerAnalysis.away.races.race5}%`);
            console.log(`      Race 7: ${cornerAnalysis.away.races.race7}%`);
            console.log(`      Race 9: ${cornerAnalysis.away.races.race9}%`);
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ TEST COMPLETE");
        console.log("=".repeat(60));

        if (cornerAnalysis.home.races !== null || cornerAnalysis.away.races !== null) {
            console.log("\n🎉 SUCCESS: Corner races/intervals are now populated!");
        } else {
            console.log("\n⚠️  Corner races/intervals still NULL - commentaries may not be available");
        }

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        console.error(error.stack);
    }
};

run();
