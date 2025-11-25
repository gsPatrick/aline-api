
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MYSPORTMONKS_API_KEY;
const baseURL = process.env.MYSPORTMONKS_API_BASE || "https://api.sportmonks.com/v3/football";
const defaultTimezone = process.env.MYSPORTMONKS_TIMEZONE || "America/Sao_Paulo";

// --- CONFIGURAÇÃO DO AXIOS (SERIALIZAÇÃO DE PARÂMETROS) ---
const http = axios.create({
  baseURL,
  timeout: 15000,
  paramsSerializer: params => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      const value = params[key];
      // Tratamento especial para 'include': Sportmonks v3 aceita arrays ou strings separadas por ;
      if (key === 'include') {
        if (Array.isArray(value)) {
          searchParams.append('include', value.join(';'));
        } else if (typeof value === 'string') {
          searchParams.append('include', value);
        }
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  }
});




// --- HELPER DE REQUISIÇÃO ---
const request = async (endpoint, params = {}) => {
  if (!apiKey) throw new Error("MYSPORTMONKS_API_KEY ausente.");
  
  const requestParams = { 
    api_token: apiKey, 
    timezone: defaultTimezone, 
    ...params 
  };

  try {
    console.log(`📡 SPORTMONKS REQUEST: ${endpoint}`);
    // console.log(`👉 Params:`, JSON.stringify(params)); // Descomente se quiser ver os params detalhados

    const { data } = await http.get(endpoint, { params: requestParams });
    
    if (!data) {
        console.warn(`⚠️ SPORTMONKS: Resposta vazia (sem data) para ${endpoint}`);
    } else {
        console.log(`✅ SPORTMONKS: Sucesso para ${endpoint}`);
    }

    return data?.data ?? data;
  } catch (err) {
    console.error(`💀 SPORTMONKS ERRO [${endpoint}]:`, err.response?.data?.message || err.message);
    if (err.response) {
        console.error("Status Code:", err.response.status);
    }
    return null;
  }
};


// --- MAPEAMENTOS E CONSTANTES ---

// Códigos da Tabela de Classificação (Type ID -> Campo)
const STANDING_CODES = {
  // GERAL
  129: "games_played",
  130: "won",
  131: "draw",
  132: "lost",
  133: "goals_for",
  134: "goals_against",
  179: "goal_difference",
  187: "points", // Overall Points
  
  // CASA
  135: "home_played",
  136: "home_won",
  137: "home_draw",
  138: "home_lost",
  139: "home_goals_for",
  140: "home_goals_against",
  185: "home_points",

  // FORA
  141: "away_played",
  142: "away_won",
  143: "away_draw",
  144: "away_lost",
  145: "away_goals_for",
  146: "away_goals_against",
  186: "away_points"
};

// Códigos de Estatísticas de Jogo
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

// --- HELPERS DE FORMATAÇÃO ---

const getMatchTime = (periods) => {
  if (!Array.isArray(periods) || periods.length === 0) return null;
  
  // Pega o último período ativo
  const currentPeriod = periods[periods.length - 1];
  
  let timeString = `${currentPeriod.minutes || 0}'`;
  if (currentPeriod.time_added > 0) {
    timeString += `+${currentPeriod.time_added}`;
  }
  
  let phase = "";
  const desc = (currentPeriod.description || "").toLowerCase();
  
  if (desc.includes("1st")) phase = "1T";
  else if (desc.includes("2nd")) phase = "2T";
  else if (desc.includes("halftime") || desc.includes("break")) return "INT"; // Intervalo
  else if (desc.includes("extra")) phase = "ET";
  else if (desc.includes("pen")) phase = "PEN";

  return `${phase} ${timeString}`.trim();
};

const mapMatchStatus = (fixture) => {
  // Lógica 1: Se tem periods ativos e não acabou, calcula tempo
  const periods = fixture.periods || [];
  if (periods.length > 0 && !fixture.finished && fixture.state?.short_name !== 'FT') {
      const timeStr = getMatchTime(periods);
      if (timeStr) return { id: 2, short: timeStr, long: "Em Andamento" };
  }

  // Lógica 2: Baseado no State ID ou Short Name
  const stateShort = fixture.state?.short_name || "NS";
  
  if (["LIVE", "1st", "2nd", "ET", "PEN", "HT", "BREAK"].includes(stateShort)) {
    return { id: 2, short: "LIVE", long: "Ao Vivo" };
  }
  if (["FT", "AET", "FT_PEN"].includes(stateShort) || fixture.result_info) {
    return { id: 3, short: "FT", long: "Encerrado" };
  }
  if (["POST", "CANC", "SUSP", "INT", "ABD"].includes(stateShort)) {
    return { id: 4, short: stateShort, long: "Adiado/Cancelado" }; 
  }
  
  return { id: 1, short: "NS", long: "Agendado" };
};

