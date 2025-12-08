import {
  apiGetLeagues,
  getAllLeagues,
  apiGetLeagueById,
  apiGetStandings,
  apiGetFixturesBySeason,
  apiGetLeaguesByDate,
  normalizeMatchCard
} from "../../services/sports.service.js";
import { getLeagueDetails } from "./league.service.js";

export const index = async (req, res, next) => {
  try {
    // If page is requested, use paginated version
    const page = parseInt(req.query.page);

    if (page) {
      res.json(await apiGetLeagues(page));
    } else {
      // Return ALL leagues (already deduplicated in service)
      const allLeagues = await getAllLeagues();

      res.json({
        success: true,
        total: allLeagues.length,
        data: allLeagues
      });
    }
  } catch (e) { next(e); }
};

export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    const league = await apiGetLeagueById(id);
    if (!league) return res.status(404).json({ error: "Liga não encontrada" });

    let standings = [];
    let upcoming = [];

    if (league.current_season_id) {
      const [std, fix] = await Promise.all([
        apiGetStandings(league.current_season_id),
        apiGetFixturesBySeason(league.current_season_id)
      ]);
      standings = std || [];

      // Filtra jogos futuros para a feature de 48h na home da liga
      const now = Date.now() / 1000;
      upcoming = (fix || []).filter(f => f.timestamp >= now).sort((a, b) => a.timestamp - b.timestamp);
    }

    res.json({ info: league, standings, upcoming_matches: upcoming });
  } catch (e) { next(e); }
};

// NOVA FUNÇÃO: Busca jogos de uma liga específica numa data específica
export const getMatchesByDate = async (req, res, next) => {
  try {
    const { id } = req.params; // ID da Liga
    const { date } = req.query; // Data YYYY-MM-DD

    if (!date) return res.status(400).json({ error: "Data obrigatória" });

    // 1. Busca todas as ligas com jogos nessa data
    const allLeaguesToday = await apiGetLeaguesByDate(date);

    // 2. Encontra a liga específica dentro da resposta
    const targetLeague = allLeaguesToday.find(l => l.id == id);

    if (!targetLeague || !targetLeague.today) {
      return res.json([]); // Nenhum jogo dessa liga nesta data
    }

    // 3. Normaliza os jogos encontrados no array 'today'
    const matches = targetLeague.today.map(normalizeMatchCard).filter(Boolean);

    res.json(matches);
  } catch (e) {
    next(e);
  }
};

// NEW: Get complete league details (dashboard data)
export const getDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(`Fetching details for league ID: ${id}`);

    const details = await getLeagueDetails(parseInt(id));

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error in getDetails controller:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};