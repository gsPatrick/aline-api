import { League, Match } from "../../models/index.js";
import { Op } from "sequelize";

// Lista Ligas do Banco Local
export const index = async (req, res, next) => {
  try {
    const leagues = await League.findAll({
      where: { active: true },
      order: [['name', 'ASC']],
      attributes: ['externalId', 'name', 'logo', 'country', 'flag']
    });
    
    // Mapeia para o formato esperado pelo front, se necessário
    const response = leagues.map(l => ({
      id: l.externalId,
      name: l.name,
      logo: l.logo,
      country: l.country,
      flag: l.flag
    }));

    res.json(response);
  } catch (e) {
    next(e);
  }
};

// Detalhes da Liga + Jogos (Lendo do Banco)
export const show = async (req, res, next) => {
  try {
    const { id } = req.params; // ID da Sportmonks

    // 1. Busca Liga no Banco
    const league = await League.findOne({ where: { externalId: id } });
    
    if (!league) {
      return res.status(404).json({ error: "Liga não encontrada ou ainda não sincronizada" });
    }

    // 2. Busca Jogos Futuros no Banco
    const today = new Date();
    const matches = await Match.findAll({
      where: {
        leagueId: id,
        date: { [Op.gte]: today } // A partir de hoje
      },
      order: [['date', 'ASC']],
      limit: 20 // Limita a 20 jogos para não pesar
    });

    // Como salvamos o objeto normalizado no campo 'data' (JSONB), 
    // podemos retorná-lo diretamente ou montar um resumo.
    const upcoming_matches = matches.map(m => m.data);

    res.json({
      info: {
        id: league.externalId,
        name: league.name,
        logo: league.logo,
        country: league.country
      },
      standings: [], // Standings ainda precisa buscar da API ou criar tabela propria
      topScorers: [], // Idem
      upcoming_matches
    });
  } catch (e) {
    next(e);
  }
};