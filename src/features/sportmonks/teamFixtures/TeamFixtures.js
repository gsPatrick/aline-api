const sportMonksProvider = require('../../provider/SportMonksProvider');

// --- CONSTANTES ---
const BET365_NAME = 'Bet365';
// Nomes comuns para o mercado de Vencedor (1x2)
const WINNER_MARKETS = ['3Way Result', 'Match Winner', '1x2'];

// --- HELPERS (PROCESSAMENTO DE DADOS) ---

/**
 * 1. Extrai Escanteios e Cartões do array complexo da Sportmonks
 */
const extractStats = (match, teamId) => {
    // Se não tiver stats, zera tudo
    if (!match.statistics || match.statistics.length === 0) {
        return { corners: 0, yellow_cards: 0, red_cards: 0 };
    }

    // Filtra estatísticas APENAS do time solicitado
    const teamStats = match.statistics.filter(s => s.participant_id == teamId);

    // Função para buscar o valor dentro do objeto data.value pelo nome do tipo
    const getValue = (name) => {
        const item = teamStats.find(s => s.type && s.type.name === name);
        return item ? item.data.value : 0;
    };

    return {
        corners: getValue('Corners'),
        yellow_cards: getValue('Yellowcards'),
        red_cards: getValue('Redcards')
    };
};

/**
 * 2. Calcula quem ganhou e qual foi o placar
 */
const calculateResult = (match, teamId) => {
    if (!match.participants) return null;

    // Identifica quem é o time e quem é o oponente
    const myTeam = match.participants.find(p => p.id == teamId);
    const opponent = match.participants.find(p => p.id != teamId);

    // Identifica se jogou em Casa (Home)
    // O primeiro do array participants nem sempre é o home, melhor verificar meta.location se existir, 
    // mas na falta, assumimos a ordem ou comparamos scores.
    // O JSON mostrou: scores têm "participant": "home" ou "away".

    // Vamos achar o score "CURRENT" (Placar Final)
    let homeScore = 0;
    let awayScore = 0;

    if (match.scores && match.scores.length > 0) {
        const currentScoreHome = match.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'home');
        const currentScoreAway = match.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'away');

        if (currentScoreHome) homeScore = currentScoreHome.score.goals;
        if (currentScoreAway) awayScore = currentScoreAway.score.goals;
    }

    // Descobrir se 'teamId' é home ou away para saber se ganhou
    // O JSON mostrou participants[0] como home no exemplo, mas vamos garantir pelo ID
    const isHome = match.participants.find(p => p.meta && p.meta.location === 'home')?.id == teamId;

    const myGoals = isHome ? homeScore : awayScore;
    const opGoals = isHome ? awayScore : homeScore;

    let result = 'D'; // Draw
    if (myGoals > opGoals) result = 'W'; // Win
    if (myGoals < opGoals) result = 'L'; // Loss

    return {
        result,
        is_home: isHome,
        score_string: `${homeScore} - ${awayScore}`,
        goals_scored: myGoals,
        goals_conceded: opGoals,
        opponent_name: opponent ? opponent.name : 'Desconhecido',
        opponent_image: opponent ? opponent.image_path : null
    };
};

/**
 * 3. Extrai Odds (Prioridade: Bet365 -> Match Winner)
 */
const extractOdds = (match) => {
    if (!match.odds || match.odds.length === 0) return null;

    // 1. Tenta achar o mercado "3Way Result" ou "Match Winner"
    const winMarket = match.odds.filter(o => o.market && WINNER_MARKETS.includes(o.market.name));

    if (winMarket.length === 0) return null; // Não abriu odd de vencedor ainda

    // 2. Tenta achar Bet365 dentro desse mercado
    let selectedOdd = winMarket.find(o => o.bookmaker && o.bookmaker.name === BET365_NAME);

    // 3. Se não tiver Bet365, pega o primeiro bookmaker que aparecer (Ex: 10Bet)
    if (!selectedOdd) selectedOdd = winMarket[0];

    // O JSON de odds geralmente é uma lista plana com labels. 
    // Ex: label: "Home", value: "1.50"
    // No seu JSON veio um array flat. Precisamos agrupar.
    // A estrutura do seu JSON mostra que cada objeto em 'odds' é UMA linha (ex: Home 2.55).
    // Então 'winMarket' é uma lista de odds variadas.

    // Vamos pegar as 3 odds (Home, Draw, Away) do mesmo bookmaker
    const bookmakerId = selectedOdd.bookmaker_id;
    const finalOdds = winMarket.filter(o => o.bookmaker_id === bookmakerId);

    const getVal = (label) => {
        const item = finalOdds.find(o => o.label === label || o.name === label);
        return item ? item.value : '-';
    };

    return {
        bookmaker: selectedOdd.bookmaker ? selectedOdd.bookmaker.name : 'Unknown',
        home: getVal('Home'), // Vitória Casa
        draw: getVal('Draw') || getVal('X'), // Empate
        away: getVal('Away')  // Vitória Fora
    };
};

