import axios from 'axios';
import fs from 'fs';

/**
 * Debug script to dump detailedHistory and h2h data structure
 * to understand what data is available for H2HTab
 */

const MATCH_ID = 19611366; // Current match being viewed
const API_URL = `http://127.0.0.1:3333/api/matches/${MATCH_ID}/analysis`;

async function debugH2HData() {
    try {
        console.log(`Fetching match ${MATCH_ID}...`);
        const response = await axios.get(API_URL);
        const data = response.data;

        console.log('\n=== MATCH INFO ===');
        console.log('Home Team:', data.homeTeam?.name);
        console.log('Away Team:', data.awayTeam?.name);

        // Check homeTeam.detailedHistory
        console.log('\n=== HOME TEAM DETAILED HISTORY ===');
        const homeHistory = data.homeTeam?.detailedHistory || [];
        console.log('Count:', homeHistory.length);

        if (homeHistory.length > 0) {
            const first = homeHistory[0];
            console.log('\nFirst match structure:');
            console.log('- id:', first.id);
            console.log('- starting_at:', first.starting_at);
            console.log('- league:', first.league);
            console.log('- participants:', first.participants?.length || 0, 'items');
            console.log('- scores:', first.scores?.length || 0, 'items');
            console.log('- statistics:', first.statistics?.length || 0, 'items');

            if (first.scores?.length > 0) {
                console.log('\nScores sample:');
                console.log(JSON.stringify(first.scores.slice(0, 3), null, 2));
            }

            if (first.participants?.length > 0) {
                console.log('\nParticipants sample:');
                console.log(JSON.stringify(first.participants, null, 2));
            }

            // Save full first match
            fs.writeFileSync('h2h_home_first_match.json', JSON.stringify(first, null, 2));
        }

        // Check h2h data
        console.log('\n=== H2H DATA ===');
        const h2h = data.h2h;
        console.log('Type:', typeof h2h);
        console.log('Keys:', h2h ? Object.keys(h2h) : 'null');
        console.log('Matches count:', h2h?.matches?.length || 0);

        if (h2h?.matches?.length > 0) {
            const firstH2H = h2h.matches[0];
            console.log('\nFirst H2H match structure:');
            console.log('- id:', firstH2H.id);
            console.log('- starting_at:', firstH2H.starting_at);
            console.log('- league:', firstH2H.league);
            console.log('- participants:', firstH2H.participants?.length || 0, 'items');
            console.log('- scores:', firstH2H.scores?.length || 0, 'items');

            // Save full h2h match
            fs.writeFileSync('h2h_first_h2h_match.json', JSON.stringify(firstH2H, null, 2));
        }

        console.log('\n✅ Debug files saved');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugH2HData();
