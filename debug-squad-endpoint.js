import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Testing Squad Endpoints for Team ${TEAM_ID}...`);

        // 1. /squads/teams/{id} with include
        console.log("\n1. Testing /squads/teams/{id} with include=player.statistics...");
        try {
            const url = `${BASE_URL}/squads/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=player.statistics`;
            const res = await axios.get(url);
            console.log(`   ✅ Success! Found ${res.data.data?.length} players.`);
            if (res.data.data?.length > 0) {
                const p = res.data.data[0].player;
                console.log("   Sample Player:", p?.common_name);
                console.log("   Has Stats?", !!p?.statistics);
                if (p?.statistics) {
                    console.log("   Stats Length:", p.statistics.length);
                }
            }
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

        // 2. /teams/{id}/squad
        console.log("\n2. Testing /teams/{id}/squad...");
        try {
            const url = `${BASE_URL}/teams/${TEAM_ID}/squad?api_token=${API_TOKEN}`;
            const res = await axios.get(url);
            console.log(`   ✅ Success! Found ${res.data.data?.length} players.`);
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

        // 3. Get current season and try /squads/seasons/{id}/teams/{id}
        console.log("\n3. Fetching active season to try season-based squad...");
        try {
            const teamUrl = `${BASE_URL}/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=activeSeasons`;
            const teamRes = await axios.get(teamUrl);
            const activeSeasons = teamRes.data.data?.activeSeasons || [];
            if (activeSeasons.length > 0) {
                const seasonId = activeSeasons[0].id;
                console.log(`   Active Season ID: ${seasonId}`);

                const squadUrl = `${BASE_URL}/squads/seasons/${seasonId}/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=player.statistics`;
                console.log(`   Testing /squads/seasons/${seasonId}/teams/${TEAM_ID}...`);
                const squadRes = await axios.get(squadUrl);
                console.log(`   ✅ Success! Found ${squadRes.data.data?.length} players.`);

                if (squadRes.data.data?.length > 0) {
                    const p = squadRes.data.data[0].player;
                    console.log("   Sample Player:", p?.common_name);
                    console.log("   Has Stats?", !!p?.statistics);
                }
            } else {
                console.log("   ⚠️ No active seasons found.");
            }
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

    } catch (error) {
        console.error("Fatal Error:", error.message);
    }
};

run();