// --- CORE SERVICE ---

const fetchFixtures = async (teamId, type, limit = 10) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimit = new Date();

    let startDate, endDate, order;

    if (type === 'past') {
        dateLimit.setFullYear(dateLimit.getFullYear() - 1); // 1 ano atrás
        startDate = dateLimit.toISOString().split('T')[0];
        endDate = today;
        order = 'desc';
    } else {
        dateLimit.setFullYear(dateLimit.getFullYear() + 1); // 1 ano à frente
        startDate = today;
        endDate = dateLimit.toISOString().split('T')[0];
        order = 'asc';
    }

    // Includes ajustados ao seu JSON
    const response = await sportMonksProvider.get(
        `/fixtures/between/${startDate}/${endDate}/${teamId}`,
        {
            include: 'league;participants;scores;statistics.type;odds.market;odds.bookmaker',
            per_page: limit,
            order: order
        }
    );

    return response.data || [];
};

// --- MÉTODOS DE CONTROLE ---

// 1. Endpoint Completo (Dashboard)
const getFullScheduleAndStats = async (teamId) => {
    // Busca 1 jogo futuro (para o card de destaque) e 10 passados (para a lista)
    const [futureGames, pastGames] = await Promise.all([
        fetchFixtures(teamId, 'future', 1),
        fetchFixtures(teamId, 'past', 10)
    ]);

    // Processar Próximo Jogo
    let nextMatch = null;
    if (futureGames.length > 0) {
        const m = futureGames[0];
        const resultInfo = calculateResult(m, teamId); // Apenas para pegar nomes
        nextMatch = {
            id: m.id,
            date: m.starting_at,
            league_name: m.league.name,
            league_image: m.league.image_path,
            opponent_name: resultInfo.opponent_name,
            opponent_image: resultInfo.opponent_image,
            is_home: resultInfo.is_home,
            odds: extractOdds(m) // Puxa odds da bet365
        };
    }

    // Processar Jogos Passados e Calcular Médias
    const last10 = pastGames.map(m => {
        const resultInfo = calculateResult(m, teamId);
        const stats = extractStats(m, teamId);

        return {
            id: m.id,
            date: m.starting_at.split(' ')[0], // Só a data YYYY-MM-DD
            league_image: m.league.image_path,
            result: resultInfo.result, // W, D, L
            score: resultInfo.score_string,
            opponent: resultInfo.opponent_name,
            stats: {
                corners: stats.corners,
                cards: stats.yellow_cards + stats.red_cards
            },
            // Dados brutos para cálculo de média abaixo
            _goals_scored: resultInfo.goals_scored,
            _goals_conceded: resultInfo.goals_conceded
        };
    });

    // Calcular Cabeçalho (Resumo)
    const summary = {
        wins: last10.filter(g => g.result === 'W').length,
        draws: last10.filter(g => g.result === 'D').length,
        losses: last10.filter(g => g.result === 'L').length,
        avg_goals: 0
    };

    // Calcular Média de Gols (Feitos + Sofridos) / Total de Jogos
    if (last10.length > 0) {
        const totalGoals = last10.reduce((acc, curr) => acc + curr._goals_scored + curr._goals_conceded, 0);
        summary.avg_goals = (totalGoals / last10.length).toFixed(2);
    }

    // Limpar dados privados (_) do retorno
    const cleanLast10 = last10.map(({ _goals_scored, _goals_conceded, ...rest }) => rest);

    return {
        summary,
        next_match: nextMatch,
        last_games: cleanLast10
    };
};

// --- CONTROLLER ---

const handleRequest = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) return res.status(400).json({ error: 'Team ID required' });

        // Aqui focamos no endpoint principal que alimenta o dashboard
        const data = await getFullScheduleAndStats(teamId);

        return res.json({ success: true, data });

    } catch (error) {
        console.error("Erro TeamFixtures:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROTA ---
module.exports = [
    {
        path: '/sportmonks/team/:teamId/schedule',
        method: 'GET',
        handler: handleRequest
    }
];