const normalizeOdds = (oddsArray) => {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) return null;

  const bookmakersMap = {};

  oddsArray.forEach(odd => {
    // Filtra apenas mercado 1 (Fulltime Result 1x2) se necessário, 
    // mas o ideal é filtrar na API. Aqui processamos o que vier.
    if (odd.market_id !== 1) return;

    const bookieId = odd.bookmaker_id;
    const bookieName = odd.bookmaker?.name || "Bookmaker";

    if (!bookmakersMap[bookieId]) {
      bookmakersMap[bookieId] = {
        id: bookieId,
        name: bookieName,
        home: null,
        draw: null,
        away: null,
        updated_at: odd.latest_bookmaker_update
      };
    }

    const label = (odd.original_label || odd.label || "").toLowerCase();
    
    if (label === "1" || label === "home") {
      bookmakersMap[bookieId].home = { value: Number(odd.value).toFixed(2), prob: odd.probability };
    } else if (label === "x" || label === "draw") {
      bookmakersMap[bookieId].draw = { value: Number(odd.value).toFixed(2), prob: odd.probability };
    } else if (label === "2" || label === "away") {
      bookmakersMap[bookieId].away = { value: Number(odd.value).toFixed(2), prob: odd.probability };
    }
  });

  // Retorna o primeiro bookmaker encontrado (geralmente Bet365 se filtrado)
  const firstBookie = Object.values(bookmakersMap)[0];
  
  if (!firstBookie || !firstBookie.home || !firstBookie.away) return null;

  return {
      bookmaker: firstBookie.name,
      home: firstBookie.home,
      draw: firstBookie.draw,
      away: firstBookie.away
  };
};

const getRating = (details) => {
  if (!Array.isArray(details)) return null;
  const ratingStat = details.find(d => d.type_id === 118); 
  return ratingStat ? Number(ratingStat.data?.value || ratingStat.value).toFixed(1) : null;
};

const getFormationFromMetadata = (metadata) => {
  if (!Array.isArray(metadata)) return { home: null, away: null };
  const formationData = metadata.find(m => m.type_id === 159); 
  if (!formationData || !formationData.values) return { home: null, away: null };
  return formationData.values; 
};

// Helper para extrair valor estatístico do array de details
const getStatValueFromDetails = (detailsArray, typeId, field = 'total') => {
  if (!Array.isArray(detailsArray)) return 0;

  // Encontra o objeto com o type_id específico
  const stat = detailsArray.find(s => s.type_id === typeId);
  if (!stat || !stat.value) return 0;

  // Se o valor for um objeto, tenta pegar o campo específico
  if (typeof stat.value === 'object') {
    return stat.value[field] ?? stat.value.total ?? 0;
  }
  
  return Number(stat.value);
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
  
  // Processa estatísticas
  if (Array.isArray(entry.details)) {
    entry.details.forEach(det => {
      const key = STANDING_CODES[det.type_id];
      if (key) detailsMap[key] = Number(det.value);
    });
  }

  // Processa Forma (W D L)
  let recentForm = [];
  if (Array.isArray(entry.form)) {
    const sortedForm = [...entry.form].sort((a, b) => b.sort_order - a.sort_order);
    recentForm = sortedForm.slice(0, 5).map(f => f.form).reverse();
  }

  return {
    position: entry.position,
    team: {
      id: entry.participant_id,
      name: entry.participant?.name || "Desconhecido",
      logo: entry.participant?.image_path || "",
      short_code: entry.participant?.short_code
    },
    points: entry.points || detailsMap.points || 0,
    status: entry.rule?.type?.name || null,
    overall: {
      games_played: detailsMap.games_played || 0,
      won: detailsMap.won || 0,
      draw: detailsMap.draw || 0,
      lost: detailsMap.lost || 0,
      goals_for: detailsMap.goals_for || 0,
      goals_against: detailsMap.goals_against || 0,
      goal_difference: detailsMap.goal_difference || 0
    },
    home: {
      games_played: detailsMap.home_played || 0,
      won: detailsMap.home_won || 0,
      draw: detailsMap.home_draw || 0,
      lost: detailsMap.home_lost || 0,
      goals_for: detailsMap.home_goals_for || 0,
      goals_against: detailsMap.home_goals_against || 0,
      points: detailsMap.home_points || 0
    },
    away: {
      games_played: detailsMap.away_played || 0,
      won: detailsMap.away_won || 0,
      draw: detailsMap.away_draw || 0,
      lost: detailsMap.away_lost || 0,
      goals_for: detailsMap.away_goals_for || 0,
      goals_against: detailsMap.away_goals_against || 0,
      points: detailsMap.away_points || 0
    },
    form: recentForm
  };
};

