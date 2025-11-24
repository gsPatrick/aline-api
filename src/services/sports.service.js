import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MYSPORTMONKS_API_KEY;
const baseURL = process.env.MYSPORTMONKS_API_BASE;
const defaultTimezone = process.env.MYSPORTMONKS_TIMEZONE || "UTC";

const http = axios.create({
  baseURL,
  timeout: 15000,
});

const ensureApiKey = () => {
  if (!apiKey) {
    throw new Error("MYSPORTMONKS_API_KEY deve estar configurada no .env");
  }
};

const normalizeInclude = (include) => {
  if (Array.isArray(include)) {
    return include.join(";");
  }
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
    return data?.data ?? data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const apiMessage =
        err.response.data?.message ||
        err.response.data?.error ||
        "Erro desconhecido";
      throw new Error(`MySportMonks (${endpoint}) erro ${status}: ${apiMessage}`);
    }
    throw new Error(
      `Falha ao consultar MySportMonks (${endpoint}): ${err.message}`
    );
  }
};

const defaultIncludes = [
  "participants",
  "scores",
  "events.type",
  "statistics.type",
];

const parseIncludeInput = (include) => {
  if (!include) {
    return [];
  }
  if (Array.isArray(include)) {
    return include.filter(Boolean);
  }
  return String(include)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
};

const resolveIncludes = (include, includeDefaults = false) => {
  const custom = parseIncludeInput(include);
  const base = includeDefaults ? defaultIncludes : [];
  const merged = [...base, ...custom];
  const unique = Array.from(new Set(merged.filter(Boolean)));
  return unique.length ? unique : undefined;
};

const buildParams = (options = {}, { includeDefaults = false } = {}) => {
  if (!options || typeof options !== "object") {
    return includeDefaults ? { include: defaultIncludes } : {};
  }

  const { include, includeDefaults: overrideIncludeDefaults, ...rest } = options;
  const shouldUseDefault =
    typeof overrideIncludeDefaults === "boolean"
      ? overrideIncludeDefaults
      : includeDefaults;
  const resolvedIncludes = resolveIncludes(include, shouldUseDefault);

  return resolvedIncludes ? { ...rest, include: resolvedIncludes } : rest;
};

const sanitizeSegment = (segment, fieldName) => {
  if (segment === null || segment === undefined) {
    throw new Error(`${fieldName || "segmento"} é obrigatório`);
  }
  const trimmed = String(segment).trim();
  if (!trimmed) {
    throw new Error(`${fieldName || "segmento"} é obrigatório`);
  }
  return encodeURIComponent(trimmed);
};

// --- Helpers de Normalização ---

const getParticipantByLocation = (participants, location) => {
  if (!Array.isArray(participants)) return null;
  return participants.find((p) => {
    // Sportmonks v3 pode retornar location em meta ou pivot
    const loc = p.meta?.location || p.pivot?.location;
    return loc === location;
  });
};

const computeStatusCode = (fixture) => {
  if (typeof fixture?.state_id === "number") {
    return fixture.state_id;
  }
  return 0;
};

const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getParticipants = (fixture) =>
  Array.isArray(fixture?.participants?.data)
    ? fixture.participants.data
    : fixture.participants || [];

const resolveLocation = (entity) =>
  entity?.meta?.location ||
  entity?.pivot?.location ||
  entity?.details?.location ||
  entity?.location ||
  null;

const locationFromParticipantId = (participantId, participants) => {
  if (!participantId) return null;
  const participant = participants.find(
    (p) => String(p.id) === String(participantId)
  );
  return participant ? resolveLocation(participant) : null;
};

const extractScoreValue = (fixture, location, participants) => {
  // Lógica simplificada para pegar o score atual
  const scores = fixture?.scores?.data || fixture?.scores || [];
  const currentScore = scores.find(
    (s) => s.description === "CURRENT" && (s.score_participant === location || resolveLocation(s) === location)
  );
  
  if (currentScore) return parseNumeric(currentScore.score?.goals || currentScore.score);

  // Fallback para campos diretos
  if (location === "home") return parseNumeric(fixture?.scores?.localteam_score || 0);
  if (location === "away") return parseNumeric(fixture?.scores?.visitorteam_score || 0);
  
  return 0;
};

const getKickoffTimestamp = (fixture) => {
  const tsFromField = parseNumeric(fixture?.starting_at_timestamp);
  if (tsFromField !== null) return Math.floor(tsFromField);
  if (!fixture?.starting_at) return null;
  const ms = Date.parse(fixture.starting_at);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};

const summarizeEvents = (fixture, participants) => {
  const events = Array.isArray(fixture?.events?.data) ? fixture.events.data : [];
  const counts = {
    home: { corners: 0, yellow: 0, red: 0 },
    away: { corners: 0, yellow: 0, red: 0 },
  };

  events.forEach((event) => {
    const location = resolveLocation(event) || locationFromParticipantId(event.participant_id, participants);
    if (location !== "home" && location !== "away") return;

    const typeName = (event?.type?.data?.name || "").toLowerCase();
    if (typeName.includes("yellow")) counts[location].yellow++;
    else if (typeName.includes("red")) counts[location].red++;
    else if (typeName.includes("corner")) counts[location].corners++;
  });
  return counts;
};

