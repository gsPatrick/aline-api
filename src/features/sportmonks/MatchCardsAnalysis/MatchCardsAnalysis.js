const sportMonksProvider = require('../../../sportmonks/provider/SportMonksProvider');

// --- CONSTANTES ---
const INTERVALS = [
    { label: '0-15', min: 0, max: 15 },
    { label: '16-30', min: 16, max: 30 },
    { label: '31-HT', min: 31, max: 45 },
    { label: '46-60', min: 46, max: 60 },
    { label: '61-75', min: 61, max: 75 },
    { label: '76-FT', min: 76, max: 120 }
];

const CARD_TYPES = ['Yellowcard', 'Redcard'];

// --- HELPERS DE BUSCA ---

const fetchHistory = async (entityId, type = 'team', location = null) => {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6); // 6 meses
    const startDate = pastDate.toISOString().split('T')[0];

    let endpoint = '';
    let params = {
        include: 'events.type;participants',
        per_page: 20,
        order: 'desc'
    };

    if (type === 'team') {
        endpoint = `/fixtures/between/${startDate}/${today}/${entityId}`;
        params.include = 'league;participants;events.type';
    } else if (type === 'referee') {
        endpoint = `/fixtures/referee/${entityId}`;
        // Para árbitro não filtramos por data na URL da v3 padrão da mesma forma, 
        // mas vamos assumir que pegamos os ultimos jogos dele.
        // Se a API exigir datas para referee, usamos estrutura similar.
        // Adaptando para buscar fixtures gerais e filtrar pelo ref se necessario,
        // mas a rota /referee/{id} geralmente traz dados dele. 
        // Vamos usar a rota de fixtures filtrando pelo referee_id se a API suportar, 
        // ou fixtures passadas genéricas. Na v3: /fixtures?filters=referee_id:{id}
        // Simplificação: Vamos assumir busca direta de fixtures do referee.
        return await sportMonksProvider.get(`/fixtures/search`, {
            filters: `referee_id:${entityId}`,
            include: 'events.type',
            per_page: 10
        });
    }

    const response = await sportMonksProvider.get(endpoint, params);
    const allMatches = response.data || [];

    // Se for time, filtra casa/fora
    if (type === 'team' && location) {
        return allMatches.filter(m => {
            const p = m.participants.find(part => part.id == entityId);
            return p && p.meta && p.meta.location === location;
        });
    }

    return allMatches;
};

// --- CÉREBRO MATEMÁTICO ---

const calculateStats = (matches, teamId, period = 'FT') => {
    const totalGames = matches.length;
    if (totalGames === 0) return null;

    let stats = {
        cards_for: 0,
        cards_against: 0,
        // Overs Totais do Jogo (Soma dos dois times)
        overs_game: { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0, 5.5: 0 },
        // Overs Individuais (Mercado "Total Cartões Marcados/Sofridos")
        overs_team_for: { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0 },
        overs_team_against: { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0 },
        intervals: {}
    };

    INTERVALS.forEach(i => stats.intervals[i.label] = { for: 0, against: 0 });

    matches.forEach(match => {
        if (!match.events) return;

        // Filtra cartões e período
        const cards = match.events.filter(e => {
            const isCard = e.type && CARD_TYPES.includes(e.type.name);
            if (!isCard) return false;

            if (period === '1T') return e.minute <= 45;
            if (period === '2T') return e.minute > 45;
            return true;
        });

        let countFor = 0;
        let countAgainst = 0;

        cards.forEach(c => {
            const isMe = c.participant_id == teamId;
            if (isMe) {
                countFor++;
                if (period === 'FT') {
                    const intv = INTERVALS.find(i => c.minute >= i.min && c.minute <= i.max);
                    if (intv) stats.intervals[intv.label].for++;
                }
            } else {
                countAgainst++;
                if (period === 'FT') {
                    const intv = INTERVALS.find(i => c.minute >= i.min && c.minute <= i.max);
                    if (intv) stats.intervals[intv.label].against++;
                }
            }
        });

        const total = countFor + countAgainst;

        stats.cards_for += countFor;
        stats.cards_against += countAgainst;

        // Popula Overs Game
        [0.5, 1.5, 2.5, 3.5, 4.5, 5.5].forEach(k => {
            if (total > k) stats.overs_game[k]++;
        });

        // Popula Overs Team (Marcados/Sofridos)
        [0.5, 1.5, 2.5, 3.5].forEach(k => {
            if (countFor > k) stats.overs_team_for[k]++;
            if (countAgainst > k) stats.overs_team_against[k]++;
        });
    });

    const pct = (val) => Math.round((val / totalGames) * 100);
    const avg = (val) => (val / totalGames).toFixed(2);

    return {
        averages: {
            for: avg(stats.cards_for),
            against: avg(stats.cards_against),
            total: avg(stats.cards_for + stats.cards_against)
        },
        percentages: {
            // Tabela "Previsões CornerPro" (Coluna Casa ou Fora)
            game_overs: {
                over_05: pct(stats.overs_game[0.5]),
                over_15: pct(stats.overs_game[1.5]),
                over_25: pct(stats.overs_game[2.5]),
                over_35: pct(stats.overs_game[3.5]),
                over_45: pct(stats.overs_game[4.5])
            },
            // Tabela "Total Cartões Marcados/Sofridos"
            team_overs: {
                for_05: pct(stats.overs_team_for[0.5]),
                for_15: pct(stats.overs_team_for[1.5]),
                for_25: pct(stats.overs_team_for[2.5]), // Ex: 90% na imagem
                against_05: pct(stats.overs_team_against[0.5]),
                against_15: pct(stats.overs_team_against[1.5]),
                against_25: pct(stats.overs_team_against[2.5])
            }
        },
        intervals: stats.intervals
    };
};

