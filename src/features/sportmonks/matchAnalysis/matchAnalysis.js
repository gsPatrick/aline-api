const sportMonksProvider = require('../../../sportmonks/provider/SportMonksProvider');

// --- HELPERS DE CÁLCULO (A Mágica das Estatísticas) ---

/**
 * Calcula porcentagens com base em uma lista de jogos anteriores
 * Ex: Quantos jogos tiveram Over 2.5 Gols?
 */
const calculateStatsPercentages = (games, teamId) => {
    const total = games.length;
    if (total === 0) return null;

    let btts = 0;
    let over05HT = 0;
    let over15FT = 0;
    let over25FT = 0;
    let cornersOver85 = 0;
    let cardsOver35 = 0;

    games.forEach(game => {
        // Scores
        const homeScore = game.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'home')?.score.goals || 0;
        const awayScore = game.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'away')?.score.goals || 0;
        const htScoreHome = game.scores.find(s => s.description === '1ST_HALF' && s.score.participant === 'home')?.score.goals || 0;
        const htScoreAway = game.scores.find(s => s.description === '1ST_HALF' && s.score.participant === 'away')?.score.goals || 0;

        const totalGoals = homeScore + awayScore;
        const totalGoalsHT = htScoreHome + htScoreAway;

        // Stats (Caçando dentro do array statistics)
        // Nota: Precisamos somar Home + Away para ter o total do jogo
        const getStatTotal = (code) => {
            const stats = game.statistics || [];
            const homeVal = stats.find(s => s.location === 'home' && s.type.code === code)?.data.value || 0;
            const awayVal = stats.find(s => s.location === 'away' && s.type.code === code)?.data.value || 0;
            return homeVal + awayVal;
        };

        const totalCorners = getStatTotal('corners');
        const totalCards = getStatTotal('yellowcards') + getStatTotal('redcards');

        // Lógica dos Checks
        if (homeScore > 0 && awayScore > 0) btts++;
        if (totalGoalsHT > 0.5) over05HT++;
        if (totalGoals > 1.5) over15FT++;
        if (totalGoals > 2.5) over25FT++;
        if (totalCorners > 8.5) cornersOver85++;
        if (totalCards > 3.5) cardsOver35++;
    });

    return {
        total_games: total,
        btts_percentage: Math.round((btts / total) * 100),
        over05ht_percentage: Math.round((over05HT / total) * 100),
        over15ft_percentage: Math.round((over15FT / total) * 100),
        over25ft_percentage: Math.round((over25FT / total) * 100),
        corners_over_85_percentage: Math.round((cornersOver85 / total) * 100)
    };
};

// --- SERVICES DE BUSCA (Data Fetching) ---

