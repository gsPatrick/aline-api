import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate chat response using GPT-4o with web search
 * Uses the new web_search tool from OpenAI Responses API
 * @param {Object} matchInfo - Basic match info (teams, league, date)
 * @param {string} userMessage - User's question
 * @param {Array} conversationHistory - Previous messages
 * @returns {Object} AI response with web search results
 */
export const generateMatchChatResponse = async (matchInfo, userMessage, conversationHistory = []) => {
    if (!OPENAI_API_KEY) {
        return {
            error: true,
            message: 'Configuração de IA ausente. Adicione OPENAI_API_KEY ao .env.'
        };
    }

    try {
        const homeTeam = matchInfo?.home_team || 'Time Casa';
        const awayTeam = matchInfo?.away_team || 'Time Fora';
        const league = matchInfo?.league || 'Liga';
        const matchDate = matchInfo?.date || 'Em breve';

        // System prompt that instructs the model to search the web
        const systemPrompt = `Você é um assistente especializado em análise de futebol e apostas esportivas.

PARTIDA EM ANÁLISE:
- ${homeTeam} vs ${awayTeam}
- Campeonato: ${league}
- Data: ${matchDate}

INSTRUÇÕES:
1. Use sua capacidade de busca na web para encontrar informações ATUALIZADAS sobre:
   - Notícias recentes dos times
   - Lesões e desfalques
   - Últimos resultados e forma
   - Estatísticas head-to-head
   - Odds das casas de apostas
   - Previsões de especialistas

2. Fontes recomendadas para buscar:
   - SofaScore, FlashScore, FotMob
   - ESPN, GE (Globo Esporte)
   - Transfermarkt (lesões)
   - Odds: bet365, Betano, 1xBet

3. Formato da resposta:
   - Seja OBJETIVO e DIRETO
   - Forneça probabilidades quando possível
   - Mencione mercados de apostas relevantes (Over/Under, BTTS, Handicap)
   - Cite as fontes quando usar dados específicos

4. Sempre responda em PORTUGUÊS BRASILEIRO`;

        // Try using OpenAI Responses API with web_search tool
        const response = await axios.post(
            'https://api.openai.com/v1/responses',
            {
                model: 'gpt-4o',
                input: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    { role: 'user', content: userMessage }
                ],
                tools: [{ type: 'web_search' }],
                tool_choice: 'auto'
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Extract response from Responses API format
        const output = response.data.output || [];
        let aiMessage = '';
        let citations = [];

        for (const item of output) {
            if (item.type === 'message' && item.content) {
                for (const content of item.content) {
                    if (content.type === 'output_text') {
                        aiMessage = content.text;
                        citations = content.annotations || [];
                    }
                }
            }
        }

        if (!aiMessage) {
            aiMessage = 'Desculpe, não consegui gerar uma resposta.';
        }

        return {
            success: true,
            message: aiMessage,
            citations: citations
        };

    } catch (error) {
        console.error('OpenAI Responses API Error:', error.response?.data || error.message);

        // Fallback to Chat Completions API with search-enabled model
        try {
            return await fallbackChatCompletion(matchInfo, userMessage, conversationHistory);
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError.message);
            return {
                error: true,
                message: 'Erro ao gerar resposta. Tente novamente.'
            };
        }
    }
};

/**
 * Fallback using Chat Completions API with gpt-4o-search-preview model
 */
const fallbackChatCompletion = async (matchInfo, userMessage, conversationHistory) => {
    const homeTeam = matchInfo?.home_team || 'Time Casa';
    const awayTeam = matchInfo?.away_team || 'Time Fora';
    const league = matchInfo?.league || 'Liga';
    const matchDate = matchInfo?.date || 'Em breve';

    const systemPrompt = `Você é um assistente especializado em análise de futebol e apostas esportivas.

PARTIDA EM ANÁLISE: ${homeTeam} vs ${awayTeam}
Campeonato: ${league} | Data: ${matchDate}

INSTRUÇÕES:
- Busque na internet informações atualizadas sobre esta partida
- Forneça análise de estatísticas, forma recente, lesões
- Sugira mercados de apostas com probabilidades
- Cite fontes: SofaScore, FlashScore, ESPN, GE, Transfermarkt
- Responda em português brasileiro de forma objetiva`;

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-search-preview', // Model with web search
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: userMessage }
            ],
            web_search_options: {
                search_context_size: 'medium'
            },
            max_tokens: 2000
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const aiMessage = response.data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
    const annotations = response.data.choices[0]?.message?.annotations || [];

    return {
        success: true,
        message: aiMessage,
        citations: annotations.filter(a => a.type === 'url_citation')
    };
};

export default {
    generateMatchChatResponse
};
