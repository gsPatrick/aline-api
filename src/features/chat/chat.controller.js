import { generateMatchChatResponse } from './chat.service.js';
import { getMatchStats } from '../match/match.service.js';

/**
 * POST /chat/match/:id
 * Chat endpoint for match-specific AI assistance
 */
export const chatWithMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, history = [] } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mensagem é obrigatória'
            });
        }

        // Get match data for context
        let matchContext = {};
        try {
            const matchData = await getMatchStats(id);

            matchContext = {
                header: {
                    home_team: matchData.matchInfo?.home_team || matchData.homeTeam,
                    away_team: matchData.matchInfo?.away_team || matchData.awayTeam,
                    league: matchData.matchInfo?.league,
                    status: matchData.matchInfo?.status || matchData.matchInfo?.state,
                    date: matchData.matchInfo?.date || matchData.matchInfo?.starting_at
                },
                // AI Analysis from existing analysis
                aiAnalysis: matchData.analysis?.aiAnalysis || matchData.aiAnalysis || null,
                // Statistics
                statistics: matchData.analysis?.detailedStats || {},
                // Goal analysis
                goalAnalysis: matchData.goalAnalysis || matchData.analysis?.goalAnalysis || null,
                // Corner analysis
                cornerAnalysis: matchData.cornerAnalysis || matchData.analysis?.cornerAnalysis || null,
                // Standings
                standings: matchData.standings || [],
                // H2H / Last matches
                h2h: matchData.history || {},
                // Events
                events: matchData.events || [],
                // xG
                xG: matchData.xG || { home: 0, away: 0 },
                // Odds if available
                odds: matchData.odds || matchData.analysis?.odds || null
            };

            // Also try to get additional context from detailed stats
            if (matchData.analysis) {
                const analysis = matchData.analysis;
                if (!matchContext.goalAnalysis && analysis.home) {
                    matchContext.goalAnalysis = {
                        home: {
                            avgGoalsScored: analysis.home.avgGoalsScored,
                            avgGoalsConceded: analysis.home.avgGoalsConceded
                        },
                        away: {
                            avgGoalsScored: analysis.away?.avgGoalsScored,
                            avgGoalsConceded: analysis.away?.avgGoalsConceded
                        },
                        over25: analysis.over25,
                        under25: analysis.under25,
                        btts: analysis.btts
                    };
                }
                if (!matchContext.cornerAnalysis && analysis.cornerStats) {
                    matchContext.cornerAnalysis = analysis.cornerStats;
                }
            }

        } catch (e) {
            console.error('Error fetching match context:', e.message);
            // Continue with empty context
        }

        // Generate AI response
        const response = await generateMatchChatResponse(matchContext, message, history);

        if (response.error) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.json({
            success: true,
            data: {
                message: response.message,
                usage: response.usage
            }
        });
    } catch (error) {
        console.error('Chat Controller Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
