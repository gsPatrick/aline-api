const sportMonksProvider = require('../../provider/SportMonksProvider');

// --- HELPERS INTERNOS ---

const fetchHistory = async (teamId, location) => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    const startDate = pastDate.toISOString().split('T')[0];

    const response = await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${today}/${teamId}`,
        {
            include: 'league;participants;scores;events.type',
            per_page: 20,
            order: 'desc'
        }
    );

    const allMatches = response.data || [];

    // Filtra Home/Away
    return allMatches.filter(m => {
        const p = m.participants.find(part => part.id == teamId);
        return p && p.meta && p.meta.location === location;
    });
};

/**
 * Processa estatísticas com base no período (FT, 1T, 2T)
 */
const processStats = (matches, teamId, period = 'FT') => {
    const totalGames = matches.length;
    if (totalGames === 0) return null;

    let stats = {
        goals_scored: 0,
        goals_conceded: 0,
        btts: 0,
        clean_sheets: 0,
        failed_to_score: 0,
        overs: {
            0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0
        },
        timing: {
            '0-15': { scored: 0, conceded: 0 },
            '16-30': { scored: 0, conceded: 0 },
            '31-45': { scored: 0, conceded: 0 },
            '46-60': { scored: 0, conceded: 0 },
            '61-75': { scored: 0, conceded: 0 },
            '76-90': { scored: 0, conceded: 0 }
        },
        first_to_score: { count: 0, wins: 0, draws: 0, losses: 0 }
    };

    matches.forEach(match => {
        const isHome = match.participants.find(p => p.meta.location === 'home').id == teamId;
        const myLoc = isHome ? 'home' : 'away';
        const opLoc = isHome ? 'away' : 'home';

        // Determinar qual score pegar baseadon no período
        let desc = 'CURRENT'; // FT
        if (period === '1T') desc = '1ST_HALF';
        if (period === '2T') desc = '2ND_HALF';

        // Nota: A API Sportmonks v3 as vezes não traz 2ND_HALF explicito no scores, 
        // mas vamos assumir logica de FT - 1T para 2T se necessario.
        // Aqui usaremos score direto se disponivel ou calculo manual pelos eventos para 2T.

        // Simplificação robusta: Usar Scores para FT e 1T.
        // Para 2T, o ideal é subtrair FT - 1T, pois nem sempre vem no array scores.

        const getScore = (d) => {
            const s = match.scores.find(score => score.description === d);
            if (!s) return { my: 0, op: 0 };
            // A estrutura do score.goals pode variar (int ou obj), assumindo padrao participant
            const sHome = match.scores.find(x => x.description === d && x.score.participant === 'home')?.score.goals || 0;
            const sAway = match.scores.find(x => x.description === d && x.score.participant === 'away')?.score.goals || 0;
            return { my: isHome ? sHome : sAway, op: isHome ? sAway : sHome };
        };

        let myGoals = 0, opGoals = 0;

        if (period === '2T') {
            const ft = getScore('CURRENT');
            const ht = getScore('1ST_HALF');
            myGoals = ft.my - ht.my;
            opGoals = ft.op - ht.op;
            // Proteção contra dados sujos
            if (myGoals < 0) myGoals = 0;
            if (opGoals < 0) opGoals = 0;
        } else {
            const s = getScore(period === 'FT' ? 'CURRENT' : '1ST_HALF');
            myGoals = s.my;
            opGoals = s.op;
        }

        const totalGoals = myGoals + opGoals;

        // Acumuladores
        stats.goals_scored += myGoals;
        stats.goals_conceded += opGoals;

        if (myGoals > 0 && opGoals > 0) stats.btts++;
        if (opGoals === 0) stats.clean_sheets++;
        if (myGoals === 0) stats.failed_to_score++;

        if (totalGoals > 0.5) stats.overs[0.5]++;
        if (totalGoals > 1.5) stats.overs[1.5]++;
        if (totalGoals > 2.5) stats.overs[2.5]++;
        if (totalGoals > 3.5) stats.overs[3.5]++;

        // Timing e First to Score só fazem sentido calcular no contexto Full Time (FT)
        if (period === 'FT' && match.events) {
            const goals = match.events
                .filter(e => e.type && e.type.name.toLowerCase().includes('goal') && !e.type.name.toLowerCase().includes('own'))
                .sort((a, b) => a.minute - b.minute);

            // First Score
            if (goals.length > 0) {
                if (goals[0].participant_id == teamId) {
                    stats.first_to_score.count++;
                    const ft = getScore('CURRENT');
                    if (ft.my > ft.op) stats.first_to_score.wins++;
                    else if (ft.my === ft.op) stats.first_to_score.draws++;
                    else stats.first_to_score.losses++;
                }
            }

            // Timing
            goals.forEach(g => {
                const min = g.minute;
                const target = g.participant_id == teamId ? 'scored' : 'conceded';

                if (min <= 15) stats.timing['0-15'][target]++;
                else if (min <= 30) stats.timing['16-30'][target]++;
                else if (min <= 45) stats.timing['31-45'][target]++;
                else if (min <= 60) stats.timing['46-60'][target]++;
                else if (min <= 75) stats.timing['61-75'][target]++;
                else stats.timing['76-90'][target]++;
            });
        }
    });

    const pct = (val) => Math.round((val / totalGames) * 100);

    return {
        averages: {
            scored: (stats.goals_scored / totalGames).toFixed(2),
            conceded: (stats.goals_conceded / totalGames).toFixed(2),
            total: ((stats.goals_scored + stats.goals_conceded) / totalGames).toFixed(2)
        },
        percentages: {
            btts: pct(stats.btts),
            clean_sheets: pct(stats.clean_sheets),
            failed_to_score: pct(stats.failed_to_score),
            over_05: pct(stats.overs[0.5]),
            over_15: pct(stats.overs[1.5]),
            over_25: pct(stats.overs[2.5]),
            over_35: pct(stats.overs[3.5])
        },
        timing: stats.timing,
        first_to_score: stats.first_to_score,
        total_games: totalGames
    };
};

// --- CONTROLLER ---

const handleRequest = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

        const matchRes = await sportMonksProvider.get(`/fixtures/${fixtureId}`, {
            include: 'participants;league'
        });
        const match = matchRes.data;
        if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

        const homeId = match.participants.find(p => p.meta.location === 'home').id;
        const awayId = match.participants.find(p => p.meta.location === 'away').id;

        const [homeHistory, awayHistory] = await Promise.all([
            fetchHistory(homeId, 'home'),
            fetchHistory(awayId, 'away')
        ]);

        // Processa FT, 1T e 2T
        const processAll = (hist, id) => ({
            ft: processStats(hist, id, 'FT'),
            ht: processStats(hist, id, '1T'),
            st: processStats(hist, id, '2T')
        });

        const homeStats = processAll(homeHistory, homeId);
        const awayStats = processAll(awayHistory, awayId);

        // --- PREDICTION TABLE BUILDER (Igual Cards) ---
        const buildTable = (periodKey) => {
            const h = homeStats[periodKey].percentages;
            const a = awayStats[periodKey].percentages;
            const combine = (k) => Math.round((h[k] + a[k]) / 2);

            return {
                over_05: { home: h.over_05, away: a.over_05, match: combine('over_05') },
                over_15: { home: h.over_15, away: a.over_15, match: combine('over_15') },
                over_25: { home: h.over_25, away: a.over_25, match: combine('over_25') },
                over_35: { home: h.over_35, away: a.over_35, match: combine('over_35') },
                btts: { home: h.btts, away: a.btts, match: combine('btts') }
            };
        };

        const responseData = {
            match: {
                id: match.id,
                home_team: match.participants.find(p => p.id === homeId).name,
                away_team: match.participants.find(p => p.id === awayId).name
            },
            // AQUI ESTÁ O QUE FALTAVA: Tabela comparativa por abas
            predictions_table: {
                full_time: buildTable('ft'),
                first_half: buildTable('ht'),
                second_half: buildTable('st')
            },
            analysis: {
                home: homeStats, // Contém ft, ht, st
                away: awayStats
            }
        };

        return res.json({ success: true, data: responseData });

    } catch (error) {
        console.error("Erro MatchGoalsAnalysis:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    path: '/sportmonks/match/:fixtureId/goals-analysis',
    method: 'GET',
    handler: handleRequest
};