import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

/**
 * Debug script to fetch team's last matches - Attempt 2
 * Using different endpoints and filters
 */

// Flamengo ID = 624, Cruz Azul = ?
const TEAM_ID = 624;

async function debugTeamMatches() {
    try {
        console.log(`\n=== Fetching last matches for team ${TEAM_ID} ===\n`);

        // 1. First get team info to understand available includes
        console.log('>>> Getting team info...');
        const teamUrl = `${BASE_URL}/teams/${TEAM_ID}?api_token=${token}`;
        const teamRes = await axios.get(teamUrl);
        console.log('Team found:', teamRes.data.data.name);

        // 2. Try fixtures with participants filter
        console.log('\n>>> Trying fixtures with participants filter...');
        try {
            // According to SportMonks docs, use filters=participantIds:624
            const url = `${BASE_URL}/fixtures?api_token=${token}&filters=participantIds:${TEAM_ID}&include=participants;scores;league;statistics.type&per_page=15`;
            console.log('URL:', url);
            const res = await axios.get(url);
            console.log('✅ SUCCESS! Fixtures count:', res.data.data?.length || 0);

            if (res.data.data?.length > 0) {
                console.log('\n=== FIRST FIXTURE ===');
                console.log(JSON.stringify(res.data.data[0], null, 2));

                // Save full response
                fs.writeFileSync('team_fixtures_v2_dump.json', JSON.stringify(res.data, null, 2));
                console.log('\n✅ Full dump saved to team_fixtures_v2_dump.json');
                return;
            }
        } catch (e) {
            console.log('❌ Failed:', e.message);
            if (e.response) {
                console.log('Response:', JSON.stringify(e.response.data, null, 2));
            }
        }

        // 3. Try using filterByParticipants
        console.log('\n>>> Trying fixtures with filterByParticipants...');
        try {
            const url = `${BASE_URL}/fixtures?api_token=${token}&filterByParticipants=${TEAM_ID}&include=participants;scores;league;statistics.type&per_page=15`;
            const res = await axios.get(url);
            console.log('✅ SUCCESS! Fixtures count:', res.data.data?.length || 0);

            if (res.data.data?.length > 0) {
                console.log(JSON.stringify(res.data.data[0], null, 2));
                fs.writeFileSync('team_fixtures_v3_dump.json', JSON.stringify(res.data, null, 2));
                return;
            }
        } catch (e) {
            console.log('❌ Failed:', e.message);
        }

        // 4. Try teams/{id}/fixtures 
        console.log('\n>>> Trying teams/{id}/fixtures...');
        try {
            const url = `${BASE_URL}/teams/${TEAM_ID}/fixtures?api_token=${token}&include=participants;scores;league;statistics.type&per_page=15`;
            const res = await axios.get(url);
            console.log('✅ SUCCESS! Fixtures count:', res.data.data?.length || 0);
            fs.writeFileSync('team_fixtures_v4_dump.json', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.log('❌ Failed:', e.message);
        }

        // 5. Try fixtures by season for team (if we have season ID)
        console.log('\n>>> Trying fixtures/between for upcoming from today back...');
        try {
            // Get fixtures for last 60 days
            const today = new Date();
            const past = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
            const startDate = past.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];

            const url = `${BASE_URL}/fixtures/between/${startDate}/${endDate}?api_token=${token}&filters=participantIds:${TEAM_ID}&include=participants;scores;league;statistics.type`;
            console.log('URL:', url);
            const res = await axios.get(url);
            console.log('✅ SUCCESS! Fixtures count:', res.data.data?.length || 0);

            if (res.data.data?.length > 0) {
                console.log('\n=== SAMPLE FIXTURE ===');
                console.log(JSON.stringify(res.data.data[0], null, 2));
                fs.writeFileSync('team_fixtures_between_dump.json', JSON.stringify(res.data, null, 2));
                return;
            }
        } catch (e) {
            console.log('❌ Failed:', e.message);
            if (e.response) {
                console.log('Response:', JSON.stringify(e.response.data, null, 2));
            }
        }

        console.log('\n❌ Could not find team fixtures');

    } catch (error) {
        console.error('General Error:', error.message);
    }
}

debugTeamMatches();
