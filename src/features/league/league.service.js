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
        const url = `${BASE_URL}/leagues/${leagueId}?api_token=${token}&include=currentSeason;country;seasons`;
        const { data } = await axios.get(url);

        const league = data.data;
        let currentSeason = league.currentSeason || league.current_season;

        // If no current season found, try to get the most recent one from seasons list
        if (!currentSeason && league.seasons && league.seasons.length > 0) {
            // Sort seasons by ID descending to get the most recent
            const sortedSeasons = [...league.seasons].sort((a, b) => b.id - a.id);
            currentSeason = sortedSeasons[0];
            console.log(`No currentSeason, using most recent season: ${currentSeason?.name} (ID: ${currentSeason?.id})`);
        }

        return {
            id: league.id,
            name: league.name,
            logo: league.image_path,
            country: league.country?.name || 'International',
            country_flag: league.country?.image_path,
            current_season_id: currentSeason?.id || null,
            season_name: currentSeason?.name || 'N/A'
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
        // Include details for stats and form for recent results
        const url = `${BASE_URL}/standings/seasons/${seasonId}?api_token=${token}&include=participant;details;form`;
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
    return standings.map((standing, index) => {
        const participant = standing.participant || {};
        const details = standing.details || [];

        // Helper to find detail value by type_id
        const getDetailValue = (typeId) => {
            const detail = details.find(d => d.type_id === typeId);
            return detail ? detail.value : 0;
        };

        // Overall stats (type_ids 129-135)
        const gamesPlayed = getDetailValue(129);
        const won = getDetailValue(130);
        const draw = getDetailValue(131);
        const lost = getDetailValue(132);
        const goalsFor = getDetailValue(133);
        const goalsAgainst = getDetailValue(134);

        // Home stats (type_ids 136-141)
        const homeWon = getDetailValue(136);
        const homeDraw = getDetailValue(137);
        const homeLost = getDetailValue(138);
        const homeGoalsFor = getDetailValue(139);
        const homeGoalsAgainst = getDetailValue(140);
        const homePlayed = homeWon + homeDraw + homeLost;
        // Points calculation (3 for win, 1 for draw)
        const homePoints = (homeWon * 3) + homeDraw;

        // Away stats (type_ids 142-147)
        const awayPlayed = getDetailValue(141);
        const awayWon = getDetailValue(142);
        const awayDraw = getDetailValue(143);
        const awayLost = getDetailValue(144);
        const awayGoalsFor = getDetailValue(145);
        const awayGoalsAgainst = getDetailValue(146);
        const awayPoints = (awayWon * 3) + awayDraw;

        // Calculate form string from last 5 matches (Priority: standing.form include)
        let recentForm = '';

        if (standing.form && Array.isArray(standing.form)) {
            recentForm = standing.form
                .slice(-5) // Get last 5
                .map(match => {
                    const formChar = match.form; // Property is 'form'
                    // Return English codes (W/D/L) because frontend handles translation and styling
                    if (formChar === 'W') return 'W';
                    if (formChar === 'D') return 'D';
                    if (formChar === 'L') return 'L';
                    return '';
                })
                .join('');
        }

        // Fallback to details if array not available
        if (!recentForm) {
            const formDetail = details.find(d => d.type_id === 185)?.value;
            if (formDetail && typeof formDetail === 'string') {
                recentForm = formDetail.replace(/W/g, 'V').replace(/L/g, 'D'); // Translate if needed
            }
        }

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
        const formString = recentForm || '';

        return {
            position: standing.position,
            team_id: participant.id,
            team_name: participant.name,
            team_logo: participant.image_path,
            points: standing.points,
            stats: {
                p: gamesPlayed,
                w: won,
                d: draw,
                l: lost,
                goals: `${goalsFor}:${goalsAgainst}`
            },
            goals_for: goalsFor,
            goals_against: goalsAgainst,
            won: won,
            draw: draw,
            lost: lost,
            form: formString,
            status: status,
            // Home stats for filter
            home: {
                played: homePlayed,
                won: homeWon,
                draw: homeDraw,
                lost: homeLost,
                goals_for: homeGoalsFor,
                goals_against: homeGoalsAgainst,
                points: homePoints
            },
            // Away stats for filter
            away: {
                played: awayPlayed,
                won: awayWon,
                draw: awayDraw,
                lost: awayLost,
                goals_for: awayGoalsFor,
                goals_against: awayGoalsAgainst,
                points: awayPoints
            }
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
 * Fetch real match statistics for a team from fixture history
 * @param {number} teamId - Team ID
 * @param {number} seasonId - Season ID
 * @returns {Object} Real stats calculated from match history
 */
export const getTeamRealStats = async (teamId, seasonId) => {
    try {
        const url = `${BASE_URL}/fixtures?api_token=${token}&include=scores&filters=participantIds:${teamId};seasonIds:${seasonId}`;
        const { data } = await axios.get(url);
        const fixtures = data.data || [];

        if (fixtures.length === 0) {
            return null;
        }

        let stats = {
            played: 0,
            over05HT: 0, over05FT: 0, over15FT: 0, over25FT: 0,
            btts: 0, cleanSheet: 0, failedToScore: 0,
            totalFor: 0, totalAgainst: 0,
            // Home stats
            homePlayed: 0, homeOver25: 0, homeBtts: 0, homeClean: 0, homeFailedToScore: 0,
            homeTotalFor: 0, homeTotalAgainst: 0,
            // Away stats
            awayPlayed: 0, awayOver25: 0, awayBtts: 0, awayClean: 0, awayFailedToScore: 0,
            awayTotalFor: 0, awayTotalAgainst: 0
        };

        fixtures.forEach(fix => {
            // Only count finished matches
            if (fix.state_id !== 5) return; // 5 = finished

            const scores = fix.scores || [];
            let homeGoals = 0, awayGoals = 0, htHomeGoals = 0, htAwayGoals = 0;

            // Extract goals from scores
            scores.forEach(s => {
                const desc = s.description;
                const participant = s.score?.participant;
                const goals = s.score?.goals || 0;

                if (desc === 'CURRENT' || desc === 'FT' || desc === '2ND_HALF') {
                    if (participant === 'home') homeGoals = Math.max(homeGoals, goals);
                    else if (participant === 'away') awayGoals = Math.max(awayGoals, goals);
                }
                if (desc === '1ST_HALF' || desc === 'HT') {
                    if (participant === 'home') htHomeGoals = goals;
                    else if (participant === 'away') htAwayGoals = goals;
                }
            });

            const totalGoals = homeGoals + awayGoals;
            const htTotalGoals = htHomeGoals + htAwayGoals;

            // Determine if team is home or away
            const participants = fix.participants || [];
            const isHome = participants.some(p => p.id === teamId && p.meta?.location === 'home');
            const teamGoals = isHome ? homeGoals : awayGoals;
            const oppGoals = isHome ? awayGoals : homeGoals;

            stats.played++;
            stats.totalFor += teamGoals;
            stats.totalAgainst += oppGoals;

            // Full Time stats
            if (totalGoals > 0.5) stats.over05FT++;
            if (totalGoals > 1.5) stats.over15FT++;
            if (totalGoals > 2.5) stats.over25FT++;
            if (htTotalGoals > 0.5) stats.over05HT++;
            if (homeGoals > 0 && awayGoals > 0) stats.btts++;
            if (oppGoals === 0) stats.cleanSheet++;
            if (teamGoals === 0) stats.failedToScore++;

            // Home/Away specific stats
            if (isHome) {
                stats.homePlayed++;
                stats.homeTotalFor += teamGoals;
                stats.homeTotalAgainst += oppGoals;
                if (totalGoals > 2.5) stats.homeOver25++;
                if (homeGoals > 0 && awayGoals > 0) stats.homeBtts++;
                if (oppGoals === 0) stats.homeClean++;
                if (teamGoals === 0) stats.homeFailedToScore++;
            } else {
                stats.awayPlayed++;
                stats.awayTotalFor += teamGoals;
                stats.awayTotalAgainst += oppGoals;
                if (totalGoals > 2.5) stats.awayOver25++;
                if (homeGoals > 0 && awayGoals > 0) stats.awayBtts++;
                if (oppGoals === 0) stats.awayClean++;
                if (teamGoals === 0) stats.awayFailedToScore++;
            }
        });

        const pct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;
        const avg = (val, total) => total > 0 ? (val / total).toFixed(2) : '0.00';

        return {
            played: stats.played,
            over05ht: pct(stats.over05HT, stats.played),
            over05ft: pct(stats.over05FT, stats.played),
            over15ft: pct(stats.over15FT, stats.played),
            over25ft: pct(stats.over25FT, stats.played),
            btts: pct(stats.btts, stats.played),
            cleanSheet: pct(stats.cleanSheet, stats.played),
            failedToScore: pct(stats.failedToScore, stats.played),
            avgFor: avg(stats.totalFor, stats.played),
            avgAgainst: avg(stats.totalAgainst, stats.played),
            avgTotal: avg(stats.totalFor + stats.totalAgainst, stats.played),
            // Home stats
            homeStats: {
                played: stats.homePlayed,
                over25ft: pct(stats.homeOver25, stats.homePlayed),
                btts: pct(stats.homeBtts, stats.homePlayed),
                cleanSheet: pct(stats.homeClean, stats.homePlayed),
                failedToScore: pct(stats.homeFailedToScore, stats.homePlayed),
                avgFor: avg(stats.homeTotalFor, stats.homePlayed),
                avgAgainst: avg(stats.homeTotalAgainst, stats.homePlayed),
                avgTotal: avg(stats.homeTotalFor + stats.homeTotalAgainst, stats.homePlayed)
            },
            // Away stats
            awayStats: {
                played: stats.awayPlayed,
                over25ft: pct(stats.awayOver25, stats.awayPlayed),
                btts: pct(stats.awayBtts, stats.awayPlayed),
                cleanSheet: pct(stats.awayClean, stats.awayPlayed),
                failedToScore: pct(stats.awayFailedToScore, stats.awayPlayed),
                avgFor: avg(stats.awayTotalFor, stats.awayPlayed),
                avgAgainst: avg(stats.awayTotalAgainst, stats.awayPlayed),
                avgTotal: avg(stats.awayTotalFor + stats.awayTotalAgainst, stats.awayPlayed)
            }
        };
    } catch (error) {
        console.error(`Error fetching real stats for team ${teamId}:`, error.message);
        return null;
    }
};

/**
 * Calculate detailed team stats table with REAL match data
 * Fetches ALL season fixtures ONCE, then calculates stats per team locally
 * @param {Array} standings - Raw standings data
 * @param {number} seasonId - Season ID to fetch fixtures from
 * @returns {Promise<Array>} Team stats for detailed table
 */
export const calculateTeamStatsTableReal = async (standings, seasonId) => {
    console.log(`Fetching all fixtures for season ${seasonId} to calculate real stats...`);

    // Fetch ALL fixtures for the season with pagination
    let allFixtures = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore && page <= 20) { // Max 20 pages = 500 fixtures (safety limit)
            const url = `${BASE_URL}/fixtures?api_token=${token}&include=scores;participants&filters=fixtureSeasons:${seasonId}&page=${page}&per_page=50`;
            const { data } = await axios.get(url);
            const fixtures = data.data || [];
            allFixtures = allFixtures.concat(fixtures);

            // Check if there are more pages
            const pagination = data.pagination || {};
            hasMore = pagination.has_more || (fixtures.length === 50);
            page++;
        }

        console.log(`Fetched ${allFixtures.length} total fixtures for season ${seasonId}`);

        // Only count finished matches
        const finishedFixtures = allFixtures.filter(f => f.state_id === 5);
        console.log(`${finishedFixtures.length} finished fixtures to analyze`);

        // Calculate stats for each team
        const teamStats = standings.map(standing => {
            const participant = standing.participant || {};
            const teamId = participant.id;

            // Get fixtures where this team participated
            const teamFixtures = finishedFixtures.filter(fix =>
                (fix.participants || []).some(p => p.id === teamId)
            );

            if (teamFixtures.length === 0) {
                return {
                    team_id: teamId,
                    team: participant.name,
                    team_logo: participant.image_path,
                    over05ht: 0, over05ft: 0, over15ft: 0, over25ft: 0,
                    btts: 0, cleanSheet: 0, failedToScore: 0,
                    avgFor: '0.00', avgAgainst: '0.00', avgTotal: '0.00',
                    homeStats: {}, awayStats: {},
                    over75corners: 50, over85corners: 40, over95corners: 30, over105corners: 20,
                    avgCorners: '9.5'
                };
            }

            // Stats accumulators
            let stats = {
                played: 0, over05HT: 0, over05FT: 0, over15FT: 0, over25FT: 0,
                btts: 0, cleanSheet: 0, failedToScore: 0, totalFor: 0, totalAgainst: 0,
                homePlayed: 0, homeOver25: 0, homeBtts: 0, homeClean: 0, homeFailedToScore: 0, homeTotalFor: 0, homeTotalAgainst: 0,
                awayPlayed: 0, awayOver25: 0, awayBtts: 0, awayClean: 0, awayFailedToScore: 0, awayTotalFor: 0, awayTotalAgainst: 0
            };

            teamFixtures.forEach(fix => {
                const scores = fix.scores || [];
                let homeGoals = 0, awayGoals = 0, htHomeGoals = 0, htAwayGoals = 0;

                scores.forEach(s => {
                    const desc = s.description;
                    const participant = s.score?.participant;
                    const goals = s.score?.goals || 0;

                    if (desc === 'CURRENT' || desc === 'FT' || desc === '2ND_HALF') {
                        if (participant === 'home') homeGoals = Math.max(homeGoals, goals);
                        else if (participant === 'away') awayGoals = Math.max(awayGoals, goals);
                    }
                    if (desc === '1ST_HALF' || desc === 'HT') {
                        if (participant === 'home') htHomeGoals = goals;
                        else if (participant === 'away') htAwayGoals = goals;
                    }
                });

                const totalGoals = homeGoals + awayGoals;
                const htTotalGoals = htHomeGoals + htAwayGoals;

                // Determine if team is home or away
                const participants = fix.participants || [];
                const teamParticipant = participants.find(p => p.id === teamId);
                const isHome = teamParticipant?.meta?.location === 'home';
                const teamGoals = isHome ? homeGoals : awayGoals;
                const oppGoals = isHome ? awayGoals : homeGoals;

                stats.played++;
                stats.totalFor += teamGoals;
                stats.totalAgainst += oppGoals;

                if (totalGoals > 0.5) stats.over05FT++;
                if (totalGoals > 1.5) stats.over15FT++;
                if (totalGoals > 2.5) stats.over25FT++;
                if (htTotalGoals > 0.5) stats.over05HT++;
                if (homeGoals > 0 && awayGoals > 0) stats.btts++;
                if (oppGoals === 0) stats.cleanSheet++;
                if (teamGoals === 0) stats.failedToScore++;

                if (isHome) {
                    stats.homePlayed++;
                    stats.homeTotalFor += teamGoals;
                    stats.homeTotalAgainst += oppGoals;
                    if (totalGoals > 2.5) stats.homeOver25++;
                    if (homeGoals > 0 && awayGoals > 0) stats.homeBtts++;
                    if (oppGoals === 0) stats.homeClean++;
                    if (teamGoals === 0) stats.homeFailedToScore++;
                } else {
                    stats.awayPlayed++;
                    stats.awayTotalFor += teamGoals;
                    stats.awayTotalAgainst += oppGoals;
                    if (totalGoals > 2.5) stats.awayOver25++;
                    if (homeGoals > 0 && awayGoals > 0) stats.awayBtts++;
                    if (oppGoals === 0) stats.awayClean++;
                    if (teamGoals === 0) stats.awayFailedToScore++;
                }
            });

            const pct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;
            const avg = (val, total) => total > 0 ? (val / total).toFixed(2) : '0.00';

            return {
                team_id: teamId,
                team: participant.name,
                team_logo: participant.image_path,
                played: stats.played,
                over05ht: pct(stats.over05HT, stats.played),
                over05ft: pct(stats.over05FT, stats.played),
                over15ft: pct(stats.over15FT, stats.played),
                over25ft: pct(stats.over25FT, stats.played),
                btts: pct(stats.btts, stats.played),
                cleanSheet: pct(stats.cleanSheet, stats.played),
                failedToScore: pct(stats.failedToScore, stats.played),
                avgFor: avg(stats.totalFor, stats.played),
                avgAgainst: avg(stats.totalAgainst, stats.played),
                avgTotal: avg(stats.totalFor + stats.totalAgainst, stats.played),
                homeStats: {
                    played: stats.homePlayed,
                    over25ft: pct(stats.homeOver25, stats.homePlayed),
                    btts: pct(stats.homeBtts, stats.homePlayed),
                    cleanSheet: pct(stats.homeClean, stats.homePlayed),
                    failedToScore: pct(stats.homeFailedToScore, stats.homePlayed),
                    avgFor: avg(stats.homeTotalFor, stats.homePlayed),
                    avgAgainst: avg(stats.homeTotalAgainst, stats.homePlayed),
                    avgTotal: avg(stats.homeTotalFor + stats.homeTotalAgainst, stats.homePlayed)
                },
                awayStats: {
                    played: stats.awayPlayed,
                    over25ft: pct(stats.awayOver25, stats.awayPlayed),
                    btts: pct(stats.awayBtts, stats.awayPlayed),
                    cleanSheet: pct(stats.awayClean, stats.awayPlayed),
                    failedToScore: pct(stats.awayFailedToScore, stats.awayPlayed),
                    avgFor: avg(stats.awayTotalFor, stats.awayPlayed),
                    avgAgainst: avg(stats.awayTotalAgainst, stats.awayPlayed),
                    avgTotal: avg(stats.awayTotalFor + stats.awayTotalAgainst, stats.awayPlayed)
                },
                // Corner stats (placeholder - would need events data)
                over75corners: Math.round(40 + Math.random() * 30),
                over85corners: Math.round(30 + Math.random() * 25),
                over95corners: Math.round(25 + Math.random() * 20),
                over105corners: Math.round(15 + Math.random() * 15),
                avgCorners: (9 + Math.random() * 2).toFixed(1)
            };
        });

        console.log(`Real stats calculated for ${teamStats.length} teams`);
        return teamStats;

    } catch (error) {
        console.error('Error fetching fixtures for real stats:', error.message);
        // Return empty stats on error
        return standings.map(s => ({
            team_id: s.participant?.id,
            team: s.participant?.name,
            team_logo: s.participant?.image_path,
            over05ht: 0, over05ft: 0, over15ft: 0, over25ft: 0,
            btts: 0, cleanSheet: 0, failedToScore: 0,
            avgFor: '0.00', avgAgainst: '0.00', avgTotal: '0.00',
            homeStats: {}, awayStats: {}
        }));
    }
};

/**
 * Calculate detailed team stats table (SYNC version - approximations)
 * @param {Array} standings - Raw standings data
 * @returns {Array} Team stats for detailed table
 */
export const calculateTeamStatsTable = (standings) => {
    return standings.map(standing => {
        const participant = standing.participant || {};
        const details = standing.details || [];

        // Helper to find detail value by type_id
        const getDetailValue = (typeId) => {
            const detail = details.find(d => d.type_id === typeId);
            return detail ? detail.value : 0;
        };

        const played = getDetailValue(129) || 1; // Avoid division by zero
        const won = getDetailValue(130);
        const lost = getDetailValue(132);
        const goalsFor = getDetailValue(133) || 0;
        const goalsAgainst = getDetailValue(134) || 0;
        const cleanSheets = getDetailValue(179) || 0; // Type 179 seems to be clean sheets based on API

        // Calculate percentages based on averages
        const avgGoalsFor = goalsFor / played;
        const avgGoalsAgainst = goalsAgainst / played;
        const avgTotalGoals = (goalsFor + goalsAgainst) / played;

        // Calculate goal thresholds percentages based on averages
        // These are approximations based on goal scoring patterns
        const over05HT = Math.min(95, Math.round(avgGoalsFor * 45 + 20)); // Higher avg = higher chance
        const over05FT = Math.min(98, Math.round(avgTotalGoals * 35 + 30));
        const over15FT = Math.min(90, Math.round(avgTotalGoals * 30 + 10));
        const over25FT = Math.min(85, Math.round(avgTotalGoals > 2.5 ? avgTotalGoals * 25 : avgTotalGoals * 15));

        // BTTS - Both teams score
        const bttsPercent = Math.round((avgGoalsFor > 0.5 && avgGoalsAgainst > 0.5)
            ? Math.min(80, (avgGoalsFor + avgGoalsAgainst) * 20)
            : Math.max(20, (avgGoalsFor + avgGoalsAgainst) * 10));

        // Clean sheet percentage
        const cleanSheetPercent = Math.round((cleanSheets / played) * 100);

        // Failed to score percentage
        const matchesWithoutScoring = played - won - (avgGoalsFor > 0.5 ? played * 0.7 : played * 0.4);
        const failedToScorePercent = Math.max(0, Math.min(80, Math.round((matchesWithoutScoring / played) * 100)));

        // Home stats (type_ids 136-141)
        const homeWon = getDetailValue(136);
        const homeLost = getDetailValue(138);
        const homeGoalsFor = getDetailValue(139);
        const homeGoalsAgainst = getDetailValue(140);
        const homePlayed = homeWon + getDetailValue(137) + homeLost || 1;

        // Away stats (type_ids 142-147)
        const awayWon = getDetailValue(142);
        const awayLost = getDetailValue(144);
        const awayGoalsFor = getDetailValue(145);
        const awayGoalsAgainst = getDetailValue(146);
        const awayPlayed = getDetailValue(141) || 1;

        // Calculate home/away specific stats
        const homeAvgGoals = (homeGoalsFor + homeGoalsAgainst) / homePlayed;
        const awayAvgGoals = (awayGoalsFor + awayGoalsAgainst) / awayPlayed;

        return {
            team_id: participant.id,
            team: participant.name,
            team_logo: participant.image_path,
            // Goals stats
            over05ht: over05HT,
            over05ft: over05FT,
            over15ft: over15FT,
            over25ft: over25FT,
            btts: bttsPercent,
            cleanSheet: cleanSheetPercent,
            failedToScore: failedToScorePercent,
            avgGoals: avgTotalGoals.toFixed(2),
            avgAgainst: avgGoalsAgainst.toFixed(2),
            avgTotal: avgTotalGoals.toFixed(2),
            // Corners stats (placeholder - would need actual corner data)
            over75corners: Math.round(50 + Math.random() * 30),
            over85corners: Math.round(40 + Math.random() * 25),
            over95corners: Math.round(30 + Math.random() * 20),
            over105corners: Math.round(20 + Math.random() * 15),
            avgCorners: (9 + Math.random() * 2).toFixed(1),
            // Home stats
            homeStats: {
                over05ht: Math.min(95, Math.round((homeGoalsFor / homePlayed) * 50 + 20)),
                over05ft: Math.min(98, Math.round(homeAvgGoals * 35 + 30)),
                over15ft: Math.min(90, Math.round(homeAvgGoals * 30 + 10)),
                over25ft: Math.min(85, Math.round(homeAvgGoals > 2.5 ? homeAvgGoals * 25 : homeAvgGoals * 15)),
                btts: Math.round((homeGoalsFor / homePlayed > 0.5 && homeGoalsAgainst / homePlayed > 0.5) ? 60 : 35),
                cleanSheet: Math.round(60 - (homeGoalsAgainst / homePlayed) * 30),
                failedToScore: Math.round(30 - (homeGoalsFor / homePlayed) * 15),
                avgFor: (homeGoalsFor / homePlayed).toFixed(2),
                avgAgainst: (homeGoalsAgainst / homePlayed).toFixed(2),
                avgTotal: homeAvgGoals.toFixed(2)
            },
            // Away stats
            awayStats: {
                over05ht: Math.min(95, Math.round((awayGoalsFor / awayPlayed) * 45 + 15)),
                over05ft: Math.min(98, Math.round(awayAvgGoals * 35 + 25)),
                over15ft: Math.min(90, Math.round(awayAvgGoals * 28 + 8)),
                over25ft: Math.min(85, Math.round(awayAvgGoals > 2.5 ? awayAvgGoals * 22 : awayAvgGoals * 12)),
                btts: Math.round((awayGoalsFor / awayPlayed > 0.5 && awayGoalsAgainst / awayPlayed > 0.5) ? 55 : 30),
                cleanSheet: Math.round(50 - (awayGoalsAgainst / awayPlayed) * 25),
                failedToScore: Math.round(40 - (awayGoalsFor / awayPlayed) * 15),
                avgFor: (awayGoalsFor / awayPlayed).toFixed(2),
                avgAgainst: (awayGoalsAgainst / awayPlayed).toFixed(2),
                avgTotal: awayAvgGoals.toFixed(2)
            }
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
        console.log(`Getting details for league ${leagueId}`);
        // Fetch current season with rounds included (for filter)
        const leagueInfo = await getCurrentSeason(leagueId);

        // If getting league info also fetched season, use it. 
        // Note: getCurrentSeason already fetches 'currentSeason' include.
        // We might need to fetch season details separately if rounds aren't there, 
        // but let's check structure. getCurrentSeason returns standardized object.
        // We need the raw season ID to fetch rounds if not present.

        if (!leagueInfo.current_season_id) {
            console.warn(`No current season found for league ${leagueId}`);
            return {
                leagueInfo: {
                    id: leagueId,
                    name: "Unknown League",
                    logo: "",
                    country: "",
                    current_season_id: null
                },
                standings: [],
                currentRound: null,
                rounds: [], // Empty for filter
                topPlayers: [],
                teamOfWeek: { players: [] },
                avgStats: null,
                leagueStats: null,
                teamStatsTable: []
            };
        }

        const seasonId = leagueInfo.current_season_id;
        console.log(`Current season ID: ${seasonId}`);

        // 1. Fetch Season Rounds (for filter & identifying current round)
        let rounds = [];
        let currentRoundId = null;
        try {
            const seasonRes = await axios.get(`${BASE_URL}/seasons/${seasonId}?api_token=${token}&include=rounds`);
            rounds = seasonRes.data.data.rounds || [];

            // Find current round
            const current = rounds.find(r => r.is_current);
            if (current) {
                currentRoundId = current.id;
            } else {
                // Fallback by date
                const today = new Date().toISOString().split('T')[0];
                const roundByDate = rounds.find(r => r.start <= today && r.end >= today);
                if (roundByDate) currentRoundId = roundByDate.id;
                else if (rounds.length > 0) currentRoundId = rounds[rounds.length - 1].id; // Last round
            }
        } catch (e) {
            console.error('Error fetching season rounds:', e.message);
        }

        // 2. Fetch Data in Parallel
        const [standingsRaw, roundDataRaw, topPlayers, teamOfWeekRaw] = await Promise.all([
            getStandings(seasonId),
            currentRoundId ? axios.get(`${BASE_URL}/rounds/${currentRoundId}?api_token=${token}&include=fixtures.participants`).then(r => r.data.data).catch(e => { console.error('Round fetch error:', e.message); return null; }) : Promise.resolve(null),
            getTopscorers(seasonId),
            axios.get(`${BASE_URL}/team-of-the-week/leagues/${leagueId}/latest?api_token=${token}&include=player;team`).then(r => r.data.data).catch(e => null)
        ]);

        // Extract fixtures from round data
        const currentRoundFixtures = roundDataRaw?.fixtures || [];

        console.log(`Raw Standings count: ${standingsRaw?.length}`);

        const standings = processStandings(standingsRaw);
        console.log(`Processed Standings count: ${standings?.length}`);

        // Calculate placeholder league stats
        const leagueStats = {
            avg_home_goals: 1.5,
            avg_away_goals: 1.2,
            btts_percentage: 55,
            over25_percentage: 48,
            cards_avg: 3.5,
            corners_avg: 9.8
        };

        // Use REAL stats from match history (async - fetches fixtures for each team)
        const teamStatsTable = await calculateTeamStatsTableReal(standingsRaw, seasonId);

        return {
            leagueInfo,
            standings,
            currentRound: currentRoundFixtures, // Now contains actual fixtures
            rounds: rounds
                .map(r => ({ id: r.id, name: r.name, start: r.start, end: r.end, is_current: r.is_current }))
                .sort((a, b) => {
                    // Extract numeric value from name (e.g., "16" from "16" or "Round 16")
                    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                    return numA - numB;
                }),
            currentRoundId, // Send ID so frontend knows which one is selected
            topPlayers,
            teamOfWeek: teamOfWeekRaw || { players: [] }, // Return TOTW data
            avgStats: null,
            leagueStats,
            teamStatsTable
        };
    } catch (error) {
        console.error('Error fetching league details:', error.message);
        throw error;
    }
};

export const getRoundFixtures = async (roundId) => {
    try {
        console.log(`Getting fixtures for round ${roundId}`);
        // Correct Sportmonks v3 endpoint - fixtures are nested on round
        // Include scores and state for displaying results
        const url = `${BASE_URL}/rounds/${roundId}?api_token=${token}&include=fixtures.participants;fixtures.scores;fixtures.state`;
        const { data } = await axios.get(url);
        // Extract fixtures from round data
        return data.data?.fixtures || [];
    } catch (error) {
        console.error(`Error fetching fixtures for round ${roundId}:`, error.message);
        throw error;
    }
};
