import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MYSPORTMONKS_API_KEY;
const baseURL = process.env.MYSPORTMONKS_API_BASE || "https://api.sportmonks.com/v3/football";
const defaultTimezone = process.env.MYSPORTMONKS_TIMEZONE || "UTC";

const http = axios.create({
  baseURL,
  timeout: 15000,
});

// --- INTERCEPTORS & CONFIG ---
const ensureApiKey = () => {
  if (!apiKey) throw new Error("MYSPORTMONKS_API_KEY não configurada no .env");
};

const normalizeInclude = (include) => {
  if (Array.isArray(include)) return include.join(";");
  return include;
};

const request = async (endpoint, params = {}) => {
  ensureApiKey();
  const parsedParams = {
    api_token: apiKey,
    timezone: defaultTimezone,
    ...params,
  };

  if (params.include) {
    parsedParams.include = normalizeInclude(params.include);
  }

  try {
    const { data } = await http.get(endpoint, { params: parsedParams });
    // Sportmonks v3 geralmente retorna { data: [...] }
    return data?.data ?? data;
  } catch (err) {
    console.error(`Erro na requisição ${endpoint}:`, err.message);
    return null; // Retorna null para não quebrar a aplicação inteira
  }
};

// --- INCLUDES PADRÃO (PARA TRAZER TUDO) ---
const fixtureIncludes = [
  "participants",           // Times
  "league.country",         // Liga e País
  "season",                 // Temporada
  "round",                  // Rodada
  "stage",                  // Fase
  "state",                  // Status do jogo
  "venue",                  // Estádio
  "scores",                 // Placar
  "events.type",            // Gols, Cartões, Substituições
  "statistics.type",        // Estatísticas (Chutes, Posse, etc)
  "lineups.player",         // Escalações
  "lineups.details",        // Detalhes da escalação (camisa, posição)
  "referee",                // Árbitro
  "probability"             // Probabilidades/Previsões (se disponível no plano)
];

// --- HELPERS DE NORMALIZAÇÃO (PARSERS) ---

const getParticipant = (participants, location) => {
  if (!Array.isArray(participants)) return {};
  // Encontra time baseado na location (home/away)
  const team = participants.find(p => p.meta?.location === location);
  return team ? {
    id: team.id,
    name: team.name,
    logo: team.image_path,
    short_code: team.short_code,
    country_id: team.country_id
  } : { name: location === 'home' ? "Mandante" : "Visitante" };
};

const getScore = (scores, location) => {
  if (!Array.isArray(scores)) return 0;
  // Tenta pegar o score "CURRENT"
  const current = scores.find(s => s.description === "CURRENT" && s.score_participant === location);
  if (current) return current.score?.goals || 0;
  return 0;
};

const normalizeEvents = (events, participants) => {
  if (!Array.isArray(events)) return [];
  
  return events.map(ev => {
    const teamId = ev.participant_id;
    const team = participants.find(p => p.id === teamId);
    const location = team?.meta?.location; // home ou away

    return {
      id: ev.id,
      minute: ev.minute,
      extra_minute: ev.extra_minute,
      type: ev.type?.data?.name || "Unknown", // ex: Goal, Yellow Card
      player_name: ev.player_name || ev.player?.data?.name,
      related_player_name: ev.related_player?.data?.name, // ex: Assistência ou jogador substituído
      team_location: location, // 'home' ou 'away'
      result: ev.info // ex: placar após o gol "1-0"
    };
  }).sort((a, b) => a.minute - b.minute);
};

const normalizeStats = (stats, participants) => {
  if (!Array.isArray(stats)) return [];
  
  // Agrupa estatísticas por tipo (ex: "Ball Possession")
  const map = {};
  
  stats.forEach(stat => {
    const typeName = stat.type?.data?.name || stat.type?.name;
    if (!typeName) return;

    const teamId = stat.participant_id;
    const team = participants.find(p => p.id === teamId);
    const location = team?.meta?.location; // home ou away

    if (!map[typeName]) map[typeName] = { name: typeName, home: 0, away: 0 };
    
    // Valor pode vir em 'value' ou 'data.value'
    const val = stat.value?.total ?? stat.value ?? 0;
    if (location) map[typeName][location] = val;
  });

  return Object.values(map);
};

