
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

// IDs de Estatísticas (Sportmonks v3)
const PLAYER_STAT_IDS = {
  GOALS: 52,
  ASSISTS: 79,
  RATING: 118,
  MINUTES: 119,
  APPEARANCES: 321,
  YELLOW_CARDS: 84,
  RED_CARDS: 83,
  SHOTS_TOTAL: 42,
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

const normalizeSidelined = (sidelinedArray, homeId, awayId) => {
  if (!Array.isArray(sidelinedArray)) return { home: [], away: [] };

  const result = { home: [], away: [] };

  sidelinedArray.forEach(entry => {
    const player = entry.player;
    if (!player) return;

    const item = {
      id: player.id,
      name: player.display_name,
      photo: player.image_path,
      reason: entry.type?.name || "Desconhecido", // Lesão, Suspensão
      start_date: entry.start_date
    };

    if (entry.team_id === homeId) result.home.push(item);
    else if (entry.team_id === awayId) result.away.push(item);
  });

  return result;
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
      short_code: home.short_code || home.name?.substring(0, 3).toUpperCase(),
      logo: home.image_path || "",
      score: Number(homeScore),
      is_winner: home.meta?.winner
    },
    away_team: {
      id: away.id,
      name: away.name || "TBD",
      short_code: away.short_code || away.name?.substring(0, 3).toUpperCase(),
      logo: away.image_path || "",
      score: Number(awayScore),
      is_winner: away.meta?.winner
    },
    odds: mainOdds,
    is_live: mapMatchStatus(fixture).id === 2,
    stats: normalizeMatchStats(fixture.stats, home.id, away.id)
  };
};

const normalizeMatchStats = (stats, homeId, awayId) => {
  if (!stats || !Array.isArray(stats)) return null;

  const getStat = (teamId, typeId) => {
    const s = stats.find(x => x.participant_id === teamId && x.type_id === typeId);
    return s ? (s.value?.total ?? s.value ?? 0) : 0;
  };

  // IDs: 34=Corners, 84=Yellow Cards, 85=Red Cards
  return {
    corners: {
      home: getStat(homeId, 34),
      away: getStat(awayId, 34)
    },
    yellow_cards: {
      home: getStat(homeId, 84),
      away: getStat(awayId, 84)
    },
    red_cards: {
      home: getStat(homeId, 85),
      away: getStat(awayId, 85)
    }
  };
};

export const normalizeLineups = (fixture) => {
  if (!fixture || !fixture.participants) return null;

  const homeId = fixture.participants.find(p => p.meta?.location === 'home')?.id;
  const awayId = fixture.participants.find(p => p.meta?.location === 'away')?.id;

  // Extrai formação do metadata (type_id 159)
  // Ex: { home: "4-2-3-1", away: "4-2-3-1" }
  const formations = getFormationFromMetadata(fixture.metadata);

  // Extrai técnicos
  const coaches = { home: null, away: null };
  if (Array.isArray(fixture.coaches)) {
    const hCoach = fixture.coaches.find(c => c.meta?.participant_id === homeId);
    const aCoach = fixture.coaches.find(c => c.meta?.participant_id === awayId);
    if (hCoach) coaches.home = { name: hCoach.display_name, photo: hCoach.image_path };
    if (aCoach) coaches.away = { name: aCoach.display_name, photo: aCoach.image_path };
  }

  const result = {
    home: {
      formation: formations.home || "N/A",
      coach: coaches.home,
      starters: [],
      bench: []
    },
    away: {
      formation: formations.away || "N/A",
      coach: coaches.away,
      starters: [],
      bench: []
    }
  };

  if (Array.isArray(fixture.lineups)) {
    fixture.lineups.forEach(entry => {
      const isHome = entry.team_id === homeId;
      const targetTeam = isHome ? result.home : result.away;

      // Rating (type_id 118 dentro de details)
      const rating = getRating(entry.details);

      const playerObj = {
        id: entry.player_id,
        name: entry.player_name || entry.player?.display_name,
        number: entry.jersey_number,
        photo: entry.player?.image_path,
        position: entry.position_id, // 24=GK, 25=DEF, 26=MID, 27=ATT
        grid: entry.formation_field, // "1:1", "4:2" etc (para desenhar no campo)
        rating: rating,
        is_captain: entry.details?.some(d => d.type_id === 40) || false
      };

      // Type ID: 11 = Titular, 12 = Banco
      if (entry.type_id === 11) targetTeam.starters.push(playerObj);
      else if (entry.type_id === 12) targetTeam.bench.push(playerObj);
    });
  }

  // Ordena titulares por posição no grid (Goleiro -> Ataque) e banco por número
  const sortGrid = (a, b) => (a.grid && b.grid) ? 0 : a.number - b.number; // Simplificado, idealmente parse grid string

  // Ordenação simples para lista: Goleiro (24) primeiro
  const sortPos = (a, b) => {
    if (a.position === 24) return -1;
    if (b.position === 24) return 1;
    return a.position - b.position;
  };

  result.home.starters.sort(sortPos);
  result.away.starters.sort(sortPos);

  return result;
};


