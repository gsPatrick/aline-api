import axios from 'axios';
import fs from 'fs';

/**
 * Debug script to fetch actual match data from our API
 * and inspect the detailedHistory structure
 */

const MATCH_ID = 19556591; // The match being viewed
const API_URL = `http://127.0.0.1:3333/api/matches/${MATCH_ID}/analysis`;

async function debugMatchData() {
    try {
        console.log(`Fetching match ${MATCH_ID} from local API...`);
        const response = await axios.get(API_URL);
        const data = response.data;

        console.log('\n=== MATCH INFO ===');
        console.log('Home Team:', data.homeTeam?.name, '(ID:', data.homeTeam?.id, ')');
        console.log('Away Team:', data.awayTeam?.name, '(ID:', data.awayTeam?.id, ')');

        console.log('\n=== HOME TEAM DETAILED HISTORY ===');
        const homeHistory = data.homeTeam?.detailedHistory || [];
        console.log('Count:', homeHistory.length);
        if (homeHistory.length > 0) {
            console.log('\nFirst match in history:');
            console.log(JSON.stringify(homeHistory[0], null, 2));
        }

        console.log('\n=== AWAY TEAM DETAILED HISTORY ===');
        const awayHistory = data.awayTeam?.detailedHistory || [];
        console.log('Count:', awayHistory.length);
        if (awayHistory.length > 0) {
            console.log('\nFirst match in history:');
            console.log(JSON.stringify(awayHistory[0], null, 2));
        }

        console.log('\n=== H2H DATA ===');
        const h2h = data.h2h;
        console.log('H2H matches:', h2h?.matches?.length || 0);
        if (h2h?.matches?.length > 0) {
            console.log('\nFirst H2H match:');
            console.log(JSON.stringify(h2h.matches[0], null, 2));
        }

        // Save individual sections for easier analysis
        fs.writeFileSync('h2h_home_history_dump.json', JSON.stringify(homeHistory, null, 2));
        fs.writeFileSync('h2h_away_history_dump.json', JSON.stringify(awayHistory, null, 2));
        fs.writeFileSync('h2h_h2h_dump.json', JSON.stringify(h2h, null, 2));

        console.log('\n✅ Dumps saved to h2h_*_dump.json files');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

debugMatchData();
