// Test script for Overview Tab Data
// Tests the expanded match analysis endpoint with H2H, trends, insights, timeline

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test match IDs (use real IDs from your database)
const TEST_MATCH_IDS = [
    19427596,  // Example match ID
    19439394   // Another example
];

const testOverviewData = async () => {
    console.log('\n🧪 Testing Overview Tab Data\n');
    console.log('='.repeat(60));

    for (const matchId of TEST_MATCH_IDS) {
        console.log(`\n📊 Testing Match ID: ${matchId}\n`);

        try {
            const response = await axios.get(`${BASE_URL}/api/matches/${matchId}/analysis`);
            const data = response.data;

            // Check for new fields
            console.log('✅ Response received');
            console.log(`   Match: ${data.matchInfo?.home_team?.name} vs ${data.matchInfo?.away_team?.name}`);
            console.log(`   State: ${data.matchInfo?.state}`);

            // Check H2H
            if (data.h2h) {
                console.log(`\n🤝 H2H Data:`);
                console.log(`   Total matches: ${data.h2h.summary?.total || 0}`);
                console.log(`   Home wins: ${data.h2h.summary?.home_wins || 0}`);
                console.log(`   Draws: ${data.h2h.summary?.draws || 0}`);
                console.log(`   Away wins: ${data.h2h.summary?.away_wins || 0}`);
                console.log(`   Avg goals: ${data.h2h.averages?.goals_per_match || 0}`);
                console.log(`   Avg corners: ${data.h2h.averages?.corners_per_match || 0}`);
            } else {
                console.log(`\n⚠️  H2H data missing`);
            }

            // Check History
            if (data.history) {
                console.log(`\n📜 History:`);
                console.log(`   Home matches: ${data.history.home?.length || 0}`);
                console.log(`   Away matches: ${data.history.away?.length || 0}`);
                if (data.history.home?.[0]?.stats) {
                    console.log(`   ✅ Stats badges present (corners: ${data.history.home[0].stats.corners}, cards: ${data.history.home[0].stats.cards})`);
                }
            } else {
                console.log(`\n⚠️  History data missing`);
            }

            // Check Trends
            if (data.trends) {
                console.log(`\n📈 Trends:`);
                console.log(`   Goals scored: Home ${data.trends.goals_scored?.home || 0} | Away ${data.trends.goals_scored?.away || 0}`);
                console.log(`   Corners for: Home ${data.trends.corners_for?.home || 0} | Away ${data.trends.corners_for?.away || 0}`);
                console.log(`   Cards total: Home ${data.trends.cards_total?.home || 0} | Away ${data.trends.cards_total?.away || 0}`);
            } else {
                console.log(`\n⚠️  Trends data missing`);
            }

            // Check Insights
            if (data.insights) {
                console.log(`\n💡 Insights (${data.insights.length}):`);
                data.insights.forEach(insight => {
                    console.log(`   ${insight.type === 'high_prob' ? '🟢' : '⚠️'}  ${insight.label} (${insight.value})`);
                });
            } else {
                console.log(`\n⚠️  Insights data missing`);
            }

            // Check Timeline
            if (data.timeline) {
                console.log(`\n⏱️  Timeline:`);
                console.log(`   Total events: ${data.timeline.length}`);
                const eventTypes = {};
                data.timeline.forEach(event => {
                    eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
                });
                Object.entries(eventTypes).forEach(([type, count]) => {
                    console.log(`   ${type}: ${count}`);
                });
            } else {
                console.log(`\n⚠️  Timeline data missing`);
            }

            console.log('\n' + '='.repeat(60));
            console.log('✅ Test passed for match', matchId);

        } catch (error) {
            console.error(`\n❌ Test failed for match ${matchId}:`, error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, error.response.data);
            }
        }
    }

    console.log('\n✅ All tests completed!\n');
};

// Run tests
testOverviewData();
