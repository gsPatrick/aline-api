// --- FILE: src/services/sports.service.js ---

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MYSPORTMONKS_API_KEY;
const baseURL = process.env.MYSPORTMONKS_API_BASE || "https://api.sportmonks.com/v3/football";
const defaultTimezone = process.env.MYSPORTMONKS_TIMEZONE || "UTC";

// Configuração do Axios para enviar parâmetros repetidos corretamente
// Ex: include=participants&include=scores
const http = axios.create({
  baseURL,
  timeout: 15000,
  paramsSerializer: params => {
    const searchParams = new URLSearchParams();
    
    // Adiciona cada chave/valor ao URLSearchParams
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        // Se for array (como o include), adiciona múltiplas vezes
        value.forEach(item => searchParams.append(key, item));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    
    return searchParams.toString();
  }
});

// --- HELPERS DE API ---

const request = async (endpoint, params = {}) => {
  if (!apiKey) throw new Error("MYSPORTMONKS_API_KEY ausente.");

  // Prepara os parâmetros base
  const requestParams = {
    api_token: apiKey,
    timezone: defaultTimezone,
    ...params
  };

  // REMOVIDO: Não fazemos mais .join(",") aqui. 
  // Deixamos o array como array para o paramsSerializer tratar.

  try {
    const { data } = await http.get(endpoint, { params: requestParams });
    return data?.data ?? data;
  } catch (err) {
    // Log melhorado para mostrar a URL exata que falhou
    console.error(`Erro Sportmonks [${endpoint}]:`, err.response?.data?.message || err.message);
    return null;
  }
};

// --- MAPPER HELPERS (Convertem IDs da Sportmonks para Data Contract) ---

const STANDING_CODES = {
  129: "games_played",
  130: "won",
  131: "draw",
  132: "lost",
  133: "goals_for",
  134: "goals_against",
  179: "goal_difference",
  186: "points",
  187: "points"
};

const mapStatus = (state) => {
  if (!state) return { id: 1, short: "NS", long: "Agendado" };

  const short = state.short_name || "NS";
  const long = state.name || "Not Started";

  if (["LIVE", "1st", "2nd", "ET", "PEN", "HT", "BREAK"].includes(short)) {
    return { id: 2, short: "LIVE", long: long };
  }
  if (["FT", "AET", "FT_PEN"].includes(short)) {
    return { id: 3, short: "FT", long: "Encerrado" };
  }
  if (["POST", "CANC", "SUSP", "INT", "ABD"].includes(short)) {
    return { id: 4, short: short, long: long };
  }
  
  return { id: 1, short: "NS", long: "Agendado" };
};

const getStatValue = (statsArray, typeId) => {
  if (!Array.isArray(statsArray)) return 0;
  const stat = statsArray.find(s => s.type_id === typeId);
  return stat ? (Number(stat.value) || Number(stat.data?.value) || 0) : 0;
};

const getTeamStats = (statsArray, teamId) => {
  if (!Array.isArray(statsArray)) return [];
  return statsArray.filter(s => String(s.participant_id) === String(teamId));
};

const STAT_TYPES = {
  GOALS: 52,
  POSSESSION: 45,
  SHOTS_TOTAL: 43,
  SHOTS_ON_TARGET: 34,
  CORNERS: 34,
  FOULS: 44,
  YELLOW_CARDS: 84,
  RED_CARDS: 83,
  DANGEROUS_ATTACKS: 42,
  PASSES_TOTAL: 80
};

// --- NORMALIZADORES ---

export const normalizeLeagueList = (league) => ({
  id: league.id,
  name: league.name || "Desconhecido",
  logo: league.image_path || "",
  country: league.country?.name || "Mundo",
  flag: league.country?.image_path || "",
  type: (league.type === "cup_international" || league.type === "domestic_cup") ? "Cup" : "League",
  current_season_id: league.current_season_id || league.currentseason?.id || null
});

