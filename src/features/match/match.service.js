import {
  getLiveMatches,
  getMatchStats,
} from "../../services/sports.service.js";

export const listLive = async () => {
  const live = await getLiveMatches();
  return Array.isArray(live)
    ? live.map((m) => {
        const scoreArray = m.score || [];
        const status = scoreArray[1] || 0;
        const homeScores = scoreArray[2] || [];
        const awayScores = scoreArray[3] || [];

        return {
          id: m.id,
          status,
          homeScore: homeScores[0] || 0,
          awayScore: awayScores[0] || 0,
          score: m.score,
          stats: m.stats || [],
          incidents: m.incidents || [],
          tlive: m.tlive || [],
        };
      })
    : [];
};

export const statsById = async (matchId) => getMatchStats(matchId);
