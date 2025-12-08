import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Investigating Squad Stats Structure for Team ${TEAM_ID}...\n`);

        // Test different includes to find where stats are
        const includeOptions = [
            'player',
            'player.statistics',
            'player.statistics.details',
            'player.statistics.type',
            'player.statistics.season'
        ];

        for (const inc of includeOptions) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Testing: include=${inc}`);
            console.log('='.repeat(60));

            try {
                const url = `${BASE_URL}/squads/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=${inc}`;
                const res = await axios.get(url);
                const squad = res.data.data || [];

                if (squad.length > 0) {
                    const firstPlayer = squad[0].player;
                    console.log(`\n✅ Player Name: ${firstPlayer?.common_name || firstPlayer?.display_name}`);

                    if (firstPlayer?.statistics) {
                        console.log(`📊 Statistics Array Length: ${firstPlayer.statistics.length}`);

                        if (firstPlayer.statistics.length > 0) {
                            const firstStat = firstPlayer.statistics[0];
                            console.log(`\n📋 First Statistics Object:`);
                            console.log(JSON.stringify(firstStat, null, 2));

                            // Check if details exist
                            if (firstStat.details) {
                                console.log(`\n✨ DETAILS FOUND!`);
                                console.log(JSON.stringify(firstStat.details, null, 2));
                            }
                        }
                    } else {
                        console.log(`⚠️ No statistics property found`);
                    }
                }
            } catch (e) {
                console.log(`❌ Failed: ${e.message}`);
            }
        }

        // Now test with detailed statistics include
        console.log(`\n${'='.repeat(60)}`);
        console.log(`FINAL TEST: Full Include Chain`);
        console.log('='.repeat(60));

        const fullUrl = `${BASE_URL}/squads/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=player.statistics.details.type`;
        const fullRes = await axios.get(fullUrl);
        const fullSquad = fullRes.data.data || [];

        if (fullSquad.length > 0) {
            const p = fullSquad[0].player;
            console.log(`\n✅ Player: ${p?.common_name}`);

            if (p?.statistics && p.statistics.length > 0) {
                const stat = p.statistics[0];
                console.log(`\n📊 Full Statistics Object:`);
                console.log(JSON.stringify(stat, null, 2));
            }
        }

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
};

run();
