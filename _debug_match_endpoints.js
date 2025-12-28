/**
 * _debug_match_endpoints.js
 * Tests all match endpoints and saves responses to file for analysis
 */
import 'dotenv/config';
import fs from 'fs';

const LOCAL_API = 'http://localhost:3333/api';
const MATCH_ID = 19425045; // A specific match ID to test

async function fetchAndLog(name, url, log) {
    console.log(`\n📡 Testing: ${name}`);
    log.push(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}\n`);
    log.push(`URL: ${url}\n`);

    try {
        const res = await fetch(url);
        const data = await res.json();

        log.push(`Status: ${res.status}`);
        log.push(`\nResponse:\n${JSON.stringify(data, null, 2)}\n`);

        console.log(`✅ Status: ${res.status}`);
        return data;
    } catch (e) {
        log.push(`Error: ${e.message}`);
        console.log(`❌ Error: ${e.message}`);
        return null;
    }
}

async function runDebug() {
    const log = [];
    log.push(`Match Endpoint Debug - ${new Date().toISOString()}\n`);
    log.push(`Testing Match ID: ${MATCH_ID}\n`);

    console.log('🔍 Testing Match Endpoints...\n');

    // Test 1: Main analysis endpoint (used by front-end1)
    await fetchAndLog(
        '1. /matches/:id/analysis (MAIN - Used by front-end1)',
        `${LOCAL_API}/matches/${MATCH_ID}/analysis`,
        log
    );

    // Test 2: Stats endpoint (used by goldstats-web)
    await fetchAndLog(
        '2. /matches/:id/stats',
        `${LOCAL_API}/matches/${MATCH_ID}/stats`,
        log
    );

    // Test 3: Goldstats header
    await fetchAndLog(
        '3. /goldstats/match/:id (Header)',
        `${LOCAL_API}/goldstats/match/${MATCH_ID}`,
        log
    );

    // Test 4: Goldstats next matches
    await fetchAndLog(
        '4. /goldstats/match/:id/next-matches',
        `${LOCAL_API}/goldstats/match/${MATCH_ID}/next-matches`,
        log
    );

    // Test 5: Goldstats last matches
    await fetchAndLog(
        '5. /goldstats/match/:id/last-matches',
        `${LOCAL_API}/goldstats/match/${MATCH_ID}/last-matches`,
        log
    );

    // Save log
    fs.writeFileSync('_match_endpoints_response.txt', log.join('\n'));
    console.log('\n📄 Results saved to _match_endpoints_response.txt');
}

runDebug().catch(console.error);
