import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427590;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Commentary Include Variations for Match ${MATCH_ID}\n`);

        const includeVariations = [
            'commentaries',
            'commentary',
            'comments',
            'comment',
            'livescores.commentaries',
            'timeline'
        ];

        for (const inc of includeVariations) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Testing: include=${inc}`);
            console.log('='.repeat(60));

            try {
                const url = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=${inc}`;
                const res = await axios.get(url);
                const data = res.data.data;

                console.log(`✅ Success!`);

                // Check for commentary-like data
                const possibleKeys = Object.keys(data).filter(k =>
                    k.toLowerCase().includes('comment') ||
                    k.toLowerCase().includes('timeline') ||
                    k.toLowerCase().includes('live')
                );

                if (possibleKeys.length > 0) {
                    console.log(`\n📋 Found keys: ${possibleKeys.join(', ')}`);
                    possibleKeys.forEach(key => {
                        const value = data[key];
                        if (Array.isArray(value)) {
                            console.log(`   ${key}: Array with ${value.length} items`);
                            if (value.length > 0) {
                                console.log(`   Sample item:`, JSON.stringify(value[0], null, 2));
                            }
                        }
                    });
                }

            } catch (e) {
                console.log(`❌ Failed: ${e.message}`);
            }
        }

        // Try as separate endpoint
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: /commentaries/fixtures/${MATCH_ID}`);
        console.log('='.repeat(60));

        try {
            const url = `${BASE_URL}/commentaries/fixtures/${MATCH_ID}?api_token=${API_TOKEN}`;
            const res = await axios.get(url);
            console.log(`✅ Success! Found ${res.data.data?.length || 0} commentaries`);

            if (res.data.data && res.data.data.length > 0) {
                console.log(`\nSample commentary:`);
                console.log(JSON.stringify(res.data.data[0], null, 2));
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
};

run();
