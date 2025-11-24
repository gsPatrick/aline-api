import { 
  apiGetLeagues, 
  apiGetLeagueById, 
  apiGetStandings, 
  apiGetFixturesBySeason,
  apiGetLeaguesByDate // <--- Importando a nova função
} from "../../services/sports.service.js"; 

// Lista Ligas (Sidebar)
export const index = async (req, res, next) => {
  try {
    const leagues = await apiGetLeagues();
    res.json(leagues);
  } catch (e) {
    next(e);
  }
};

// Nova Rota: Jogos por Data (Global ou Filtrado)
export const listByDate = async (req, res, next) => {
  try {
    const { date } = req.params; // Formato YYYY-MM-DD
    if (!date) return res.status(400).json({ error: "Data obrigatória" });

    const data = await apiGetLeaguesByDate(date);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

// Detalhes da Liga (Info + Tabela + Jogos Futuros)
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
      
      // Filtra para pegar apenas jogos que ainda não aconteceram (Upcoming)
      const now = Date.now() / 1000; // Timestamp atual em segundos
      
      // Ordena por data crescente (o mais próximo primeiro)
      upcoming = (fixturesData || [])
        .filter(f => f.timestamp >= now) 
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    res.json({
      info: league,
      standings: standings,
      upcoming_matches: upcoming // <--- Isso garante que o front receba os jogos futuros para o calendário e as 48h
    });

  } catch (e) {
    next(e);
  }
};