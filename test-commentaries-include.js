import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427586;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Commentaries Include on Fixtures Endpoint\n`);

        const includes = [
            'events.type;statistics.type;participants',
            'events.type;statistics.type;participants;commentaries',
            'events.type;statistics.type;participants;comments'
        ];

        for (const inc of includes) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Testing: include=${inc}`);
            console.log('='.repeat(60));

            try {
                const url = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=${inc}`;
                const res = await axios.get(url);
                console.log(`✅ Success!`);

                const data = res.data.data;
                console.log(`   Events: ${data.events?.length || 0}`);
                console.log(`   Statistics: ${data.statistics?.length || 0}`);
                console.log(`   Participants: ${data.participants?.length || 0}`);
                console.log(`   Commentaries: ${data.commentaries?.length || 0}`);
                console.log(`   Comments: ${data.comments?.length || 0}`);

            } catch (e) {
                console.log(`❌ Failed: ${e.response?.status} - ${e.message}`);
            }
        }

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
};

run();
