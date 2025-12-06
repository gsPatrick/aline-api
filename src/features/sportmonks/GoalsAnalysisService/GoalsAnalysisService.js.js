const sportMonksProvider = require('../../../sportmonks/provider/SportMonksProvider');

// --- HELPERS INTERNOS (LÓGICA MATEMÁTICA) ---

/**
 * Busca histórico de partidas com filtros específicos
 */
const fetchHistory = async (teamId, location) => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6); // Últimos 6 meses
    const startDate = pastDate.toISOString().split('T')[0];

    // Busca API com Includes necessários: 
    // - events: para saber o minuto do gol
    // - scores: para saber HT/FT
    // - participants: para confirmar mando de campo
    const response = await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${today}/${teamId}`,
        {
            include: 'league;participants;scores;events.type',
            per_page: 20, // Amostra de 20 jogos para estatística confiável
            order: 'desc'
        }
    );

    const allMatches = response.data || [];

    // Filtra: Se location for 'home', só quero jogos onde teamId foi mandante
    // Se location for 'away', só quero jogos onde teamId foi visitante
    return allMatches.filter(m => {
        const p = m.participants.find(part => part.id == teamId);
        return p && p.meta && p.meta.location === location;
    });
};

/**
 * Processa estatísticas detalhadas (Intervalos, 1º a marcar, Overs)
 */
const processStats = (matches, teamId) => {
    const totalGames = matches.length;
    if (totalGames === 0) return null;

    let stats = {
        goals_scored: 0,
        goals_conceded: 0,
        btts: 0, // Ambas Marcam
        clean_sheets: 0, // Jogos sem sofrer gol
        failed_to_score: 0, // Jogos sem marcar
        overs: {
            ft_05: 0, ft_15: 0, ft_25: 0, ft_35: 0,
            ht_05: 0, ht_15: 0
        },
        timing: { // Gols marcados por intervalo (0-15, 16-30...)
            '0-15': { scored: 0, conceded: 0 },
            '16-30': { scored: 0, conceded: 0 },
            '31-45': { scored: 0, conceded: 0 }, // Considera 31-HT
            '46-60': { scored: 0, conceded: 0 },
            '61-75': { scored: 0, conceded: 0 },
            '76-90': { scored: 0, conceded: 0 }  // Considera 76-FT
        },
        first_to_score: {
            count: 0,      // Quantas vezes abriu o placar
            wins: 0,       // Ganhou depois de abrir
            draws: 0,      // Empatou depois de abrir
            losses: 0      // Perdeu depois de abrir
        }
    };

    matches.forEach(match => {
        // 1. Identificar Mando e Placar
        // Na v3, precisamos achar o score do participante correto
        const isHome = match.participants.find(p => p.meta.location === 'home').id == teamId;

        // Helper para pegar gols de um score type específico
        const getGoals = (desc, participantType) => {
            const s = match.scores.find(score => score.description === desc && score.score.participant === participantType);
            return s ? s.score.goals : 0;
        };

        const myLoc = isHome ? 'home' : 'away';
        const opLoc = isHome ? 'away' : 'home';

        // FT Scores (Final)
        const myGoals = getGoals('CURRENT', myLoc);
        const opGoals = getGoals('CURRENT', opLoc);
        const totalGoals = myGoals + opGoals;

        // HT Scores (Intervalo)
        const myGoalsHT = getGoals('1ST_HALF', myLoc);
        const opGoalsHT = getGoals('1ST_HALF', opLoc);
        const totalGoalsHT = myGoalsHT + opGoalsHT;

        // 2. Acumuladores Básicos
        stats.goals_scored += myGoals;
        stats.goals_conceded += opGoals;

        if (myGoals > 0 && opGoals > 0) stats.btts++;
        if (opGoals === 0) stats.clean_sheets++;
        if (myGoals === 0) stats.failed_to_score++;

        // 3. Overs
        if (totalGoals > 0.5) stats.overs.ft_05++;
        if (totalGoals > 1.5) stats.overs.ft_15++;
        if (totalGoals > 2.5) stats.overs.ft_25++;
        if (totalGoals > 3.5) stats.overs.ft_35++;
        if (totalGoalsHT > 0.5) stats.overs.ht_05++;
        if (totalGoalsHT > 1.5) stats.overs.ht_15++;

        // 4. Análise de Eventos (Minutos dos Gols)
        if (match.events) {
            // Filtrar apenas gols válidos (ignora VAR anulado se a API retornar, foca em type 'goal')
            const goals = match.events.filter(e => e.type && e.type.name.toLowerCase().includes('goal') && !e.type.name.toLowerCase().includes('own'));

            // Ordenar por minuto para saber quem marcou primeiro
            goals.sort((a, b) => a.minute - b.minute);

            // Lógica Primeiro a Marcar
            if (goals.length > 0) {
                const firstGoal = goals[0];
                if (firstGoal.participant_id == teamId) {
                    stats.first_to_score.count++;
                    if (myGoals > opGoals) stats.first_to_score.wins++;
                    else if (myGoals === opGoals) stats.first_to_score.draws++;
                    else stats.first_to_score.losses++;
                }
            }

            // Lógica Intervalos
            goals.forEach(g => {
                const min = g.minute;
                const isMine = g.participant_id == teamId;
                const target = isMine ? 'scored' : 'conceded';

                if (min <= 15) stats.timing['0-15'][target]++;
                else if (min <= 30) stats.timing['16-30'][target]++;
                else if (min <= 45) stats.timing['31-45'][target]++; // Inclui acrescimos 1T
                else if (min <= 60) stats.timing['46-60'][target]++;
                else if (min <= 75) stats.timing['61-75'][target]++;
                else stats.timing['76-90'][target]++; // Inclui acrescimos 2T
            });
        }
    });

    // 5. Cálculos Finais (Porcentagens e Médias)
    const pct = (val) => Math.round((val / totalGames) * 100);

    return {
        total_games: totalGames,
        averages: {
            scored: (stats.goals_scored / totalGames).toFixed(2),
            conceded: (stats.goals_conceded / totalGames).toFixed(2),
            total_match: ((stats.goals_scored + stats.goals_conceded) / totalGames).toFixed(2)
        },
        percentages: {
            btts: pct(stats.btts),
            clean_sheets: pct(stats.clean_sheets),
            failed_to_score: pct(stats.failed_to_score),
            over_05: pct(stats.overs.ft_05),
            over_15: pct(stats.overs.ft_15),
            over_25: pct(stats.overs.ft_25),
            over_35: pct(stats.overs.ft_35),
            ht_over_05: pct(stats.overs.ht_05)
        },
        timing: stats.timing,
        first_to_score: {
            percentage: pct(stats.first_to_score.count),
            stats_when_first: {
                win: stats.first_to_score.count ? Math.round((stats.first_to_score.wins / stats.first_to_score.count) * 100) : 0,
                draw: stats.first_to_score.count ? Math.round((stats.first_to_score.draws / stats.first_to_score.count) * 100) : 0,
                loss: stats.first_to_score.count ? Math.round((stats.first_to_score.losses / stats.first_to_score.count) * 100) : 0
            }
        }
    };
};

// --- HANDLER PRINCIPAL (CONTROLLER) ---

const handleRequest = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

        // 1. Busca dados da partida para saber quem é quem
        const matchRes = await sportMonksProvider.get(`/fixtures/${fixtureId}`, {
            include: 'participants;league'
        });
        const match = matchRes.data;
        if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

        const homeId = match.participants.find(p => p.meta.location === 'home').id;
        const awayId = match.participants.find(p => p.meta.location === 'away').id;

        // 2. Busca histórico em paralelo (Home jogando em Casa, Away jogando Fora)
        const [homeHistory, awayHistory] = await Promise.all([
            fetchHistory(homeId, 'home'),
            fetchHistory(awayId, 'away')
        ]);

        // 3. Processa estatísticas
        const homeStats = processStats(homeHistory, homeId);
        const awayStats = processStats(awayHistory, awayId);

        if (!homeStats || !awayStats) {
            return res.status(200).json({ success: false, message: 'Dados insuficientes para análise' });
        }

        // 4. Criação da Previsão Combinada (Média das probabilidades dos dois)
        const combine = (key) => Math.round((homeStats.percentages[key] + awayStats.percentages[key]) / 2);

        const predictions = {
            over_05: combine('over_05'),
            over_15: combine('over_15'),
            over_25: combine('over_25'), // Este é o valor que aparece colorido no card "Fim do Jogo"
            over_35: combine('over_35'),
            btts: combine('btts')
        };

        // 5. Montagem do JSON final
        const responseData = {
            match: {
                id: match.id,
                league: match.league.name,
                home_team: match.participants.find(p => p.id === homeId).name,
                away_team: match.participants.find(p => p.id === awayId).name
            },
            predictions_cornerpro_style: {
                match_goals: predictions,
                ht_goals: {
                    over_05: combine('ht_over_05')
                }
            },
            teams_analysis: {
                home: {
                    name: match.participants.find(p => p.id === homeId).name,
                    matches_played: homeStats.total_games,
                    averages: homeStats.averages,
                    percentages: homeStats.percentages,
                    timing_goals: homeStats.timing,
                    first_to_score: homeStats.first_to_score
                },
                away: {
                    name: match.participants.find(p => p.id === awayId).name,
                    matches_played: awayStats.total_games,
                    averages: awayStats.averages,
                    percentages: awayStats.percentages,
                    timing_goals: awayStats.timing,
                    first_to_score: awayStats.first_to_score
                }
            }
        };

        return res.json({ success: true, data: responseData });

    } catch (error) {
        console.error("Erro MatchGoalsAnalysis:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROTA ---
module.exports = {
    path: '/sportmonks/match/:fixtureId/goals-analysis',
    method: 'GET',
    handler: handleRequest
};