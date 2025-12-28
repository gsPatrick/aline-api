import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Build enriched context string for AI analysis
 * Includes: header, standings, lineups with ratings, last/next matches
 */
const buildEnrichedContext = (matchInfo) => {
    let context = '';

    const homeTeam = matchInfo?.home_team || matchInfo?.header?.home_team?.name || 'Time Casa';
    const awayTeam = matchInfo?.away_team || matchInfo?.header?.away_team?.name || 'Time Fora';
    const league = matchInfo?.league || matchInfo?.header?.league?.name || 'Liga';
    const matchDate = matchInfo?.date || matchInfo?.header?.date || 'Em breve';

    context += `\n=== PARTIDA ===\n${homeTeam} vs ${awayTeam}\nCampeonato: ${league}\nData: ${matchDate}\n`;

    // Standings context
    if (matchInfo?.standings?.length > 0) {
        context += `\n=== CLASSIFICAÇÃO ===\n`;
        matchInfo.standings.slice(0, 10).forEach(team => {
            const isHome = team.name === homeTeam || team.participant?.name === homeTeam;
            const isAway = team.name === awayTeam || team.participant?.name === awayTeam;
            const marker = isHome ? ' [CASA]' : (isAway ? ' [FORA]' : '');
            context += `${team.position || team.sort}º ${team.name || team.participant?.name}${marker}: ${team.points || team.details?.find(d => d.type_id === 1)?.value || 0} pts\n`;
        });
    }

    // Lineups with player ratings (CRITICAL for AI analysis)
    if (matchInfo?.lineups) {
        context += `\n=== PROVÁVEIS ESCALAÇÕES (com média de notas) ===\n`;

        if (matchInfo.lineups.home?.length > 0) {
            context += `\n${homeTeam}:\n`;
            const homeXI = matchInfo.lineups.home.slice(0, 11);
            homeXI.forEach(player => {
                const rating = player.rating || player.statistics?.rating || player.player?.statistics?.rating || '?';
                const position = player.position || player.player?.position?.name || '';
                context += `- ${player.name || player.player?.name} (${position}) - Rating: ${rating}\n`;
            });
            // Calculate average rating
            const avgRating = homeXI.reduce((sum, p) => {
                const r = parseFloat(p.rating || p.statistics?.rating || p.player?.statistics?.rating || 0);
                return sum + (isNaN(r) ? 0 : r);
            }, 0) / homeXI.filter(p => p.rating || p.statistics?.rating).length || 0;
            if (avgRating > 0) context += `Média do time: ${avgRating.toFixed(2)}\n`;
        }

        if (matchInfo.lineups.away?.length > 0) {
            context += `\n${awayTeam}:\n`;
            const awayXI = matchInfo.lineups.away.slice(0, 11);
            awayXI.forEach(player => {
                const rating = player.rating || player.statistics?.rating || player.player?.statistics?.rating || '?';
                const position = player.position || player.player?.position?.name || '';
                context += `- ${player.name || player.player?.name} (${position}) - Rating: ${rating}\n`;
            });
            const avgRating = awayXI.reduce((sum, p) => {
                const r = parseFloat(p.rating || p.statistics?.rating || p.player?.statistics?.rating || 0);
                return sum + (isNaN(r) ? 0 : r);
            }, 0) / awayXI.filter(p => p.rating || p.statistics?.rating).length || 0;
            if (avgRating > 0) context += `Média do time: ${avgRating.toFixed(2)}\n`;
        }
    }

    // Last matches (same league - forma real)
    if (matchInfo?.lastMatches) {
        context += `\n=== FORMA RECENTE (Só Liga) ===\n`;
        if (matchInfo.lastMatches.home?.length > 0) {
            context += `${homeTeam}: `;
            matchInfo.lastMatches.home.forEach(m => {
                const result = m.result || (m.home_team?.score > m.away_team?.score ? 'V' : m.home_team?.score < m.away_team?.score ? 'D' : 'E');
                context += `${result} `;
            });
            context += '\n';
        }
        if (matchInfo.lastMatches.away?.length > 0) {
            context += `${awayTeam}: `;
            matchInfo.lastMatches.away.forEach(m => {
                const result = m.result || (m.away_team?.score > m.home_team?.score ? 'V' : m.away_team?.score < m.home_team?.score ? 'D' : 'E');
                context += `${result} `;
            });
            context += '\n';
        }
    }

    // Next matches (all competitions)
    if (matchInfo?.nextMatches) {
        context += `\n=== PRÓXIMOS JOGOS (Todas Competições) ===\n`;
        if (matchInfo.nextMatches.home?.length > 0) {
            context += `${homeTeam}: `;
            matchInfo.nextMatches.home.slice(0, 3).forEach(m => {
                context += `vs ${m.away_team?.name || m.home_team?.name} (${m.league?.name}), `;
            });
            context += '\n';
        }
        if (matchInfo.nextMatches.away?.length > 0) {
            context += `${awayTeam}: `;
            matchInfo.nextMatches.away.slice(0, 3).forEach(m => {
                context += `vs ${m.away_team?.name || m.home_team?.name} (${m.league?.name}), `;
            });
            context += '\n';
        }
    }

    return context;
};

