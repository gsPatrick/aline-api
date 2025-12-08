import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Fetching fixture ${FIXTURE_ID} stats...`);
        const url = `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=statistics.type`;

        const res = await axios.get(url);
        const stats = res.data.data.statistics || [];

        console.log(`Found ${stats.length} stats.`);

        // Log all unique stat names
        const uniqueStats = [...new Set(stats.map(s => s.type?.name))];
        console.log("\nAvailable Stat Names:", uniqueStats.sort());

        // Log specific samples for missing ones
        const samples = stats.filter(s =>
            s.type?.name.includes("Possession") ||
            s.type?.name.includes("Box")
        );

        console.log("\nDetailed Samples for Possession/Box:", JSON.stringify(samples.map(s => ({
            name: s.type?.name,
            dev_name: s.type?.developer_name,
            value: s.data?.value || s.value
        })), null, 2));

    } catch (error) {
        console.error("Error:", error.message);
    }
};

run();
