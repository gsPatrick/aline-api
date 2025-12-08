import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462; // Same test fixture

const run = async () => {
    try {
        console.log(`\n🚀 Starting Charts Service Test for Fixture ${FIXTURE_ID}...`);

        // 1. Fetch Data
        console.log("📡 Fetching external match data...");
        const mergedData = await fetchExternalMatchData(FIXTURE_ID, API_TOKEN);

        // 2. Calculate Stats
        console.log("\n🧮 Calculating Stats...");
        const stats = calculateMatchStats(mergedData);

        // 3. Verify Charts Analysis
        console.log("\n📈 Charts Analysis Results:");
        if (stats.chartsAnalysis) {
            const timeline = stats.chartsAnalysis.timeline;
            const summary = stats.chartsAnalysis.summary;

            console.log(`   Timeline Length: ${timeline.length} minutes`);
            console.log(`   Has Pressure Graph: ${summary.hasPressureGraph}`);
            console.log(`   Has Attacks Data: ${summary.hasAttacksData}`);

            // Sample Minutes
            const sampleMinutes = [10, 45, 75, 90];
            sampleMinutes.forEach(min => {
                const entry = timeline.find(t => t.minute === min);
                if (entry) {
                    console.log(`\n   ⏱ Minute ${min}:`);
                    console.log(`      Home: Pressure=${entry.home.pressure.toFixed(1)}, Shots=${entry.home.shots}, Corners=${entry.home.corners}`);
                    console.log(`      Away: Pressure=${entry.away.pressure.toFixed(1)}, Shots=${entry.away.shots}, Corners=${entry.away.corners}`);
                }
            });

        } else {
            console.log("   ❌ No Charts Analysis found");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
};

run();
