import dotenv from 'dotenv';
import { fetchExternalMatchData, calculateMatchStats } from './src/features/match/match.service.js';

dotenv.config();

const MATCH_ID = process.argv[2] || '19568578'; // Default to the debug ID we saw earlier

async function run() {
    console.log(`Fetching match ${MATCH_ID}...`);
    try {
        const rawData = await fetchExternalMatchData(MATCH_ID);
        console.log('--- RAW DATA KEYS ---');
        console.log(Object.keys(rawData));

        console.log('--- RAW STATE ---');
        console.log(JSON.stringify(rawData.state, null, 2));

        console.log('--- RAW SCORES/PARTICIPANTS ---');
        if (rawData.scores) console.log('Scores Array:', JSON.stringify(rawData.scores, null, 2));

        if (rawData.participants) {
            rawData.participants.forEach(p => {
                console.log(`Participant: ${p.id} - ${p.name} (${p.meta?.location})`);
                // Check common score fields
                console.log('  Meta:', p.meta);
            });
        }

        console.log('--- CALCULATING STATS ---');
        const processed = calculateMatchStats(rawData);

        console.log('--- ENRICHED MATCH INFO ---');
        console.log('State:', processed.matchInfo.state);
        console.log('Score String:', processed.matchInfo.score);
        console.log('Status (raw string):', processed.matchInfo.status);

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

run();
