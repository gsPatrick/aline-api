import { generateMatchChatResponse } from './chat.service.js';

/**
 * POST /chat/match/:id
 * Chat endpoint for match-specific AI assistance with web search
 */
export const chatWithMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, history = [], matchInfo = {} } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mensagem é obrigatória'
            });
        }

        // Build match info from request body
        const matchData = {
            home_team: matchInfo.home_team || 'Time não especificado',
            away_team: matchInfo.away_team || 'Time não especificado',
            league: matchInfo.league || 'Liga não especificada',
            date: matchInfo.date || 'Data não especificada'
        };

        console.log(`[Chat] Processing request for match ${id}:`, matchData);

        // Generate AI response with web search
        const response = await generateMatchChatResponse(matchData, message, history);

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
                citations: response.citations || []
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
