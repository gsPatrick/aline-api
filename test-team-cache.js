import { getTeamData } from './src/features/team/team.service.js';
import { sequelize } from './src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal

const run = async () => {
    try {
        await sequelize.sync(); // Ensure tables exist

        console.log(`\n🚀 Starting Team Cache Test for Team ${TEAM_ID}...`);

        // 1. First Call (Should fetch from API)
        console.log("\n1️⃣ First Call (Expect API Fetch)...");
        const start1 = Date.now();
        const data1 = await getTeamData(TEAM_ID, API_TOKEN);
        const end1 = Date.now();
        console.log(`   ✅ Data received in ${end1 - start1}ms`);
        console.log(`   Name: ${data1.teamInfo.name}`);

        // 2. Second Call (Should fetch from Cache)
        console.log("\n2️⃣ Second Call (Expect Cache Hit)...");
        const start2 = Date.now();
        const data2 = await getTeamData(TEAM_ID, API_TOKEN);
        const end2 = Date.now();
        console.log(`   ✅ Data received in ${end2 - start2}ms`);

        if ((end2 - start2) < 100) {
            console.log("   🚀 FAST! Likely from cache.");
        } else {
            console.log("   ⚠️ Slow. Might not be cached.");
        }

        if (JSON.stringify(data1) === JSON.stringify(data2)) {
            console.log("   ✅ Data matches exactly.");
        } else {
            console.log("   ❌ Data mismatch.");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    } finally {
        await sequelize.close();
    }
};

run();