// 1. Busca Histórico de um time (Para calcular forma)
const fetchTeamHistory = async (teamId, endDate) => {
    // Pega 3 meses para trás a partir da data do jogo
    const date = new Date(endDate);
    date.setMonth(date.getMonth() - 3);
    const startDate = date.toISOString().split('T')[0];

    // Includes necessários para calcular estatísticas
    return await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${endDate}/${teamId}`,
        {
            include: 'scores;statistics.type',
            per_page: 10, // Últimos 10 jogos
            order: 'desc'
        }
    );
};

// 2. Busca Confronto Direto (H2H)
const fetchH2H = async (teamA, teamB) => {
    return await sportMonksProvider.get(
        `/fixtures/head-to-head/${teamA}/${teamB}`,
        {
            include: 'scores;statistics.type',
            per_page: 5,
            order: 'desc'
        }
    );
};

// 3. Busca Classificação (Standings) da Season atual
const fetchStandings = async (seasonId) => {
    if (!seasonId) return [];
    // Tenta buscar a tabela total
    const res = await sportMonksProvider.get(`/standings/seasons/${seasonId}`, {
        include: 'details' // Para pegar form guide (V-V-E-D-V)
    });
    return res.data || [];
};

// --- SERVICE PRINCIPAL ---

const getFullMatchAnalysis = async (fixtureId) => {
    // 1. Detalhes da Partida Principal
    // Includes monstros para pegar tudo: lineups, odds, lesões (sidelined), local, estatísticas
    const matchRes = await sportMonksProvider.get(`/fixtures/${fixtureId}`, {
        include: 'league;venue;participants;scores;lineups.player;odds.market;odds.bookmaker;events'
    });

    const match = matchRes.data;
    if (!match) throw new Error('Partida não encontrada');

    const seasonId = match.season_id;
    const homeTeamId = match.participants.find(p => p.meta.location === 'home').id;
    const awayTeamId = match.participants.find(p => p.meta.location === 'away').id;
    const matchDate = match.starting_at.split(' ')[0];

    // 2. Chamadas Paralelas (Otimização de tempo)
    const [homeHistory, awayHistory, h2hHistory, standingsData] = await Promise.all([
        fetchTeamHistory(homeTeamId, matchDate),
        fetchTeamHistory(awayTeamId, matchDate),
        fetchH2H(homeTeamId, awayTeamId),
        fetchStandings(seasonId)
    ]);

    // 3. Processar Dados para o Dashboard

    // A. Classificação e Forma
    const findStanding = (id) => standingsData.find(s => s.participant_id === id);
    const homeStanding = findStanding(homeTeamId);
    const awayStanding = findStanding(awayTeamId);

    // Helper simples para pegar posição e pontos
    const getTeamMeta = (standing) => ({
        position: standing ? standing.position : '-',
        points: standing ? standing.points : 0,
        form: standing ? standing.form : '-----', // V-V-E-D
        ppj: standing ? (standing.points / standing.details.find(d => d.type_id === 129)?.value || 1).toFixed(2) : '0.00' // Points per Game (estimado)
    });

    // B. Estatísticas Calculadas (Cards Verdes da Imagem 1)
    const homeStats = calculateStatsPercentages(homeHistory.data || [], homeTeamId);
    const awayStats = calculateStatsPercentages(awayHistory.data || [], awayTeamId);
    const h2hStats = calculateStatsPercentages(h2hHistory.data || [], null);

    // C. Lineups e Ausências
    // Na v3, lineups vêm misturados. Filtramos por time.
    // Ausências geralmente vêm em 'sidelined' (se o plano permitir) ou analisamos lineups type 'bench' vs 'lineup'
    // Aqui vamos estruturar o que veio no include 'lineups'
    const formatLineup = (teamId) => {
        if (!match.lineups) return [];
        return match.lineups
            .filter(l => l.team_id === teamId && l.type_id === 11) // 11 = XI Inicial geralmente
            .map(l => ({
                player_name: l.player_name,
                player_image: l.player.image_path,
                position: l.position,
                jersey_number: l.jersey_number
            }));
    };

    // D. Odds (Correct Score e Winner)
    // Filtramos odds de "Correct Score"
    const correctScoreOdds = match.odds ? match.odds.filter(o => o.market.name === 'Correct Score') : [];
    // Pega as top 3 probabilidades (menores odds)
    const top3CorrectScores = correctScoreOdds
        .sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
        .slice(0, 3)
        .map(o => ({ score: o.label, odd: o.value, probability: (1 / o.value * 100).toFixed(1) + '%' }));

    // --- MONTAGEM DO JSON FINAL ---
    return {
        match_info: {
            id: match.id,
            date: match.starting_at,
            venue: match.venue ? match.venue.name : null,
            league_name: match.league.name,
            round: match.round_id // Você pode precisar buscar o nome da rodada se quiser "Round #38"
        },
        teams: {
            home: {
                id: homeTeamId,
                name: match.participants.find(p => p.id === homeTeamId).name,
                image: match.participants.find(p => p.id === homeTeamId).image_path,
                standing: getTeamMeta(homeStanding),
                lineup: formatLineup(homeTeamId),
                last_10_stats: homeStats
            },
            away: {
                id: awayTeamId,
                name: match.participants.find(p => p.id === awayTeamId).name,
                image: match.participants.find(p => p.id === awayTeamId).image_path,
                standing: getTeamMeta(awayStanding),
                lineup: formatLineup(awayTeamId),
                last_10_stats: awayStats
            }
        },
        analysis: {
            h2h_summary: h2hStats, // Dados para o bloco "Confronto Direto"
            predictions: {
                // Aqui você pode criar regras. Ex: Se Over 2.5 > 70% nos dois times -> Recomenda Over 2.5
                recommended_over_25: (homeStats?.over25ft_percentage + awayStats?.over25ft_percentage) / 2 > 60,
                recommended_btts: (homeStats?.btts_percentage + awayStats?.btts_percentage) / 2 > 55
            },
            correct_score_prob: top3CorrectScores
        },
        history_data: {
            h2h_matches: h2hHistory.data || [], // Lista crua para exibir detalhes
            home_last_matches: homeHistory.data || [],
            away_last_matches: awayHistory.data || []
        }
    };
};

// --- CONTROLLER ---

const handleRequest = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

        const data = await getFullMatchAnalysis(fixtureId);

        return res.json({ success: true, data });

    } catch (error) {
        console.error('Erro Match Analysis:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROTA ---
module.exports = {
    path: '/sportmonks/match/:fixtureId/analysis',
    method: 'GET',
    handler: handleRequest
};