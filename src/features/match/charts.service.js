
// Helper to safely get nested properties
const get = (obj, path, def = 0) => {
    if (!obj) return def;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || def;
};

export const generateCharts = (matchData) => {
    if (!matchData) return null;

    // 1. Determine Match Duration / Current Minute
    let currentMinute = matchData.minute || 0;
    const state = matchData.state?.state;

    // Check if match is finished
    const isFinished = state === 'FT' || state === 'AET' || state === 'FT_PEN';

    // If finished, we want to show the full game (at least 90 mins).
    // If live, we want to show up to the current minute.
    const maxMinute = isFinished ? Math.max(currentMinute, 90) : currentMinute;

    // Ensure we have at least minute 1 if game just started
    const loopLimit = Math.max(maxMinute, 1);

    // Initialize Timeline
    const timeline = [];

    // Accumulators
    const acc = {
        home: { attacks: 0, dangerous_attacks: 0, shots: 0, corners: 0, pressure: 0 },
        away: { attacks: 0, dangerous_attacks: 0, shots: 0, corners: 0, pressure: 0 }
    };

    // Events
    const events = matchData.events || [];
    const commentaries = matchData.commentaries || []; // Use commentaries for attacks if needed

    // Helper to check if event happened at specific minute
    const getEventsAtMinute = (min, teamId) => {
        return events.filter(e => e.minute === min && e.participant_id == teamId);
    };

    // Helper to check commentary for keywords at minute
    // Commentary usually has 'minute' and 'comment'
    // Keywords: "Attack", "Dangerous Attack"
    // Note: Sportmonks commentary might be sparse.
    const getCommentaryAtMinute = (min) => {
        return commentaries.filter(c => c.minute === min);
    };

    const homeId = matchData.participants?.find(p => p.meta?.location === 'home')?.id;
    const awayId = matchData.participants?.find(p => p.meta?.location === 'away')?.id;

    // Pressure Index Rolling Window (e.g., 5 mins)
    // We need to store raw pressure scores per minute to calculate rolling avg
    const rawPressure = { home: [], away: [] };

    for (let i = 1; i <= loopLimit; i++) {
        // 1. Process Events for this minute
        const homeEvents = getEventsAtMinute(i, homeId);
        const awayEvents = getEventsAtMinute(i, awayId);

        if (homeEvents.length > 0 || awayEvents.length > 0) {
            // Events found
        }

        // Count Metrics
        const countMetric = (evts, typeName) => evts.filter(e => e.type?.name === typeName).length;

        // Shots
        const homeShots = countMetric(homeEvents, 'Goal') +
            homeEvents.filter(e => e.type?.name?.includes('Shot')).length; // "Shot off target", "Shot on target"

        const awayShots = countMetric(awayEvents, 'Goal') +
            awayEvents.filter(e => e.type?.name?.includes('Shot')).length;

        // Corners
        const homeCorners = countMetric(homeEvents, 'Corner');
        const awayCorners = countMetric(awayEvents, 'Corner');

        // Attacks / Dangerous Attacks
        // Hard to get from events. Try commentary or interpolation?
        // Let's check commentary for "Dangerous Attack"
        // If not found, we might leave as 0 or use a placeholder if total stats exist.
        // For now, let's try to find "Attack" events if they exist (rare).

        // Update Accumulators
        acc.home.shots += homeShots;
        acc.away.shots += awayShots;
        acc.home.corners += homeCorners;
        acc.away.corners += awayCorners;

        // Pressure Score Calculation (Instant)
        // Formula: (Dangerous Attacks * 1) + (Shots * 2) + (Corners * 3)
        // Since we might lack Dangerous Attacks, we rely heavily on Shots and Corners.
        // Let's boost weights: Shots * 15, Corners * 10 to make it visible?
        // Or standard: Shots * 20, Corners * 15.
        // If we have no attacks, pressure will be spikey.
        // Let's use a decay or rolling sum.

        const homeInstantPressure = (homeShots * 20) + (homeCorners * 15);
        const awayInstantPressure = (awayShots * 20) + (awayCorners * 15);

        rawPressure.home.push(homeInstantPressure);
        rawPressure.away.push(awayInstantPressure);

        // Calculate Rolling Average Pressure (last 5 mins)
        const getRollingPressure = (arr) => {
            const window = arr.slice(Math.max(0, arr.length - 5));
            const sum = window.reduce((a, b) => a + b, 0);
            // Normalize? Or just sum?
            // "Pressure Index" is usually 0-100.
            // Let's cap at 100.
            return Math.min(100, sum);
        };

        acc.home.pressure = getRollingPressure(rawPressure.home);
        acc.away.pressure = getRollingPressure(rawPressure.away);

        // Add to Timeline
        timeline.push({
            minute: i,
            home: { ...acc.home },
            away: { ...acc.away }
        });
    }

    return {
        timeline,
        summary: {
            hasPressureGraph: true,
            hasAttacksData: false // We didn't implement robust attack parsing yet
        }
    };
};
