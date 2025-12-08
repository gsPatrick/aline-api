import { generateCharts } from './src/features/match/charts.service.js';

const run = () => {
    console.log("🚀 Testing Live Logic for Charts Service...\n");

    // Case 1: Live Match (Minute 45)
    console.log("1. Testing LIVE Match (Minute 45)...");
    const liveMatch = {
        minute: 45,
        state: { state: 'LIVE' },
        participants: [{ id: 1, meta: { location: 'home' } }, { id: 2, meta: { location: 'away' } }],
        events: []
    };
    const liveCharts = generateCharts(liveMatch);
    console.log(`   Timeline Length: ${liveCharts.timeline.length}`);
    if (liveCharts.timeline.length === 45) {
        console.log("   ✅ PASS: Timeline matches current minute.");
    } else {
        console.log(`   ❌ FAIL: Expected 45, got ${liveCharts.timeline.length}`);
    }

    // Case 2: Finished Match (FT)
    console.log("\n2. Testing FINISHED Match (FT)...");
    const finishedMatch = {
        minute: 90,
        state: { state: 'FT' },
        participants: [{ id: 1, meta: { location: 'home' } }, { id: 2, meta: { location: 'away' } }],
        events: []
    };
    const finishedCharts = generateCharts(finishedMatch);
    console.log(`   Timeline Length: ${finishedCharts.timeline.length}`);
    if (finishedCharts.timeline.length === 90) {
        console.log("   ✅ PASS: Timeline matches 90 minutes.");
    } else {
        console.log(`   ❌ FAIL: Expected 90, got ${finishedCharts.timeline.length}`);
    }

    // Case 3: Live Match (Minute 10)
    console.log("\n3. Testing LIVE Match (Minute 10)...");
    const liveMatch10 = {
        minute: 10,
        state: { state: 'LIVE' },
        participants: [{ id: 1, meta: { location: 'home' } }, { id: 2, meta: { location: 'away' } }],
        events: []
    };
    const liveCharts10 = generateCharts(liveMatch10);
    console.log(`   Timeline Length: ${liveCharts10.timeline.length}`);
    if (liveCharts10.timeline.length === 10) {
        console.log("   ✅ PASS: Timeline matches current minute.");
    } else {
        console.log(`   ❌ FAIL: Expected 10, got ${liveCharts10.timeline.length}`);
    }

};

run();
