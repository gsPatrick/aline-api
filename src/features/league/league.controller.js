
import { 
  apiGetLeagues, 
  apiGetLeagueById, 
  apiGetStandings, 
  apiGetFixturesBySeason,
  apiGetLeaguesByDate,
  normalizeMatchCard 
} from "../../services/sports.service.js"; 

// 1. Lista Ligas (Para o Sidebar) - Rota: GET /leagues
export const index = async (req, res, next) => {
  try {
    const leagues = await apiGetLeagues();
    res.json(leagues);
  } catch (e) {
    next(e);
  }
};

// 2. Detalhes da Liga (Carga Inicial da Página) - Rota: GET /leagues/:id
export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Busca informações básicas da liga
    const league = await apiGetLeagueById(id);
    if (!league) return res.status(404).json({ error: "Liga não encontrada" });

    const currentSeasonId = league.current_season_id;

    let standings = [];
    let upcoming = [];

    // Se tiver temporada atual, busca tabela e jogos
    if (currentSeasonId) {
      const [standingsData, fixturesData] = await Promise.all([
        apiGetStandings(currentSeasonId),
        apiGetFixturesBySeason(currentSeasonId)
      ]);

      standings = standingsData || [];
      
      // Filtra para pegar apenas jogos futuros (para a sidebar de 48h do front)
      const now = Date.now() / 1000;
      upcoming = (fixturesData || [])
        .filter(f => f.timestamp >= now) 
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    res.json({
      info: league,
      standings: standings,
      upcoming_matches: upcoming 
    });

  } catch (e) {
    next(e);
  }
};

// 3. Calendário por Data (Aba Calendário) - Rota: GET /leagues/:id/matches?date=YYYY-MM-DD
export const getMatchesByDate = async (req, res, next) => {
  try {
    const { id } = req.params; // ID da Liga (ex: 8 da Premier League)
    const { date } = req.query; // Data (ex: 2025-11-24)

    if (!date) return res.status(400).json({ error: "Data obrigatória" });

    // A função apiGetLeaguesByDate retorna um array de TODAS as ligas que têm jogos no dia
    const allLeaguesToday = await apiGetLeaguesByDate(date);

    // Nós filtramos apenas a liga que o usuário está acessando (ID 8, por exemplo)
    // Convertemos para String para garantir que a comparação funcione (ex: "8" == 8)
    const targetLeague = allLeaguesToday.find(l => String(l.id) === String(id));

    if (!targetLeague || !targetLeague.matches) {
      return res.json([]); // Nenhum jogo encontrado para esta liga nesta data
    }

    // Retorna apenas os jogos normalizados dessa liga
    res.json(targetLeague.matches);
  } catch (e) {
    next(e);
  }
};