
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

// Constants for Card Types (Validated in Research)
const TYPE_YELLOW = 84;
const TYPE_RED = 83;

export const calculateRefereeStats = (refereeHistory, refereeName) => {
    if (!refereeHistory || !Array.isArray(refereeHistory) || refereeHistory.length === 0) {
        return null;
    }

    // Limit to last 20 matches for recent form
    // Assuming history is passed sorted, but let's sort just in case if we have dates
    // The history comes from 'fixtures' include which might not be sorted.
    // However, the pivot object doesn't always have date. The nested fixture does.
    const matches = refereeHistory
        .map(item => item.fixture) // Extract fixture from pivot
        .filter(f => f && f.starting_at) // Ensure fixture exists
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 20);

    let totalCards = 0;
    let totalYellow = 0;
    let totalRed = 0;
    let gamesOver05 = 0;
    let gamesOver15 = 0;
    let gamesOver25 = 0;
    let gamesOver35 = 0;
    let gamesOver45 = 0;
    let analyzedGames = 0;

    matches.forEach(match => {
        // Check if stats exist (property is usually 'statistics' in v3)
        const stats = match.statistics || match.stats;
        if (!stats || !Array.isArray(stats) || stats.length === 0) return;

        let matchYellow = 0;
        let matchRed = 0;

        stats.forEach(statItem => {
            const typeId = statItem.type_id;
            const value = statItem.data?.value || statItem.value || 0;

            if (typeId === TYPE_YELLOW) {
                matchYellow += value;
            } else if (typeId === TYPE_RED) {
                matchRed += value;
            }
        });

        const matchTotal = matchYellow + matchRed;

        // Only count if we found some cards or if we are confident stats are complete
        // If matchTotal is 0, it might be a clean game or missing stats.
        // Given we checked for 'statistics' existence, we assume 0 is valid.

        totalYellow += matchYellow;
        totalRed += matchRed;
        totalCards += matchTotal;

        if (matchTotal > 0.5) gamesOver05++;
        if (matchTotal > 1.5) gamesOver15++;
        if (matchTotal > 2.5) gamesOver25++;
        if (matchTotal > 3.5) gamesOver35++;
        if (matchTotal > 4.5) gamesOver45++;

        analyzedGames++;
    });

    if (analyzedGames === 0) {
        return {
            name: refereeName,
            avgCards: 0,
            avgYellow: 0,
            avgRed: 0,
            over05: "0%",
            over15: "0%",
            over25: "0%",
            over35: "0%",
            over45: "0%"
        };
    }

    const avgCards = Number((totalCards / analyzedGames).toFixed(1));
    const avgYellow = Number((totalYellow / analyzedGames).toFixed(1));
    const avgRed = Number((totalRed / analyzedGames).toFixed(1));

    const toPct = (count) => Math.round((count / analyzedGames) * 100) + "%";

    return {
        name: refereeName,
        avgCards,
        avgYellow,
        avgRed,
        over05: toPct(gamesOver05),
        over15: toPct(gamesOver15),
        over25: toPct(gamesOver25),
        over35: toPct(gamesOver35),
        over45: toPct(gamesOver45)
    };
};