/**
 * Generate chat response using GPT-4o with web search
 * Uses enriched match context including player ratings
 */
export const generateMatchChatResponse = async (matchInfo, userMessage, conversationHistory = []) => {
    if (!OPENAI_API_KEY) {
        return {
            error: true,
            message: 'Configuração de IA ausente. Adicione OPENAI_API_KEY ao .env.'
        };
    }

    try {
        const homeTeam = matchInfo?.home_team || matchInfo?.header?.home_team?.name || 'Time Casa';
        const awayTeam = matchInfo?.away_team || matchInfo?.header?.away_team?.name || 'Time Fora';
        const league = matchInfo?.league || matchInfo?.header?.league?.name || 'Liga';
        const matchDate = matchInfo?.date || matchInfo?.header?.date || 'Em breve';

        // Build enriched context with all data
        const enrichedContext = buildEnrichedContext(matchInfo);

        const systemPrompt = `Você é um assistente ESPECIALISTA em análise de futebol e apostas esportivas.

PARTIDA: ${homeTeam} vs ${awayTeam}
CAMPEONATO: ${league}
DATA: ${matchDate}

=== DADOS DISPONÍVEIS ===
${enrichedContext}

=== INSTRUÇÕES ===

1. Você TEM ACESSO À INTERNET. Busque informações ATUALIZADAS sobre:
   - Notícias de última hora sobre desfalques e lesões
   - Condições climáticas na cidade do jogo
   - Motivação dos times (momento, pressão, objetivos)
   - Últimas declarações de técnicos

2. FONTES para buscar:
   - SofaScore, FlashScore, FotMob (estatísticas)
   - ESPN, GE/Globo Esporte (notícias BR)
   - Transfermarkt (lesões e valores)
   - bet365, Betano, 1xBet (odds atuais)

3. Use os DADOS ACIMA (classificação, escalações, notas dos jogadores) para dar análise PERSONALIZADA.
   - Se houver média de notas, comente sobre defesa fraca ou ataque forte
   - Se houver forma recente, analise tendências

4. FORMATO da resposta:
   - Seja OBJETIVO e DIRETO
   - Forneça PROBABILIDADES quando possível
   - Mencione mercados: Over/Under, BTTS, Handicap, Escanteios
   - Cite fontes quando usar dados específicos

5. SEMPRE responda em PORTUGUÊS BRASILEIRO`;

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
                },
                timeout: 60000 // 60s timeout for web search
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

        // Fallback to Chat Completions API
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
    const homeTeam = matchInfo?.home_team || matchInfo?.header?.home_team?.name || 'Time Casa';
    const awayTeam = matchInfo?.away_team || matchInfo?.header?.away_team?.name || 'Time Fora';
    const league = matchInfo?.league || matchInfo?.header?.league?.name || 'Liga';
    const matchDate = matchInfo?.date || matchInfo?.header?.date || 'Em breve';

    const enrichedContext = buildEnrichedContext(matchInfo);

    const systemPrompt = `Você é um assistente ESPECIALISTA em futebol e apostas.

PARTIDA: ${homeTeam} vs ${awayTeam} | ${league} | ${matchDate}

DADOS DISPONÍVEIS:
${enrichedContext}

INSTRUÇÕES:
- Busque na internet informações ATUALIZADAS (lesões, notícias, odds)
- Use os dados acima para análise personalizada
- Sugira mercados de apostas com probabilidades
- Responda em português brasileiro de forma objetiva`;

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-search-preview',
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
            },
            timeout: 60000
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
