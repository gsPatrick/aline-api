import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

// Use a known season ID - let's try to get it from a match first
// Or use a Brazilian Serie A season
const SEASON_ID = 23614; // Example: Brazilian Serie A 2024

async function debugStandings() {
    try {
        console.log(`Fetching standings for season ${SEASON_ID}...`);
        const url = `${BASE_URL}/standings/seasons/${SEASON_ID}?api_token=${token}&include=participant;form;details`;
        console.log('URL:', url);

        const { data } = await axios.get(url);

        console.log('\n=== RAW RESPONSE ===');
        console.log('Data count:', data.data?.length || 0);

        if (data.data && data.data.length > 0) {
            console.log('\n=== FIRST ROW STRUCTURE ===');
            const first = data.data[0];
            console.log(JSON.stringify(first, null, 2));

            console.log('\n=== ALL KEYS ===');
            console.log(Object.keys(first));

            if (first.details) {
                console.log('\n=== DETAILS ARRAY ===');
                first.details.forEach(d => {
                    console.log(`  type_id: ${d.type_id}, value: ${d.value}`);
                });
            }
        }

        // Save full dump
        fs.writeFileSync('standings_dump.json', JSON.stringify(data, null, 2));
        console.log('\n✅ Full dump saved to standings_dump.json');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

debugStandings();