export const normalizeMatchCard = (fixture) => {
  if (!fixture) return null;

  // Participantes (suporta estrutura plana ou dentro de 'participants.data')
  let participants = fixture.participants || [];
  if (fixture.participants && Array.isArray(fixture.participants.data)) participants = fixture.participants.data;

  const home = participants.find(p => p.meta?.location === 'home') || participants[0] || {};
  const away = participants.find(p => p.meta?.location === 'away') || participants[1] || {};

  // Placar
  const scores = fixture.scores || [];
  const currentScores = scores.filter(s => s.description === 'CURRENT');
  
  let homeScore = 0;
  let awayScore = 0;

  const homeScoreObj = currentScores.find(s => s.score?.participant === 'home');
  const awayScoreObj = currentScores.find(s => s.score?.participant === 'away');

  if (homeScoreObj) homeScore = homeScoreObj.score.goals;
  if (awayScoreObj) awayScore = awayScoreObj.score.goals;
  
  if (!homeScoreObj && !awayScoreObj && currentScores.length > 0) {
     const h = currentScores.find(s => s.participant_id === home.id);
     const a = currentScores.find(s => s.participant_id === away.id);
     if (h) homeScore = h.score?.goals || 0;
     if (a) awayScore = a.score?.goals || 0;
  }

  // Odds
  const mainOdds = normalizeOdds(fixture.odds);

  return {
    id: fixture.id,
    status: mapMatchStatus(fixture),
    timestamp: fixture.starting_at_timestamp || (new Date(fixture.starting_at).getTime() / 1000),
    league: {
      id: fixture.league_id || fixture.league?.id,
      name: fixture.league?.name || "Desconhecido",
      logo: fixture.league?.image_path || "",
      country: fixture.league?.country?.name || ""
    },
    home_team: {
      id: home.id,
      name: home.name || "TBD",
      short_code: home.short_code || home.name?.substring(0,3).toUpperCase(),
      logo: home.image_path || "",
      score: Number(homeScore),
      is_winner: home.meta?.winner
    },
    away_team: {
      id: away.id,
      name: away.name || "TBD",
      short_code: away.short_code || away.name?.substring(0,3).toUpperCase(),
      logo: away.image_path || "",
      score: Number(awayScore),
      is_winner: away.meta?.winner
    },
    odds: mainOdds,
    is_live: mapMatchStatus(fixture).id === 2
  };
};

