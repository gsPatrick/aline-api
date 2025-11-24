
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
    const { data } = await http.get(endpoint, { params: requestParams });
    return data?.data ?? data;
  } catch (err) {
    console.error(`Erro Sportmonks [${endpoint}]:`, err.response?.data?.message || err.message);
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
    // Filtra apenas mercado 1 (Fulltime Result 1x2)
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
      bookmakersMap[bookieId].home = Number(odd.value);
      bookmakersMap[bookieId].prob_home = odd.probability;
    } else if (label === "x" || label === "draw") {
      bookmakersMap[bookieId].draw = Number(odd.value);
      bookmakersMap[bookieId].prob_draw = odd.probability;
    } else if (label === "2" || label === "away") {
      bookmakersMap[bookieId].away = Number(odd.value);
      bookmakersMap[bookieId].prob_away = odd.probability;
    }
  });

  return Object.values(bookmakersMap);
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

// Helper para extrair valor estatístico do array de details de forma robusta
const getStatValueFromDetails = (detailsArray, typeId, field = 'total') => {
  if (!Array.isArray(detailsArray)) return 0;

  // Encontra o objeto com o type_id específico
  const stat = detailsArray.find(s => s.type_id === typeId);
  if (!stat || !stat.value) return 0;

  // Se o valor for um objeto, tenta pegar o campo específico, senão retorna o primitivo
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

  // Tenta pegar pelo 'score.participant' (string 'home'/'away')
  const homeScoreObj = currentScores.find(s => s.score?.participant === 'home');
  const awayScoreObj = currentScores.find(s => s.score?.participant === 'away');

  if (homeScoreObj) homeScore = homeScoreObj.score.goals;
  if (awayScoreObj) awayScore = awayScoreObj.score.goals;
  
  // Fallback pelo ID se necessário
  if (!homeScoreObj && !awayScoreObj && currentScores.length > 0) {
     const h = currentScores.find(s => s.participant_id === home.id);
     const a = currentScores.find(s => s.participant_id === away.id);
     if (h) homeScore = h.score?.goals || 0;
     if (a) awayScore = a.score?.goals || 0;
  }

  // Odds
  const oddsData = normalizeOdds(fixture.odds);
  const mainOdds = oddsData ? oddsData[0] : null; // Pega o primeiro bookmaker (ex: Bet365)

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
      is_winner: home.meta?.winner // Vencedor do jogo (histórico)
    },
    away_team: {
      id: away.id,
      name: away.name || "TBD",
      short_code: away.short_code || away.name?.substring(0,3).toUpperCase(),
      logo: away.image_path || "",
      score: Number(awayScore),
      is_winner: away.meta?.winner
    },
    odds: mainOdds ? {
      bookmaker: mainOdds.name,
      home: mainOdds.home,
      draw: mainOdds.draw,
      away: mainOdds.away
    } : null,
    all_odds: oddsData,
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

      // type_id 11 = Titular, 12 = Banco
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

// 3. Jogos da Temporada
export const apiGetFixturesBySeason = async (seasonId) => {
  const data = await request(`/fixtures/seasons/${seasonId}`, {
    include: ["participants", "scores", "state", "league.country"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean); 
};

// 4. Detalhes da Partida (Genérico)
export const apiGetFixtureDetails = async (fixtureId) => {
  const data = await request(`/fixtures/${fixtureId}`, {
    include: [
      "participants", "scores", "state", "statistics", "odds",
      "venue", "events.player", "events.type", "lineups.player", "lineups.position", "league.country"
    ]
  });
  if (!data) return null;
  return normalizeMatchDetails(data);
};

// 5. Jogos ao Vivo (LiveScores)
export const apiGetLiveMatches = async () => {
  const includes = [
    "participants",
    "scores",
    "periods",
    "events",
    "league.country",
    "round"
  ];
  const data = await request("/livescores/inplay", { include: includes });
  return (data || []).map(normalizeMatchCard).filter(Boolean);
};

// 6. Jogos do Dia (Fallback)
export const apiGetDailyMatches = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await request(`/fixtures/date/${today}`, {
    include: ["participants", "scores", "state", "league.country"]
  });
  return (data || []).map(normalizeMatchCard).filter(Boolean);
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
     console.warn("SeasonID não fornecido para squad, usando fallback");
     seasonId = "25184"; 
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

// 14. Calendário de Ligas por Data (NOVO e COMPLETO)
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

// Helper para buscar jogos em intervalo (usado no sync service se necessário)
export const fetchFixturesBetween = async (startStr, endStr, extraParams = {}) => {
  const params = {
      include: ["participants", "scores", "state", "league.country", "periods"],
      ...extraParams
  };
  const data = await request(`/fixtures/between/${startStr}/${endStr}`, params);
  return data || [];
};

// Helper para buscar ligas (usado no sync service)
export const fetchLeagues = async () => {
    return apiGetLeagues();
};

// Exportando normalizador para uso externo se necessário
export const normalizeFixture = normalizeMatchCard;