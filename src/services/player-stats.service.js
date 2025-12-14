/**
 * Player Statistics Service
 * Fetches and aggregates player statistics per match for a team
 * 
 * IMPORTANT: Stats come from lineups.details, NOT fixture.statistics!
 * fixture.statistics = team-level stats (participant_id is team)
 * lineups.details = player-level stats per match
 */

import axios from 'axios';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Type IDs from lineups.details (per-player stats)
const STAT_TYPE_IDS = {
    // Shots
    shots: 42,              // Total shots
    shots_off: 58,          // Shots off target
    shots_blocked: 97,      // Blocked shots

    // Defense
    tackles: 78,            // Tackles
    interceptions: 100,     // Interceptions (verify)
    clearances: 96,         // Clearances (verify)

    // Fouls
    fouls: 56,              // Fouls committed

    // Passes
    passes: 80,             // Total passes
    passes_accurate: 116,   // Accurate passes
    passes_attempted: 120,  // Passes attempted
    pass_accuracy: 119,     // Pass accuracy %
    key_passes: 580,        // Key passes
    long_balls: 122,        // Long balls
    long_balls_accurate: 123, // Accurate long balls

    // Cards
    yellow_cards: 88,       // Yellow card
    red_cards: 83,          // Red card (verify)

    // Dribbles & Duels
    duels_won: 105,         // Duels won
    duels_lost: 106,        // Duels lost
    dribbles: 108,          // Dribble attempts
    dribbles_successful: 109, // Successful dribbles

    // Other
    minutes: 1584,          // Minutes played
    rating: 118,            // Player rating
    recoveries: 1491,       // Ball recoveries
    aerial_won: 107,        // Aerial duels won
};

// Categories for the sidebar
const STAT_CATEGORIES = {
    shots: {
        name: 'Finalizações',
        items: [
            { key: 'shots', label: 'Finalizações', type_id: STAT_TYPE_IDS.shots },
            { key: 'shots_off', label: 'Chutes para Fora', type_id: STAT_TYPE_IDS.shots_off },
            { key: 'shots_blocked', label: 'Chutes Bloqueados', type_id: STAT_TYPE_IDS.shots_blocked },
        ]
    },
    tackles: {
        name: 'Desarmes',
        items: [
            { key: 'tackles', label: 'Desarmes', type_id: STAT_TYPE_IDS.tackles },
            { key: 'clearances', label: 'Cortes', type_id: STAT_TYPE_IDS.clearances },
            { key: 'recoveries', label: 'Recuperações', type_id: STAT_TYPE_IDS.recoveries },
        ]
    },
    fouls: {
        name: 'Faltas',
        items: [
            { key: 'fouls', label: 'Faltas Cometidas', type_id: STAT_TYPE_IDS.fouls },
        ]
    },
    passes: {
        name: 'Passes',
        items: [
            { key: 'passes', label: 'Passes', type_id: STAT_TYPE_IDS.passes },
            { key: 'passes_accurate', label: 'Passes Certos', type_id: STAT_TYPE_IDS.passes_accurate },
            { key: 'key_passes', label: 'Passes Chave', type_id: STAT_TYPE_IDS.key_passes },
        ]
    },
    cards: {
        name: 'Cartões',
        items: [
            { key: 'yellow_cards', label: 'Cartões Amarelos', type_id: STAT_TYPE_IDS.yellow_cards },
        ]
    },
    duels: {
        name: 'Duelos',
        items: [
            { key: 'duels_won', label: 'Duelos Vencidos', type_id: STAT_TYPE_IDS.duels_won },
            { key: 'duels_lost', label: 'Duelos Perdidos', type_id: STAT_TYPE_IDS.duels_lost },
            { key: 'dribbles', label: 'Dribles', type_id: STAT_TYPE_IDS.dribbles },
            { key: 'aerial_won', label: 'Duelos Aéreos', type_id: STAT_TYPE_IDS.aerial_won },
        ]
    },
    other: {
        name: 'Outros',
        items: [
            { key: 'rating', label: 'Nota', type_id: STAT_TYPE_IDS.rating },
            { key: 'minutes', label: 'Minutos', type_id: STAT_TYPE_IDS.minutes },
        ]
    }
};

// Flatten all stat items for easy lookup
const ALL_STATS = Object.values(STAT_CATEGORIES).flatMap(cat => cat.items);

/**
 * Get player statistics from team's recent matches
 * Uses lineups.details for per-player stats!
 */
export const getTeamPlayerStats = async (teamId, statKey = 'shots', lastN = 20, token) => {
    try {
        // Use fixed dates from 2024 (current data)
        const startStr = '2024-06-01';
        const endStr = '2024-12-31';

        // Include lineups.details for per-player stats!
        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}/${teamId}?api_token=${token}&include=lineups.details;lineups.player;participants;scores&per_page=${lastN}`;

        console.log('Fetching player stats from:', fixturesUrl.replace(token, 'TOKEN'));

        const { data: fixturesResponse } = await axios.get(fixturesUrl);
        const fixtures = fixturesResponse.data || [];

        console.log(`Found ${fixtures.length} fixtures for team ${teamId}`);

        if (fixtures.length === 0) {
            return { players: [], matches: [], category: statKey };
        }

        // Find the stat config
        const statConfig = ALL_STATS.find(s => s.key === statKey) || ALL_STATS[0];
        console.log(`Looking for stat: ${statKey} (type_id: ${statConfig.type_id})`);

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
                possession: null
            };

            matchesInfo.push(matchInfo);

            // Get lineups for THIS TEAM only
            const teamLineups = fixture.lineups?.filter(
                l => l.team_id === Number(teamId)
            ) || [];

            // Process each player's lineup and extract their stats from details
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
                        position: lineup.position || lineup.formation_position,
                        jersey: lineup.jersey_number,
                        matches: {},
                        total: 0,
                        avg: 0,
                        p90: 0,
                        matchCount: 0,
                        totalMinutes: 0
                    });
                }

                // Get stat from lineups.details (THIS IS THE KEY!)
                const details = lineup.details || [];
                const statDetail = details.find(d => d.type_id === statConfig.type_id);
                const statValue = statDetail?.data?.value ?? 0;

                // Get minutes played for P90 calculation
                const minutesDetail = details.find(d => d.type_id === STAT_TYPE_IDS.minutes);
                const minutesPlayed = minutesDetail?.data?.value ?? 0;

                // Update player data
                const playerData = playersMap.get(playerId);
                playerData.matches[fixture.id] = {
                    value: statValue,
                    minutes: minutesPlayed
                };
                playerData.total += Number(statValue) || 0;
                playerData.matchCount += 1;
                playerData.totalMinutes += minutesPlayed;
            }
        }

        // 3. Calculate averages and P90
        const players = Array.from(playersMap.values()).map(player => {
            player.avg = player.matchCount > 0
                ? Math.round((player.total / player.matchCount) * 100) / 100
                : 0;

            // P90 = (total / totalMinutes) * 90
            player.p90 = player.totalMinutes > 0
                ? Math.round((player.total / player.totalMinutes) * 90 * 100) / 100
                : player.avg;

            return player;
        });

        // Sort by total (descending)
        players.sort((a, b) => b.total - a.total);

        console.log(`Processed ${players.length} players, ${matchesInfo.length} matches`);

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

export { STAT_CATEGORIES, STAT_TYPE_IDS };