export const normalizeLineups = (fixture) => {
  if (!fixture || !fixture.participants) return null;

  const homeId = fixture.participants.find(p => p.meta?.location === 'home')?.id;
  const awayId = fixture.participants.find(p => p.meta?.location === 'away')?.id;

  const formations = getFormationFromMetadata(fixture.metadata);

  const coaches = { home: null, away: null };
  if (Array.isArray(fixture.coaches)) {
    const homeCoach = fixture.coaches.find(c => c.meta?.participant_id === homeId);
    const awayCoach = fixture.coaches.find(c => c.meta?.participant_id === awayId);
    
    if (homeCoach) coaches.home = { name: homeCoach.display_name, photo: homeCoach.image_path };
    if (awayCoach) coaches.away = { name: awayCoach.display_name, photo: awayCoach.image_path };
  }

  const result = {
    home: {
      team_id: homeId,
      formation: formations.home,
      coach: coaches.home,
      starters: [],
      bench: []
    },
    away: {
      team_id: awayId,
      formation: formations.away,
      coach: coaches.away,
      starters: [],
      bench: []
    }
  };

  if (Array.isArray(fixture.lineups)) {
    fixture.lineups.forEach(entry => {
      const isHome = entry.team_id === homeId;
      const targetTeam = isHome ? result.home : result.away;
      
      const playerObj = {
        id: entry.player_id,
        name: entry.player_name || entry.player?.display_name,
        number: entry.jersey_number,
        photo: entry.player?.image_path,
        position: entry.position_id,
        grid: entry.formation_field,
        rating: getRating(entry.details),
        is_captain: entry.details?.some(d => d.type_id === 40) || false
      };

      if (entry.type_id === 11) targetTeam.starters.push(playerObj);
      else if (entry.type_id === 12) targetTeam.bench.push(playerObj);
    });
  }

  const sortLineup = (a, b) => (a.grid && b.grid) ? 0 : a.number - b.number;
  result.home.starters.sort(sortLineup);
  result.away.starters.sort(sortLineup);

  return result;
};

export const normalizeMatchDetails = (fixture) => {
    const base = normalizeMatchCard(fixture);
    if(!base) return null;
    return {
        ...base,
        venue: fixture.venue?.name || "Estádio não informado"
    };
};

export const normalizeSquadPlayer = (entry) => {
  const p = entry.player;
  
  if (!p) return null;

  // Pega as estatísticas da temporada filtrada (array statistics do JSON)
  const statsDetails = p.statistics && p.statistics.length > 0 
    ? p.statistics[0].details 
    : [];

  return {
    id: p.id,
    name: p.display_name || p.common_name || p.name,
    photo: p.image_path,
    nationality_flag: p.nationality?.image_path,
    country: p.nationality?.name,
    position_id: p.position_id, 
    position_name: p.position?.name || "Desconhecido",
    number: entry.jersey_number,
    is_captain: entry.captain || false,
    stats: {
      matches: Number(getStatValueFromDetails(statsDetails, 321, 'total')), // ID 321: Appearances
      goals: Number(getStatValueFromDetails(statsDetails, 52, 'total')),    // ID 52: Goals
      assists: Number(getStatValueFromDetails(statsDetails, 79, 'total')),  // ID 79: Assists
      rating: Number(getStatValueFromDetails(statsDetails, 118, 'average')).toFixed(2) // ID 118: Rating
    }
  };
};

// --- FUNÇÕES EXPORTADAS (API CALLS) ---

// 1. Listar Ligas
export const apiGetLeagues = async () => {
  const data = await request("/leagues", { include: ["country", "currentSeason"] });
  return (data || []).map(normalizeLeagueList);
};

export const apiGetLeagueById = async (id) => {
  const data = await request(`/leagues/${id}`, { include: ["country", "currentSeason"] });
  if (!data) return null;
  return normalizeLeagueList(data);
};

// 2. Tabela (Standings) Completa
export const apiGetStandings = async (seasonId) => {
  const includes = [
    "participant",
    "rule.type",
    "details.type",
    "form",
    "stage",
    "league",
    "group"
  ];
  const data = await request(`/standings/seasons/${seasonId}`, { include: includes });
  return (data || [])
    .filter(s => s.participant_id)
    .map(normalizeStanding)
    .sort((a, b) => a.position - b.position);
};

