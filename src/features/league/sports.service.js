
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

// --- HELPERS DE API ---

const request = async (endpoint, params = {}) => {
  if (!apiKey) throw new Error("MYSPORTMONKS_API_KEY ausente.");

  // Tratamento para includes repetidos (Solução que funcionou para você)
  const searchParams = new URLSearchParams();
  searchParams.append("api_token", apiKey);
  searchParams.append("timezone", defaultTimezone);

  Object.keys(params).forEach(key => {
    if (key === 'include' && Array.isArray(params[key])) {
      params[key].forEach(val => searchParams.append('include', val));
    } else {
      searchParams.append(key, params[key]);
    }
  });

  try {
    const { data } = await http.get(endpoint, { params: searchParams });
    return data?.data ?? data;
  } catch (err) {
    console.error(`Erro Sportmonks [${endpoint}]:`, err.response?.data || err.message);
    return null; // Retorna null para não quebrar a aplicação inteira, o controller trata
  }
};

// --- MAPPER HELPERS (Convertem IDs da Sportmonks para Data Contract) ---

const mapStatus = (state) => {
  const short = state?.short_name || "";
  // Mapeia estados para o padrão do Front: "LIVE", "HT", "FT", "NS"
  if (["LIVE", "1st", "2nd", "ET", "PEN", "HT"].includes(short)) return { id: 2, short: "LIVE", long: state.name };
  if (["FT", "AET", "FT_PEN"].includes(short)) return { id: 3, short: "FT", long: "Encerrado" };
  if (["NS", "TBA"].includes(short)) return { id: 1, short: "NS", long: "Agendado" };
  return { id: 0, short: short, long: state.name };
};

const getStatValue = (statsArray, typeId) => {
  if (!Array.isArray(statsArray)) return 0;
  const stat = statsArray.find(s => s.type_id === typeId);
  return stat ? (Number(stat.value) || Number(stat.data?.value) || 0) : 0;
};

const getTeamStats = (statsArray, teamId) => {
  if (!Array.isArray(statsArray)) return {};
  // Filtra estatísticas que pertencem a este time
  return statsArray.filter(s => String(s.participant_id) === String(teamId));
};

// Type IDs comuns na Sportmonks v3
const STAT_TYPES = {
  GOALS: 52,
  POSSESSION: 45,
  SHOTS_TOTAL: 43,
  SHOTS_ON_TARGET: 34,
  SHOTS_OFF_TARGET: 44, // Às vezes varia, verificar
  SHOTS_BLOCKED: 216, // Verificar ID exato na sua subscrição
  CORNERS: 34, // Confirmar ID de escanteios (geralmente em events ou stats)
  FOULS: 44, // Confirmar conflito
  YELLOW_CARDS: 84,
  RED_CARDS: 83,
  ATTACKS: 41, // Exemplo
  DANGEROUS_ATTACKS: 42,
  PASSES_TOTAL: 80,
  PASSES_ACCURATE: 81
};

// --- NORMALIZADORES (Transformam o JSON da API no seu Data Contract) ---

// 1. Ligas (Sidebar)
export const normalizeLeagueList = (league) => ({
  id: league.id,
  name: league.name,
  logo: league.image_path,
  country: league.country?.name || "Mundo",
  flag: league.country?.image_path,
  type: league.type === "cup_international" || league.type === "domestic_cup" ? "Cup" : "League",
  current_season_id: league.current_season_id || league.currentseason?.id // Pega do include
});

// 2.B Tabela de Classificação
export const normalizeStanding = (entry) => {
  // Helper para extrair valor do array 'details'
  const getDetail = (typeId) => {
    const item = entry.details?.find(d => d.type_id === typeId);
    return item ? item.value : 0;
  };

  // Processar formulário recente (W, D, L)
  const formString = Array.isArray(entry.form) 
    ? entry.form.slice(-5).map(f => f.form).join(",") // "W,L,D,W,W"
    : "";

  return {
    position: entry.position,
    team: {
      id: entry.participant_id,
      name: entry.participant?.name,
      logo: entry.participant?.image_path
    },
    games_played: getDetail(129),
    won: getDetail(130),
    draw: getDetail(131),
    lost: getDetail(132),
    goals_for: getDetail(133),
    goals_against: getDetail(134),
    goal_difference: getDetail(179) || (getDetail(133) - getDetail(134)), // Se não tiver ID de saldo, calcula
    points: entry.points,
    recent_form: formString
  };
};

