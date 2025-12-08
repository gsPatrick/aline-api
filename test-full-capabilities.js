import { getTeamData } from './src/features/team/team.service.js';
import { fetchExternalMatchData } from './src/features/match/match.service.js';
import { sequelize } from './src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const TEAM_ID = 19; // Arsenal

const run = async () => {
    try {
        await sequelize.sync();

        // Force Cache Clear
        const { Team } = await import('./src/models/index.js');
        await Team.destroy({ where: { externalId: TEAM_ID } });
        console.log("🗑️ Cleared Cache.\n");

        console.log(`🚀 Testing Full Capabilities for Team ${TEAM_ID}...\n`);

        // 1. Test Squad Stats
        console.log("=".repeat(60));
        console.log("1️⃣ SQUAD STATS TEST");
        console.log("=".repeat(60));

        const data = await getTeamData(TEAM_ID, API_TOKEN);

        if (data.squad.hasData) {
            console.log(`✅ Found ${data.squad.players.length} players.\n`);

            // Show top 5 players with stats
            const playersWithGoals = data.squad.players
                .filter(p => p.goals > 0)
                .sort((a, b) => b.goals - a.goals)
                .slice(0, 5);

            console.log("🔥 Top Scorers:");
            playersWithGoals.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.name}: ${p.goals} goals, ${p.assists} assists, Rating: ${p.rating}`);
            });

            if (playersWithGoals.length === 0) {
                console.log("   ⚠️ No players with goals found. Showing first 3 players:");
                data.squad.players.slice(0, 3).forEach((p, i) => {
                    console.log(`   ${i + 1}. ${p.name}: ${p.goals} goals, ${p.assists} assists, Rating: ${p.rating}`);
                });
            }
        } else {
            console.log("❌ No Squad Data Found.");
        }

        // 2. Test Corner Events
        console.log("\n" + "=".repeat(60));
        console.log("2️⃣ CORNER EVENTS TEST");
        console.log("=".repeat(60));

        // Find a match with corners
        console.log("\n🔍 Searching for a match with corners...");
        let matchWithCorners = null;

        for (const match of data.matchHistory.slice(0, 10)) {
            if (match.stats.corners > 5) {
                matchWithCorners = match;
                console.log(`✅ Found match with ${match.stats.corners} corners: ${match.opponent} (${match.date})`);
                break;
            }
        }

        if (matchWithCorners) {
            console.log(`\n📊 Fetching detailed events for match ${matchWithCorners.id}...`);
            const matchData = await fetchExternalMatchData(matchWithCorners.id, API_TOKEN);
            const events = matchData.events || [];
            const corners = events.filter(e => e.type?.name === 'Corner' || e.type?.name === 'Corners');

            console.log(`✅ Total Events: ${events.length}`);
            console.log(`✅ Corner Events: ${corners.length}`);

            if (corners.length > 0) {
                console.log(`\n🎯 Sample Corner Event:`);
                console.log(JSON.stringify(corners[0], null, 2));
            } else {
                // Log all event types to debug
                const types = [...new Set(events.map(e => e.type?.name))];
                console.log(`⚠️ No corner events found. Event types present: ${types.join(', ')}`);
            }
        } else {
            console.log("⚠️ No matches with corners found in recent history.");
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ TEST COMPLETE");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
};

run();
