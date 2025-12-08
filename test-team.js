import { getTeamData } from './src/features/team/team.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal (Example)

const run = async () => {
    try {
        console.log(`\n🚀 Starting Team Service Test for Team ${TEAM_ID}...`);

        // 1. Fetch Data
        console.log("📡 Fetching team data...");
        const data = await getTeamData(TEAM_ID, API_TOKEN);

        // 2. Verify Structure
        console.log("\n✅ Team Data Fetched Successfully!");
        console.log(`   Name: ${data.teamInfo.name}`);
        console.log(`   Competitions: ${data.teamInfo.competitions.length}`);

        console.log("\n📊 Stats Grid:");
        console.log(JSON.stringify(data.statsGrid, null, 2));

        console.log("\n🕸 Radar:");
        console.log(JSON.stringify(data.radar, null, 2));

        console.log(`\n📜 Match History (${data.matchHistory.length} games):`);
        if (data.matchHistory.length > 0) {
            const sample = data.matchHistory[0];
            console.log("   Sample Match:");
            console.log(`      Date: ${sample.date}`);
            console.log(`      Opponent: ${sample.opponent}`);
            console.log(`      Score: ${sample.score} ${sample.htScore}`);
            console.log(`      Badges: Corners=${sample.stats.corners}, Cards=${sample.stats.cards}`);
        }

        console.log(`\n👥 Squad (${data.squad.players.length} players):`);
        if (data.squad.hasData) {
            console.log(`   Sample Player: ${data.squad.players[0].name} (${data.squad.players[0].position})`);
        } else {
            console.log("   ⚠️ No Squad Data Available");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
};

run();