// 3. Jogo (Card Resumido)
export const normalizeMatchCard = (fixture) => {
  const home = fixture.participants?.find(p => p.meta?.location === 'home');
  const away = fixture.participants?.find(p => p.meta?.location === 'away');
  
  // Scores
  const homeScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score_participant === 'home')?.score?.goals || 0;
  const awayScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score_participant === 'away')?.score?.goals || 0;

  // Pressão (Dangerous Attacks)
  const homeStats = getTeamStats(fixture.statistics, home?.id);
  const awayStats = getTeamStats(fixture.statistics, away?.id);
  const daHome = getStatValue(homeStats, STAT_TYPES.DANGEROUS_ATTACKS); // ID 42
  const daAway = getStatValue(awayStats, STAT_TYPES.DANGEROUS_ATTACKS);

  // Odds (1x2 - Market ID 1)
  const matchOdds = fixture.odds?.find(o => o.market_id === 1);
  const odd1 = matchOdds?.values?.find(v => v.label === '1')?.value;
  const oddX = matchOdds?.values?.find(v => v.label === 'X')?.value;
  const odd2 = matchOdds?.values?.find(v => v.label === '2')?.value;

  return {
    id: fixture.id,
    status: mapStatus(fixture.state),
    minute: fixture.minute || null,
    timestamp: fixture.starting_at_timestamp || (new Date(fixture.starting_at).getTime() / 1000),
    home_team: {
      id: home?.id,
      name: home?.name,
      logo: home?.image_path,
      score: homeScore
    },
    away_team: {
      id: away?.id,
      name: away?.name,
      logo: away?.image_path,
      score: awayScore
    },
    pressure: {
      home: daHome,
      away: daAway
    },
    odds: {
      home: odd1 || null,
      draw: oddX || null,
      away: odd2 || null
    }
  };
};

// 4. Detalhes da Partida (Completo)
export const normalizeMatchDetails = (fixture) => {
  const base = normalizeMatchCard(fixture); // Reusa a base

  // Stats Completos
  const home = fixture.participants?.find(p => p.meta?.location === 'home');
  const away = fixture.participants?.find(p => p.meta?.location === 'away');
  const homeStatsArr = getTeamStats(fixture.statistics, home?.id);
  const awayStatsArr = getTeamStats(fixture.statistics, away?.id);

  const buildStats = (arr) => ({
    possession: getStatValue(arr, STAT_TYPES.POSSESSION),
    shots_total: getStatValue(arr, STAT_TYPES.SHOTS_TOTAL),
    shots_on_target: getStatValue(arr, STAT_TYPES.SHOTS_ON_TARGET),
    corners: getStatValue(arr, STAT_TYPES.CORNERS), // Atenção: Se corners vier de 'events', lógica muda
    fouls: getStatValue(arr, STAT_TYPES.FOULS),
    attacks: getStatValue(arr, STAT_TYPES.ATTACKS),
    dangerous_attacks: getStatValue(arr, STAT_TYPES.DANGEROUS_ATTACKS)
  });

  // Eventos (Timeline)
  const events = (fixture.events || []).map(ev => ({
    id: ev.id,
    type: ev.type?.name || "Unknown", // Goal, Yellow Card
    minute: ev.minute,
    team_location: ev.participant_id === home?.id ? "home" : "away",
    player_name: ev.player?.name,
    related_player_name: ev.related_player?.name
  })).sort((a, b) => a.minute - b.minute);

  // Escalações
  const lineups = { home: [], away: [] };
  (fixture.lineups || []).forEach(l => {
    const player = {
      id: l.player_id,
      name: l.player_name || l.player?.name,
      number: l.jersey_number,
      position: l.position?.name, // Goalkeeper, etc
      grid: l.formation_position ? String(l.formation_position) : null,
      is_starter: l.type_id === 11, // Verificar ID de starting XI
      photo: l.player?.image_path
    };
    if (l.team_id === home?.id) lineups.home.push(player);
    else lineups.away.push(player);
  });

  // H2H Simples
  const h2h = (fixture.h2h || []).map(h => ({
    date: h.starting_at,
    league_name: h.league?.name,
    score: `${h.scores?.find(s=>s.description==='CURRENT')?.score?.goals || 0}-${h.scores?.find(s=>s.description==='CURRENT' && s.score_participant !== 'home')?.score?.goals || 0}`, // Simplificado
    winner_id: h.winner_team_id
  }));

  return {
    ...base,
    venue: fixture.venue?.name,
    referee: fixture.referee?.name,
    timeline: events,
    stats: {
      home: buildStats(homeStatsArr),
      away: buildStats(awayStatsArr)
    },
    lineups,
    h2h
  };
};

