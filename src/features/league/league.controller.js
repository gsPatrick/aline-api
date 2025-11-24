// --- FILE: src/features/league/league.controller.js ---

// CORREÇÃO: Ajuste o caminho para subir dois níveis (../../)
import { 
  apiGetLeagues, 
  apiGetLeagueById, 
  apiGetStandings, 
  apiGetFixturesBySeason 
} from "./teste.js"; 

// Lista Ligas (Sidebar)
export const index = async (req, res, next) => {
  try {
    const leagues = await apiGetLeagues();
    res.json(leagues);
  } catch (e) {
    next(e);
  }
};

// Detalhes da Liga (Info + Tabela + Jogos)
export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const league = await apiGetLeagueById(id);
    if (!league) return res.status(404).json({ error: "Liga não encontrada" });

    const currentSeasonId = league.current_season_id;

    let standings = [];
    let upcoming = [];

    if (currentSeasonId) {
      const [standingsData, fixturesData] = await Promise.all([
        apiGetStandings(currentSeasonId),
        apiGetFixturesBySeason(currentSeasonId)
      ]);

      standings = standingsData || [];
      
      const now = Date.now() / 1000;
      upcoming = (fixturesData || [])
        .filter(f => f.timestamp > now)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 10);
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