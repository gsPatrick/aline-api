/**
 * _debug_api_test.js
 * Validates SportMonks API structure before production changes
 */
import 'dotenv/config';
import fs from 'fs';

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const TOKEN = process.env.SPORTMONKS_API_TOKEN;

const log = [];

async function fetchAndLog(name, url) {
    console.log(`\n📡 Testing: ${name}`);
    log.push(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}\n`);

    try {
        const res = await fetch(url);
        const data = await res.json();

        log.push(`Status: ${res.status}`);
        log.push(`URL: ${url.replace(TOKEN, 'TOKEN_HIDDEN')}`);
        log.push(`\nResponse:\n${JSON.stringify(data, null, 2).slice(0, 5000)}`);

        if (data.data) {
            console.log(`✅ Success - ${Array.isArray(data.data) ? data.data.length + ' items' : 'object'}`);
        } else {
            console.log(`⚠️ No data property`);
        }

        return data;
    } catch (e) {
        log.push(`Error: ${e.message}`);
        console.log(`❌ Error: ${e.message}`);
        return null;
    }
}

async function runTests() {
    console.log('🔍 Starting SportMonks API Validation...\n');
    log.push(`SportMonks API Validation - ${new Date().toISOString()}\n`);

    // Test 1: Today's fixtures
    const today = new Date().toISOString().split('T')[0];
    await fetchAndLog(
        '1. Today Fixtures',
        `${BASE_URL}/fixtures/date/${today}?api_token=${TOKEN}&include=league;participants;state;scores`
    );

    // Test 2: Yesterday's fixtures (for -1 day support)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await fetchAndLog(
        '2. Yesterday Fixtures',
        `${BASE_URL}/fixtures/date/${yesterday.toISOString().split('T')[0]}?api_token=${TOKEN}&include=league;participants;state;scores`
    );

    // Test 3: Team squad with ratings
    const testTeamId = 85; // Dortmund
    await fetchAndLog(
        '3. Team Squad (with ratings)',
        `${BASE_URL}/squads/teams/${testTeamId}?api_token=${TOKEN}&include=player.statistics.details.type;player.position`
    );

    // Test 4: Match header for a known match
    const testMatchId = 19433604; // Test match
    await fetchAndLog(
        '4. Match Header',
        `${BASE_URL}/fixtures/${testMatchId}?api_token=${TOKEN}&include=league;participants;state;scores;venue`
    );

    // Test 5: Team fixtures for last/next matches
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    await fetchAndLog(
        '5. Team Fixtures (between dates)',
        `${BASE_URL}/fixtures/between/${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}/${testTeamId}?api_token=${TOKEN}&include=league;participants;scores;state`
    );

    // Test 6: Standings
    const testSeasonId = 25659; // La Liga 2024/25
    await fetchAndLog(
        '6. Standings',
        `${BASE_URL}/standings/seasons/${testSeasonId}?api_token=${TOKEN}&include=participant;details`
    );

    // Save log
    fs.writeFileSync('_api_response_log.txt', log.join('\n'));
    console.log('\n📄 Results saved to _api_response_log.txt');
}

runTests().catch(console.error);