// --- EXPORTS: FUNÇÕES DE BUSCA ---

// Ligas
export const apiGetLeagues = async () => {
  const data = await request("/leagues", { include: ["country", "currentSeason"] });
  return (data || []).map(normalizeLeagueList);
};

export const apiGetLeagueById = async (id) => {
  const data = await request(`/leagues/${id}`, { include: ["country", "currentSeason"] });
  if (!data) return null;
  return normalizeLeagueList(data);
};

// Tabela
export const apiGetStandings = async (seasonId) => {
  // AQUI ESTÁ A CORREÇÃO DA VÍRGULA: Mandamos array
  const data = await request(`/standings/seasons/${seasonId}`, { 
    include: ["participant", "details", "form"] 
  });
  return (data || []).map(normalizeStanding);
};

// Jogos da Liga (Resumo)
export const apiGetFixturesBySeason = async (seasonId) => {
  const data = await request(`/fixtures/seasons/${seasonId}`, {
    include: ["participants", "scores", "state", "statistics", "odds"]
  });
  return (data || []).map(normalizeMatchCard);
};

// Jogo Detalhado
export const apiGetFixtureDetails = async (fixtureId) => {
  const data = await request(`/fixtures/${fixtureId}`, {
    include: [
      "participants", "scores", "state", "statistics", "odds",
      "venue", "referee", "events.player", "events.type", "lineups.player", "lineups.position", "h2h"
    ]
  });
  if (!data) return null;
  return normalizeMatchDetails(data);
};

// Jogos ao Vivo (Geral)
export const apiGetLiveMatches = async () => {
  const data = await request("/livescores/inplay", {
    include: ["participants", "scores", "state", "statistics", "odds"]
  });
  return (data || []).map(normalizeMatchCard);
};

// Jogadores (Stats & Props)
export const apiGetPlayerStats = async (playerId) => {
  const data = await request(`/players/${playerId}`, {
    include: ["teams", "statistics.season", "latest.stats"]
  });
  
  if (!data) return null;

  // Pega stats da temporada atual (a última do array geralmente)
  const currentSeasonStats = data.statistics?.[0]?.details || []; // Simplificado
  
  // Função auxiliar para extrair média
  const getAvg = (typeId) => {
    const stat = currentSeasonStats.find(s => s.type_id === typeId);
    // Supondo que 'value' seja o total, precisamos dividir por 'appearances' se a API não der a média
    return stat ? Number(stat.value) : 0; 
  };

  // Histórico (Last 5)
  const last5 = (data.latest || []).slice(0, 5).map(match => ({
    opponent: "TBD", // Precisaria cruzar com fixture
    shots: getStatValue(match.stats, STAT_TYPES.SHOTS_TOTAL)
    // ... outros stats
  }));

  return {
    id: data.id,
    name: data.display_name,
    photo: data.image_path,
    team: data.teams?.[0], // Pega o time atual
    averages: {
      shots: getAvg(STAT_TYPES.SHOTS_TOTAL),
      shots_on_target: getAvg(STAT_TYPES.SHOTS_ON_TARGET),
      fouls: getAvg(STAT_TYPES.FOULS)
    },
    last_5: last5
  };
};