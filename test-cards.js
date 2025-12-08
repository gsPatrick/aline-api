import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462; // Same test fixture

const run = async () => {
    try {
        console.log(`\n🚀 Starting Cards Service Test for Fixture ${FIXTURE_ID}...`);

        // 1. Fetch Data
        console.log("📡 Fetching external match data...");
        const mergedData = await fetchExternalMatchData(FIXTURE_ID, API_TOKEN);

        // 2. Inspect Referee
        console.log("\n👨‍⚖️ Referee Data (Raw):");
        if (mergedData.referee) {
            console.log(`   Name: ${mergedData.referee.common_name || mergedData.referee.fullname}`);
            console.log(`   ID: ${mergedData.referee.id}`);
        } else {
            console.log("   ❌ No Referee Data found in fetch response");
        }

        // 3. Calculate Stats
        console.log("\n🧮 Calculating Stats...");
        const stats = calculateMatchStats(mergedData);

        // 4. Verify Card Analysis
        console.log("\n🟨 Card Analysis Results:");
        if (stats.cardAnalysis) {
            const home = stats.cardAnalysis.home;
            const away = stats.cardAnalysis.away;
            const referee = stats.cardAnalysis.referee;

            console.log(`\n   --- Home Team (${stats.basicInfo.teams.home}) ---`);
            console.log(`   Avg Total: ${home.avgTotal}`);
            console.log(`   Avg For: ${home.avgFor}`);
            console.log(`   Avg Against: ${home.avgAgainst}`);
            console.log(`   1st Half Avg: ${home.firstHalfAvg}`);
            console.log(`   2nd Half Avg: ${home.secondHalfAvg}`);
            console.log(`   Markets Over 3.5: ${home.markets.over35}%`);
            console.log(`   Interval 76-FT: ${JSON.stringify(home.intervals['76-FT'])}`);

            console.log(`\n   --- Away Team (${stats.basicInfo.teams.away}) ---`);
            console.log(`   Avg Total: ${away.avgTotal}`);
            console.log(`   Avg For: ${away.avgFor}`);

            console.log(`\n   --- Referee ---`);
            if (referee) {
                console.log(`   Name: ${referee.name}`);
                console.log(`   Avg Cards: ${referee.avgCards}`);
            } else {
                console.log("   ❌ No Referee Analysis");
            }

        } else {
            console.log("   ❌ No Card Analysis found");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
};

run();
