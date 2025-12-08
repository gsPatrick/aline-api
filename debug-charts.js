import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Testing Commentary Fetch for Fixture ${FIXTURE_ID}...`);

        // Try singular
        try {
            console.log("1. Trying include=commentary...");
            const res1 = await axios.get(`${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=commentary`);
            console.log("   ✅ Success! Commentary Count:", res1.data.data.commentary?.length || 0);
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

        // Try plural
        try {
            console.log("2. Trying include=commentaries...");
            const res2 = await axios.get(`${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=commentaries`);
            console.log("   ✅ Success! Commentaries Count:", res2.data.data.commentaries?.length || 0);
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

    } catch (error) {
        console.error("Fatal Error:", error.message);
    }
};

run();
