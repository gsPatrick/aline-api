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

// --- AQUI ESTÁ O FOCO DO DEBUG ---
export const show = async (req, res, next) => {
  const { id } = req.params;
  
  console.log("========================================");
  console.log(`🔥 CONTROLLER: Recebida requisição para partida ID: ${id}`);
  console.log("========================================");

  try {
    const details = await apiGetFixtureDetails(id);
    
    if (!details) {
      console.log(`❌ CONTROLLER: apiGetFixtureDetails retornou null para o ID ${id}`);
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    console.log(`✅ CONTROLLER: Dados encontrados para ID ${id}. Enviando resposta...`);
    res.json(details);
  } catch (e) {
    console.error(`💀 CONTROLLER ERRO:`, e.message);
    next(e);
  }
};