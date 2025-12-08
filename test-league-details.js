// Complete test for League Details endpoint
// Tests with real Premier League ID (8)

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const PREMIER_LEAGUE_ID = 8; // Premier League ID

const testLeagueDetails = async () => {
    console.log('\n🧪 Testing League Details Endpoint\n');
    console.log('='.repeat(60));
    console.log(`Testing League ID: ${PREMIER_LEAGUE_ID} (Premier League)\n`);

    try {
        const response = await axios.get(`${BASE_URL}/api/leagues/${PREMIER_LEAGUE_ID}/details`);
        const { success, data } = response.data;

        if (!success) {
            console.error('❌ API returned success: false');
            return;
        }

        console.log('✅ API Response received\n');

        // Validate League Info
        console.log('📋 League Info:');
        if (data.leagueInfo) {
            console.log(`   Name: ${data.leagueInfo.name}`);
            console.log(`   Country: ${data.leagueInfo.country}`);
            console.log(`   Season: ${data.leagueInfo.season}`);
            console.log(`   Logo: ${data.leagueInfo.logo ? '✅' : '❌'}`);
            console.log(`   Country Flag: ${data.leagueInfo.country_flag ? '✅' : '❌'}`);
        } else {
            console.log('   ❌ Missing leagueInfo');
        }

        // Validate Current Round
        console.log('\n🎯 Current Round:');
        if (data.currentRound) {
            console.log(`   Round ID: ${data.currentRound.round_id}`);
            console.log(`   Round Name: ${data.currentRound.name}`);
            console.log(`   Fixtures: ${data.currentRound.fixtures?.length || 0}`);
            if (data.currentRound.fixtures?.length > 0) {
                const fixture = data.currentRound.fixtures[0];
                console.log(`   Example: ${fixture.home_team?.name} vs ${fixture.away_team?.name} (${fixture.score})`);
            }
        } else {
            console.log('   ❌ Missing currentRound');
        }

        // Validate Standings
        console.log('\n📊 Standings:');
        if (data.standings && data.standings.length > 0) {
            console.log(`   Total teams: ${data.standings.length}`);
            console.log(`   Top 3:`);
            data.standings.slice(0, 3).forEach(team => {
                console.log(`      ${team.position}. ${team.team_name} - ${team.points} pts (${team.stats.p}J ${team.stats.w}V ${team.stats.d}E ${team.stats.l}D)`);
            });
            console.log(`   Bottom 3:`);
            data.standings.slice(-3).forEach(team => {
                console.log(`      ${team.position}. ${team.team_name} - ${team.points} pts (${team.stats.p}J ${team.stats.w}V ${team.stats.d}E ${team.stats.l}D)`);
            });
        } else {
            console.log('   ❌ Missing or empty standings');
        }

        // Validate League Insights
        console.log('\n💡 League Insights:');
        if (data.leagueInsights) {
            console.log(`   Best Attack: ${data.leagueInsights.bestAttack?.team} (${data.leagueInsights.bestAttack?.value} goals)`);
            console.log(`   Best Defense: ${data.leagueInsights.bestDefense?.team} (${data.leagueInsights.bestDefense?.value} goals conceded)`);
            console.log(`   Most Wins: ${data.leagueInsights.mostWins?.team} (${data.leagueInsights.mostWins?.value} wins)`);
            console.log(`   Most Losses: ${data.leagueInsights.mostLosses?.team} (${data.leagueInsights.mostLosses?.value} losses)`);
        } else {
            console.log('   ❌ Missing leagueInsights');
        }

        // Validate Top Players
        console.log('\n⭐ Top Players:');
        if (data.topPlayers) {
            console.log(`   Top Scorers: ${data.topPlayers.scorers?.length || 0}`);
            if (data.topPlayers.scorers?.length > 0) {
                const top = data.topPlayers.scorers[0];
                console.log(`      1. ${top.player_name} (${top.team_name}) - ${top.goals} goals`);
            }

            console.log(`   Top Assists: ${data.topPlayers.assists?.length || 0}`);
            if (data.topPlayers.assists?.length > 0) {
                const top = data.topPlayers.assists[0];
                console.log(`      1. ${top.player_name} (${top.team_name}) - ${top.assists} assists`);
            }

            console.log(`   Top Ratings: ${data.topPlayers.ratings?.length || 0}`);
            if (data.topPlayers.ratings?.length > 0) {
                const top = data.topPlayers.ratings[0];
                console.log(`      1. ${top.player_name} (${top.team_name}) - ${top.rating} rating`);
            }
        } else {
            console.log('   ❌ Missing topPlayers');
        }

        // Validate Team Stats Table
        console.log('\n📈 Team Stats Table:');
        if (data.teamStatsTable && data.teamStatsTable.length > 0) {
            console.log(`   Total teams: ${data.teamStatsTable.length}`);
            const team = data.teamStatsTable[0];
            console.log(`   Example (${team.team}):`);
            console.log(`      Over 0.5 HT: ${team.over05HT}%`);
            console.log(`      Over 2.5 FT: ${team.over25FT}%`);
            console.log(`      BTTS: ${team.btts}%`);
            console.log(`      Avg Goals: ${team.avgGoals}`);
        } else {
            console.log('   ❌ Missing or empty teamStatsTable');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📝 Validation Summary:\n');

        const checks = [
            { name: 'League Info', valid: !!data.leagueInfo },
            { name: 'Current Round', valid: !!data.currentRound },
            { name: 'Standings', valid: data.standings?.length > 0 },
            { name: 'League Insights', valid: !!data.leagueInsights },
            { name: 'Top Players', valid: !!data.topPlayers },
            { name: 'Team Stats Table', valid: data.teamStatsTable?.length > 0 }
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
testLeagueDetails();