const buildScoreArray = (fixture, participants) => {
  const homeScore = extractScoreValue(fixture, "home", participants);
  const awayScore = extractScoreValue(fixture, "away", participants);
  const eventSummary = summarizeEvents(fixture, participants);

  return [
    String(fixture?.id ?? ""),
    computeStatusCode(fixture),
    [homeScore, 0, eventSummary.home.red, eventSummary.home.yellow, eventSummary.home.corners, 0, 0],
    [awayScore, 0, eventSummary.away.red, eventSummary.away.yellow, eventSummary.away.corners, 0, 0],
    getKickoffTimestamp(fixture),
    "",
  ];
};

const normalizeStats = (fixture, participants) => {
  const stats = Array.isArray(fixture?.statistics?.data) ? fixture.statistics.data : [];
  if (stats.length === 0) return [];

  const grouped = new Map();

  stats.forEach((stat) => {
    const type = stat?.type?.data?.name || stat?.type_id;
    if (!type) return;

    const location = locationFromParticipantId(stat.participant_id, participants) || resolveLocation(stat);
    const value = parseNumeric(stat.value) ?? parseNumeric(stat.data?.value);

    if (!location || value === null) return;

    const entry = grouped.get(type) || { type, home: 0, away: 0 };
    if (location === "away") entry.away = value;
    else entry.home = value;

    grouped.set(type, entry);
  });

  return Array.from(grouped.values());
};

const normalizeIncidents = (fixture, participants) => {
  const events = Array.isArray(fixture?.events?.data) ? fixture.events.data : [];
  return events.map((event) => {
    const location = resolveLocation(event) || locationFromParticipantId(event.participant_id, participants);
    return {
      type: event?.type?.data?.name || "Unknown",
      participant: location,
      minute: event.minute,
      player_name: event.player?.data?.name || event.player_name
    };
  });
};

const fixtureParams = (options = {}) =>
  buildParams(options, { includeDefaults: true });

// --- EXPORTS (FUNÇÕES DE BUSCA) ---

export const fetchLivescores = (options = {}) => request("/livescores", fixtureParams(options));

export const fetchLivescoresInplay = (options = {}) => request("/livescores/inplay", fixtureParams(options));

export const fetchLatestLivescores = (options = {}) => request("/livescores/latest", fixtureParams(options));

export const fetchFixtures = (options = {}) => request("/fixtures", fixtureParams(options));

export const fetchFixtureById = (fixtureId, options = {}) => request(`/fixtures/${sanitizeSegment(fixtureId, "fixtureId")}`, fixtureParams(options));

export const fetchLeagues = (options = {}) => request("/leagues", buildParams(options));

export const fetchLeagueById = (leagueId, options = {}) => request(`/leagues/${sanitizeSegment(leagueId, "leagueId")}`, buildParams(options));

export const fetchSeasons = (options = {}) => request("/seasons", buildParams(options));

export const fetchStandingsBySeason = (seasonId, options = {}) => request(`/standings/seasons/${sanitizeSegment(seasonId, "seasonId")}`, buildParams(options));

export const normalizeFixture = (fixture) => {
  const participants = getParticipants(fixture);
  const homeTeam = getParticipantByLocation(participants, "home");
  const awayTeam = getParticipantByLocation(participants, "away");
  const scoreArray = buildScoreArray(fixture, participants);
  const homeScore = scoreArray[2][0];
  const awayScore = scoreArray[3][0];

  return {
    id: String(fixture?.id ?? ""),
    status_id: computeStatusCode(fixture),
    status_name: fixture?.state?.data?.name || "Unknown",
    minute: fixture?.minute || null,
    league: {
      id: fixture?.league_id,
      name: fixture?.league?.data?.name || "Liga",
      country: fixture?.league?.data?.country?.data?.name || "Mundo",
      flag: fixture?.league?.data?.country?.data?.image_path || null,
      logo: fixture?.league?.data?.image_path || null,
    },
    homeTeam: {
      id: homeTeam?.id,
      name: homeTeam?.name || "Casa",
      logo: homeTeam?.image_path || null,
      score: homeScore
    },
    awayTeam: {
      id: awayTeam?.id,
      name: awayTeam?.name || "Fora",
      logo: awayTeam?.image_path || null,
      score: awayScore
    },
    score: scoreArray,
    stats: normalizeStats(fixture, participants),
    incidents: normalizeIncidents(fixture, participants),
    events: fixture?.events?.data || [],
    tlive: [],
    odds: fixture?.odds?.data || []
  };
};

export const getLiveMatches = async () => {
  const fixtures = await fetchLivescoresInplay();
  if (!Array.isArray(fixtures)) return [];
  return fixtures.map(normalizeFixture);
};

export const getMatchStats = async (matchId) => {
  if (!matchId) throw new Error("matchId é obrigatório");
  const fixture = await fetchFixtureById(matchId);
  if (!fixture) throw new Error("Partida não encontrada");
  return normalizeFixture(Array.isArray(fixture?.data) ? fixture.data[0] : fixture);
};