import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427586; // Arsenal vs Brentford with 12 corners
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Investigating Corner Events for Match ${MATCH_ID}...\n`);

        // Test different event includes
        const includes = [
            'events',
            'events.type',
            'events.detail',
            'statistics',
            'statistics.type'
        ];

        for (const inc of includes) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Testing: include=${inc}`);
            console.log('='.repeat(60));

            try {
                const url = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=${inc}`;
                const res = await axios.get(url);
                const data = res.data.data;

                if (inc.includes('events')) {
                    const events = data.events || [];
                    console.log(`\n📊 Total Events: ${events.length}`);

                    if (events.length > 0) {
                        // Get all unique event types
                        const types = [...new Set(events.map(e => {
                            if (e.type?.name) return e.type.name;
                            if (e.type) return JSON.stringify(e.type);
                            return 'NO_TYPE';
                        }))];

                        console.log(`\n📋 Event Types Found:`);
                        types.forEach(t => console.log(`   - ${t}`));

                        // Show first event structure
                        console.log(`\n🔍 First Event Structure:`);
                        console.log(JSON.stringify(events[0], null, 2));
                    }
                }

                if (inc.includes('statistics')) {
                    const stats = data.statistics || [];
                    console.log(`\n📊 Total Statistics: ${stats.length}`);

                    // Find corner stats
                    const cornerStats = stats.filter(s =>
                        s.type?.name?.toLowerCase().includes('corner') ||
                        s.type?.developer_name?.toLowerCase().includes('corner')
                    );

                    if (cornerStats.length > 0) {
                        console.log(`\n🎯 Corner Statistics Found:`);
                        cornerStats.forEach(s => {
                            console.log(JSON.stringify(s, null, 2));
                        });
                    } else {
                        console.log(`\n⚠️ No corner statistics found`);
                        // Show all stat types
                        const statTypes = [...new Set(stats.map(s => s.type?.name || 'NO_TYPE'))];
                        console.log(`\nAll Stat Types: ${statTypes.join(', ')}`);
                    }
                }

            } catch (e) {
                console.log(`❌ Failed: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
};

run();
