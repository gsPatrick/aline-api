import axios from 'axios';
import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const FIXTURE_ID = 19568462;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`Fetching fixture ${FIXTURE_ID} using integrated service...`);

        const mergedData = await fetchExternalMatchData(FIXTURE_ID, API_TOKEN);

        console.log("✅ Data fetched successfully!");
        console.log("Match:", mergedData.name);

        // Check main fixture events
        const mainEvents = mergedData.events || [];
        const mainEventTypes = mainEvents.map(e => e.type?.name).filter((v, i, a) => a.indexOf(v) === i);
        console.log("DEBUG: Main Fixture Event Types:", JSON.stringify(mainEventTypes));

        console.log("Home History:", mergedData.homeTeam?.latest?.length);
        console.log("Away History:", mergedData.awayTeam?.latest?.length);

        console.log("\nCalculating Stats...");
        const stats = calculateMatchStats(mergedData);

        console.log("FULL STATS:", JSON.stringify(stats, null, 2));

        if (stats.cornerAnalysis) {
            console.log("\n✅ Corner Analysis Generated!");
            console.log("--- Home Team (Last 10 Home) ---");
            console.log("Avg For:", stats.cornerAnalysis.home.avgFor);
            console.log("Avg Against:", stats.cornerAnalysis.home.avgAgainst);
            console.log("Races:", JSON.stringify(stats.cornerAnalysis.home.races));
            console.log("Trends:", JSON.stringify(stats.cornerAnalysis.home.trends));

            console.log("\n--- Away Team (Last 10 Away) ---");
            console.log("Avg For:", stats.cornerAnalysis.away.avgFor);
            console.log("Avg Against:", stats.cornerAnalysis.away.avgAgainst);
            console.log("Races:", JSON.stringify(stats.cornerAnalysis.away.races));

            // Log a sample interval
            console.log("\nSample Interval (0-10):", JSON.stringify(stats.cornerAnalysis.home.intervals['0-10']));
        } else {
            console.log("\n❌ Corner Analysis Missing!");
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
    }
};

run();
