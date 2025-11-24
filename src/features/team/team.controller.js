import { apiGetTeamSchedule, apiGetTeamSquad } from "../../services/sports.service.js";

export const schedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Busca todos os jogos (passados e futuros)
    const allMatches = await apiGetTeamSchedule(id);

    // Opcional: Separar em "Resultados" e "Calendário"
    const now = Date.now() / 1000;
    
    const results = allMatches
      .filter(m => m.timestamp < now)
      .sort((a, b) => b.timestamp - a.timestamp); // Do mais recente para o antigo

    const upcoming = allMatches
      .filter(m => m.timestamp >= now)
      .sort((a, b) => a.timestamp - b.timestamp); // Do mais próximo para o distante

    res.json({
      team_id: id,
      results: results, // Últimos jogos
      upcoming: upcoming // Próximos jogos
    });
  } catch (e) {
    next(e);
  }
};

// Nova função para o Elenco
export const squad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { season_id } = req.query; // Opcional: Front pode mandar a temporada

    const squadData = await apiGetTeamSquad(id, season_id);
    res.json(squadData);
  } catch (e) {
    next(e);
  }
};