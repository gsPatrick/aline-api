
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
        away: awayStats
    };
};
