import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427590; // Man City vs Fulham (7 home corners, 2 away corners)
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Commentary for Corner Data - Match ${MATCH_ID}\n`);

        const url = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=comments;participants;statistics.type`;
        const res = await axios.get(url);
        const data = res.data.data;

        // Get participants
        const participants = data.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        console.log("=".repeat(60));
        console.log("📊 MATCH INFO");
        console.log("=".repeat(60));
        console.log(`Home: ${home?.name} (ID: ${home?.id})`);
        console.log(`Away: ${away?.name} (ID: ${away?.id})`);

        // Get corner stats for validation
        const stats = data.statistics || [];
        const cornerStats = stats.filter(s => s.type?.name?.toLowerCase().includes('corner'));
        console.log("\n📈 Expected Corners (from statistics):");
        cornerStats.forEach(s => {
            const team = s.participant_id === home?.id ? 'HOME' : 'AWAY';
            console.log(`   ${team}: ${s.data?.value} corners`);
        });

        // Check commentaries
        console.log("\n" + "=".repeat(60));
        console.log("💬 COMMENTS ANALYSIS");
        console.log("=".repeat(60));

        const comments = data.commentaries || []; // Assuming 'commentaries' field is the source for 'comments'
        console.log(`\nTotal Comments: ${comments.length}`);

        if (comments.length === 0) {
            console.log("❌ No comments found!");
            return;
        }

        // Filter for corners
        const cornerComments = comments.filter(c => {
            const text = c.comment?.toLowerCase() || '';
            return text.includes('corner') || text.includes('escanteio');
        });

        console.log(`Corner-related Comments: ${cornerComments.length}`);

        if (cornerComments.length > 0) {
            console.log("\n✅ CORNER COMMENTS FOUND!\n");

            console.log("📋 All Corner Comments:");
            cornerComments.forEach((c, i) => {
                const minute = c.minute + (c.extra_minute ? `+${c.extra_minute}` : '');
                console.log(`\n${i + 1}. Min ${minute}`);
                console.log(`   Comment: ${c.comment}`);
                console.log(`   Important: ${c.is_important}`);
            });

            console.log("\n🔍 Sample Comment Structure:");
            console.log(JSON.stringify(cornerComments[0], null, 2));

            // Try to match with expected stats
            console.log("\n📊 Comparison with Statistics:");
            console.log(`   Expected: 7 home + 2 away = 9 total corners`);
            console.log(`   Found in comments: ${cornerComments.length} corner mentions`);

        } else {
            console.log("\n❌ No corner comments found");
            console.log("\nSample comments:");
            comments.slice(0, 10).forEach((c, i) => {
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
