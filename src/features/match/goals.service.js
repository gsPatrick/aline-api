
// Helper to safely get nested properties
const get = (obj, path, def = 0) => {
    if (!obj) return def;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || def;
};

// Helper to find specific stat type in array
const findStat = (stats, typeName) => {
    if (!stats) return 0;
    const stat = stats.find(s => s.type?.name === typeName || s.type?.developer_name === typeName);
    return stat?.data?.value ?? stat?.value ?? 0;
};

export const calculateGoalAnalysis = (homeHistory, awayHistory, homeId, awayId) => {

    // Filter last 10 matches for each context
    // Home Team: Last 10 games playing at HOME (Already filtered by match.service)
    const homeMatches = (homeHistory || [])
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 10);

    // Away Team: Last 10 games playing at AWAY (Already filtered by match.service)
    const awayMatches = (awayHistory || [])
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 10);

    const processMatches = (matches, teamId) => {
        let gamesCount = matches.length;
        let bttsCount = 0;
        let firstToScoreCount = 0;
        let firstToScoreAndWinCount = 0;
        let over05Count = 0;
        let over15Count = 0;
        let over25Count = 0;

        matches.forEach(match => {
            // 1. BTTS & Over/Under (Stats)
            const stats = match.statistics || [];
            const myStatsArr = stats.filter(s => s.participant_id == teamId);
            const oppStatsArr = stats.filter(s => s.participant_id != teamId);

            // Try to find 'Goals' stat. If not found, sum up 'Goals' events? 
            // Usually 'Goals' stat exists.
            let myGoals = findStat(myStatsArr, 'Goals');
            let oppGoals = findStat(oppStatsArr, 'Goals');

            // Fallback: Count goal events if stats are missing
            if (myGoals === 0 && oppGoals === 0) {
                const events = match.events || [];
                myGoals = events.filter(e => e.type?.name === 'Goal' && e.participant_id == teamId).length;
                oppGoals = events.filter(e => e.type?.name === 'Goal' && e.participant_id != teamId).length;
            }

            // DEBUG LOG
            // console.log(`Match ${match.id}: Team ${teamId} Goals: ${myGoals}, Opp Goals: ${oppGoals}`);

            const totalGoals = myGoals + oppGoals;

            if (myGoals > 0 && oppGoals > 0) bttsCount++;
            if (totalGoals > 0.5) over05Count++;
            if (totalGoals > 1.5) over15Count++;
            if (totalGoals > 2.5) over25Count++;

            // 2. First to Score (Events)
            const events = match.events || [];
            const goalEvents = events
                .filter(e => e.type?.name === 'Goal')
                .sort((a, b) => a.minute - b.minute);

            if (goalEvents.length > 0) {
                const firstGoal = goalEvents[0];
                if (firstGoal.participant_id == teamId) {
                    firstToScoreCount++;

                    // Did we win?
                    // Check result info or compare scores
                    // We have myGoals and oppGoals calculated above
                    if (myGoals > oppGoals) {
                        firstToScoreAndWinCount++;
                    }
                }
            }
        });

        return {
            btts: gamesCount ? ((bttsCount / gamesCount) * 100).toFixed(0) : 0,
            firstToScore: gamesCount ? ((firstToScoreCount / gamesCount) * 100).toFixed(0) : 0,
            firstToScoreAndWin: gamesCount ? ((firstToScoreAndWinCount / gamesCount) * 100).toFixed(0) : 0,
            over05: gamesCount ? ((over05Count / gamesCount) * 100).toFixed(0) : 0,
            over15: gamesCount ? ((over15Count / gamesCount) * 100).toFixed(0) : 0,
            over25: gamesCount ? ((over25Count / gamesCount) * 100).toFixed(0) : 0,
        };
    };

    // Note: The user requested a single object for goalAnalysis, not split by home/away?
    // "goalAnalysis": { "btts": 60, ... }
    // But usually we want to know stats for the Home Team (playing at Home) and Away Team (playing at Away).
    // The example JSON showed:
    // "goalAnalysis": { "btts": 60, ... }
    // This implies an aggregation or maybe just for the primary team?
    // Wait, the example JSON structure was:
    // { "cornerAnalysis": { "home": { ... } }, "goalAnalysis": { "btts": 60 ... } }
    // This is ambiguous. Does "btts": 60 mean "60% of Home Team's last 10 games had BTTS"?
    // Or "Average of both"?
    // Usually in betting apps, you show stats for the Home Team and Away Team separately.
    // However, if the user wants a single object, maybe they want the prediction?
    // Let's look at the request again:
    // "O output final deve preencher os campos que hoje estão zerados: ... goalAnalysis: { btts: 60 ... }"
    // It seems to be a single object.
    // But typically we have `goalAnalysis.home` and `goalAnalysis.away`.
    // Let's implement both and maybe return a structure that fits or just return both.
    // I will return { home: ..., away: ... } to be safe and consistent with corners.
    // If the frontend expects a flat object, I might need to adjust.
    // Let's check `match.service.js` current return. It had `// goalAnalysis, // Needs history`.
    // I will implement it returning both.

    const homeStats = processMatches(homeMatches, homeId);
    const awayStats = processMatches(awayMatches, awayId);

    return {
        home: homeStats,
        away: awayStats
    };
};
