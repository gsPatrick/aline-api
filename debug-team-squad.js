import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Testing Team Squad Includes for ID ${TEAM_ID}...`);

        const includes = [
            'squad',
            'squad.player',
            'squad.player.statistics',
            'squad.player.statistics.season'
        ];

        for (const inc of includes) {
            console.log(`\nTesting include=${inc}...`);
            try {
                const url = `${BASE_URL}/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=${inc}`;
                const res = await axios.get(url);
                console.log("   ✅ Success");
                const data = res.data.data;
                const squad = data.squad || [];
                console.log(`   Found ${squad.length} squad members.`);
                if (squad.length > 0 && inc.includes('statistics')) {
                    const p = squad[0].player;
                    const stats = p?.statistics || [];
                    console.log(`   Sample Player Stats: ${stats.length} entries.`);
                }
            } catch (e) {
                console.log("   ❌ Failed:", e.message);
            }
        }

    } catch (error) {
        console.error("Fatal Error:", error.message);
    }
};

run();