export const normalizeStanding = (entry) => {
  const detailsMap = {};
  
  if (Array.isArray(entry.details)) {
    entry.details.forEach(det => {
      const key = STANDING_CODES[det.type_id];
      if (key) {
        detailsMap[key] = Number(det.value);
      }
    });
  }

  const teamData = entry.participant || {};
  const formArray = Array.isArray(entry.form) 
      ? entry.form.slice(-5).map(f => f.form || "-") 
      : [];

  return {
    position: entry.position,
    team: {
      id: entry.participant_id,
      name: teamData.name || "Time Desconhecido",
      logo: teamData.image_path || "https://cdn.sportmonks.com/images/soccer/placeholder.png"
    },
    games_played: detailsMap.games_played || 0,
    won: detailsMap.won || 0,
    draw: detailsMap.draw || 0,
    lost: detailsMap.lost || 0,
    goals_for: detailsMap.goals_for || 0,
    goals_against: detailsMap.goals_against || 0,
    goal_difference: detailsMap.goal_difference ?? ((detailsMap.goals_for || 0) - (detailsMap.goals_against || 0)),
    points: entry.points || detailsMap.points || 0,
    recent_form: formArray
  };
};

export const normalizeMatchCard = (fixture) => {
  if (!fixture) return null;

  const participants = fixture.participants || [];
  const home = participants.find(p => p.meta?.location === 'home') || participants[0] || {};
  const away = participants.find(p => p.meta?.location === 'away') || participants[1] || {};
  
  const scores = fixture.scores || [];
  const currentScore = scores.filter(s => s.description === 'CURRENT');
  const homeScoreObj = currentScore.find(s => s.score_participant === 'home');
  const awayScoreObj = currentScore.find(s => s.score_participant === 'away');

  const homeScore = homeScoreObj?.score?.goals ?? 0;
  const awayScore = awayScoreObj?.score?.goals ?? 0;

  const homeStats = getTeamStats(fixture.statistics, home.id);
  const awayStats = getTeamStats(fixture.statistics, away.id);
  const daHome = getStatValue(homeStats, STAT_TYPES.DANGEROUS_ATTACKS);
  const daAway = getStatValue(awayStats, STAT_TYPES.DANGEROUS_ATTACKS);

  const matchOdds = (fixture.odds || []).find(o => o.market_id === 1);
  const values = matchOdds?.values || [];
  const getOdd = (label) => values.find(v => v.label === label)?.value || null;

  return {
    id: fixture.id,
    status: mapStatus(fixture.state),
    minute: fixture.minute || null,
    timestamp: fixture.starting_at_timestamp || (new Date(fixture.starting_at).getTime() / 1000),
    home_team: {
      id: home.id,
      name: home.name || "TBD",
      logo: home.image_path || "https://cdn.sportmonks.com/images/soccer/placeholder.png",
      score: homeScore
    },
    away_team: {
      id: away.id,
      name: away.name || "TBD",
      logo: away.image_path || "https://cdn.sportmonks.com/images/soccer/placeholder.png",
      score: awayScore
    },
    pressure: {
      home: daHome,
      away: daAway
    },
    odds: {
      home: getOdd('1'),
      draw: getOdd('X'),
      away: getOdd('2')
    }
  };
};

export const normalizeMatchDetails = (fixture) => {
  const base = normalizeMatchCard(fixture);
  if (!base) return null;

  const participants = fixture.participants || [];
  const home = participants.find(p => p.meta?.location === 'home') || {};
  const away = participants.find(p => p.meta?.location === 'away') || {};
  
  const homeStatsArr = getTeamStats(fixture.statistics, home.id);
  const awayStatsArr = getTeamStats(fixture.statistics, away.id);

  const buildStats = (arr) => ({
    possession: getStatValue(arr, STAT_TYPES.POSSESSION),
    shots_total: getStatValue(arr, STAT_TYPES.SHOTS_TOTAL),
    shots_on_target: getStatValue(arr, STAT_TYPES.SHOTS_ON_TARGET),
    corners: getStatValue(arr, STAT_TYPES.CORNERS),
    fouls: getStatValue(arr, STAT_TYPES.FOULS),
    attacks: getStatValue(arr, STAT_TYPES.ATTACKS),
    dangerous_attacks: getStatValue(arr, STAT_TYPES.DANGEROUS_ATTACKS)
  });

  const events = (fixture.events || []).map(ev => ({
    id: ev.id,
    type: ev.type?.name || "Evento",
    minute: ev.minute,
    team_location: ev.participant_id === home.id ? "home" : (ev.participant_id === away.id ? "away" : "neutral"),
    player_name: ev.player?.name || ev.player_name || "Desconhecido",
    related_player_name: ev.related_player?.name
  })).sort((a, b) => a.minute - b.minute);

  const lineups = { home: [], away: [] };
  (fixture.lineups || []).forEach(l => {
    const player = {
      id: l.player_id,
      name: l.player_name || l.player?.name || "Desconhecido",
      number: l.jersey_number,
      position: l.position?.name,
      grid: l.formation_position ? String(l.formation_position) : null,
      is_starter: l.type_id === 11,
      photo: l.player?.image_path || "https://cdn.sportmonks.com/images/soccer/placeholder.png"
    };
    if (l.team_id === home.id) lineups.home.push(player);
    else if (l.team_id === away.id) lineups.away.push(player);
  });

  const h2h = (fixture.h2h || []).slice(0, 5).map(h => ({
     date: h.starting_at,
     league_name: h.league?.name || "Liga",
     score: "Ver Detalhes", 
     winner_id: h.winner_team_id
  }));

  return {
    ...base,
    venue: fixture.venue?.name || "Estádio não informado",
    referee: fixture.referee?.name || "Árbitro não informado", 
    timeline: events,
    stats: {
      home: buildStats(homeStatsArr),
      away: buildStats(awayStatsArr)
    },
    lineups,
    h2h
  };
};

