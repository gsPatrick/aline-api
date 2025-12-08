import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Testing Referee Fetch for Fixture ${FIXTURE_ID}...`);

        try {
            console.log("Trying include=referees.referee...");
            const res = await axios.get(`${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=referees.referee`);
            const refs = res.data.data.referees || [];
            console.log("   ✅ Success! Referees Count:", refs.length);
            if (refs.length > 0) {
                console.log("   Sample Referee Entry:", JSON.stringify(refs[0], null, 2));
                // Check if nested referee data is present
                if (refs[0].referee) {
                    console.log("   ✅ Nested Referee Data Found!");
                    console.log("   Name:", refs[0].referee.common_name || refs[0].referee.fullname);
                } else {
                    console.log("   ❌ Nested Referee Data MISSING");
                }
            }
        } catch (e) {
            console.log("   ❌ Failed:", e.message);
        }

    } catch (error) {
        console.error("Fatal Error:", error.message);
    }
};

run();
