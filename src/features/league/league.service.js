// League Service - Comprehensive League Dashboard Data
// Fetches standings, fixtures, topscorers, and calculates insights

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

/**
 * Get current season ID for a league
 * @param {number} leagueId - League ID
 * @returns {Object} League info with current season ID
 */
export const getCurrentSeason = async (leagueId) => {
    try {
        const url = `${BASE_URL}/leagues/${leagueId}?api_token=${token}&include=currentSeason;country`;
        const { data } = await axios.get(url);

        const league = data.data;
        const currentSeason = league.currentSeason || league.current_season;

        return {
            id: league.id,
            name: league.name,
            logo: league.image_path,
            country: league.country?.name || 'International',
            country_flag: league.country?.image_path,
            current_season_id: currentSeason?.id,
            season_name: currentSeason?.name
        };
    } catch (error) {
        console.error('Error fetching current season:', error.message);
        throw error;
    }
};

/**
 * Get standings for a season
 * @param {number} seasonId - Season ID
 * @returns {Array} Standings data
 */
export const getStandings = async (seasonId) => {
    try {
        const url = `${BASE_URL}/standings/seasons/${seasonId}?api_token=${token}&include=participant;details`;
        const { data } = await axios.get(url);

        return data.data || [];
    } catch (error) {
        console.error('Error fetching standings:', error.message);
        return [];
    }
};

/**
 * Get current round fixtures
 * @param {number} seasonId - Season ID
 * @returns {Object} Current round info with fixtures
 */
export const getCurrentRoundFixtures = async (seasonId) => {
    try {
        // First, get the season to find current round
        const seasonUrl = `${BASE_URL}/seasons/${seasonId}?api_token=${token}`;
        const { data: seasonData } = await axios.get(seasonUrl);

        // Get current round from season or calculate
        const currentRoundId = seasonData.data?.current_round_id;

        if (!currentRoundId) {
            return { round_id: null, name: null, fixtures: [] };
        }

        // Fetch fixtures for current round
        const fixturesUrl = `${BASE_URL}/fixtures?api_token=${token}&filter=roundId:${currentRoundId}&include=participants;scores;state`;
        const { data: fixturesData } = await axios.get(fixturesUrl);

        const fixtures = fixturesData.data || [];

        return {
            round_id: currentRoundId,
            name: fixtures[0]?.round?.name || `Rodada ${currentRoundId}`,
            fixtures: fixtures.map(f => ({
                id: f.id,
                home_team: {
                    name: f.participants?.find(p => p.meta?.location === 'home')?.name,
                    logo: f.participants?.find(p => p.meta?.location === 'home')?.image_path
                },
                away_team: {
                    name: f.participants?.find(p => p.meta?.location === 'away')?.name,
                    logo: f.participants?.find(p => p.meta?.location === 'away')?.image_path
                },
                score: `${f.scores?.[0]?.score?.goals || 0}-${f.scores?.[1]?.score?.goals || 0}`,
                status: f.state?.state || 'NS',
                starting_at: f.starting_at
            }))
        };
    } catch (error) {
        console.error('Error fetching current round fixtures:', error.message);
        return { round_id: null, name: null, fixtures: [] };
    }
};

/**
 * Get topscorers for a season
 * @param {number} seasonId - Season ID
 * @returns {Object} Top players by goals, assists, and rating
 */
export const getTopscorers = async (seasonId) => {
    try {
        const url = `${BASE_URL}/topscorers/seasons/${seasonId}?api_token=${token}&include=player;participant`;
        const { data } = await axios.get(url);

        const topscorers = data.data || [];

        // Sort by goals
        const byGoals = [...topscorers]
            .sort((a, b) => (b.goals || 0) - (a.goals || 0))
            .slice(0, 5)
            .map(t => ({
                player_name: t.player?.display_name || t.player?.name,
                team_name: t.participant?.name,
                team_logo: t.participant?.image_path,
                goals: t.goals || 0
            }));

        // Sort by assists
        const byAssists = [...topscorers]
            .sort((a, b) => (b.assists || 0) - (a.assists || 0))
            .slice(0, 5)
            .map(t => ({
                player_name: t.player?.display_name || t.player?.name,
                team_name: t.participant?.name,
                team_logo: t.participant?.image_path,
                assists: t.assists || 0
            }));

        // Sort by rating
        const byRating = [...topscorers]
            .filter(t => t.rating)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5)
            .map(t => ({
                player_name: t.player?.display_name || t.player?.name,
                team_name: t.participant?.name,
                team_logo: t.participant?.image_path,
                rating: t.rating ? parseFloat(t.rating).toFixed(2) : 0
            }));

        return {
            scorers: byGoals,
            assists: byAssists,
            ratings: byRating
        };
    } catch (error) {
        console.error('Error fetching topscorers:', error.message);
        return { scorers: [], assists: [], ratings: [] };
    }
};

/**
 * Process standings data into table format
 * @param {Array} standings - Raw standings data
 * @returns {Array} Processed standings table
 */
