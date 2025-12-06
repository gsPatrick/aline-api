const sportMonksProvider = require('../../../sportmonks/provider/SportMonksProvider');

// --- HELPER: Calcula V/E/D (Vitória, Empate, Derrota) ---
// Baseado na estrutura real do JSON que analisamos (scores array + participants)
const calculateForm = (match, teamId) => {
    // Validações básicas
    if (!match.finished || !match.scores) return null;

    // Identificar placar final (CURRENT)
    const currentScoreHome = match.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'home');
    const currentScoreAway = match.scores.find(s => s.description === 'CURRENT' && s.score.participant === 'away');

    const homeGoals = currentScoreHome ? currentScoreHome.score.goals : 0;
    const awayGoals = currentScoreAway ? currentScoreAway.score.goals : 0;

    // Identificar se meu time jogou em casa
    // Tenta pelo meta location, ou pelo primeiro participante
    const homeParticipant = match.participants.find(p => p.meta && p.meta.location === 'home');
    const isHome = homeParticipant ? (homeParticipant.id == teamId) : (match.participants[0].id == teamId);

    const myGoals = isHome ? homeGoals : awayGoals;
    const opGoals = isHome ? awayGoals : homeGoals;

    if (myGoals > opGoals) return 'W'; // Win (Verde)
    if (myGoals < opGoals) return 'L'; // Loss (Vermelho)
    return 'D'; // Draw (Amarelo)
};

// --- SERVICE ---
const getCompetitionsWithForm = async (teamId) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6); // 6 meses de histórico para pegar copas antigas

    const todayStr = today.toISOString().split('T')[0];
    const pastStr = pastDate.toISOString().split('T')[0];

    // Busca histórico. Não precisa de 'odds' ou 'statistics' aqui, o que deixa mais rápido
    const response = await sportMonksProvider.get(
        `/fixtures/between/${pastStr}/${todayStr}/${teamId}`,
        {
            include: 'league;participants;scores',
            per_page: 50, // Volume alto para garantir que pegue várias ligas
            order: 'desc' // Mais recentes primeiro
        }
    );

    const matches = response.data || [];
    const leaguesMap = {};

    // 1. Agrupar jogos por Liga
    matches.forEach(match => {
        const leagueId = match.league_id;

        // Se a liga ainda não existe no mapa, inicializa
        if (!leaguesMap[leagueId]) {
            leaguesMap[leagueId] = {
                league_id: leagueId,
                league_name: match.league.name,
                league_image: match.league.image_path,
                matches: []
            };
        }

        // Adiciona o jogo na lista dessa liga
        leaguesMap[leagueId].matches.push(match);
    });

    // 2. Processar apenas os últimos 5 de cada liga e calcular FORM
    const result = Object.values(leaguesMap).map(league => {
        // Pega só os 5 primeiros (já que ordenamos por desc na API)
        const last5Matches = league.matches.slice(0, 5);

        const formHistory = last5Matches.map(match => {
            const form = calculateForm(match, teamId);

            // Busca nome do oponente para tooltip (opcional)
            const opponent = match.participants.find(p => p.id != teamId);

            return {
                match_id: match.id,
                date: match.starting_at,
                result: form, // 'W', 'L', 'D' ou null
                opponent: opponent ? opponent.name : 'Unknown'
            };
        });

        // Retorna objeto limpo para o front
        return {
            league_id: league.league_id,
            league_name: league.league_name,
            league_image: league.league_image,
            last_5_games: formHistory
        };
    });

    return result;
};

// --- CONTROLLER ---
const handleRequest = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) return res.status(400).json({ error: 'Team ID required' });

        const data = await getCompetitionsWithForm(teamId);

        return res.json({ success: true, data });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROTA ---
module.exports = {
    path: '/sportmonks/team/:teamId/competitions',
    method: 'GET',
    handler: handleRequest
};