export const normalizeMatchDetails = (fixture) => {
  const base = normalizeMatchCard(fixture);
  if (!base) return null;
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
export const apiGetLeagues = async (page = 1) => {
  // Aumentando o limite para 2000 para tentar buscar todas as ligas
  const data = await request("/leagues", {
    include: ["country", "currentSeason"],
    per_page: 50, // Voltando para 50 para usar paginação corretamente
    page: Number(page)
  });
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
// --- FUNÇÃO PRINCIPAL DE DETALHES (CORRIGIDA) ---
export const apiGetFixtureDetails = async (fixtureId) => {
  console.log(`📡 SERVICE: Buscando detalhes completos para ID ${fixtureId}...`);

  // Lista completa de includes (MERGE DO SEU PEDIDO + NECESSIDADES DO APP)
  const include = [
    // Básico
    "participants",
    "league.country", // Traz a liga e o país
    "venue",
    "state",
    "scores",

    // Lineups (CORRIGIDO PARA INCLUIR TUDO QUE VC PEDIU)
    "lineups.player",
    "lineups.type",         // <--- ADICIONADO (Faltava)
    "lineups.details.type",
    "lineups.position",     // Mantemos para ordenação
    "metadata.type",        // <--- ADICIONADO (Para Formação 4-3-3)
    "coaches",              // <--- ADICIONADO (Para Técnicos)

    // Outras Abas (Timeline, Stats, Odds, Lesões)
    "events.type", "events.period", "events.player",
    "statistics.type",
    "sidelined.sideline.player", "sidelined.sideline.type",
    "weatherReport",
    "odds.market", "odds.bookmaker"
  ].join(";");

  // Requisição à API
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
    const statsObj = { home: {}, away: {} };
    if (Array.isArray(data.statistics)) {
      data.statistics.forEach(stat => {
        const code = stat.type?.code;
        const isHome = stat.participant_id === normalized.home_team.id;
        const target = isHome ? statsObj.home : statsObj.away;
        const val = stat.data?.value ?? stat.value ?? 0;
        if (code) target[code] = val;
      });
    }
    normalized.stats = statsObj;

    // 4. Linha do Tempo (Events)
    normalized.events = (data.events || []).map(e => ({
      id: e.id,
      minute: e.minute,
      extra_minute: e.extra_minute,
      type: e.type?.name,
      player_name: e.player?.display_name || e.player_name,
      related_player_name: e.related_player_name,
      result: e.result,
      is_home: e.participant_id === normalized.home_team.id
    })).sort((a, b) => b.minute - a.minute);

    // 5. Escalações (Lineups) - AGORA VAI PEGAR FORMAÇÃO E TÉCNICO
    if (data.lineups) {
      normalized.lineups = normalizeLineups(data);
    } else {
      normalized.lineups = null;
    }

    // 6. Projeções (Predictions)
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

  return [...upcoming, ...latest];
};


// --- POLLING SERVICE (LIVE UPDATES) ---
import { getIO } from "./socket.js";

let lastLiveMatchesHash = "";

export const startLiveMatchPolling = () => {
  console.log("🔄 Iniciando Polling de Jogos ao Vivo (10s)...");

  setInterval(async () => {
    try {
      const liveMatches = await apiGetLiveMatches();

      // Cria um hash simples do estado atual para comparar
      // Usamos apenas ID, Placar e Status para detectar mudanças relevantes
      const currentHash = JSON.stringify(liveMatches.map(m => ({
        id: m.id,
        score_home: m.home_team.score,
        score_away: m.away_team.score,
        status: m.status.short,
        minute: m.status.short // Minuto também muda
      })));

      if (currentHash !== lastLiveMatchesHash) {
        console.log("⚡ Mudança detectada nos jogos ao vivo! Emitindo socket...");

        const io = getIO();
        io.broadcastMatchUpdate("match:update", liveMatches);

        lastLiveMatchesHash = currentHash;
      }

    } catch (err) {
      console.error("❌ Erro no Polling de Jogos:", err.message);
    }
  }, 10000); // 10 segundos
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
      if (normalized) {
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


// --- NORMALIZADOR DE PERFIL DE JOGADOR ---
const normalizePlayerProfile = (p) => {
  if (!p) return null;

  // 1. Pé Preferido (Metadata type_id 229)
  const footMeta = p.metadata?.find(m => m.type_id === 229);
  const preferredFoot = footMeta ? footMeta.values : "N/A";

  // 2. Time Atual (Baseado na data de fim do contrato)
  const currentTeamEntry = p.teams?.sort((a, b) => new Date(b.start) - new Date(a.start))[0];
  const currentTeam = currentTeamEntry ? {
    id: currentTeamEntry.team.id,
    name: currentTeamEntry.team.name,
    logo: currentTeamEntry.team.image_path,
    shirt_number: currentTeamEntry.jersey_number
  } : null;

  // 3. Estatísticas por Temporada (Tabela)
  // Agrupa estatísticas úteis e remove duplicatas ou temporadas vazias
  const careerStats = (p.statistics || []).map(stat => {
    const getVal = (id) => {
      const item = stat.details?.find(d => d.type_id === id);
      return item ? Number(item.value.total || item.value.average || item.value) : 0;
    };

    // Pula se não tiver stats relevantes
    if (!stat.has_values && !stat.details?.length) return null;

    return {
      id: stat.id,
      season_id: stat.season_id,
      season_name: stat.season?.name,
      league_name: stat.season?.league?.name,
      league_logo: stat.season?.league?.image_path,
      team_logo: stat.team?.image_path,
      matches: getVal(PLAYER_STAT_IDS.APPEARANCES),
      goals: getVal(PLAYER_STAT_IDS.GOALS),
      assists: getVal(PLAYER_STAT_IDS.ASSISTS),
      rating: getVal(PLAYER_STAT_IDS.RATING).toFixed(2),
      minutes: getVal(PLAYER_STAT_IDS.MINUTES)
    };
  }).filter(Boolean).sort((a, b) => b.season_id - a.season_id); // Mais recente primeiro

  // 4. Totais da Carreira (Somatório simples dos dados retornados)
  const totals = careerStats.reduce((acc, curr) => ({
    matches: acc.matches + curr.matches,
    goals: acc.goals + curr.goals,
    assists: acc.assists + curr.assists
  }), { matches: 0, goals: 0, assists: 0 });

  // 5. Últimos Jogos (Latest Matches)
  const lastMatches = (p.latest || []).map(latest => {
    const fix = latest.fixture;
    if (!fix) return null;

    // Busca a nota específica desse jogo nos details do 'latest'
    const ratingDetail = latest.details?.find(d => d.type_id === PLAYER_STAT_IDS.RATING);
    const rating = ratingDetail ? Number(ratingDetail.value.average || ratingDetail.value).toFixed(1) : "-";

    // Busca estatísticas chave do jogo
    const goalsDetail = latest.details?.find(d => d.type_id === PLAYER_STAT_IDS.GOALS);
    const goals = goalsDetail ? Number(goalsDetail.value.total || goalsDetail.value) : 0;

    // Determina o adversário
    const opponent = fix.participants?.find(part => part.id !== latest.team_id);
    const myTeam = fix.participants?.find(part => part.id === latest.team_id);

    return {
      id: fix.id,
      date: fix.starting_at,
      league_name: fix.league?.name,
      logo: fix.league?.image_path,
      opponent_name: opponent?.name || "TBD",
      opponent_logo: opponent?.image_path,
      result: fix.scores?.find(s => s.description === "CURRENT") ?
        `${fix.scores.find(s => s.participant_id === myTeam?.id)?.score?.goals}-${fix.scores.find(s => s.participant_id === opponent?.id)?.score?.goals}` : "VS",
      rating: rating,
      goals: goals,
      minutes: latest.details?.find(d => d.type_id === PLAYER_STAT_IDS.MINUTES)?.value?.total || 0
    };
  }).filter(Boolean);

  // 6. Troféus
  const trophies = (p.trophies || []).map(t => ({
    id: t.id,
    league_name: t.league?.name,
    season: t.season?.name,
    status: t.trophy?.name, // "Winner", "Runner-up"
    team_logo: t.team?.image_path
  })).filter(t => t.status === "Winner"); // Filtra apenas títulos ganhos (opcional)

  return {
    info: {
      id: p.id,
      name: p.common_name || p.display_name,
      fullname: p.name,
      photo: p.image_path,
      age: p.date_of_birth ? Math.floor((new Date() - new Date(p.date_of_birth).getTime()) / 3.15576e+10) : "-",
      birthdate: p.date_of_birth,
      height: p.height,
      weight: p.weight,
      nationality: p.nationality?.name,
      flag: p.nationality?.image_path,
      position: p.detailedposition?.name || "Jogador",
      foot: preferredFoot,
      current_team: currentTeam
    },
    career: {
      stats: careerStats,
      totals: totals
    },
    latest: lastMatches,
    trophies: trophies
  };
};

// --- 16. OBTER PERFIL COMPLETO DO JOGADOR ---
export const apiGetPlayerProfile = async (playerId) => {
  // Includes solicitados para montar o perfil completo
  const include = [
    "trophies.league",
    "trophies.season",
    "trophies.trophy",
    "trophies.team",
    "teams.team",
    "statistics.details.type",
    "statistics.team",
    "statistics.season.league",
    "latest.fixture.participants",
    "latest.fixture.league",
    "latest.fixture.scores",
    "latest.details.type",
    "nationality",
    "detailedPosition",
    "metadata.type"
  ].join(";");

  const data = await request(`/players/${playerId}`, { include });

  if (!data) return null;

  return normalizePlayerProfile(data);
};

// 10. Match Analysis (Dashboard do Jogo)
export const apiGetMatchAnalysis = async (fixtureId) => {
  const includes = [
    "league",
    "venue",
    "participants",
    "probability", // Probabilidades (Predictions)
    "valueBets"    // Value Bets (se disponível no seu plano)
  ].join(";");

  const data = await request(`/fixtures/${fixtureId}`, { include: includes });
  if (!data) return null;

  // Busca estatísticas da temporada para os times (Home e Away)
  const homeId = data.participants.find(p => p.meta?.location === 'home')?.id;
  const awayId = data.participants.find(p => p.meta?.location === 'away')?.id;

  const [homeStats, awayStats, standings] = await Promise.all([
    homeId ? request(`/statistics/seasons/teams/${homeId}`) : null,
    awayId ? request(`/statistics/seasons/teams/${awayId}`) : null,
    data.league_id && data.season_id ? apiGetStandings(data.season_id) : []
  ]);

  // Helper para processar estatísticas de temporada
  const processSeasonStats = (statsData) => {
    if (!statsData || !Array.isArray(statsData)) return null;
    // Pega a última estatística disponível (geralmente a da temporada atual/recente)
    const latest = statsData[0];
    if (!latest || !latest.details) return null;

    const getVal = (id) => {
      const item = latest.details.find(d => d.type_id === id);
      return item ? Number(item.value?.total ?? item.value ?? 0) : 0;
    };

    // IDs: 52=Gols Marcados, 56=Gols Sofridos, 34=Cantos, 84=Amarelos
    // Scoring Minutes (Heatmap): type_id geralmente é complexo, simplificando para exemplo
    // Na v3, scoring minutes vem em 'details' com type específico ou sub-propriedade.
    // Vamos simular ou pegar se existir.

    return {
      goals_scored: getVal(52),
      goals_conceded: getVal(56),
      corners: getVal(34),
      yellow_cards: getVal(84),
      matches_played: getVal(129) || 1, // Evitar divisão por zero
    };
  };

  const hStats = processSeasonStats(homeStats);
  const aStats = processSeasonStats(awayStats);

  // Calcula médias
  const calcAvg = (total, matches) => matches > 0 ? (total / matches).toFixed(2) : "0.00";

  const homeAvg = hStats ? {
    goals_scored: calcAvg(hStats.goals_scored, hStats.matches_played),
    goals_conceded: calcAvg(hStats.goals_conceded, hStats.matches_played),
    btts_percentage: "N/A", // Requer cálculo mais complexo iterando jogos
    clean_sheets_percentage: "N/A"
  } : null;

  const awayAvg = aStats ? {
    goals_scored: calcAvg(aStats.goals_scored, aStats.matches_played),
    goals_conceded: calcAvg(aStats.goals_conceded, aStats.matches_played),
    btts_percentage: "N/A",
    clean_sheets_percentage: "N/A"
  } : null;

  // Posição na tabela
  const getPosition = (teamId) => {
    const entry = standings.find(s => s.team.id === teamId);
    return entry ? entry.position : "-";
  };

  return {
    fixture: normalizeMatchCard(data),
    venue: data.venue?.name,
    standings: {
      home_position: getPosition(homeId),
      away_position: getPosition(awayId)
    },
    stats: {
      home: homeAvg,
      away: awayAvg
    },
    predictions: {
      probabilities: data.probability, // Estrutura bruta da API
      value_bets: data.value_bets
    }
  };
};

// 11. Team Stats Page (Dashboard do Time)
export const apiGetTeamStats = async (teamId) => {
  // 1. Últimos 10 jogos com stats
  // Usamos o endpoint de fixtures do time, filtrando por data ou limitando
  // Como a API v3 não tem 'limit' direto em fixtures/team, pegamos por data ou latest
  const latestMatches = await request(`/fixtures/teams/${teamId}`, {
    include: "stats;participants;scores;league",
    per_page: 10,
    page: 1,
    // order: 'desc' (depende da API, mas vamos ordenar manualmente se precisar)
  });

  // 2. Próximo Jogo
  const upcoming = await request(`/fixtures/upcoming/teams/${teamId}`, {
    include: "participants;league;odds.market;odds.bookmaker",
    per_page: 1
  });

  // 3. Stats da Temporada (Radar)
  const seasonStats = await request(`/statistics/seasons/teams/${teamId}`);

  // Processamento do Radar
  // Normalização 0-100 (Mockada/Estimada pois requer máximos da liga para ser real)
  const processRadar = (stats) => {
    if (!stats || !stats[0]) return null;
    const d = stats[0].details || [];
    const getVal = (id) => {
      const item = d.find(x => x.type_id === id);
      return item ? Number(item.value?.total ?? item.value ?? 0) : 0;
    };

    // Exemplo de normalização simples (valores arbitrários para 'max')
    const goals = getVal(52);
    const shots = getVal(43); // Shots Total
    const interception = getVal(1565); // Exemplo ID
    const corners = getVal(34);

    return {
      attack: Math.min(100, (goals * 2 + shots) / 2), // Lógica fictícia
      defense: Math.min(100, (interception * 5)),
      pressure: Math.min(100, corners * 3),
      // Adicionar outros conforme disponibilidade
    };
  };

  return {
    latest_matches: (latestMatches || []).map(normalizeMatchCard),
    next_match: (upcoming || []).map(normalizeMatchCard)[0] || null,
    radar_data: processRadar(seasonStats)
  };
};