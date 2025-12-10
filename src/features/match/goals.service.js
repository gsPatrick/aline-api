
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

export const calculateGoalAnalysis = (homeHistory, awayHistory, homeId, awayId, matchOdds) => {

    // Filter last 10 matches for each context
    const homeMatches = (homeHistory || [])
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 10);

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

        let totalScored = 0;
        let totalConceded = 0;
        let cleanSheetsCount = 0;

        // Intervals
        const intervals = {
            '0-15': { scored: 0, conceded: 0, count: 0 },
            '16-30': { scored: 0, conceded: 0, count: 0 },
            '31-HT': { scored: 0, conceded: 0, count: 0 },
            '46-60': { scored: 0, conceded: 0, count: 0 },
            '61-75': { scored: 0, conceded: 0, count: 0 },
            '76-FT': { scored: 0, conceded: 0, count: 0 }
        };

        matches.forEach(match => {
            // 1. Stats (Total Goals)
            const stats = match.statistics || [];
            const myStatsArr = stats.filter(s => s.participant_id == teamId);
            const oppStatsArr = stats.filter(s => s.participant_id != teamId);

            let myGoals = findStat(myStatsArr, 'Goals');
            let oppGoals = findStat(oppStatsArr, 'Goals');

            // Fallback: Count goal events
            if (myGoals === 0 && oppGoals === 0) {
                const events = match.events || [];
                myGoals = events.filter(e => e.type?.name === 'Goal' && e.participant_id == teamId).length;
                oppGoals = events.filter(e => e.type?.name === 'Goal' && e.participant_id != teamId).length;
            }

            const totalGoals = myGoals + oppGoals;

            totalScored += myGoals;
            totalConceded += oppGoals;

            if (oppGoals === 0) cleanSheetsCount++;
            if (myGoals > 0 && oppGoals > 0) bttsCount++;
            if (totalGoals > 0.5) over05Count++;
            if (totalGoals > 1.5) over15Count++;
            if (totalGoals > 2.5) over25Count++;

            // 2. Events (First to Score & Intervals)
            const events = match.events || [];
            const goalEvents = events
                .filter(e => e.type?.name === 'Goal')
                .sort((a, b) => a.minute - b.minute);

            if (goalEvents.length > 0) {
                const firstGoal = goalEvents[0];
                if (firstGoal.participant_id == teamId) {
                    firstToScoreCount++;
                    if (myGoals > oppGoals) {
                        firstToScoreAndWinCount++;
                    }
                }
            }

            // Interval Logic
            const intervalFlags = {};
            goalEvents.forEach(e => {
                const minute = e.minute;
                const isMine = e.participant_id == teamId;

                let bucket = '';
                if (minute <= 15) bucket = '0-15';
                else if (minute <= 30) bucket = '16-30';
                else if (minute <= 45) bucket = '31-HT';
                else if (minute <= 60) bucket = '46-60';
                else if (minute <= 75) bucket = '61-75';
                else bucket = '76-FT';

                if (intervals[bucket]) {
                    if (isMine) intervals[bucket].scored++;
                    else intervals[bucket].conceded++;

                    if (!intervalFlags[bucket]) {
                        intervals[bucket].count++;
                        intervalFlags[bucket] = true;
                    }
                }
            });
        });

        const avgScored = gamesCount ? (totalScored / gamesCount).toFixed(2) : 0;
        const avgConceded = gamesCount ? (totalConceded / gamesCount).toFixed(2) : 0;

        // Format Intervals
        const formattedIntervals = {};
        Object.keys(intervals).forEach(key => {
            const data = intervals[key];
            formattedIntervals[key] = {
                scored: data.scored,
                conceded: data.conceded,
                frequency: gamesCount ? ((data.count / gamesCount) * 100).toFixed(0) : 0
            };
        });

        return {
            scored: avgScored,
            conceded: avgConceded,
            cleanSheets: gamesCount ? ((cleanSheetsCount / gamesCount) * 100).toFixed(0) : 0,
            btts: gamesCount ? ((bttsCount / gamesCount) * 100).toFixed(0) : 0,
            firstToScore: gamesCount ? ((firstToScoreCount / gamesCount) * 100).toFixed(0) : 0,
            firstToScoreAndWin: gamesCount ? ((firstToScoreAndWinCount / gamesCount) * 100).toFixed(0) : 0,
            over05: gamesCount ? ((over05Count / gamesCount) * 100).toFixed(0) : 0,
            over15: gamesCount ? ((over15Count / gamesCount) * 100).toFixed(0) : 0,
            over25: gamesCount ? ((over25Count / gamesCount) * 100).toFixed(0) : 0,
            intervals: formattedIntervals
        };
    };

    const homeStats = processMatches(homeMatches, homeId);
    const awayStats = processMatches(awayMatches, awayId);

    // Score Predictions & Value Bets
    const homeAttack = parseFloat(homeStats.scored);
    const awayDefense = parseFloat(awayStats.conceded);
    const awayAttack = parseFloat(awayStats.scored);
    const homeDefense = parseFloat(homeStats.conceded);

    const expHomeGoals = (homeAttack + awayDefense) / 2;
    const expAwayGoals = (awayAttack + homeDefense) / 2;
    const expTotalGoals = expHomeGoals + expAwayGoals;

    // Probable Scores
    const probableScores = [];
    const scores = ['1-0', '0-1', '1-1', '2-1', '1-2', '2-0', '0-2', '2-2'];
    scores.forEach(score => {
        const [h, a] = score.split('-').map(Number);
        const diff = Math.abs(h - expHomeGoals) + Math.abs(a - expAwayGoals);
        let prob = Math.max(0, 30 - (diff * 10));
        if (prob > 0) {
            probableScores.push({ score, prob: prob.toFixed(0) });
        }
    });
    probableScores.sort((a, b) => b.prob - a.prob);

    // Value Bets (Calculator)
    // Compare calculated probability with odds
    const calculator = {
        expectedGoals: expTotalGoals.toFixed(2),
        markets: []
    };

    if (matchOdds && Array.isArray(matchOdds)) {
        const findOdd = (market, label) => {
            const m = matchOdds.find(o => o.market_description === market && o.label === label);
            return m ? parseFloat(m.value) : null;
        };

        // Over 2.5 Analysis
        // Simple Poisson approx: if exp > 2.7, prob > 60%
        // Let's use a simple heuristic: % chance = (exp / 3) * 100 clamped
        const probOver25 = Math.min(95, Math.max(5, (expTotalGoals / 2.5) * 50));
        const oddOver25 = findOdd("Goals Over/Under", "Over"); // Need to check total=2.5 usually
        // Actually odds array usually has 'total' property.
        const oddOver25Obj = matchOdds.find(o => o.market_description === "Goals Over/Under" && o.label === "Over" && o.total === "2.5");
        const oddOver25Val = oddOver25Obj ? parseFloat(oddOver25Obj.value) : null;

        if (oddOver25Val) {
            const impliedProb = (1 / oddOver25Val) * 100;
            const value = probOver25 - impliedProb;
            calculator.markets.push({
                name: "Over 2.5 Goals",
                prob: probOver25.toFixed(0),
                odd: oddOver25Val,
                value: value > 5, // 5% edge
                edge: value.toFixed(1)
            });
        }

        // BTTS Analysis
        // Heuristic: if both teams score > 1.2 avg
        const probBTTS = Math.min(90, Math.max(10, (Math.min(expHomeGoals, expAwayGoals) / 1.0) * 60));
        const oddBTTS = findOdd("Both Teams To Score", "Yes");

        if (oddBTTS) {
            const impliedProb = (1 / oddBTTS) * 100;
            const value = probBTTS - impliedProb;
            calculator.markets.push({
                name: "BTTS - Yes",
                prob: probBTTS.toFixed(0),
                odd: oddBTTS,
                value: value > 5,
                edge: value.toFixed(1)
            });
        }
    }

    return {
        home: homeStats,
        away: awayStats,
        scorePredictions: {
            probable: probableScores.slice(0, 3)
        },
        calculator // Added calculator
    };
};
