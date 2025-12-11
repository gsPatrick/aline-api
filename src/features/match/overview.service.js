// Overview Helper Functions for Match Analysis
// Functions for H2H, enriched history, trends, insights and timeline

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

/**
 * Fetch Head-to-Head matches between two teams
 * @param {number} homeTeamId - Home team ID
 * @param {number} awayTeamId - Away team ID
 * @returns {Object} H2H data with matches, summary and averages
 */
export const fetchH2HMatches = async (homeTeamId, awayTeamId) => {
    try {
        console.log(`Fetching H2H for teams ${homeTeamId} vs ${awayTeamId}...`);

        // Query for finished matches between these two teams
        // Include league for frontend H2HTab display
        const url = `${BASE_URL}/fixtures/head-to-head/${homeTeamId}/${awayTeamId}?api_token=${token}&include=participants;scores;statistics.type;league&limit=10`;

        const { data } = await axios.get(url);
        const matches = data.data || [];

        console.log(`Found ${matches.length} H2H matches`);

        if (matches.length === 0) {
            return {
                matches: [],
                summary: { total: 0, home_wins: 0, draws: 0, away_wins: 0 },
                averages: { goals_per_match: 0, corners_per_match: 0, cards_per_match: 0 }
            };
        }

        // Process matches
        const processedMatches = matches.map(match => {
            const participants = match.participants || [];
            const home = participants.find(p => p.meta?.location === 'home');
            const away = participants.find(p => p.meta?.location === 'away');

            const scores = match.scores || [];
            const currentScore = scores.find(s => s.description === 'CURRENT');
            const htScore = scores.find(s => s.description === '1ST_HALF');

            let homeScore = 0;
            let awayScore = 0;
            let homeScoreHT = 0;
            let awayScoreHT = 0;

            if (currentScore && currentScore.score) {
                if (currentScore.score.participant === 'home') {
                    homeScore = currentScore.score.goals || 0;
                } else if (currentScore.score.participant === 'away') {
                    awayScore = currentScore.score.goals || 0;
                }
            }
            // Handle standard score format if participant isn't explicit in single object
            if (currentScore && !currentScore.score?.participant) {
                // SportMonks v3 often gives array of scores. 
                // If description is CURRENT, it might be the final score.
                // Let's rely on the fact that usually we have separate score objects for home/away or we parse the string if needed.
                // Actually, simpler:
                const hS = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'home');
                const aS = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'away');
                if (hS) homeScore = hS.score.goals;
                if (aS) awayScore = aS.score.goals;
            }

            if (htScore) {
                const hS = scores.find(s => s.description === '1ST_HALF' && s.score?.participant === 'home');
                const aS = scores.find(s => s.description === '1ST_HALF' && s.score?.participant === 'away');
                if (hS) homeScoreHT = hS.score.goals;
                if (aS) awayScoreHT = aS.score.goals;
            }

            // Extract stats
            const stats = match.statistics || [];

            // Helper para comparar IDs com segurança (String vs Number)
            const isTeam = (statId, teamId) => String(statId) === String(teamId);

            // 1. CANTOS
            const homeCorners = stats.reduce((sum, s) => {
                const name = s.type?.name || s.type?.developer_name || '';
                // Verifica se é o time E se o nome parece com Canto
                if (isTeam(s.participant_id, home?.id) && (name === 'Corners' || name.includes('Corner'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            const awayCorners = stats.reduce((sum, s) => {
                const name = s.type?.name || s.type?.developer_name || '';
                if (isTeam(s.participant_id, away?.id) && (name === 'Corners' || name.includes('Corner'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            // 2. CARTÕES (Amarelos - ID 84 geralmente, ou busca por nome)
            const homeYellow = stats.reduce((sum, s) => {
                const name = s.type?.name || '';
                if (isTeam(s.participant_id, home?.id) && (name === 'Yellowcards' || name.includes('Yellow'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            const awayYellow = stats.reduce((sum, s) => {
                const name = s.type?.name || '';
                if (isTeam(s.participant_id, away?.id) && (name === 'Yellowcards' || name.includes('Yellow'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            // 3. CARTÕES VERMELHOS
            const homeRed = stats.reduce((sum, s) => {
                const name = s.type?.name || '';
                if (isTeam(s.participant_id, home?.id) && (name === 'Redcards' || name.includes('Red'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            const awayRed = stats.reduce((sum, s) => {
                const name = s.type?.name || '';
                if (isTeam(s.participant_id, away?.id) && (name === 'Redcards' || name.includes('Red'))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);

            // Determine winner
            let winner = 'draw';
            if (homeScore > awayScore) {
                winner = home?.id === homeTeamId ? 'home' : 'away';
            } else if (awayScore > homeScore) {
                winner = away?.id === homeTeamId ? 'away' : 'home';
            }
            return {
                id: match.id,
                date: match.starting_at?.split('T')[0] || match.starting_at,
                home_team: home?.name || 'Home',
                away_team: away?.name || 'Away',
                score: `${homeScore}-${awayScore}`,
                ht_score: `${homeScoreHT}-${awayScoreHT}`,
                homeScore, awayScore,
                homeScoreHT, awayScoreHT,
                winner: winner,
                stats: {
                    corners: { home: homeCorners, away: awayCorners },
                    yellowCards: { home: homeYellow, away: awayYellow },
                    redCards: { home: homeRed, away: awayRed }
                }
            };
        });

        // Calculate summary
        const summary = {
            total: processedMatches.length,
            home_wins: processedMatches.filter(m => m.winner === 'home').length,
            draws: processedMatches.filter(m => m.winner === 'draw').length,
            away_wins: processedMatches.filter(m => m.winner === 'away').length
        };

        // Calculate averages
        const totalGoals = processedMatches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
        const totalCorners = processedMatches.reduce((sum, m) => sum + m.stats.corners.home + m.stats.corners.away, 0);
        const totalCards = processedMatches.reduce((sum, m) => sum + m.stats.yellowCards.home + m.stats.yellowCards.away + m.stats.redCards.home + m.stats.redCards.away, 0);

        const averages = {
            goals_per_match: processedMatches.length > 0 ? (totalGoals / processedMatches.length).toFixed(2) : 0,
            corners_per_match: processedMatches.length > 0 ? (totalCorners / processedMatches.length).toFixed(1) : 0,
            cards_per_match: processedMatches.length > 0 ? (totalCards / processedMatches.length).toFixed(1) : 0
        };

        // Calculate aggregates for frontend H2HStats
        const aggregates = {
            goals: {
                home: processedMatches.reduce((sum, m) => sum + m.homeScore, 0),
                away: processedMatches.reduce((sum, m) => sum + m.awayScore, 0)
            },
            corners: {
                home: processedMatches.reduce((sum, m) => sum + m.stats.corners.home, 0),
                away: processedMatches.reduce((sum, m) => sum + m.stats.corners.away, 0)
            },
            yellowCards: {
                home: processedMatches.reduce((sum, m) => sum + m.stats.yellowCards.home, 0),
                away: processedMatches.reduce((sum, m) => sum + m.stats.yellowCards.away, 0)
            },
            redCards: {
                home: processedMatches.reduce((sum, m) => sum + m.stats.redCards.home, 0),
                away: processedMatches.reduce((sum, m) => sum + m.stats.redCards.away, 0)
            }
        };

        // Calculate Trends (Green Cards)
        const total = processedMatches.length;
        const trends = [];
        if (total > 0) {
            const btts = processedMatches.filter(m => m.homeScore > 0 && m.awayScore > 0).length;
            const over05HT = processedMatches.filter(m => (m.homeScoreHT + m.awayScoreHT) > 0.5).length;
            const over15FT = processedMatches.filter(m => (m.homeScore + m.awayScore) > 1.5).length;
            const over25FT = processedMatches.filter(m => (m.homeScore + m.awayScore) > 2.5).length;
            // Use total corners for trends
            const over85Corners = processedMatches.filter(m => (m.stats.corners.home + m.stats.corners.away) > 8.5).length;
            const over95Corners = processedMatches.filter(m => (m.stats.corners.home + m.stats.corners.away) > 9.5).length;

            const addTrend = (label, count) => {
                const pct = Math.round((count / total) * 100);
                if (pct >= 50) { // Only show relevant trends
                    trends.push({
                        label: `${pct}% ${label}`,
                        sub: `${count}/${total} Jogos`,
                        type: pct >= 70 ? 'high' : 'warn'
                    });
                }
            };

            addTrend('Over 0.5HT', over05HT);
            addTrend('BTTS', btts);
            addTrend('Over 1.5FT', over15FT);
            addTrend('Over 2.5FT', over25FT);
            addTrend('Over 8.5 Cantos', over85Corners);
            addTrend('Over 9.5 Cantos', over95Corners);
        }

        return {
            matches: matches, // Return RAW matches with participants, scores, league for frontend
            processedMatches, // Keep processed matches for stats analysis
            summary,
            averages,
            aggregates, // Return aggregates
            trends
        };

    } catch (error) {
        console.error('Error fetching H2H matches:', error.message);
        return {
            matches: [],
            summary: { total: 0, home_wins: 0, draws: 0, away_wins: 0 },
            averages: { goals_per_match: 0, corners_per_match: 0, cards_per_match: 0 }
        };
    }
};

/**
 * Enrich history with corner and card stats
 * @param {Array} history - Array of historical matches
 * @returns {Array} Enriched history with stats badges
 */
export const enrichHistoryWithStats = (history) => {
    if (!history || !Array.isArray(history)) return [];

    return history.map(match => {
        // Extract participants
        const participants = match.participants || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        // Extract scores
        const scores = match.scores || [];
        const currentScore = scores.find(s => s.description === 'CURRENT');

        let homeScore = 0;
        let awayScore = 0;

        if (currentScore && currentScore.score) {
            if (currentScore.score.participant === 'home') {
                homeScore = currentScore.score.goals || 0;
            } else if (currentScore.score.participant === 'away') {
                awayScore = currentScore.score.goals || 0;
            }
        }
        // Handle standard score format if participant isn't explicit in single object
        if (currentScore && !currentScore.score?.participant) {
            const hS = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'home');
            const aS = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'away');
            if (hS) homeScore = hS.score.goals;
            if (aS) awayScore = aS.score.goals;
        }

        // Determine winner
        let winner = 'draw';
        if (homeScore > awayScore) winner = 'home';
        else if (awayScore > homeScore) winner = 'away';

        // Extract stats
        const stats = match.statistics || [];
        const isTeam = (statId, teamId) => String(statId) === String(teamId);

        const getStat = (namePart, teamId) => {
            return stats.reduce((sum, s) => {
                const name = s.type?.name || s.type?.developer_name || '';
                if (isTeam(s.participant_id, teamId) && (name === namePart || name.includes(namePart))) {
                    return sum + (s.data?.value || s.value || 0);
                }
                return sum;
            }, 0);
        };

        const homeCorners = getStat('Corner', home?.id);
        const awayCorners = getStat('Corner', away?.id);
        const homeCards = getStat('Yellow', home?.id) + getStat('Red', home?.id); // Simplified total cards
        const awayCards = getStat('Yellow', away?.id) + getStat('Red', away?.id);

        return {
            id: match.id,
            date: match.starting_at,
            home_team: home?.name || 'Home',
            away_team: away?.name || 'Away',
            home_logo: home?.image_path,
            away_logo: away?.image_path,
            home_id: home?.id,
            away_id: away?.id,
            score: `${homeScore}-${awayScore}`,
            winner: winner,
            league: match.league?.name || 'League', // Add league name
            stats: {
                corners: { home: homeCorners, away: awayCorners },
                cards: { home: homeCards, away: awayCards }
            }
        };
    });
};

/**
 * Generate trends comparison table
 * @param {Object} goalAnalysis - Goal analysis data
 * @param {Object} cornerAnalysis - Corner analysis data
 * @param {Object} cardAnalysis - Card analysis data
 * @returns {Object} Trends data formatted for frontend table
 */
export const generateTrends = (goalAnalysis, cornerAnalysis, cardAnalysis) => {
    try {
        return {
            goals_scored: {
                home: goalAnalysis?.home?.avgGoalsFor || 0,
                away: goalAnalysis?.away?.avgGoalsFor || 0
            },
            goals_conceded: {
                home: goalAnalysis?.home?.avgGoalsAgainst || 0,
                away: goalAnalysis?.away?.avgGoalsAgainst || 0
            },
            corners_for: {
                home: cornerAnalysis?.home?.avgCornersFor || 0,
                away: cornerAnalysis?.away?.avgCornersFor || 0
            },
            corners_against: {
                home: cornerAnalysis?.home?.avgCornersAgainst || 0,
                away: cornerAnalysis?.away?.avgCornersAgainst || 0
            },
            corners_over_85_pct: {
                home: cornerAnalysis?.home?.over85Percentage || 0,
                away: cornerAnalysis?.away?.over85Percentage || 0
            },
            cards_total: {
                home: cardAnalysis?.home?.avgTotal || 0,
                away: cardAnalysis?.away?.avgTotal || 0
            },
            cards_first_half: {
                home: cardAnalysis?.home?.avgFirstHalf || 0,
                away: cardAnalysis?.away?.avgFirstHalf || 0
            }
        };
    } catch (error) {
        console.error('Error generating trends:', error.message);
        return {};
    }
};

/**
 * Generate prediction insights based on thresholds
 * @param {Object} stats - All calculated stats
 * @returns {Array} Array of insight objects
 */
export const generateInsights = (stats) => {
    const insights = [];

    try {
        const goalAnalysis = stats.goalAnalysis || {};
        const cornerAnalysis = stats.cornerAnalysis || {};
        const cardAnalysis = stats.cardAnalysis || {};

        // BTTS Insight (>70%)
        const bttsPercentage = goalAnalysis.bttsPercentage || 0;
        if (bttsPercentage > 70) {
            insights.push({
                label: `${Math.round(bttsPercentage)}% BTTS`,
                type: 'high_prob',
                value: bttsPercentage
            });
        }

        // Over 2.5 Insight (>70%)
        const over25Percentage = goalAnalysis.over25Percentage || 0;
        if (over25Percentage > 70) {
            insights.push({
                label: 'Over 2.5 FT',
                type: 'high_prob',
                value: over25Percentage
            });
        }

        // Corners Insight (>10 average)
        const avgCorners = (cornerAnalysis.home?.avgCornersFor || 0) + (cornerAnalysis.away?.avgCornersFor || 0);
        if (avgCorners > 10) {
            insights.push({
                label: '10+ Cantos',
                type: 'high_prob',
                value: avgCorners.toFixed(1)
            });
        }

        // Cards Insight (>6 average)
        const avgCards = (cardAnalysis.home?.avgTotal || 0) + (cardAnalysis.away?.avgTotal || 0);
        if (avgCards > 6) {
            insights.push({
                label: 'Muitos Cartões',
                type: 'warning',
                value: avgCards.toFixed(1)
            });
        }

        // Clean Sheet Insight
        const cleanSheetPercentage = Math.max(
            goalAnalysis.home?.cleanSheetPercentage || 0,
            goalAnalysis.away?.cleanSheetPercentage || 0
        );
        if (cleanSheetPercentage > 40) {
            insights.push({
                label: 'Provável Clean Sheet',
                type: 'info',
                value: cleanSheetPercentage
            });
        }

    } catch (error) {
        console.error('Error generating insights:', error.message);
    }

    // 1x2 Predictions (Basic heuristic based on stats)
    // Real implementation would use complex models or odds.
    // Here we use a simple weight based on recent form and H2H.

    const homeWinProb = 45; // Placeholder
    const drawProb = 25;
    const awayWinProb = 30;

    return {
        fulltime: {
            home: homeWinProb,
            draw: drawProb,
            away: awayWinProb
        },
        list: insights
    };
};

/**
 * Build combined timeline from events and comments
 * @param {Array} events - Match events (goals, cards, etc)
 * @param {Array} comments - Match commentary (corners, etc)
 * @returns {Array} Sorted timeline of all events
 */
export const buildTimeline = (events, comments) => {
    const timeline = [];

    try {
        // Process events (goals, cards, substitutions)
        if (events && Array.isArray(events)) {
            events.forEach(event => {
                const eventType = event.type?.name?.toLowerCase() || '';
                const minute = event.minute || 0;

                if (eventType.includes('goal')) {
                    timeline.push({
                        type: 'goal',
                        minute: minute,
                        team: event.participant?.meta?.location || 'unknown',
                        player: event.player?.name || 'Unknown',
                        score: event.result || ''
                    });
                } else if (eventType.includes('yellow')) {
                    timeline.push({
                        type: 'yellow_card',
                        minute: minute,
                        team: event.participant?.meta?.location || 'unknown',
                        player: event.player?.name || 'Unknown'
                    });
                } else if (eventType.includes('red')) {
                    timeline.push({
                        type: 'red_card',
                        minute: minute,
                        team: event.participant?.meta?.location || 'unknown',
                        player: event.player?.name || 'Unknown'
                    });
                }
            });
        }

        // Process comments for corners
        if (comments && Array.isArray(comments)) {
            comments.forEach(comment => {
                const text = comment.comment?.toLowerCase() || '';
                const minute = comment.minute || 0;

                if (text.includes('corner') || text.includes('escanteio')) {
                    // Try to determine team from comment
                    let team = 'unknown';
                    if (comment.extra_minute) {
                        // Try to parse team from comment text
                        // This is a best-effort extraction
                    }

                    timeline.push({
                        type: 'corner',
                        minute: minute,
                        team: team
                    });
                }
            });
        }

        // Sort by minute
        timeline.sort((a, b) => a.minute - b.minute);

    } catch (error) {
        console.error('Error building timeline:', error.message);
    }

    return timeline;
};