const calculateRefereeStats = (matches) => {
    if (!matches || matches.length === 0) return { avg: 0, matches: 0 };

    let totalCards = 0;
    matches.forEach(m => {
        if (m.events) {
            totalCards += m.events.filter(e => e.type && CARD_TYPES.includes(e.type.name)).length;
        }
    });

    return {
        matches: matches.length,
        avg: (totalCards / matches.length).toFixed(2)
    };
};

// --- CONTROLLER ---

const handleRequest = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

        // 1. Dados da Partida
        const matchRes = await sportMonksProvider.get(`/fixtures/${fixtureId}`, {
            include: 'participants;league;referee'
        });
        const match = matchRes.data;
        if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

        const homeId = match.participants.find(p => p.meta.location === 'home').id;
        const awayId = match.participants.find(p => p.meta.location === 'away').id;
        const refereeId = match.referee_id;

        // 2. Buscas em Paralelo (Home, Away e Árbitro)
        const promises = [
            fetchHistory(homeId, 'team', 'home'),
            fetchHistory(awayId, 'team', 'away')
        ];

        // Só busca juiz se tiver ID
        if (refereeId) {
            promises.push(fetchHistory(refereeId, 'referee'));
        }

        const [homeHistory, awayHistory, refereeHistory] = await Promise.all(promises);

        // 3. Processar Estatísticas por Tempo (FT, 1T, 2T)
        const processAllPeriods = (hist, teamId) => ({
            ft: calculateStats(hist, teamId, 'FT'),
            ht: calculateStats(hist, teamId, '1T'),
            st: calculateStats(hist, teamId, '2T')
        });

        const homeStats = processAllPeriods(homeHistory, homeId);
        const awayStats = processAllPeriods(awayHistory, awayId);

        // 4. Processar Árbitro
        const refStats = refereeHistory ? calculateRefereeStats(refereeHistory.data || []) : { avg: 0 };

        // 5. Montar Tabela de Previsões (Esquerda da Imagem)
        // Combina Home% e Away% para gerar a coluna "Jogo"
        const buildPredictionTable = (periodKey) => {
            const h = homeStats[periodKey].percentages.game_overs;
            const a = awayStats[periodKey].percentages.game_overs;

            // Função para média combinada (CornerPro logic)
            const combine = (k) => Math.round((h[k] + a[k]) / 2);

            return {
                over_05: { home: h.over_05, away: a.over_05, match: combine('over_05') },
                over_15: { home: h.over_15, away: a.over_15, match: combine('over_15') },
                over_25: { home: h.over_25, away: a.over_25, match: combine('over_25') },
                over_35: { home: h.over_35, away: a.over_35, match: combine('over_35') },
                over_45: { home: h.over_45, away: a.over_45, match: combine('over_45') }
            };
        };

        return res.json({
            success: true,
            data: {
                match_info: {
                    id: match.id,
                    home_name: match.participants.find(p => p.id === homeId).name,
                    away_name: match.participants.find(p => p.id === awayId).name,
                    referee: {
                        name: match.referee ? match.referee.common_name : 'Desconhecido',
                        stats: refStats // "Média total" da imagem
                    }
                },
                // Dados para a tabela da Esquerda (Previsões CornerPro)
                predictions_table: {
                    full_time: buildPredictionTable('ft'),
                    first_half: buildPredictionTable('ht'),
                    second_half: buildPredictionTable('st')
                },
                // Dados para as tabelas do Centro e Direita
                analysis: {
                    home: homeStats, // Acessar .ft, .ht, .st dentro
                    away: awayStats
                }
            }
        });

    } catch (error) {
        console.error("Erro MatchCardsAnalysis:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    path: '/sportmonks/match/:fixtureId/cards-analysis',
    method: 'GET',
    handler: handleRequest
};