
import { 
  apiGetLiveMatches, 
  apiGetFixtureDetails,
  apiGetFixtureLineups 
} from "../../services/sports.service.js";

// Lista de Jogos (Home/Live)
export const live = async (req, res, next) => {
  try {
    // Aqui você pode adicionar filtros por data se quiser
    // Por enquanto retorna os LIVE do Sportmonks
    const matches = await apiGetLiveMatches();
    res.json(matches);
  } catch (e) {
    next(e);
  }
};

export const lineups = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await apiGetFixtureLineups(id);
    if (!data) return res.status(404).json({ error: "Escalação não disponível" });
    res.json(data);
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