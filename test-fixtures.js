// Test script for fixture service

import { getFixturesByDate, getLiveFixtures } from './src/services/fixture.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Hardcoded token for testing (same as other test files)
const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

// Override process.env for testing
if (!process.env.SPORTMONKS_API_TOKEN) {
    process.env.SPORTMONKS_API_TOKEN = API_TOKEN;
}

const testFixtures = async () => {
    console.log('\n🧪 Testing Fixture Service\n');
    console.log('='.repeat(60));
    console.log(`Using API Token: ${API_TOKEN.substring(0, 20)}...`);

    try {
        // Test 1: Today's fixtures
        const today = new Date().toISOString().split('T')[0];
        console.log(`\n1️⃣ Fetching fixtures for today (${today})...\n`);

        const todayFixtures = await getFixturesByDate(today);

        console.log(`✅ Found ${todayFixtures.length} leagues with fixtures`);
        console.log(`📊 Total fixtures: ${todayFixtures.reduce((sum, l) => sum + l.fixtures.length, 0)}`);

        // Show Brazilian and South American leagues
        console.log('\n🇧🇷 Brazilian Leagues:');
        const brazilianLeagues = todayFixtures.filter(l =>
            l.country_name === 'Brazil' ||
            l.league_name.includes('Brasil')
        );
        brazilianLeagues.forEach(league => {
            console.log(`   - ${league.league_name}: ${league.fixtures.length} fixtures`);
        });

        console.log('\n🌎 South American Competitions:');
        const southAmericanLeagues = todayFixtures.filter(l =>
            l.league_name.includes('Libertadores') ||
            l.league_name.includes('Sudamericana') ||
            ['Argentina', 'Uruguay', 'Colombia', 'Chile', 'Paraguay', 'Peru'].includes(l.country_name)
        );
        southAmericanLeagues.forEach(league => {
            console.log(`   - ${league.league_name}: ${league.fixtures.length} fixtures`);
        });

        // Show first 5 leagues
        console.log('\n📋 First 5 Leagues (by priority):');
        todayFixtures.slice(0, 5).forEach((league, index) => {
            console.log(`\n${index + 1}. ${league.league_name} (${league.country_name})`);
            console.log(`   Fixtures: ${league.fixtures.length}`);
            if (league.fixtures.length > 0) {
                const firstMatch = league.fixtures[0];
                console.log(`   Example: ${firstMatch.home_team.name} vs ${firstMatch.away_team.name}`);
                console.log(`   Status: ${firstMatch.status}, Score: ${firstMatch.home_team.score}-${firstMatch.away_team.score}`);
            }
        });

        // Test 2: Live fixtures
        console.log('\n\n2️⃣ Fetching live fixtures...\n');

        const liveFixtures = await getLiveFixtures();

        console.log(`✅ Found ${liveFixtures.length} leagues with live fixtures`);
        console.log(`📊 Total live fixtures: ${liveFixtures.reduce((sum, l) => sum + l.fixtures.length, 0)}`);

        if (liveFixtures.length > 0) {
            console.log('\n⚽ Live Matches:');
            liveFixtures.forEach(league => {
                console.log(`\n${league.league_name}:`);
                league.fixtures.forEach(match => {
                    console.log(`   ${match.home_team.name} ${match.home_team.score}-${match.away_team.score} ${match.away_team.name}`);
                    console.log(`   Minute: ${match.minute}'`);
                });
            });
        } else {
            console.log('   No live matches at the moment');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
};

testFixtures();
