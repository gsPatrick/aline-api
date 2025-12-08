import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462; // Same test fixture

const run = async () => {
    try {
        console.log(`\n🚀 Starting General Stats Service Test for Fixture ${FIXTURE_ID}...`);

        // 1. Fetch Data
        console.log("📡 Fetching external match data...");
        const mergedData = await fetchExternalMatchData(FIXTURE_ID, API_TOKEN);

        // 2. Calculate Stats
        console.log("\n🧮 Calculating Stats...");
        const stats = calculateMatchStats(mergedData);

        // 3. Verify General Stats Analysis
        console.log("\n📊 General Stats Analysis Results:");
        if (stats.generalStatsAnalysis) {
            const home = stats.generalStatsAnalysis.home;
            const away = stats.generalStatsAnalysis.away;

            const logStats = (teamName, data) => {
                console.log(`\n   --- ${teamName} ---`);
                console.log("   🎯 Shots:");
                console.log(`      Total: ${data.shots.total}`);
                console.log(`      On Goal: ${data.shots.onGoal}`);
                console.log(`      Off Goal: ${data.shots.offGoal}`);
                console.log(`      Blocked: ${data.shots.blocked}`);
                console.log(`      Inside Box: ${data.shots.insideBox}`);
                console.log(`      Outside Box: ${data.shots.outsideBox}`);

                console.log("   🎮 Control:");
                console.log(`      Possession: ${data.control.possession}%`);
                console.log(`      Offsides: ${data.control.offsides}`);
                console.log(`      Fouls: ${data.control.fouls}`);
                console.log(`      Passes: ${data.control.passes}`);
            };

            logStats(`Home Team (${stats.basicInfo.teams.home})`, home);
            logStats(`Away Team (${stats.basicInfo.teams.away})`, away);

        } else {
            console.log("   ❌ No General Stats Analysis found");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
};

run();