export const processStandings = (standings) => {
    return standings.map(standing => {
        const details = standing.details || [];
        const participant = standing.participant || {};

        // Determine status color (promotion/relegation zones)
        let status = null;
        if (standing.position <= 4) {
            status = 'Champions League';
        } else if (standing.position <= 6) {
            status = 'Europa League';
        } else if (standing.position >= standings.length - 2) {
            status = 'Relegation';
        }

        // Build form string (last 5 matches)
        const form = standing.recent_form || standing.form || 'N/A';

        return {
            position: standing.position,
            team_name: participant.name,
            team_logo: participant.image_path,
            points: standing.points,
            stats: {
                p: standing.played || 0,
                w: standing.won || 0,
                d: standing.draw || 0,
                l: standing.lost || 0,
                goals: `${standing.goals_for || 0}:${standing.goals_against || 0}`
            },
            form: form,
            status: status
        };
    });
};

/**
 * Calculate league insights from standings
 * @param {Array} standings - Raw standings data
 * @returns {Object} League insights (best attack, defense, etc)
 */
export const calculateLeagueInsights = (standings) => {
    if (!standings || standings.length === 0) {
        return {
            bestAttack: null,
            bestDefense: null,
            mostWins: null,
            mostLosses: null
        };
    }

    // Find best attack (most goals scored)
    const bestAttack = standings.reduce((best, current) => {
        const currentGoals = current.goals_for || 0;
        const bestGoals = best.goals_for || 0;
        return currentGoals > bestGoals ? current : best;
    });

    // Find best defense (least goals conceded)
    const bestDefense = standings.reduce((best, current) => {
        const currentGoals = current.goals_against || 999;
        const bestGoals = best.goals_against || 999;
        return currentGoals < bestGoals ? current : best;
    });

    // Find most wins
    const mostWins = standings.reduce((best, current) => {
        const currentWins = current.won || 0;
        const bestWins = best.won || 0;
        return currentWins > bestWins ? current : best;
    });

    // Find most losses
    const mostLosses = standings.reduce((best, current) => {
        const currentLosses = current.lost || 0;
        const bestLosses = best.lost || 0;
        return currentLosses > bestLosses ? current : best;
    });

    return {
        bestAttack: {
            team: bestAttack.participant?.name || 'N/A',
            value: bestAttack.goals_for || 0
        },
        bestDefense: {
            team: bestDefense.participant?.name || 'N/A',
            value: bestDefense.goals_against || 0
        },
        mostWins: {
            team: mostWins.participant?.name || 'N/A',
            value: mostWins.won || 0
        },
        mostLosses: {
            team: mostLosses.participant?.name || 'N/A',
            value: mostLosses.lost || 0
        }
    };
};

/**
 * Calculate detailed team stats table
 * @param {Array} standings - Raw standings data
 * @returns {Array} Team stats for detailed table
 */
export const calculateTeamStatsTable = (standings) => {
    return standings.map(standing => {
        const participant = standing.participant || {};
        const played = standing.played || 1; // Avoid division by zero

        // Calculate percentages
        const goalsFor = standing.goals_for || 0;
        const goalsAgainst = standing.goals_against || 0;

        // BTTS approximation (if both scored and conceded > 0 on average)
        const avgGoalsFor = goalsFor / played;
        const avgGoalsAgainst = goalsAgainst / played;
        const bttsApprox = (avgGoalsFor > 0.5 && avgGoalsAgainst > 0.5) ? 60 : 30;

        // Over 2.5 approximation
        const avgTotalGoals = (goalsFor + goalsAgainst) / played;
        const over25Approx = avgTotalGoals > 2.5 ? 70 : 30;

        return {
            team: participant.name,
            team_logo: participant.image_path,
            over05HT: Math.round(Math.random() * 40 + 40), // Placeholder (40-80%)
            over25FT: Math.round(over25Approx),
            btts: Math.round(bttsApprox),
            avgGoals: avgTotalGoals.toFixed(1),
            avgCorners: 'N/A' // Not available without detailed stats
        };
    });
};

/**
 * Main function: Get complete league details
 * @param {number} leagueId - League ID
 * @returns {Object} Complete league dashboard data
 */
export const getLeagueDetails = async (leagueId) => {
    try {
        console.log(`Fetching league details for ID: ${leagueId}`);

        // Step 1: Get current season
        const leagueInfo = await getCurrentSeason(leagueId);

        if (!leagueInfo.current_season_id) {
            throw new Error('No current season found for this league');
        }

        const seasonId = leagueInfo.current_season_id;

        // Step 2: Parallel fetch of all data
        const [standings, currentRound, topPlayers] = await Promise.all([
            getStandings(seasonId),
            getCurrentRoundFixtures(seasonId),
            getTopscorers(seasonId)
        ]);

        // Step 3: Process data
        const processedStandings = processStandings(standings);
        const leagueInsights = calculateLeagueInsights(standings);
        const teamStatsTable = calculateTeamStatsTable(standings);

        // Step 4: Build response
        return {
            leagueInfo: {
                name: leagueInfo.name,
                country: leagueInfo.country,
                season: leagueInfo.season_name,
                logo: leagueInfo.logo,
                country_flag: leagueInfo.country_flag
            },
            currentRound,
            standings: processedStandings,
            leagueInsights,
            topPlayers,
            teamStatsTable
        };

    } catch (error) {
        console.error('Error fetching league details:', error.message);
        throw error;
    }
};
