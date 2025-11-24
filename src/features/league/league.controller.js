
import { 
  apiGetLeagues, 
  apiGetLeagueById, 
  apiGetStandings, 
  apiGetFixturesBySeason,
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

