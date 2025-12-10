
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

// Helper to extract corner events from commentaries
// Since corner events are not available in the API, we extract them from match commentaries
const extractCornersFromCommentaries = (commentaries) => {
    if (!commentaries || !Array.isArray(commentaries)) return [];

    // Filter for actual corner awards (not just mentions in goal descriptions)
    return commentaries.filter(c => {
        const text = c.comment?.toLowerCase() || '';
        return (
            text.includes('corner awarded') ||
            text.includes('corner kick awarded') ||
            (text.startsWith('corner') && !text.includes('following')) ||
            text.match(/^.{0,20}has been awarded a corner/)
        );
    }).map(c => ({
        minute: c.minute,
        extra_minute: c.extra_minute,
        // Note: commentaries don't have participant_id, we'll need to parse from comment text
        comment: c.comment,
        type: { name: 'Corner' }
    }));
};

export const calculateCornerStats = (homeHistory, awayHistory, homeId, awayId, matchOdds) => {
    // ... (processMatches logic remains same)
    const processMatches = (matches, teamId) => {
        // ... (existing logic)
        // I need to include the existing processMatches logic here or assume it's unchanged.
        // Since I'm replacing the whole export, I must include it.
        // To save tokens, I will use the "MultiReplace" or just replace the end part if possible.
        // But the function signature changed.
        // Let's rewrite the wrapper and the end part.

        // RE-IMPLEMENTING processMatches logic briefly to ensure context (or I should have used MultiReplace)
        // Actually, I can just replace the function definition line and the return statement.
        // But I need to access 'matchOdds' inside the return statement logic.

        // Let's assume I'm replacing the whole file content or a large chunk.
        // The tool call below replaces the whole function.

        let totalCornersFor = 0;
        let totalCornersAgainst = 0;
        let gamesCount = matches.length;

        // Interval Data
        const intervals = {
            '0-10': { for: 0, against: 0, count: 0 },
            '11-20': { for: 0, against: 0, count: 0 },
            '21-30': { for: 0, against: 0, count: 0 },
            '31-40': { for: 0, against: 0, count: 0 },
            '41-50': { for: 0, against: 0, count: 0 },
            '51-60': { for: 0, against: 0, count: 0 },
            '61-70': { for: 0, against: 0, count: 0 },
            '71-80': { for: 0, against: 0, count: 0 },
            '81-90': { for: 0, against: 0, count: 0 }
        };

        // Races Counters (Wins)
        const races = { 3: 0, 5: 0, 7: 0, 9: 0 };

        // Trends
        let corners37HT = 0;
        let corners87FT = 0;
        let over85Count = 0;

        matches.forEach(match => {
            const stats = match.statistics || [];
            const myStatsArr = stats.filter(s => s.participant_id == teamId);
            const oppStatsArr = stats.filter(s => s.participant_id != teamId);

            const myCorners = findStat(myStatsArr, 'Corners');
            const oppCorners = findStat(oppStatsArr, 'Corners');
            const matchTotal = myCorners + oppCorners;

            totalCornersFor += myCorners;
            totalCornersAgainst += oppCorners;

            if (matchTotal > 8.5) over85Count++;

            let cornerEvents = (match.events || [])
                .filter(e => (e.type?.name === 'Corner' || e.type?.name === 'Corners'));

            if (cornerEvents.length === 0 && match.comments) {
                const commentaryCorners = extractCornersFromCommentaries(match.comments);
                const participants = match.participants || [];
                const homeTeam = participants.find(p => p.meta?.location === 'home');
                const awayTeam = participants.find(p => p.meta?.location === 'away');

                cornerEvents = commentaryCorners.map(c => {
                    const text = c.comment || '';
                    let participantId = null;
                    if (homeTeam && text.includes(homeTeam.name)) participantId = homeTeam.id;
                    else if (awayTeam && text.includes(awayTeam.name)) participantId = awayTeam.id;

                    return { ...c, participant_id: participantId };
                });
            }

            cornerEvents.sort((a, b) => {
                if (a.minute === b.minute) return (a.extra_minute || 0) - (b.extra_minute || 0);
                return a.minute - b.minute;
            });

            let myRaceCount = 0;
            let oppRaceCount = 0;
            const raceFlags = { 3: false, 5: false, 7: false, 9: false };
            const intervalFlags = {};
            let has37HT = false;
            let has87FT = false;

            cornerEvents.forEach(e => {
                const isMine = e.participant_id == teamId;
                const minute = e.minute;

                if (isMine) myRaceCount++;
                else oppRaceCount++;

                [3, 5, 7, 9].forEach(r => {
                    if (!raceFlags[r]) {
                        if (myRaceCount === r) { races[r]++; raceFlags[r] = true; }
                        else if (oppRaceCount === r) { raceFlags[r] = true; }
                    }
                });

                let bucket = '';
                if (minute <= 10) bucket = '0-10';
                else if (minute <= 20) bucket = '11-20';
                else if (minute <= 30) bucket = '21-30';
                else if (minute <= 40) bucket = '31-40';
                else if (minute <= 50) bucket = '41-50';
                else if (minute <= 60) bucket = '51-60';
                else if (minute <= 70) bucket = '61-70';
                else if (minute <= 80) bucket = '71-80';
                else bucket = '81-90';

                if (intervals[bucket]) {
                    if (isMine) intervals[bucket].for++;
                    else intervals[bucket].against++;

                    if (!intervalFlags[bucket]) {
                        intervals[bucket].count++;
                        intervalFlags[bucket] = true;
                    }
                }

                if (minute >= 37 && minute <= 45) has37HT = true;
                if (minute >= 87) has87FT = true;
            });

            if (has37HT) corners37HT++;
            if (has87FT) corners87FT++;
        });

        const avgFor = gamesCount ? (totalCornersFor / gamesCount).toFixed(1) : 0;
        const avgAgainst = gamesCount ? (totalCornersAgainst / gamesCount).toFixed(1) : 0;
        const avgTotal = gamesCount ? ((totalCornersFor + totalCornersAgainst) / gamesCount).toFixed(1) : 0;

        const formattedIntervals = {};
        Object.keys(intervals).forEach(key => {
            const data = intervals[key];
            formattedIntervals[key] = {
                avgFor: gamesCount ? (data.for / gamesCount).toFixed(1) : 0,
                avgAgainst: gamesCount ? (data.against / gamesCount).toFixed(1) : 0,
                frequency: gamesCount ? ((data.count / gamesCount) * 100).toFixed(0) : 0
            };
        });

        formattedIntervals['37-HT'] = { frequency: gamesCount ? ((corners37HT / gamesCount) * 100).toFixed(0) : 0 };
        formattedIntervals['87-FT'] = { frequency: gamesCount ? ((corners87FT / gamesCount) * 100).toFixed(0) : 0 };

        return {
            avgFor,
            avgAgainst,
            avgTotal,
            races: {
                race3: gamesCount ? ((races[3] / gamesCount) * 100).toFixed(0) : 0,
                race5: gamesCount ? ((races[5] / gamesCount) * 100).toFixed(0) : 0,
                race7: gamesCount ? ((races[7] / gamesCount) * 100).toFixed(0) : 0,
                race9: gamesCount ? ((races[9] / gamesCount) * 100).toFixed(0) : 0,
            },
            trends: {
                over85: gamesCount ? ((over85Count / gamesCount) * 100).toFixed(0) : 0,
            },
            intervals: formattedIntervals
        };
    };

    const homeStats = processMatches(homeHistory || [], homeId);
    const awayStats = processMatches(awayHistory || [], awayId);

    // Value Bet Logic
    const expTotalCorners = (parseFloat(homeStats.avgTotal) + parseFloat(awayStats.avgTotal)) / 2;

    const calculator = {
        expectedTotal: expTotalCorners.toFixed(1),
        lines: []
    };

    // Define lines to check
    const linesToCheck = [8.5, 9.5, 10.5, 11.5];

    linesToCheck.forEach(line => {
        // Heuristic probability
        // If exp=10, prob > 9.5 is ~50%. 
        // prob > 8.5 is ~65%.
        // Delta = exp - line.
        // If delta is 0 (exp=9.5, line=9.5), prob is 50%.
        // If delta is +1 (exp=10.5, line=9.5), prob is ~65%.
        // If delta is -1 (exp=8.5, line=9.5), prob is ~35%.
        const delta = expTotalCorners - line;
        let prob = 50 + (delta * 15); // 15% shift per corner diff
        prob = Math.min(95, Math.max(5, prob));

        // Find Odds
        let oddVal = null;
        let value = false;
        let edge = 0;

        if (matchOdds && Array.isArray(matchOdds)) {
            const oddObj = matchOdds.find(o =>
                o.market_description === "Corners Over/Under" &&
                o.label === "Over" &&
                parseFloat(o.total) === line
            );
            if (oddObj) {
                oddVal = parseFloat(oddObj.value);
                const impliedProb = (1 / oddVal) * 100;
                edge = prob - impliedProb;
                value = edge > 5; // 5% edge
            }
        }

        calculator.lines.push({
            line,
            prob: prob.toFixed(0),
            odd: oddVal,
            value,
            edge: edge.toFixed(1)
        });
    });

    return {
        home: homeStats,
        away: awayStats,
        calculator // Renamed from predictions
    };
};