const normalizeLineups = (lineups, participants) => {
  if (!Array.isArray(lineups)) return { home: [], away: [] };

  const home = [];
  const away = [];

  lineups.forEach(l => {
    const teamId = l.team_id;
    const team = participants.find(p => p.id === teamId);
    const location = team?.meta?.location;

    const playerObj = {
      id: l.player_id,
      name: l.player_name || l.player?.data?.display_name,
      number: l.jersey_number,
      position: l.position_id, // Precisa mapear ID para texto se quiser
      type: l.type?.data?.name || (l.formation_position ? "Starting XI" : "Bench"), // Simplificação
      image: l.player?.data?.image_path
    };

    if (location === 'home') home.push(playerObj);
    else if (location === 'away') away.push(playerObj);
  });

  return { home, away };
};

// --- FUNÇÃO PRINCIPAL DE NORMALIZAÇÃO DE PARTIDA ---
export const normalizeFixture = (f) => {
  if (!f) return null;

  const participants = f.participants?.data || f.participants || [];
  const eventsRaw = f.events?.data || f.events || [];
  const statsRaw = f.statistics?.data || f.statistics || [];
  const lineupsRaw = f.lineups?.data || f.lineups || [];
  const scoresRaw = f.scores?.data || f.scores || [];

  const homeTeam = getParticipant(participants, 'home');
  const awayTeam = getParticipant(participants, 'away');

  return {
    id: f.id,
    league: {
      id: f.league_id,
      name: f.league?.data?.name,
      logo: f.league?.data?.image_path,
      country: f.league?.data?.country?.data?.name,
      flag: f.league?.data?.country?.data?.image_path
    },
    season_id: f.season_id,
    round_name: f.round?.data?.name,
    venue: f.venue?.data?.name,
    starting_at: f.starting_at,
    timestamp: f.starting_at_timestamp,
    status: {
      id: f.state_id,
      short: f.state?.data?.short_name, // FT, NS, HT, LIVE
      name: f.state?.data?.name,
      minute: f.minute
    },
    teams: {
      home: { ...homeTeam, score: getScore(scoresRaw, 'home') },
      away: { ...awayTeam, score: getScore(scoresRaw, 'away') }
    },
    events: normalizeEvents(eventsRaw, participants),
    stats: normalizeStats(statsRaw, participants),
    lineups: normalizeLineups(lineupsRaw, participants),
    referee: f.referee?.data?.name || null,
    has_odds: f.has_odds
  };
};

// --- EXPORTS DAS CHAMADAS API (Mapeando APIFUTEBOL.json) ---

// 1. Fixtures
export const fetchFixturesBetween = (start, end, filters = {}) => 
  request(`/fixtures/between/${start}/${end}`, { ...filters, include: fixtureIncludes });

export const fetchFixtureById = (id) => 
  request(`/fixtures/${id}`, { include: fixtureIncludes });

export const fetchLiveFixtures = () => 
  request(`/livescores/inplay`, { include: fixtureIncludes });

// 2. Leagues
export const fetchLeagues = (params = {}) => 
  request(`/leagues`, { ...params, include: ["country", "currentSeason"] });

export const fetchLeagueById = (id) => 
  request(`/leagues/${id}`, { include: ["country", "currentSeason"] });

// 3. Standings
export const fetchStandingsBySeason = (seasonId) => 
  request(`/standings/seasons/${seasonId}`, { include: ["details.type", "participant"] });

// 4. Topscorers
export const fetchTopscorersBySeason = (seasonId) => 
  request(`/topscorers/seasons/${seasonId}`, { include: ["player", "participant"] });

// 5. Teams
export const fetchTeamById = (id) =>
  request(`/teams/${id}`, { include: ["country", "venue"] });

// 6. Search
export const searchTeams = (name) => request(`/teams/search/${encodeURIComponent(name)}`);