// --- FUNÇÕES EXPORTADAS ---

export const apiGetLeagues = async () => {
  const data = await request("/leagues", { include: ["country", "currentSeason"] });
  return (data || []).map(normalizeLeagueList);
};

export const apiGetLeagueById = async (id) => {
  const data = await request(`/leagues/${id}`, { include: ["country", "currentSeason"] });
  if (!data) return null;
  return normalizeLeagueList(data);
};

export const apiGetStandings = async (seasonId) => {
  // Agora o paramsSerializer vai gerar: include=participant&include=details&include=form
  const data = await request(`/standings/seasons/${seasonId}`, { 
    include: ["participant", "details", "form"] 
  });
  return (data || []).map(normalizeStanding);
};

export const apiGetFixturesBySeason = async (seasonId) => {
  const data = await request(`/fixtures/seasons/${seasonId}`, {
    include: ["participants", "scores", "state", "statistics", "odds"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean); 
};

export const apiGetFixtureDetails = async (fixtureId) => {
  // REMOVIDO 'referee' DOS INCLUDES
  const data = await request(`/fixtures/${fixtureId}`, {
    include: [
      "participants", "scores", "state", "statistics", "odds",
      "venue", "events.player", "events.type", "lineups.player", "lineups.position", "h2h.league"
    ]
  });
  if (!data) return null;
  return normalizeMatchDetails(data);
};

export const apiGetLiveMatches = async () => {
  const data = await request("/livescores/inplay", {
    include: ["participants", "scores", "state", "statistics", "odds"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean);
};

export const apiGetDailyMatches = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await request(`/fixtures/date/${today}`, {
    include: ["participants", "scores", "state", "statistics", "odds"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean);
};

export const apiGetPlayerStats = async (playerId) => {
  const data = await request(`/players/${playerId}`, {
    include: ["teams", "statistics.season", "latest.stats"]
  });
  
  if (!data) return null;

  const seasonStats = data.statistics || [];
  const currentSeasonStats = seasonStats.length > 0 ? (seasonStats[seasonStats.length - 1].details || []) : [];
  
  const getAvg = (typeId) => {
    const stat = currentSeasonStats.find(s => s.type_id === typeId);
    return stat ? Number(stat.value) : 0; 
  };

  const last5 = (data.latest || []).slice(0, 5).map(match => ({
    opponent: "TBD",
    shots: getStatValue(match.stats, STAT_TYPES.SHOTS_TOTAL)
  }));

  return {
    id: data.id,
    name: data.display_name,
    photo: data.image_path,
    team: data.teams?.[0] ? {
        id: data.teams[0].id,
        name: data.teams[0].name,
        logo: data.teams[0].image_path
    } : null,
    averages: {
      shots: getAvg(STAT_TYPES.SHOTS_TOTAL),
      shots_on_target: getAvg(STAT_TYPES.SHOTS_ON_TARGET),
      fouls: getAvg(STAT_TYPES.FOULS)
    },
    last_5: last5
  };
};