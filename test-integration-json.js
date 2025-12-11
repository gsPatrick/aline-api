import { calculateMatchStats } from './src/features/match/match.service.js';
import fs from 'fs';

// Mock Data (Expanded to cover all analysis areas)
const mockData = {
    id: 12345,
    state: { state: 'NS', short_name: 'NS', minute: 0 },
    starting_at: '2025-12-10 15:00:00',
    starting_at_timestamp: 1765378800,
    participants: [
        { id: 1, name: 'Mirassol', image_path: 'home.png', meta: { location: 'home' } },
        { id: 2, name: 'Flamengo', image_path: 'away.png', meta: { location: 'away' } }
    ],
    league: { id: 1, name: 'Serie A', image_path: 'league.png' },
    round: { name: 'Round 38' },
    venue: { name: 'Estádio Municipal', city_name: 'Mirassol' },
    weather_report: { temperature: { temp: 25 }, type: 'Sunny' },
    form: { home: 'WWWWW', away: 'LLLLL' },

    // Stats for Heuristics & General
    statistics: [
        { participant_id: 1, type: { name: 'Dangerous Attacks', id: 100 }, data: { value: 50 } },
        { participant_id: 1, type: { name: 'Shots Total' }, data: { value: 15 } },
        { participant_id: 1, type: { name: 'Shots On Target' }, data: { value: 5 } },
        { participant_id: 1, type: { name: 'Corners' }, data: { value: 6 } },
        { participant_id: 1, type: { name: 'Passes' }, data: { value: 400 } },
        { participant_id: 1, type: { name: 'Attacks' }, data: { value: 100 } },
        { participant_id: 1, type: { name: 'Fouls' }, data: { value: 10 } },
        { participant_id: 1, type: { name: 'Yellow Cards' }, data: { value: 2 } },

        { participant_id: 2, type: { name: 'Dangerous Attacks', id: 100 }, data: { value: 30 } },
        { participant_id: 2, type: { name: 'Shots Total' }, data: { value: 10 } },
        { participant_id: 2, type: { name: 'Shots On Target' }, data: { value: 3 } },
        { participant_id: 2, type: { name: 'Corners' }, data: { value: 4 } },
        { participant_id: 2, type: { name: 'Passes' }, data: { value: 200 } },
        { participant_id: 2, type: { name: 'Attacks' }, data: { value: 60 } },
        { participant_id: 2, type: { name: 'Fouls' }, data: { value: 12 } },
        { participant_id: 2, type: { name: 'Yellow Cards' }, data: { value: 3 } }
    ],

    // Mock fetchH2HMatches
    h2h: {
        matches: [],
        summary: { total: 0, home_wins: 0, draws: 0, away_wins: 0 },
        averages: { goals_per_match: 0, corners_per_match: 0, cards_per_match: 0 },
        aggregates: {
            goals: { home: 0, away: 0 },
            corners: { home: 0, away: 0 },
            yellowCards: { home: 0, away: 0 },
            redCards: { home: 0, away: 0 }
        },
        trends: []
    },

    // Trends for Momentum
    trends: [
        { participant_id: 1, type_id: 100, minute_start: 0, minute_end: 15, amount: 10 },
        { participant_id: 2, type_id: 100, minute_start: 0, minute_end: 15, amount: 5 }
    ],

    // Mock History for Services
    homeTeam: { detailedHistory: [] }, // Empty array will trigger fallback logic or 0s
    awayTeam: { detailedHistory: [] },

    // Odds for Calculator
    odds: [
        { market_description: "Goals Over/Under", label: "Over", total: "2.5", value: "1.80" },
        { market_description: "Both Teams To Score", label: "Yes", value: "1.90" }
    ],

    events: [],
    comments: [],
    referee: { name: 'Wilton Pereira', image_path: 'ref.png' },
    refereeHistory: [],

    // Mock Lineups (Flat Array)
    lineups: [
        { team_id: 1, player_id: 101, player_name: 'Home GK', jersey_number: 1, position_id: 24, type_id: 11, formation_field: '1:1' },
        { team_id: 1, player_id: 102, player_name: 'Home Def', jersey_number: 4, position_id: 25, type_id: 11, formation_field: '2:2' },
        { team_id: 1, player_id: 103, player_name: 'Home Sub', jersey_number: 12, position_id: 26, type_id: 12, formation_field: null },
        { team_id: 2, player_id: 201, player_name: 'Away GK', jersey_number: 1, position_id: 24, type_id: 11, formation_field: '1:1' },
        { team_id: 2, player_id: 202, player_name: 'Away Fwd', jersey_number: 9, position_id: 27, type_id: 11, formation_field: '4:3' }
    ]
};

console.log("Generating Integration JSON...");

try {
    const result = calculateMatchStats(mockData);

    // Output to file
    fs.writeFileSync('integration_output.json', JSON.stringify(result, null, 2));
    console.log("✅ JSON generated successfully: integration_output.json");

    // Also print key sections to console for quick verification
    console.log("\n--- MATCH INFO ---");
    console.log("State:", result.matchInfo.state);

    console.log("\n--- GOAL ANALYSIS ---");
    console.log("General:", result.goalAnalysis.general);
    console.log("Intervals (Goals):", result.goalAnalysis.intervals.goals.length);

    console.log("\n--- CORNER ANALYSIS ---");
    console.log("Total Corners:", result.cornerAnalysis.totalCorners);

    console.log("\n--- CARD ANALYSIS ---");
    console.log("Averages:", result.cardAnalysis.averages);

} catch (error) {
    console.error("Error generating JSON:", error);
}
