// Test script for leagues listing
// Validates deduplication and image paths

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

const testLeaguesListing = async () => {
    console.log('\n🧪 Testing Leagues Listing Endpoint\n');
    console.log('='.repeat(60));

    try {
        const response = await axios.get(`${BASE_URL}/api/leagues`);
        const { success, total, data } = response.data;

        if (!success) {
            console.error('❌ API returned success: false');
            return;
        }

        console.log(`✅ API Response received\n`);
        console.log(`📊 Total leagues: ${total}`);
        console.log(`📊 Data array length: ${data.length}\n`);

        // Check for duplicates
        const ids = data.map(l => l.id);
        const uniqueIds = new Set(ids);
        const hasDuplicates = ids.length !== uniqueIds.size;

        console.log('🔍 Deduplication Check:');
        console.log(`   Total IDs: ${ids.length}`);
        console.log(`   Unique IDs: ${uniqueIds.size}`);
        console.log(`   ${hasDuplicates ? '❌ HAS DUPLICATES!' : '✅ No duplicates'}\n`);

        if (hasDuplicates) {
            // Find duplicates
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            console.log(`   Duplicate IDs: ${[...new Set(duplicates)].join(', ')}\n`);
        }

        // Check image paths
        console.log('🖼️  Image Path Check:');
        const withLogo = data.filter(l => l.logo).length;
        const withCountryFlag = data.filter(l => l.country?.flag).length;

        console.log(`   Leagues with logo: ${withLogo}/${total} (${Math.round(withLogo / total * 100)}%)`);
        console.log(`   Leagues with country flag: ${withCountryFlag}/${total} (${Math.round(withCountryFlag / total * 100)}%)\n`);

        // Sample leagues
        console.log('📋 Sample Leagues (First 5):');
        data.slice(0, 5).forEach((league, i) => {
            console.log(`   ${i + 1}. ${league.name} (${league.country?.name || 'N/A'})`);
            console.log(`      ID: ${league.id}`);
            console.log(`      Logo: ${league.logo ? '✅' : '❌'} ${league.logo || 'missing'}`);
            console.log(`      Flag: ${league.country?.flag ? '✅' : '❌'} ${league.country?.flag || 'missing'}`);
            console.log('');
        });

        // Brazilian leagues
        const brazilian = data.filter(l => l.country?.name === 'Brazil');
        console.log(`🇧🇷 Brazilian Leagues: ${brazilian.length}`);
        brazilian.forEach(l => {
            console.log(`   - ${l.name} (ID: ${l.id})`);
        });

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📝 Validation Summary:\n');

        const checks = [
            { name: 'No Duplicates', valid: !hasDuplicates },
            { name: 'Has Leagues', valid: total > 0 },
            { name: 'Most have logos', valid: withLogo / total > 0.8 },
            { name: 'Most have flags', valid: withCountryFlag / total > 0.8 },
            { name: 'Has Brazilian leagues', valid: brazilian.length > 0 }
        ];

        checks.forEach(check => {
            console.log(`   ${check.valid ? '✅' : '❌'} ${check.name}`);
        });

        const allValid = checks.every(c => c.valid);
        console.log('\n' + '='.repeat(60));
        console.log(allValid ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   ⚠️  Server is not running!');
            console.error('   Start the server with: npm run dev');
        }
        console.log('\n');
    }
};

// Run test
testLeaguesListing();