export const calculateCardStats = (homeHistory, awayHistory, homeId, awayId) => {

    // Filter last 10 matches for each context
    // Home Team: Last 10 games playing at HOME (Already filtered by match.service logic if passed correctly, but let's ensure sort/slice)
    const homeMatches = (homeHistory || [])
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 10);

    // Away Team: Last 10 games playing at AWAY
    const awayMatches = (awayHistory || [])
        .sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))
        .slice(0, 10);

    const processMatches = (matches, teamId) => {
        let gamesCount = matches.length;

        let totalCardsFor = 0;
        let totalCardsAgainst = 0;

        // Markets Counters
        let over05Count = 0;
        let over15Count = 0;
        let over25Count = 0;
        let over35Count = 0;
        let over45Count = 0;

        // Halves
        let firstHalfCards = 0;
        let secondHalfCards = 0;

        // Intervals
        const intervals = {
            '0-15': { total: 0, count: 0 },
            '16-30': { total: 0, count: 0 },
            '31-HT': { total: 0, count: 0 },
            '46-60': { total: 0, count: 0 },
            '61-75': { total: 0, count: 0 },
            '76-FT': { total: 0, count: 0 }
        };

        matches.forEach(match => {
            const events = match.events || [];

            // Filter card events
            // Types: Yellowcard, Redcard. 
            // Note: YellowRed card might be a separate type or just a Redcard.
            // Let's look for "card" in type name or specific IDs if known.
            // Based on debug script, we saw "Yellowcard".
            const cardEvents = events.filter(e => {
                const name = e.type?.name || "";
                return name.includes("Card") || name.includes("card");
            });

            // Filter by team
            const myCards = cardEvents.filter(e => e.participant_id == teamId);
            const oppCards = cardEvents.filter(e => e.participant_id != teamId);

            const myCount = myCards.length;
            const oppCount = oppCards.length;
            const totalCount = myCount + oppCount;

            totalCardsFor += myCount;
            totalCardsAgainst += oppCount;

            // Markets
            if (totalCount > 0.5) over05Count++;
            if (totalCount > 1.5) over15Count++;
            if (totalCount > 2.5) over25Count++;
            if (totalCount > 3.5) over35Count++;
            if (totalCount > 4.5) over45Count++;

            // Halves & Intervals
            // Interval Flags for frequency
            const intervalFlags = {};

            cardEvents.forEach(e => {
                const minute = e.minute;

                // Halves
                if (minute <= 45) firstHalfCards++;
                else secondHalfCards++;

                // Intervals
                let bucket = '';
                if (minute <= 15) bucket = '0-15';
                else if (minute <= 30) bucket = '16-30';
                else if (minute <= 45) bucket = '31-HT';
                else if (minute <= 60) bucket = '46-60';
                else if (minute <= 75) bucket = '61-75';
                else bucket = '76-FT';

                if (intervals[bucket]) {
                    intervals[bucket].total++;
                    if (!intervalFlags[bucket]) {
                        intervals[bucket].count++; // Frequency
                        intervalFlags[bucket] = true;
                    }
                }
            });
        });

        const avgFor = gamesCount ? (totalCardsFor / gamesCount).toFixed(1) : 0;
        const avgAgainst = gamesCount ? (totalCardsAgainst / gamesCount).toFixed(1) : 0;
        const avgTotal = gamesCount ? ((totalCardsFor + totalCardsAgainst) / gamesCount).toFixed(1) : 0;

        const firstHalfAvg = gamesCount ? (firstHalfCards / gamesCount).toFixed(1) : 0;
        const secondHalfAvg = gamesCount ? (secondHalfCards / gamesCount).toFixed(1) : 0;

        // Format Intervals
        const formattedIntervals = {};
        Object.keys(intervals).forEach(key => {
            const data = intervals[key];
            formattedIntervals[key] = {
                total: data.total, // Total cards in this bucket across all games? Or Avg? User asked for "Quantidade (Soma)" and "%".
                // "0-15": { "total": 2, "frequency": 20 } -> Example shows total 2 (maybe avg is better? or total sum?)
                // "Soma de cartões nesse tempo" implies total sum.
                // But usually for analysis you want avg.
                // Let's stick to the requested "Soma" (total) and "Frequency" (%).
                frequency: gamesCount ? ((data.count / gamesCount) * 100).toFixed(0) : 0
            };
        });

        return {
            avgTotal,
            avgFor,
            avgAgainst,
            firstHalfAvg,
            secondHalfAvg,
            markets: {
                over05: gamesCount ? ((over05Count / gamesCount) * 100).toFixed(0) : 0,
                over15: gamesCount ? ((over15Count / gamesCount) * 100).toFixed(0) : 0,
                over25: gamesCount ? ((over25Count / gamesCount) * 100).toFixed(0) : 0,
                over35: gamesCount ? ((over35Count / gamesCount) * 100).toFixed(0) : 0,
                over45: gamesCount ? ((over45Count / gamesCount) * 100).toFixed(0) : 0,
            },
            intervals: formattedIntervals
        };
    };

    const homeStats = processMatches(homeMatches, homeId);
    const awayStats = processMatches(awayMatches, awayId);

    return {
        home: homeStats,
        away: awayStats,
    };
};
