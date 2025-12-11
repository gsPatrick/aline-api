import { fetchExternalMatchData } from './src/features/match/match.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCH_ID = 19556591; // Logged match ID

async function saveEventsDump() {
    console.log(`Fetching match ${MATCH_ID} for Dump...`);

    try {
        const rawData = await fetchExternalMatchData(MATCH_ID);
        const events = rawData.events || [];

        console.log(`Fetched ${events.length} events.`);

        const dumpData = {
            matchId: MATCH_ID,
            timestamp: new Date().toISOString(),
            eventsCount: events.length,
            events: events
        };

        const filePath = path.join(__dirname, 'events_dump.txt');
        await fs.writeFile(filePath, JSON.stringify(dumpData, null, 2));

        console.log(`✅ Dump saved to ${filePath}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

saveEventsDump();
