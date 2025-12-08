import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427590; // Man City vs Fulham (7 home corners, 2 away corners)
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Commentaries Endpoint for Corner Data - Match ${MATCH_ID}\n`);

        // Get match info first
        const matchUrl = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=participants;statistics.type`;
        const matchRes = await axios.get(matchUrl);
        const matchData = matchRes.data.data;

        const participants = matchData.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        console.log("=".repeat(60));
        console.log("📊 MATCH INFO");
        console.log("=".repeat(60));
        console.log(`Home: ${home?.name} (ID: ${home?.id})`);
        console.log(`Away: ${away?.name} (ID: ${away?.id})`);

        // Get corner stats for validation
        const stats = matchData.statistics || [];
        const cornerStats = stats.filter(s => s.type?.name?.toLowerCase().includes('corner'));
        console.log("\n📈 Expected Corners (from statistics):");
        cornerStats.forEach(s => {
            const team = s.participant_id === home?.id ? 'HOME' : 'AWAY';
            console.log(`   ${team}: ${s.data?.value} corners`);
        });

        // Get commentaries from separate endpoint
        console.log("\n" + "=".repeat(60));
        console.log("💬 COMMENTARIES ENDPOINT");
        console.log("=".repeat(60));

        const commUrl = `${BASE_URL}/commentaries/fixtures/${MATCH_ID}?api_token=${API_TOKEN}`;
        const commRes = await axios.get(commUrl);
        const commentaries = commRes.data.data || [];

        console.log(`\nTotal Commentaries: ${commentaries.length}`);

        if (commentaries.length === 0) {
            console.log("❌ No commentaries found!");
            return;
        }

        // Filter for corners
        const cornerComments = commentaries.filter(c => {
            const text = c.comment?.toLowerCase() || '';
            return text.includes('corner');
        });

        console.log(`Corner-related Commentaries: ${cornerComments.length}`);

        if (cornerComments.length > 0) {
            console.log("\n✅ CORNER COMMENTARIES FOUND!\n");

            console.log("📋 All Corner Commentaries:");
            cornerComments.forEach((c, i) => {
                const minute = c.minute + (c.extra_minute ? `+${c.extra_minute}` : '');
                console.log(`\n${i + 1}. Min ${minute}`);
                console.log(`   Comment: ${c.comment}`);
                console.log(`   Important: ${c.is_important}`);
                console.log(`   Goal: ${c.is_goal}`);
            });

            console.log("\n🔍 Sample Commentary Structure:");
            console.log(JSON.stringify(cornerComments[0], null, 2));

            // Try to match with expected stats
            console.log("\n📊 Comparison with Statistics:");
            console.log(`   Expected: 7 home + 2 away = 9 total corners`);
            console.log(`   Found in commentaries: ${cornerComments.length} corner mentions`);

            console.log("\n⚠️ Note: Commentaries may include multiple mentions per corner");
            console.log("   (e.g., 'corner kick', 'corner cleared', etc.)");

        } else {
            console.log("\n❌ No corner commentaries found");
            console.log("\nSample commentaries:");
            commentaries.slice(0, 10).forEach((c, i) => {
                console.log(`${i + 1}. Min ${c.minute}: ${c.comment?.substring(0, 80)}...`);
            });
        }

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
        }
    }
};

run();
