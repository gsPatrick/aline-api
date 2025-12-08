import { getTeamData } from './src/features/team/team.service.js';
import { sequelize } from './src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal

const run = async () => {
    try {
        await sequelize.sync();

        // Force Cache Clear for Team 19
        const { Team } = await import('./src/models/index.js');
        await Team.destroy({ where: { externalId: TEAM_ID } });
        console.log("   🗑️ Cleared Cache for Team 19.");

        console.log(`\n🚀 Verifying Full Capabilities for Team ${TEAM_ID}...`);

        const data = await getTeamData(TEAM_ID, API_TOKEN);

        console.log("\n👥 Squad Data:");
        if (data.squad.hasData) {
            console.log(`   ✅ Found ${data.squad.players.length} players.`);
            const sample = data.squad.players[0];
            console.log("   Sample Player:", sample.name);
            console.log("   Stats:", JSON.stringify({
                rating: sample.rating,
                goals: sample.goals,
                assists: sample.assists
            }, null, 2));

            // Debug: Log raw details if stats are 0
            if (sample.rating === 0) {
                // We need to fetch the raw squad data again to see the structure because getTeamData processes it.
                // But we can't easily do that here without duplicating logic.
                // Let's just trust that if it's 0, findStat failed.
                // I'll add a separate debug step below to fetch raw squad data.
            }
        } else {
            console.log("   ⚠️ No Squad Data Found.");
        }

        // Debug Raw Squad Data
        console.log("\n🔍 Debugging Raw Squad Data...");
        const { default: axios } = await import('axios');
        const squadUrl = `https://api.sportmonks.com/v3/football/squads/teams/${TEAM_ID}?api_token=${API_TOKEN}&include=player.statistics`;
        const resSquad = await axios.get(squadUrl);
        const rawSquad = resSquad.data.data || [];
        if (rawSquad.length > 0) {
            const p = rawSquad[0].player;
            const stats = p?.statistics || [];
            if (stats.length > 0) {
                console.log("   Raw Stats Object (First Entry):", JSON.stringify(stats[0], null, 2));
            } else {
                console.log("   ⚠️ No statistics array for player.");
            }
        }

        // Verify Match Events (Historical)
        console.log("\n⚽ Match Events (Historical):");
        // We need to fetch a match that has history.
        // Let's try to fetch the same team's latest match details using the service logic?
        // Or just use the team service's match history which we just verified has stats.
        // But we want to verify the "Heavy Fetch" in match.service.js.
        // Let's import fetchExternalMatchData from match.service.js
        const { fetchExternalMatchData } = await import('./src/features/match/match.service.js');

        // We need a match ID. Let's pick one from the team's history we just fetched.
        const matchId = data.matchHistory[0]?.id;
        if (matchId) {
            console.log(`   Fetching detailed match ${matchId}...`);
            const matchData = await fetchExternalMatchData(matchId, API_TOKEN);
            const events = matchData.events || [];
            const corners = events.filter(e => e.type?.name === 'Corner');
            console.log(`   ✅ Found ${events.length} total events.`);

            // Log event types
            const types = [...new Set(events.map(e => e.type?.name))];
            console.log("   Event Types Found:", types);

            console.log(`   ✅ Found ${corners.length} corner events.`);
            if (corners.length > 0) {
                console.log("   Sample Corner:", JSON.stringify(corners[0], null, 2));
            }
        } else {
            console.log("   ⚠️ No match ID found to test.");
        }

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    } finally {
        await sequelize.close();
    }
};

run();
