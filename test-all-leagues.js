// Test script to fetch ALL leagues

import { getAllLeagues } from './src/services/sports.service.js';
import dotenv from 'dotenv';

dotenv.config();

const testAllLeagues = async () => {
    console.log('\n🧪 Testing All Leagues Fetch\n');
    console.log('='.repeat(60));

    try {
        const leagues = await getAllLeagues();

        console.log(`\n✅ SUCCESS: Fetched ${leagues.length} leagues total\n`);

        // Filter Brazilian leagues
        const brazilian = leagues.filter(l =>
            l.country?.name === 'Brazil' ||
            l.name.toLowerCase().includes('brasil')
        );

        console.log(`🇧🇷 Brazilian Leagues (${brazilian.length}):`);
        brazilian.forEach(l => {
            console.log(`   - ${l.name} (ID: ${l.id})`);
        });

        // Filter South American competitions
        const southAmerican = leagues.filter(l =>
            l.name.includes('Libertadores') ||
            l.name.includes('Sudamericana') ||
            ['Argentina', 'Uruguay', 'Colombia', 'Chile', 'Paraguay', 'Peru', 'Ecuador', 'Bolivia', 'Venezuela']
                .includes(l.country?.name)
        );

        console.log(`\n🌎 South American Leagues (${southAmerican.length}):`);
        southAmerican.slice(0, 10).forEach(l => {
            console.log(`   - ${l.name} (${l.country?.name || 'International'})`);
        });
        if (southAmerican.length > 10) {
            console.log(`   ... and ${southAmerican.length - 10} more`);
        }

        // Top European leagues
        const topEuropean = leagues.filter(l =>
            l.name.includes('Premier League') ||
            l.name.includes('La Liga') ||
            (l.name.includes('Serie A') && l.country?.name === 'Italy') ||
            l.name.includes('Bundesliga') ||
            l.name.includes('Ligue 1')
        );

        console.log(`\n⚽ Top European Leagues (${topEuropean.length}):`);
        topEuropean.forEach(l => {
            console.log(`   - ${l.name} (${l.country?.name})`);
        });

        // International competitions
        const international = leagues.filter(l =>
            l.name.includes('Champions') ||
            l.name.includes('Europa') ||
            l.name.includes('World Cup') ||
            l.name.includes('Copa America')
        );

        console.log(`\n🏆 International Competitions (${international.length}):`);
        international.slice(0, 10).forEach(l => {
            console.log(`   - ${l.name}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
};

testAllLeagues();
