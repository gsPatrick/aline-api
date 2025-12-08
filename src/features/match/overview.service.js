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
        const url = `${BASE_URL}/fixtures/head-to-head/${homeTeamId}/${awayTeamId}?api_token=${token}&include=participants;scores;statistics&limit=10`;

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

            let homeScore = 0;
            let awayScore = 0;

            if (currentScore && currentScore.score) {
                if (currentScore.score.participant === 'home') {
                    homeScore = currentScore.score.goals || 0;
                } else if (currentScore.score.participant === 'away') {
                    awayScore = currentScore.score.goals || 0;
                }
            }

            // Extract stats
            const stats = match.statistics || [];
            const totalCorners = stats.reduce((sum, s) => {
                if (s.type?.name === 'Corners') {
                    return sum + (s.data?.value || 0);
                }
                return sum;
            }, 0);

            const totalCards = stats.reduce((sum, s) => {
                if (s.type?.name === 'Yellow Cards' || s.type?.name === 'Red Cards') {
                    return sum + (s.data?.value || 0);
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
                winner: winner,
                stats: {
                    corners: totalCorners,
                    cards: totalCards
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
        const totalGoals = processedMatches.reduce((sum, m) => {
            const [home, away] = m.score.split('-').map(Number);
            return sum + home + away;
        }, 0);

        const totalCorners = processedMatches.reduce((sum, m) => sum + m.stats.corners, 0);
        const totalCards = processedMatches.reduce((sum, m) => sum + m.stats.cards, 0);

        const averages = {
            goals_per_match: processedMatches.length > 0 ? (totalGoals / processedMatches.length).toFixed(2) : 0,
            corners_per_match: processedMatches.length > 0 ? (totalCorners / processedMatches.length).toFixed(1) : 0,
            cards_per_match: processedMatches.length > 0 ? (totalCards / processedMatches.length).toFixed(1) : 0
        };

        return {
            matches: processedMatches,
            summary,
            averages
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
        // If stats already exist, return as is
        if (match.stats) return match;

        // Try to extract from raw data if available
        const corners = match.corners || 0;
        const cards = match.cards || 0;

        return {
            ...match,
            stats: {
                corners: corners,
                cards: cards
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

    return insights;
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
