/**
 * Player Statistics Service
 * Fetches and aggregates player statistics per match for a team
 */

import axios from 'axios';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Stat type mappings - what we can fetch from SportMonks
const STAT_CATEGORIES = {
    shots: {
        name: 'Shots',
        items: [
            { key: 'shots', label: 'Shots', type_id: 42 },
            { key: 'shots_on_target', label: 'Shots on Target', type_id: 86 },
            { key: 'shots_blocked', label: 'Blocked Shots', type_id: 57 },
        ]
    },
    tackles: {
        name: 'Tackles',
        items: [
            { key: 'tackles', label: 'Tackles', type_id: 79 },
            { key: 'interceptions', label: 'Interceptions', type_id: 80 },
            { key: 'clearances', label: 'Clearances', type_id: 81 },
        ]
    },
    fouls: {
        name: 'Fouls',
        items: [
            { key: 'fouls', label: 'Fouls Committed', type_id: 56 },
        ]
    },
    passes: {
        name: 'Passes',
        items: [
            { key: 'passes', label: 'Passes', type_id: 77 },
            { key: 'accurate_passes', label: 'Accurate Passes', type_id: 78 },
        ]
    },
    cards: {
        name: 'Cards',
        items: [
            { key: 'yellow_cards', label: 'Yellow Cards', type_id: 84 },
            { key: 'red_cards', label: 'Red Cards', type_id: 83 },
        ]
    },
    goals: {
        name: 'Goals',
        items: [
            { key: 'goals', label: 'Goals', type_id: 52 },
            { key: 'assists', label: 'Assists', type_id: 79 },
        ]
    },
    other: {
        name: 'Other',
        items: [
            { key: 'offsides', label: 'Offsides', type_id: 37 },
            { key: 'saves', label: 'Goalkeeper Saves', type_id: 60 },
        ]
    }
};

// Flatten all stat items for easy lookup
const ALL_STATS = Object.values(STAT_CATEGORIES).flatMap(cat => cat.items);

/**
 * Get player statistics from team's recent matches
 * @param {number} teamId - Team ID
 * @param {string} statKey - Stat type key (shots, tackles, etc)
 * @param {number} lastN - Number of last matches to fetch
 * @param {string} token - API token
 */
export const getTeamPlayerStats = async (teamId, statKey = 'shots', lastN = 20, token) => {
    try {
        // Calculate date range (last 6 months to today)
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        // 1. Get team's fixtures with lineups and statistics using the correct endpoint
        // SportMonks uses: /fixtures/between/{start_date}/{end_date}/{team_id}
        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}/${teamId}?api_token=${token}&include=lineups.player;statistics;participants;scores&per_page=${lastN}`;

        console.log('Fetching player stats from:', fixturesUrl.replace(token, 'TOKEN'));

        const { data: fixturesResponse } = await axios.get(fixturesUrl);
        const fixtures = fixturesResponse.data || [];

        console.log(`Found ${fixtures.length} fixtures for team ${teamId}`);

        if (fixtures.length === 0) {
            return { players: [], matches: [], category: statKey };
        }

        // Find the stat config
        const statConfig = ALL_STATS.find(s => s.key === statKey) || ALL_STATS[0];

        // 2. Build player stats matrix
        const playersMap = new Map();
        const matchesInfo = [];

        for (const fixture of fixtures) {
            // Get match info
            const homeTeam = fixture.participants?.find(p => p.meta?.location === 'home');
            const awayTeam = fixture.participants?.find(p => p.meta?.location === 'away');
            const isHome = homeTeam?.id === Number(teamId);
            const opponent = isHome ? awayTeam : homeTeam;

            const homeScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals ?? 0;
            const awayScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals ?? 0;

            const matchInfo = {
                id: fixture.id,
                date: fixture.starting_at,
                opponent: {
                    id: opponent?.id,
                    name: opponent?.name,
                    logo: opponent?.image_path
                },
                isHome,
                score: isHome ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`,
                result: isHome
                    ? (homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D')
                    : (awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D'),
                possession: null // Will be filled from stats if available
            };

            // Get possession from statistics
            const possessionStat = fixture.statistics?.find(
                s => s.type_id === 45 && s.participant_id === Number(teamId)
            );
            if (possessionStat) {
                matchInfo.possession = possessionStat.data?.value || null;
            }

            matchesInfo.push(matchInfo);

            // Get lineups for this team
            const teamLineups = fixture.lineups?.filter(
                l => l.team_id === Number(teamId)
            ) || [];

            // For each player in lineup, get their stat
            for (const lineup of teamLineups) {
                const playerId = lineup.player_id;
                const player = lineup.player;

                if (!player) continue;

                // Initialize player if not exists
                if (!playersMap.has(playerId)) {
                    playersMap.set(playerId, {
                        id: playerId,
                        name: player.common_name || player.display_name || player.name,
                        image: player.image_path,
                        position: lineup.position,
                        jersey: lineup.jersey_number,
                        matches: {},
                        total: 0,
                        avg: 0,
                        p90: 0,
                        matchCount: 0
                    });
                }

                // Find stat for this player in this match
                const playerStat = fixture.statistics?.find(
                    s => s.type_id === statConfig.type_id && s.player_id === playerId
                );

                const statValue = playerStat?.data?.value ?? 0;

                // Update player data
                const playerData = playersMap.get(playerId);
                playerData.matches[fixture.id] = {
                    value: statValue,
                    minutes: lineup.formation_position ? 90 : (lineup.substitution?.minute || 0)
                };
                playerData.total += statValue;
                playerData.matchCount += 1;
            }
        }

        // 3. Calculate averages and P90
        const players = Array.from(playersMap.values()).map(player => {
            player.avg = player.matchCount > 0
                ? Math.round((player.total / player.matchCount) * 100) / 100
                : 0;
            player.p90 = player.avg; // Simplified - would need minutes data for true P90
            return player;
        });

        // Sort by total (descending)
        players.sort((a, b) => b.total - a.total);

        return {
            teamId,
            category: statKey,
            categoryLabel: statConfig.label,
            statTypes: STAT_CATEGORIES,
            players,
            matches: matchesInfo
        };

    } catch (error) {
        console.error('Error fetching player stats:', error.message);
        throw error;
    }
};

/**
 * Get season statistics for a single player
 */
export const getPlayerSeasonStats = async (playerId, token) => {
    try {
        const url = `${BASE_URL}/statistics/seasons/players/${playerId}?api_token=${token}`;
        const { data } = await axios.get(url);
        return data.data || [];
    } catch (error) {
        console.error('Error fetching player season stats:', error.message);
        return [];
    }
};

export { STAT_CATEGORIES };
