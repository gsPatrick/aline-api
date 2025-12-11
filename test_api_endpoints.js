
import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const BASE_URL = 'https://api.sportmonks.com/v3/football';
const LEAGUE_ID = 8; // Premier League

async function testEndpoints() {
    try {
        console.log('Testing League Details (for current_round_id)...');
        const leagueRes = await axios.get(`${BASE_URL}/leagues/${LEAGUE_ID}`, {
            params: {
                api_token: API_TOKEN,
                include: 'currentSeason'
            }
        });

        const currentSeason = leagueRes.data.data.currentseason;
        console.log('Current Season ID:', currentSeason?.id);
        console.log('Current Round ID in Season:', currentSeason?.current_round_id);

        let currentRoundId = currentSeason?.current_round_id;

        // Simulating the service logic
        console.log('Fetching Season details with rounds...');
        const seasonRes = await axios.get(`${BASE_URL}/seasons/${currentSeason.id}`, {
            params: {
                api_token: API_TOKEN,
                include: 'rounds'
            }
        });

        const rounds = seasonRes.data.data.rounds || [];
        console.log('Rounds fetched:', rounds.length);

        currentRoundId = null; // Resetting to apply new logic
        const current = rounds.find(r => r.is_current);
        if (current) {
            console.log('Found current round (is_current):', current.id);
            currentRoundId = current.id;
        } else {
            console.log('No is_current round. Trying date fallback...');
            const today = new Date().toISOString().split('T')[0];
            const roundByDate = rounds.find(r => r.start <= today && r.end >= today);
            if (roundByDate) {
                console.log('Found round by date:', roundByDate.id);
                currentRoundId = roundByDate.id;
            } else {
                console.log('Fallback to last round');
                if (rounds.length) currentRoundId = rounds[rounds.length - 1].id;
            }
        }

        if (currentRoundId) {
            console.log(`Fetching Fixtures for Round ${currentRoundId}...`);
            const fixturesRes = await axios.get(`${BASE_URL}/fixtures/rounds/${currentRoundId}`, {
                params: { api_token: API_TOKEN, include: 'participants;round' }
            });
            console.log('Fixtures found:', fixturesRes.data.data?.length);
            if (fixturesRes.data.data?.length > 0) {
                console.log('First fixture:', fixturesRes.data.data[0].name);
            }
        }

        console.log('\nTesting Team of the Week (Latest for League)...');
        try {
            const totwRes = await axios.get(`${BASE_URL}/team-of-the-week/leagues/${LEAGUE_ID}/latest`, {
                params: {
                    api_token: API_TOKEN,
                    include: 'player;team'
                }
            });
            console.log('TOTW Found:', !!totwRes.data.data);
            if (totwRes.data.data) {
                // If it's an array or object
                const data = Array.isArray(totwRes.data.data) ? totwRes.data.data[0] : totwRes.data.data;
                console.log('TOTW Data Type:', typeof totwRes.data.data);
                console.log('TOTW Keys:', Object.keys(data || {}));
                fs.writeFileSync('totw_response.json', JSON.stringify(totwRes.data, null, 2));
            }
        } catch (e) {
            console.error('TOTW Error:', e.response?.data?.message || e.message);
            console.error('TOTW Error Status:', e.response?.status);
        }

    } catch (error) {
        console.error('General Error:', error.response?.data?.message || error.message);
    }
}

testEndpoints();
