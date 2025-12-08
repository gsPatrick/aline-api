import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427590; // Man City vs Fulham - Premier League
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Corner Events for Match ${MATCH_ID} (Man City vs Fulham)\n`);

        const url = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=events.type;statistics.type;participants`;
        const res = await axios.get(url);
        const data = res.data.data;

        console.log("=".repeat(60));
        console.log("📊 MATCH INFO");
        console.log("=".repeat(60));
        const participants = data.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');
        console.log(`Home: ${home?.name} (ID: ${home?.id})`);
        console.log(`Away: ${away?.name} (ID: ${away?.id})`);

        // Check Events
        console.log("\n" + "=".repeat(60));
        console.log("🎯 CORNER EVENTS");
        console.log("=".repeat(60));

        const events = data.events || [];
        console.log(`\nTotal Events: ${events.length}`);

        // Find corner events
        const cornerEvents = events.filter(e =>
            e.type?.name === 'Corner' ||
            e.type?.name === 'Corners' ||
            e.type?.developer_name === 'CORNER' ||
            e.type?.developer_name === 'CORNERS'
        );

        console.log(`Corner Events Found: ${cornerEvents.length}`);

        if (cornerEvents.length > 0) {
            console.log("\n✅ CORNER EVENTS EXIST!\n");
            console.log("First 5 Corner Events:");
            cornerEvents.slice(0, 5).forEach((e, i) => {
                const team = e.participant_id === home?.id ? 'HOME' : 'AWAY';
                console.log(`   ${i + 1}. Min ${e.minute}${e.extra_minute ? `+${e.extra_minute}` : ''} - ${team} (${e.participant_id})`);
            });

            console.log(`\n📋 Corner Event Structure (First Event):`);
            console.log(JSON.stringify(cornerEvents[0], null, 2));

            console.log(`\n🔢 Corner Type ID: ${cornerEvents[0].type_id}`);
            console.log(`🔢 Corner Type Name: ${cornerEvents[0].type?.name}`);
            console.log(`🔢 Corner Developer Name: ${cornerEvents[0].type?.developer_name}`);
        } else {
            console.log("\n❌ No corner events found");

            // Show all event types
            const types = [...new Set(events.map(e => e.type?.name))];
            console.log(`\nEvent types present: ${types.join(', ')}`);
        }

        // Check Statistics
        console.log("\n" + "=".repeat(60));
        console.log("📈 CORNER STATISTICS");
        console.log("=".repeat(60));

        const stats = data.statistics || [];
        const cornerStats = stats.filter(s =>
            s.type?.name?.toLowerCase().includes('corner') ||
            s.type?.developer_name?.toLowerCase().includes('corner')
        );

        if (cornerStats.length > 0) {
            console.log("\n✅ Corner Statistics:");
            cornerStats.forEach(s => {
                const team = s.participant_id === home?.id ? 'HOME' : 'AWAY';
                console.log(`   ${team}: ${s.data?.value} corners`);
            });
        }

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
};

run();
