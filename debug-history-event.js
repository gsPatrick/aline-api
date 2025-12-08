import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462; // Use the main fixture as we know it has data
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Fetching fixture ${FIXTURE_ID}...`);
        // Try 'timeline' include which often has detailed events
        const url = `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=timeline;events.type;statistics.type;participants`;

        const res = await axios.get(url);
        const data = res.data.data;

        console.log("Match:", data.name);

        // Check Participants
        const participants = data.participants || [];
        console.log("Participants:", participants.map(p => ({ id: p.id, name: p.name, location: p.meta?.location })));

        // Check Stats
        const stats = data.statistics || [];
        console.log("\nStats Count:", stats.length);
        const goalStats = stats.filter(s => s.type?.name === 'Goals' || s.type?.name === 'Goal');
        console.log("Goal Stats:", JSON.stringify(goalStats, null, 2));

        // Check Events
        const events = data.events || [];
        console.log("\nEvents Count:", events.length);

        // Group events by type
        const eventTypes = {};
        events.forEach(e => {
            const typeName = e.type?.name || 'Unknown';
            if (!eventTypes[typeName]) eventTypes[typeName] = 0;
            eventTypes[typeName]++;
        });
        console.log("Event Types Distribution:", eventTypes);

        // Check Corner Events specifically
        const corners = events.filter(e => e.type?.name === 'Corner' || e.type?.name === 'Corners');
        console.log("Corner Events Found:", corners.length);
        if (corners.length > 0) {
            console.log("Sample Corner:", JSON.stringify(corners[0], null, 2));
        }

        // Check Goal Events specifically
        const goals = events.filter(e => e.type?.name === 'Goal');
        console.log("Goal Events Found:", goals.length);
        if (goals.length > 0) {
            console.log("Sample Goal:", JSON.stringify(goals[0], null, 2));
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
};

run();
