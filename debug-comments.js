import { fetchExternalMatchData } from './src/features/match/match.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCH_ID = 19556592;

async function debugComments() {
    console.log(`Fetching match ${MATCH_ID} for Comments...`);

    try {
        const rawData = await fetchExternalMatchData(MATCH_ID);

        // Check if comments exist (SportMonks uses 'comments' or 'commentaries')
        // The service usually merges 'events' but not 'comments' into top level?
        // Let's check the raw AXIOS calls in match.service.js
        // It fetches 'events.type' but NOT 'comments' in the MAIN call.
        // Wait, line 946: `include=events.type;statistics.type;participants;comments;...` 
        // THAT IS FOR HISTORICAL DATA (DetailedMatch).

        // The main match fetch (line 826) DOES NOT INCLUDE COMMENTS.
        // It includes: participants;state;scores, statistics.type, league, venue, odds, referees, events.type, lineups.player.

        console.log('Checking main match data for comments...');
        console.log('Keys:', Object.keys(rawData));

        // If comments are missing, we might need to add them to the main fetch.
        if (!rawData.comments) {
            console.log('❌ Comments not found in main match data.');
        } else {
            console.log(`✅ Found ${rawData.comments.length} comments.`);
            const corners = rawData.comments.filter(c => c.comment?.toLowerCase().includes('corner'));
            console.log(`Found ${corners.length} corner comments.`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugComments();
