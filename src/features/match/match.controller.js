import {
  apiGetLiveMatches,
  apiGetDailyMatches,
  apiGetFixtureDetails,
  apiGetHeadToHead,
  apiGetMatchAnalysis
} from "../../services/sports.service.js";

export const live = async (req, res, next) => {
  try {
    const matches = await apiGetLiveMatches();
    res.json(matches);
  } catch (e) {
    next(e);
  }
};

export const daily = async (req, res, next) => {
  try {
    const matches = await apiGetDailyMatches();
    res.json(matches);
  } catch (e) {
    next(e);
  }
};

export const show = async (req, res, next) => {
  const { id } = req.params;
  console.log(`🔍 CONTROLLER: Buscando partida ID [${id}]...`);

  try {
    const details = await apiGetFixtureDetails(id);

    if (!details) {
      console.error(`❌ CONTROLLER: Service retornou NULL para ID [${id}]. Retornando 404.`);
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    console.log(`✅ CONTROLLER: Partida encontrada! Enviando JSON.`);
    res.json(details);
  } catch (e) {
    console.error(`💀 CONTROLLER ERRO CRÍTICO:`, e);
    next(e);
  }
};

export const h2h = async (req, res, next) => {
  try {
    const { id } = req.params;
    const match = await apiGetFixtureDetails(id);

    if (!match) return res.status(404).json({ error: "Partida não encontrada" });

    const teamA = match.home_team.id;
    const teamB = match.away_team.id;

    const history = await apiGetHeadToHead(teamA, teamB);
    const filteredHistory = history.filter(h => String(h.id) !== String(id));

    res.json(filteredHistory);
  } catch (e) {
    console.error("Erro no H2H:", e);
    next(e);
  }
};

export const getMatchAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await apiGetMatchAnalysis(id);
    if (!data) return res.status(404).json({ message: "Análise não encontrada" });
    res.json(data);
  } catch (error) {
    next(error);
  }
};