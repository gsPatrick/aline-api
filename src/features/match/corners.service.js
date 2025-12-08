
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

export const calculateCornerStats = (homeHistory, awayHistory, homeId, awayId) => {
    // homeHistory and awayHistory are now arrays of detailed matches (Heavy Fetch)

    const processMatches = (matches, teamId) => {
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
            // 1. Stats (Total Corners)
            const stats = match.statistics || [];

            // Find stats for this match
            // Note: In detailed match response, stats might be array of objects with participant_id
            const myStatsArr = stats.filter(s => s.participant_id == teamId);
            const oppStatsArr = stats.filter(s => s.participant_id != teamId);

            const myCorners = findStat(myStatsArr, 'Corners');
            const oppCorners = findStat(oppStatsArr, 'Corners');
            const matchTotal = myCorners + oppCorners;

            totalCornersFor += myCorners;
            totalCornersAgainst += oppCorners;

            if (matchTotal > 8.5) over85Count++;

            // 2. Events/Commentaries (Intervals & Races)
            // Try to get corner events from events array first (future-proof)
            let cornerEvents = (match.events || [])
                .filter(e => (e.type?.name === 'Corner' || e.type?.name === 'Corners'));

            // If no corner events, extract from commentaries (current reality)
            if (cornerEvents.length === 0 && match.comments) {
                const commentaryCorners = extractCornersFromCommentaries(match.comments);

                // Get team names from match participants for matching
                const participants = match.participants || [];
                const homeTeam = participants.find(p => p.meta?.location === 'home');
                const awayTeam = participants.find(p => p.meta?.location === 'away');

                // Parse team from commentary text and add participant_id
                cornerEvents = commentaryCorners.map(c => {
                    // Comments say "Corner awarded to [Team Name]" or "[Team Name] has been awarded a corner"
                    const text = c.comment || '';
                    let participantId = null;

                    // Try to match team names in the comment
                    if (homeTeam && text.includes(homeTeam.name)) {
                        participantId = homeTeam.id;
                    } else if (awayTeam && text.includes(awayTeam.name)) {
                        participantId = awayTeam.id;
                    }

                    return {
                        minute: c.minute,
                        extra_minute: c.extra_minute,
                        type: c.type,
                        comment: c.comment,
                        participant_id: participantId
                    };
                });
            }

            // Sort by minute
            cornerEvents.sort((a, b) => {
                if (a.minute === b.minute) {
                    return (a.extra_minute || 0) - (b.extra_minute || 0);
                }
                return a.minute - b.minute;
            });

            // Races Logic
            let myRaceCount = 0;
            let oppRaceCount = 0;
            const raceFlags = { 3: false, 5: false, 7: false, 9: false };

            // Interval Flags for this match (frequency)
            const intervalFlags = {};

            // Trends Flags
            let has37HT = false;
            let has87FT = false;

            cornerEvents.forEach(e => {
                const isMine = e.participant_id == teamId;
                const minute = e.minute;

                // Race Logic
                if (isMine) myRaceCount++;
                else oppRaceCount++;

                [3, 5, 7, 9].forEach(r => {
                    if (!raceFlags[r]) {
                        if (myRaceCount === r) {
                            races[r]++;
                            raceFlags[r] = true; // I won race
                        } else if (oppRaceCount === r) {
                            raceFlags[r] = true; // Opponent won race
                        }
                    }
                });

                // Interval Logic
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
                        intervals[bucket].count++; // Game had a corner in this bucket (frequency count)
                        intervalFlags[bucket] = true;
                    }
                }

                // Trends Logic
                // 37-HT: Minute 37 to 45 (Period 1)
                // 87-FT: Minute 87 to 90+ (Period 2)
                // We can check period_id if available, but minute is a good proxy usually.
                // 45+ is usually period 1, 90+ is period 2.
                // Let's assume standard minutes.
                if (minute >= 37 && minute <= 45) has37HT = true;
                if (minute >= 87) has87FT = true;
            });

            if (has37HT) corners37HT++;
            if (has87FT) corners87FT++;
        });

        const avgFor = gamesCount ? (totalCornersFor / gamesCount).toFixed(1) : 0;
        const avgAgainst = gamesCount ? (totalCornersAgainst / gamesCount).toFixed(1) : 0;
        const avgTotal = gamesCount ? ((totalCornersFor + totalCornersAgainst) / gamesCount).toFixed(1) : 0;

        // Check if we have ANY corner data (events or comments) across all matches
        const hasCornerEvents = matches.some(m => {
            // Check events array first
            const events = m.events || [];
            const hasEventCorners = events.some(e => e.type?.name === 'Corner' || e.type?.name === 'Corners');

            // Check comments if no events
            if (!hasEventCorners && m.comments) {
                const commentCorners = extractCornersFromCommentaries(m.comments);
                return commentCorners.length > 0;
            }

            return hasEventCorners;
        });

        // If no corner events are available, return null for races and intervals
        // This allows the frontend to gracefully handle missing data
        if (!hasCornerEvents) {
            return {
                avgFor,
                avgAgainst,
                avgTotal,
                races: null, // Not available without events
                trends: {
                    over85: gamesCount ? ((over85Count / gamesCount) * 100).toFixed(0) : 0,
                },
                intervals: null // Not available without events
            };
        }

        // Calculate Frequency % for intervals
        const formattedIntervals = {};
        Object.keys(intervals).forEach(key => {
            const data = intervals[key];
            formattedIntervals[key] = {
                avgFor: gamesCount ? (data.for / gamesCount).toFixed(1) : 0,
                avgAgainst: gamesCount ? (data.against / gamesCount).toFixed(1) : 0,
                frequency: gamesCount ? ((data.count / gamesCount) * 100).toFixed(0) : 0
            };
        });

        // Add special intervals
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

    // We expect homeHistory and awayHistory to be the detailed arrays already filtered by location
    const homeStats = processMatches(homeHistory || [], homeId);
    const awayStats = processMatches(awayHistory || [], awayId);

    return {
        home: homeStats,
        away: awayStats
    };
};
