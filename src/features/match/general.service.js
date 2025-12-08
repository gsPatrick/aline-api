
// Helper to find specific stat type in array
const findStat = (stats, typeName) => {
    if (!stats) return 0;
    // Check for exact name, developer name, or simple name match
    const stat = stats.find(s =>
        s.type?.name === typeName ||
        s.type?.developer_name === typeName ||
        s.type?.code === typeName
    );
    return stat?.data?.value ?? stat?.value ?? 0;
};

export const calculateGeneralStats = (homeHistory, awayHistory, homeId, awayId) => {

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

        // Shots Accumulators
        let totalShots = 0;
        let shotsOnGoal = 0;
        let shotsOffGoal = 0;
        let shotsBlocked = 0;
        let shotsInsideBox = 0;
        let shotsOutsideBox = 0;

        // Control Accumulators
        let possession = 0;
        let offsides = 0;
        let fouls = 0;
        let passes = 0;

        matches.forEach(match => {
            const stats = match.statistics || [];
            // Filter stats for this team
            const teamStats = stats.filter(s => s.participant_id == teamId);

            // Shots
            totalShots += findStat(teamStats, 'Shots Total');
            shotsOnGoal += findStat(teamStats, 'Shots On Target');
            shotsOffGoal += findStat(teamStats, 'Shots Off Target');
            shotsBlocked += findStat(teamStats, 'Shots Blocked');
            shotsInsideBox += findStat(teamStats, 'Shots Insidebox');
            shotsOutsideBox += findStat(teamStats, 'Shots Outsidebox');

            // Control
            possession += findStat(teamStats, 'Ball Possession %');
            offsides += findStat(teamStats, 'Offsides');
            fouls += findStat(teamStats, 'Fouls');
            passes += findStat(teamStats, 'Passes');
        });

        // Calculate Averages
        const avg = (total) => gamesCount ? parseFloat((total / gamesCount).toFixed(1)) : 0;

        return {
            shots: {
                total: avg(totalShots),
                onGoal: avg(shotsOnGoal),
                offGoal: avg(shotsOffGoal),
                blocked: avg(shotsBlocked),
                insideBox: avg(shotsInsideBox),
                outsideBox: avg(shotsOutsideBox)
            },
            control: {
                possession: avg(possession), // %
                offsides: avg(offsides),
                fouls: avg(fouls),
                passes: avg(passes) // Usually integer, but avg can be float
            }
        };
    };

    const homeStats = processMatches(homeMatches, homeId);
    const awayStats = processMatches(awayMatches, awayId);

    return {
        home: homeStats,
        away: awayStats
    };
};
