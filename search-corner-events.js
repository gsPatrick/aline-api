import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Searching for Premier League matches with corner events...\n`);

        // Get recent Premier League fixtures
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 30); // Last 30 days

        const formatDate = (d) => d.toISOString().split('T')[0];
        const start = formatDate(pastDate);
        const end = formatDate(today);

        // Premier League ID is 8
        const leagueId = 8;

        console.log(`Fetching fixtures from ${start} to ${end}...`);
        const fixturesUrl = `${BASE_URL}/fixtures/between/${start}/${end}?api_token=${API_TOKEN}&filters=fixtureLeagues:${leagueId}&include=league;state`;
        const resFixtures = await axios.get(fixturesUrl);
        const fixtures = resFixtures.data.data || [];

        // Filter for finished matches
        const finishedMatches = fixtures.filter(f => {
            const state = f.state?.state || f.state?.short_code;
            return state === 'FT' || state === 'AET' || state === 'FT_PEN';
        }).slice(0, 10); // Test first 10

        console.log(`Found ${finishedMatches.length} finished Premier League matches.\n`);
        console.log("=".repeat(60));
        console.log("Testing matches for corner events...");
        console.log("=".repeat(60));

        for (const match of finishedMatches) {
            console.log(`\n📊 Match ${match.id}: ${match.name}`);

            try {
                const url = `${BASE_URL}/fixtures/${match.id}?api_token=${API_TOKEN}&include=events.type;statistics.type`;
                const res = await axios.get(url);
                const data = res.data.data;

                const events = data.events || [];
                const stats = data.statistics || [];

                // Find corner events
                const cornerEvents = events.filter(e =>
                    e.type?.name?.toLowerCase().includes('corner') ||
                    e.type?.developer_name?.toLowerCase().includes('corner')
                );

                // Find corner stats
                const cornerStats = stats.filter(s =>
                    s.type?.name?.toLowerCase().includes('corner') ||
                    s.type?.developer_name?.toLowerCase().includes('corner')
                );

                const totalCorners = cornerStats.reduce((sum, s) => sum + (s.data?.value || 0), 0);

                console.log(`   Events: ${events.length} total, ${cornerEvents.length} corners`);
                console.log(`   Stats: ${totalCorners} total corners`);

                if (cornerEvents.length > 0) {
                    console.log(`\n   ✅ FOUND CORNER EVENTS!`);
                    console.log(`   Match ID: ${match.id}`);
                    console.log(`   Sample Event:`);
                    console.log(JSON.stringify(cornerEvents[0], null, 2));
                    break; // Found one!
                }
            } catch (e) {
                console.log(`   ❌ Error: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
};

run();
