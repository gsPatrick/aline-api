import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate chat response using GPT-4o-mini with match context
 * @param {Object} matchContext - Match data, stats, h2h, standings
 * @param {string} userMessage - User's question
 * @param {Array} conversationHistory - Previous messages
 * @returns {Object} AI response
 */
export const generateMatchChatResponse = async (matchContext, userMessage, conversationHistory = []) => {
    if (!OPENAI_API_KEY) {
        return {
            error: true,
            message: 'Configuração de IA ausente. Adicione OPENAI_API_KEY ao .env.'
        };
    }

    try {
        // Build context from match data
        const systemPrompt = buildMatchSystemPrompt(matchContext);

        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        // Call OpenAI API with GPT-4o-mini
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 1500,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiMessage = response.data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

        return {
            success: true,
            message: aiMessage,
            usage: response.data.usage
        };
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        return {
            error: true,
            message: 'Erro ao gerar resposta. Tente novamente.'
        };
    }
};

/**
 * Build system prompt with match context
 */
const buildMatchSystemPrompt = (ctx) => {
    const homeTeam = ctx.header?.home_team?.name || 'Time Casa';
    const awayTeam = ctx.header?.away_team?.name || 'Time Fora';
    const league = ctx.header?.league?.name || 'Liga';
    const matchStatus = ctx.header?.status || 'NS';
    const date = ctx.header?.date || 'Data não disponível';

    let prompt = `Você é um assistente especializado em análise de futebol e apostas esportivas.
Você está analisando a partida: ${homeTeam} vs ${awayTeam}
Liga: ${league}
Data: ${date}
Status: ${matchStatus === 'NS' ? 'Ainda não começou' : matchStatus === 'FT' ? 'Finalizado' : matchStatus}

`;

    // Add existing AI analysis if available
    if (ctx.aiAnalysis) {
        prompt += `
ANÁLISE PRÉVIA DA IA (usar como base):
${ctx.aiAnalysis}

`;
    }

    // Add statistics if available
    if (ctx.statistics?.home && matchStatus !== 'NS') {
        const stats = ctx.statistics;
        prompt += `
ESTATÍSTICAS DO JOGO:
- Posse de bola: ${stats.home.ball_possession || 0}% x ${stats.away.ball_possession || 0}%
- Finalizações: ${stats.home.shots_total || 0} x ${stats.away.shots_total || 0}
- Finalizações no gol: ${stats.home.shots_on_target || 0} x ${stats.away.shots_on_target || 0}
- Escanteios: ${stats.home.corners || 0} x ${stats.away.corners || 0}
- Cartões amarelos: ${stats.home.yellow_cards || 0} x ${stats.away.yellow_cards || 0}
`;
        if (stats.xG) {
            prompt += `- xG (Gols esperados): ${stats.xG.home?.toFixed?.(2) || stats.xG.home || 0} x ${stats.xG.away?.toFixed?.(2) || stats.xG.away || 0}\n`;
        }
    }

    // Add goal analysis if available
    if (ctx.goalAnalysis) {
        const ga = ctx.goalAnalysis;
        prompt += `
ANÁLISE DE GOLS:
- ${homeTeam}: Média de ${ga.home?.avgGoalsScored || '?'} gols marcados e ${ga.home?.avgGoalsConceded || '?'} sofridos por jogo
- ${awayTeam}: Média de ${ga.away?.avgGoalsScored || '?'} gols marcados e ${ga.away?.avgGoalsConceded || '?'} sofridos por jogo
- Over 2.5: ${ga.over25 || '?'}% | Under 2.5: ${ga.under25 || '?'}%
- BTTS (Ambos marcam): ${ga.btts || '?'}%
`;
    }

    // Add corner analysis if available
    if (ctx.cornerAnalysis) {
        const ca = ctx.cornerAnalysis;
        prompt += `
ANÁLISE DE ESCANTEIOS:
- ${homeTeam}: Média de ${ca.home?.avgCorners || '?'} escanteios por jogo
- ${awayTeam}: Média de ${ca.away?.avgCorners || '?'} escanteios por jogo
- Total esperado: ${ca.avgTotal || '?'} escanteios
- Over 9.5: ${ca.over95 || '?'}% | Over 10.5: ${ca.over105 || '?'}%
`;
    }

    // Add standings context
    if (ctx.standings?.length > 0) {
        const homeStanding = ctx.standings.find(t => t.team_id === ctx.header?.home_team?.id);
        const awayStanding = ctx.standings.find(t => t.team_id === ctx.header?.away_team?.id);

        if (homeStanding || awayStanding) {
            prompt += `
CLASSIFICAÇÃO NO CAMPEONATO:
`;
            if (homeStanding) {
                prompt += `- ${homeTeam}: ${homeStanding.position}º lugar, ${homeStanding.points} pontos (${homeStanding.won}V ${homeStanding.draw}E ${homeStanding.lost}D), GD: ${homeStanding.goals_for - homeStanding.goals_against}, Forma: ${homeStanding.form || 'N/A'}\n`;
            }
            if (awayStanding) {
                prompt += `- ${awayTeam}: ${awayStanding.position}º lugar, ${awayStanding.points} pontos (${awayStanding.won}V ${awayStanding.draw}E ${awayStanding.lost}D), GD: ${awayStanding.goals_for - awayStanding.goals_against}, Forma: ${awayStanding.form || 'N/A'}\n`;
            }
        }
    }

    // Add H2H if available
    if (ctx.h2h?.home?.length > 0 || ctx.h2h?.away?.length > 0) {
        prompt += `
ÚLTIMOS JOGOS:
`;
        if (ctx.h2h.home?.slice(0, 5).length > 0) {
            prompt += `${homeTeam} (últimos 5): `;
            ctx.h2h.home.slice(0, 5).forEach(m => {
                const isHome = m.home_team?.id === ctx.header?.home_team?.id;
                const score = `${m.home_team?.score || 0}-${m.away_team?.score || 0}`;
                const opponent = isHome ? m.away_team?.name : m.home_team?.name;
                prompt += `${isHome ? 'vs' : '@'} ${opponent || '?'} (${score}), `;
            });
            prompt += '\n';
        }
        if (ctx.h2h.away?.slice(0, 5).length > 0) {
            prompt += `${awayTeam} (últimos 5): `;
            ctx.h2h.away.slice(0, 5).forEach(m => {
                const isHome = m.home_team?.id === ctx.header?.away_team?.id;
                const score = `${m.home_team?.score || 0}-${m.away_team?.score || 0}`;
                const opponent = isHome ? m.away_team?.name : m.home_team?.name;
                prompt += `${isHome ? 'vs' : '@'} ${opponent || '?'} (${score}), `;
            });
            prompt += '\n';
        }
    }

    // Add odds if available
    if (ctx.odds) {
        prompt += `
ODDS (se disponíveis):
- ${homeTeam} vencer: ${ctx.odds.home || '?'}
- Empate: ${ctx.odds.draw || '?'}
- ${awayTeam} vencer: ${ctx.odds.away || '?'}
`;
    }

    prompt += `
INSTRUÇÕES IMPORTANTES:
- Responda SEMPRE em português brasileiro
- Seja especialista em apostas esportivas e análise de dados
- Forneça probabilidades estimadas quando relevante
- Mencione mercados específicos (Over/Under, BTTS, Handicap, etc.)
- Seja honesto sobre incertezas e riscos
- Use dados fornecidos + conhecimento geral sobre os times
- Mantenha respostas informativas mas objetivas
- Se não tiver dados suficientes, diga claramente
- Considere fatores como motivação, histórico, lesões se souber
`;

    return prompt;
};

export default {
    generateMatchChatResponse
};
