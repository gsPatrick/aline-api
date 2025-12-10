import { calculateMatchStats } from './src/features/match/match.service.js';

// Mock Data
const mockData = {
    participants: [
        { id: 1, name: 'Home Team', image_path: 'home.png', meta: { location: 'home' } },
        { id: 2, name: 'Away Team', image_path: 'away.png', meta: { location: 'away' } }
    ],
    league: { name: 'Premier League' },
    round: { name: 'Round 1' },
    form: { home: 'WWWWW', away: 'LLLLL' },
    weather_report: { temperature: { temp: 20 }, type: 'Sunny' },
    venue: { name: 'Stadium' },
    statistics: [
        // Home Stats
        { participant_id: 1, type: { name: 'Dangerous Attacks', id: 100 }, data: { value: 50 } },
        { participant_id: 1, type: { name: 'Shots Total' }, data: { value: 10 } },
        { participant_id: 1, type: { name: 'Corners' }, data: { value: 5 } },
        { participant_id: 1, type: { name: 'Passes' }, data: { value: 400 } },
        { participant_id: 1, type: { name: 'Attacks' }, data: { value: 100 } },
        { participant_id: 1, type: { name: 'Saves' }, data: { value: 2 } },

        // Away Stats
        { participant_id: 2, type: { name: 'Dangerous Attacks', id: 100 }, data: { value: 30 } },
        { participant_id: 2, type: { name: 'Shots Total' }, data: { value: 5 } },
        { participant_id: 2, type: { name: 'Corners' }, data: { value: 2 } },
        { participant_id: 2, type: { name: 'Passes' }, data: { value: 200 } },
        { participant_id: 2, type: { name: 'Attacks' }, data: { value: 60 } },
        { participant_id: 2, type: { name: 'Saves' }, data: { value: 5 } }
    ],
    trends: [
        // Home Trends (Dangerous Attacks - ID 100)
        { participant_id: 1, type_id: 100, minute_start: 0, minute_end: 15, amount: 10 },
        { participant_id: 1, type_id: 100, minute_start: 16, minute_end: 30, amount: 15 },

        // Away Trends
        { participant_id: 2, type_id: 100, minute_start: 0, minute_end: 15, amount: 5 },
        { participant_id: 2, type_id: 100, minute_start: 16, minute_end: 30, amount: 5 }
    ],
    events: [],
    comments: [],
    homeTeam: { detailedHistory: [] },
    awayTeam: { detailedHistory: [] }
};

console.log("Running Heuristic Logic Test...");

try {
    const result = calculateMatchStats(mockData);

    console.log("\n--- MOMENTUM (PRESSURE) ---");
    console.log("Length:", result.chartsAnalysis.pressure.length);
    console.log("Sample (0-30 min):", result.chartsAnalysis.pressure.slice(0, 31));

    console.log("\n--- ACTION ZONES ---");
    console.log("Home:", JSON.stringify(result.chartsAnalysis.attackZones.home, null, 2));
    console.log("Away:", JSON.stringify(result.chartsAnalysis.attackZones.away, null, 2));

    // Validations
    if (result.chartsAnalysis.pressure.length > 0 && result.chartsAnalysis.attackZones.home.attack > 0) {
        console.log("\n✅ TEST PASSED: Heuristic logic generated data.");
    } else {
        console.error("\n❌ TEST FAILED: Missing data.");
    }

} catch (error) {
    console.error("Error executing test:", error);
}
