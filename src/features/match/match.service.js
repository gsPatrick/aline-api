import {
  getLiveMatches,
  getMatchStats,
} from "../../services/sports.service.js";

export const listLive = async () => {
  // Busca os jogos ao vivo e retorna já normalizados
  const liveMatches = await getLiveMatches();
  return liveMatches;
};

export const statsById = async (matchId) => {
  // Busca os detalhes/estatísticas da partida pelo ID
  const matchStats = await getMatchStats(matchId);
  return matchStats;
};