import dotenv from 'dotenv';
dotenv.config();

import { fetchExternalMatchData } from './src/features/match/match.service.js';

const MATCH_ID = 19427630; // Crystal Palace vs Arsenal

async function testRawFetch() {
    try {
        console.log(`Fetching RAW external data for match ${MATCH_ID}...`);
        const token = process.env.SPORTMONKS_API_TOKEN;
        if (!token) throw new Error("Missing SPORTMONKS_API_TOKEN in .env");

        console.log("Token starts with:", token.substring(0, 5));

        const data = await fetchExternalMatchData(MATCH_ID, token);

        console.log('\n--- RAW DATA INSPECTION ---');

        // Check Participants
        if (data.participants && Array.isArray(data.participants)) {
            console.log(`Participants count: ${data.participants.length}`);
            data.participants.forEach(p => {
                console.log(`Participant: ID=${p.id}, Name=${p.name}, Location=${p.meta?.location}`);
            });
        } else {
            console.log('Participants missing or not an array');
        }

        // Check Statistics
        if (data.statistics && Array.isArray(data.statistics)) {
            console.log(`Statistics count: ${data.statistics.length}`);
            if (data.statistics.length > 0) {
                const stat = data.statistics[0];
                console.log('Sample stat:', JSON.stringify(stat, null, 2));
                console.log(`Sample stat participant_id: ${stat.participant_id} (Type: ${typeof stat.participant_id})`);
            } else {
                console.log('Statistics array is empty');
            }
        } else {
            console.log('Statistics missing or not an array');
        }

        // Check Events
        if (data.events && Array.isArray(data.events)) {
            console.log(`Events count: ${data.events.length}`);
            if (data.events.length > 0) {
                console.log('Sample event:', JSON.stringify(data.events[0], null, 2));
            }
        } else {
            console.log('Events missing or not an array');
        }

        // Check Lineups
        if (data.lineups && Array.isArray(data.lineups)) {
            console.log(`Lineups count: ${data.lineups.length}`);
            if (data.lineups.length > 0) {
                console.log('Sample lineup item:', JSON.stringify(data.lineups[0], null, 2));
            }
        } else {
            console.log('Lineups missing or not an array');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

testRawFetch();
