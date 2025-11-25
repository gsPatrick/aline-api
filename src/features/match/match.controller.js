import { 
  apiGetLiveMatches, 
  apiGetDailyMatches,
  apiGetFixtureDetails 
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

// --- CORREÇÃO E LOGS AQUI ---
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
    const { id } = req.params; // ID da partida atual
    
    // Primeiro precisamos saber quem são os times dessa partida
    const match = await apiGetFixtureDetails(id);
    
    if (!match) return res.status(404).json({ error: "Partida não encontrada" });

    const teamA = match.home_team.id;
    const teamB = match.away_team.id;

    // Busca o histórico entre eles
    const history = await apiGetHeadToHead(teamA, teamB);
    
    // Filtra a partida atual da lista (se ela já aconteceu)
    const filteredHistory = history.filter(h => String(h.id) !== String(id));

    res.json(filteredHistory);
  } catch (e) {
    next(e);
  }
};