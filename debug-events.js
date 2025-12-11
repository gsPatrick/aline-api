import { fetchExternalMatchData } from './src/features/match/match.service.js';

const MATCH_ID = 19556592; // Mirassol vs Flamengo (or active match)

async function debugEvents() {
    console.log(`Fetching match ${MATCH_ID} using Service...`);

    try {
        // fetchExternalMatchData handles auth internally
        const rawData = await fetchExternalMatchData(MATCH_ID);

        console.log('\n--- EVENTS DATA ---');
        // fetchExternalMatchData returns mergedData which puts events in 'events' key
        const events = rawData.events || [];
        console.log(`Total Events: ${events.length}`);

        if (events.length === 0) {
            console.log('⚠️ Events array is empty!');
        } else {
            console.log(`Found ${events.length} events. Showing first 10:\n`);
            events.slice(0, 10).forEach((e, i) => {
                const typeName = e.type?.name || e.type;
                console.log(`[${i}] ${e.minute}' - ${typeName} (Team: ${e.participant_id})`);
                console.log(`    Player: ${e.player_name || e.player?.common_name || e.player?.name}`);
                console.log(`    Type Raw: ${JSON.stringify(e.type)}`);
            });

            console.log('\n--- ALL UNIQUE TYPES ---');
            const types = new Set(events.map(e => {
                if (typeof e.type === 'object') return e.type.name;
                return e.type;
            }));
            console.log(Array.from(types));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugEvents();
