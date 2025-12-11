
import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const TOKEN = "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh"; // Using the token from the file

const MATCH_ID = 19568578;

async function debugMatch() {
    try {
        console.log(`Fetching match ${MATCH_ID}...`);
        const matchUrl = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${TOKEN}&include=participants;scores;statistics;events;lineups`;
        const matchRes = await axios.get(matchUrl);
        const matchData = matchRes.data.data;

        const homeId = matchData.participants.find(p => p.meta.location === 'home').id;
        const awayId = matchData.participants.find(p => p.meta.location === 'away').id;

        console.log(`Home ID: ${homeId}, Away ID: ${awayId}`);

        console.log(`Fetching H2H for ${homeId} vs ${awayId}...`);
        const h2hUrl = `${BASE_URL}/fixtures/head-to-head/${homeId}/${awayId}?api_token=${TOKEN}&include=participants;scores;statistics.type&limit=10`;
        const h2hRes = await axios.get(h2hUrl);
        const h2hMatches = h2hRes.data.data;

        console.log(`Found ${h2hMatches.length} H2H matches`);

        const output = {
            match: matchData,
            h2h: h2hMatches
        };

        fs.writeFileSync('match_19568578_debug.json', JSON.stringify(output, null, 2));
        console.log('Debug data saved to match_19568578_debug.json');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugMatch();
