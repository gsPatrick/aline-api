import { 
  apiGetLiveMatches, 
  apiGetDailyMatches, // <--- Importe isso
  apiGetFixtureDetails 
} from "../../services/sports.service.js";

// Lista de Jogos ao Vivo
export const live = async (req, res, next) => {
  try {
    const matches = await apiGetLiveMatches();
    res.json(matches);
  } catch (e) {
    next(e);
  }
};

// NOVA: Lista de Todos os Jogos do Dia (Para a Home)
export const daily = async (req, res, next) => {
  try {
    const matches = await apiGetDailyMatches();
    res.json(matches);
  } catch (e) {
    next(e);
  }
};

// Detalhes da Partida
export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    const details = await apiGetFixtureDetails(id);
    
    if (!details) return res.status(404).json({ error: "Partida não encontrada" });

    res.json(details);
  } catch (e) {
    next(e);
  }
};