import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427590;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const run = async () => {
    try {
        console.log(`\n🔍 Testing Corner Extraction Logic\n`);

        // Get match info
        const matchUrl = `${BASE_URL}/fixtures/${MATCH_ID}?api_token=${API_TOKEN}&include=participants;statistics.type`;
        const matchRes = await axios.get(matchUrl);
        const matchData = matchRes.data.data;

        const participants = matchData.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        console.log(`Home: ${home?.name} (ID: ${home?.id})`);
        console.log(`Away: ${away?.name} (ID: ${away?.id})`);

        // Get corner stats
        const stats = matchData.statistics || [];
        const homeCornerStat = stats.find(s => s.participant_id === home?.id && s.type?.name?.toLowerCase().includes('corner'));
        const awayCornerStat = stats.find(s => s.participant_id === away?.id && s.type?.name?.toLowerCase().includes('corner'));

        console.log(`\nExpected: ${homeCornerStat?.data?.value || 0} home + ${awayCornerStat?.data?.value || 0} away = ${(homeCornerStat?.data?.value || 0) + (awayCornerStat?.data?.value || 0)} total\n`);

        // Get commentaries
        const commUrl = `${BASE_URL}/commentaries/fixtures/${MATCH_ID}?api_token=${API_TOKEN}`;
        const commRes = await axios.get(commUrl);
        const commentaries = commRes.data.data || [];

        // FILTER LOGIC: Only actual corner awards
        const cornerAwards = commentaries.filter(c => {
            const text = c.comment?.toLowerCase() || '';
            // Match phrases that indicate a corner was AWARDED
            return (
                text.includes('corner awarded') ||
                text.includes('corner kick awarded') ||
                (text.startsWith('corner') && !text.includes('following')) ||
                text.match(/^.{0,20}has been awarded a corner/)
            );
        });

        console.log("=".repeat(60));
        console.log("✅ FILTERED CORNER AWARDS");
        console.log("=".repeat(60));
        console.log(`\nTotal: ${cornerAwards.length} corners\n`);

        cornerAwards.forEach((c, i) => {
            const minute = c.minute + (c.extra_minute ? `+${c.extra_minute}` : '');
            console.log(`${i + 1}. Min ${minute}: ${c.comment}`);
        });

        console.log("\n" + "=".repeat(60));
        console.log("📊 VALIDATION");
        console.log("=".repeat(60));
        console.log(`Expected: ${(homeCornerStat?.data?.value || 0) + (awayCornerStat?.data?.value || 0)} corners`);
        console.log(`Found: ${cornerAwards.length} corner awards`);
        console.log(`Match: ${cornerAwards.length === ((homeCornerStat?.data?.value || 0) + (awayCornerStat?.data?.value || 0)) ? '✅ PERFECT' : '⚠️ MISMATCH'}`);

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
};

run();
