import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Fetching events for fixture ${FIXTURE_ID}...`);
        const url = `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=events.type;participants`;

        const res = await axios.get(url);
        const events = res.data.data.events || [];
        const participants = res.data.data.participants || [];

        console.log(`Found ${events.length} events.`);

        // Log sample events with minutes
        const samples = events.slice(0, 10).map(e => ({
            type: e.type?.name,
            minute: e.minute,
            participant_id: e.participant_id,
            team: participants.find(p => p.id === e.participant_id)?.name
        }));

        console.log("\nSample Events:", JSON.stringify(samples, null, 2));

        // Check for Shots specifically
        const shots = events.filter(e => e.type?.name?.includes('Shot') || e.type?.name === 'Goal');
        console.log(`\nFound ${shots.length} Shot/Goal events.`);
        if (shots.length > 0) {
            console.log("Sample Shot:", JSON.stringify(shots[0], null, 2));
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
};

run();