// 3. Jogos da Temporada (Legacy - Mantido para compatibilidade)
export const apiGetFixturesBySeason = async (seasonId) => {
  const data = await request(`/fixtures/seasons/${seasonId}`, {
    include: ["participants", "scores", "state", "league.country"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean); 
};

// --- HELPER: Normalizar Previsões (Predictions) ---
const normalizePredictions = (predictionsArray) => {
  if (!Array.isArray(predictionsArray)) return null;

  const result = {
    fulltime: null,
    goals_home: null,
    goals_away: null,
    btts: null,
    corners: null
  };

  predictionsArray.forEach(pred => {
    const typeId = pred.type_id;
    const vals = pred.predictions;

    // 237: Probabilidade Resultado Final (1x2)
    if (typeId === 237) {
      result.fulltime = {
        home: vals.home,
        draw: vals.draw,
        away: vals.away
      };
    }
    // 1683: Escanteios Over/Under 5 (Exemplo)
    if (typeId === 1683) {
        result.corners = vals;
    }
    // Você pode adicionar outros IDs aqui conforme aparecem na sua API
  });

  return result;
};



// --- FUNÇÃO PRINCIPAL DE DETALHES (Atualizada) ---
export const apiGetFixtureDetails = async (fixtureId) => {
  console.log(`📡 SERVICE: Buscando detalhes completos para ID ${fixtureId}...`);

  // Lista completa de includes solicitados
  // NOTA: Se o seu plano não suportar 'predictions', remova 'predictions.type' da string abaixo.
  const include = [
    "participants",
    "league.country",
    "venue",
    "state",
    "scores",
    "events.type", "events.period", "events.player", // Timeline
    "statistics.type", // Estatísticas
    "lineups.player", "lineups.position", "lineups.details.type", // Escalações + Ratings
    "sidelined.sideline.player", "sidelined.sideline.type", // Lesionados
    "weatherReport", // Clima
    "odds.market", "odds.bookmaker" // Cotações
  ].join(";");

  // Requisição à API (Sem filtros restritivos para garantir retorno)
  const data = await request(`/fixtures/${fixtureId}`, { include });
  
  if (!data) {
      console.warn(`⚠️ SERVICE: Sportmonks retornou vazio para ${fixtureId}`);
      return null;
  }

  // 1. Normalização Básica (Card da Partida)
  const normalized = normalizeMatchCard(data);
  
  if (normalized) {
      // 2. Dados de Estádio e Clima
      normalized.venue = data.venue?.name;
      normalized.weather = data.weather_report;
      
      // 3. Estatísticas (Stats)
      // Transforma array da API em objeto { home: {...}, away: {...} }
      const statsObj = { home: {}, away: {} };
      if (Array.isArray(data.statistics)) {
          data.statistics.forEach(stat => {
              const code = stat.type?.code; // ex: 'possession', 'shots_total'
              const isHome = stat.participant_id === normalized.home_team.id;
              const target = isHome ? statsObj.home : statsObj.away;
              
              // Sportmonks v3: valor pode estar em data.value ou direto em value
              const val = stat.data?.value ?? stat.value ?? 0;
              
              if (code) target[code] = val;
          });
      }
      normalized.stats = statsObj;

      // 4. Linha do Tempo (Events)
      // Mapeia eventos e ordena por minuto (decrescente = mais recente no topo)
      normalized.events = (data.events || []).map(e => ({
          id: e.id,
          minute: e.minute,
          extra_minute: e.extra_minute,
          type: e.type?.name, // Goal, Yellow Card, Substitution
          player_name: e.player?.display_name || e.player_name,
          related_player_name: e.related_player_name, // Para substituições
          result: e.result, // Placar no momento do gol
          is_home: e.participant_id === normalized.home_team.id
      })).sort((a, b) => b.minute - a.minute);

      // 5. Escalações (Lineups)
      if (data.lineups) {
          // Usa a função normalizeLineups que já existe no arquivo sports.service.js
          normalized.lineups = normalizeLineups(data);
      } else {
          normalized.lineups = null;
      }

      // 6. Projeções (Predictions)
      // Verifica se existem antes de normalizar
      if (data.predictions && data.predictions.length > 0) {
          normalized.predictions = normalizePredictions(data.predictions);
      } else {
          normalized.predictions = null;
      }

      // 7. Desfalques (Sidelined)
      if (data.sidelined) {
          normalized.sidelined = normalizeSidelined(data.sidelined, normalized.home_team.id, normalized.away_team.id);
      } else {
          normalized.sidelined = { home: [], away: [] };
      }
  }

  console.log(`✅ SERVICE: Dados normalizados com sucesso para ID ${fixtureId}`);
  return normalized;
};


// 5. Jogos ao Vivo (LiveScores)
export const apiGetLiveMatches = async () => {
  const today = new Date().toISOString().split('T')[0];
  const params = { include: "participants;scores;periods;league.country;state;odds.market;odds.bookmaker" };
  
  const data = await request(`/fixtures/date/${today}`, params);
  if (!data) return [];
  
  const liveStatuses = [2, 3, 22, 23, 25, 26]; 
  const liveShorts = ['LIVE', '1st', '2nd', 'HT', 'ET', 'PEN', 'BREAK', 'INT'];

  const liveMatches = data.filter(f => {
      const state = f.state || {};
      return liveStatuses.includes(state.id) || liveShorts.includes(state.short_name);
  });

  return liveMatches.map(normalizeMatchCard);
};

// 6. Jogos do Dia (Fallback)
export const apiGetDailyMatches = async () => {
  const today = new Date().toISOString().split('T')[0];
  // Filtra apenas jogos com odds da Bet365 e Mercado 1x2 para a lista principal ficar limpa
  const params = {
    include: "participants;scores;state;league.country;odds.market;odds.bookmaker",
    filters: "markets:1;bookmakers:2" 
  };
  const data = await request(`/fixtures/date/${today}`, params);
  return (data || []).map(normalizeMatchCard);
};
// 7. Estatísticas Jogador
export const apiGetPlayerStats = async (playerId) => {
  const data = await request(`/players/${playerId}`, {
    include: ["teams", "statistics.season", "latest.stats"]
  });
  
  if (!data) return null;

  const seasonStats = data.statistics || [];
  const currentSeasonStats = seasonStats.length > 0 ? (seasonStats[seasonStats.length - 1].details || []) : [];
  
  const getVal = (id) => {
      const stat = currentSeasonStats.find(s => s.type_id === id);
      return stat ? Number(stat.value) : 0;
  };

  return {
    id: data.id,
    name: data.display_name,
    photo: data.image_path,
    team: data.teams?.[0] ? { id: data.teams[0].id, name: data.teams[0].name, logo: data.teams[0].image_path } : null,
    stats: {
        goals: getVal(STAT_TYPES.GOALS),
        assists: 0 
    }
  };
};

// 8. Jogos da Rodada com Odds (Comparação)
export const apiGetRoundFixtures = async (roundId) => {
  const includes = [
    "fixtures.odds.market",
    "fixtures.odds.bookmaker",
    "fixtures.participants",
    "league.country",
    "fixtures.scores" 
  ];

  const filters = {
    "markets": "1",   // Fulltime Result
    "bookmakers": "2" // Bet365 (padrão)
  };

  const data = await request(`/rounds/${roundId}`, {
    include: includes,
    filters: filters
  });

  if (!data || !data.fixtures) return [];

  return (data.fixtures || [])
    .map(normalizeMatchCard)
    .sort((a, b) => a.timestamp - b.timestamp);
};

// 9. Calendário/Histórico do Time (Upcoming + Latest)
export const apiGetTeamSchedule = async (teamId) => {
  // Busca os próximos jogos (upcoming) e os últimos resultados (latest) em uma única chamada
  const params = {
    include: "upcoming.participants;upcoming.league;latest.participants;latest.scores;latest.league"
  };

  const data = await request(`/teams/${teamId}`, params);

  if (!data) return [];

  const upcoming = (data.upcoming || []).map(normalizeMatchCard);
  const latest = (data.latest || []).map(normalizeMatchCard);

  return [...latest, ...upcoming];
};

// 10. Classificação Ao Vivo / Por Rodada
export const apiGetLiveStandings = async (roundId) => {
  const includes = [
    "stage",
    "league",
    "details.type",
    "participant"
  ];
  const data = await request(`/standings/rounds/${roundId}`, { include: includes });
  return (data || [])
    .filter(s => s.participant_id)
    .map(normalizeStanding)
    .sort((a, b) => a.position - b.position);
};

// 11. Escalação da Partida (Lineups)
export const apiGetFixtureLineups = async (fixtureId) => {
  const includes = [
    "participants",
    "league",
    "venue",
    "state",
    "scores",
    "lineups.player",
    "lineups.type",
    "lineups.details.type",
    "metadata.type",
    "coaches"
  ];

  const data = await request(`/fixtures/${fixtureId}`, { include: includes });
  if (!data) return null;
  return normalizeLineups(data);
};

// 12. Elenco do Time (Squad)
export const apiGetTeamSquad = async (teamId, seasonId) => {
  if (!seasonId) {
     seasonId = "25184"; // Fallback
  }

  const params = {
    include: "team;player.nationality;player.statistics.details.type;player.position",
    filters: `playerstatisticSeasons:${seasonId}`
  };

  const data = await request(`/squads/teams/${teamId}`, params);

  if (!data) return [];

  return (data || []).map(normalizeSquadPlayer).filter(Boolean);
};

// 13. Detalhes do Time (Info Básica)
export const apiGetTeamById = async (teamId) => {
  const data = await request(`/teams/${teamId}`, {
    include: ["country", "venue"]
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    short_code: data.short_code,
    image_path: data.image_path,
    founded: data.founded,
    country: data.country?.name,
    venue_name: data.venue?.name
  };
};

// 14. Calendário de Liga por Data (OTIMIZADO E CORRIGIDO)
export const apiGetFixturesByDateAndLeague = async (date, leagueId) => {
    // Busca jogos filtrados por data e ID da liga diretamente
    const params = {
        include: "participants;scores;state;league.country;odds.market;odds.bookmaker",
        filters: `league_ids:${leagueId};markets:1;bookmakers:2`
    };
    
    const data = await request(`/fixtures/date/${date}`, params);
    
    if (!data) return [];
    return (data || []).map(normalizeMatchCard);
};

// 15. Próximos Jogos por Liga (OTIMIZADO - Intervalo de 14 dias)
export const apiGetUpcomingFixturesByLeague = async (leagueId) => {
    const today = new Date();
    const startStr = today.toISOString().split('T')[0];
    
    const future = new Date();
    future.setDate(today.getDate() + 14); // Intervalo de 2 semanas
    const endStr = future.toISOString().split('T')[0];

    const params = {
        include: "participants;scores;state;league.country;odds.market;odds.bookmaker",
        filters: `league_ids:${leagueId};markets:1;bookmakers:2`
    };

    const data = await request(`/fixtures/between/${startStr}/${endStr}`, params);
    
    if (!data) return [];
    
    return (data || []).map(normalizeMatchCard).sort((a, b) => a.timestamp - b.timestamp);
};

// Helper para buscar jogos em intervalo (usado no sync)
export const fetchFixturesBetween = async (startStr, endStr, extraParams = {}) => {
  const params = {
      include: ["participants", "scores", "state", "league.country", "periods"],
      ...extraParams
  };
  const data = await request(`/fixtures/between/${startStr}/${endStr}`, params);
  return data || [];
};

// Helper para buscar ligas (usado no sync)
export const fetchLeagues = async () => {
    return apiGetLeagues();
};

// Exportando normalizador para uso externo se necessário
export const normalizeFixture = normalizeMatchCard;

export const apiGetLeaguesByDate = async (date) => {
  // Parâmetros exatos para buscar ligas e jogos do dia
  const params = {
    include: "today.scores;today.participants;today.stage;today.group;today.round"
  };

  const data = await request(`/leagues/date/${date}`, params);

  if (!data) return [];

  // Transforma a resposta para retornar uma estrutura amigável
  return data.map(league => {
      // Normaliza informações da liga
      const leagueInfo = normalizeLeagueList(league);

      // Normaliza jogos contidos em 'today'
      // Os jogos dentro de 'today' não possuem o objeto 'league' completo dentro deles (apenas league_id).
      // Então injetamos as informações da liga pai neles manualmente após normalizar.
      const matches = (league.today || []).map(f => {
          const normalized = normalizeMatchCard(f);
          if(normalized) {
              normalized.league = leagueInfo; // Injeta a info da liga pai para o frontend saber a qual liga pertence
          }
          return normalized;
      }).filter(Boolean);

      return {
          ...leagueInfo,
          matches // Array de jogos normalizados
      };
  }).filter(l => l.matches.length > 0); // Retorna apenas ligas que têm jogos na data
};


// HELPER H2H
export const normalizeH2H = (fixturesArray) => {
  if (!Array.isArray(fixturesArray)) return [];
  
  // Retorna os últimos 5 jogos
  return fixturesArray.slice(0, 5).map(normalizeMatchCard);
};

// NOVO: Buscar Head-to-Head
export const apiGetHeadToHead = async (teamA, teamB) => {
  const params = {
    include: "participants;league;scores;state;venue"
  };
  
  const data = await request(`/fixtures/head-to-head/${teamA}/${teamB}`, params);
  
  if (!data) return [];
  
  // Normaliza usando a função padrão de card
  return (data || []).map(normalizeMatchCard).sort((a, b) => b.timestamp - a.timestamp); // Mais recente primeiro
};
