import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MYSPORTMONKS_API_KEY;
const baseURL =
  process.env.MYSPORTMONKS_API_BASE;
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
  if (!participantId) {
    return null;
  }

  const participant = participants.find(
    (p) => String(p.id) === String(participantId)
  );

  return participant ? resolveLocation(participant) : null;
};

const computeStatusCode = (fixture) => {
  if (typeof fixture?.state_id === "number") {
    return fixture.state_id;
  }

  const statusCode =
    fixture?.time?.status?.code ||
    fixture?.time?.status?.short_code ||
    fixture?.status?.code;

  if (typeof statusCode === "number") {
    return statusCode;
  }

  const translated =
    typeof statusCode === "string" ? statusCode.toUpperCase() : null;

  const legacyMap = {
    NS: 0,
    PST: 1,
    LIVE: 2,
    HT: 6,
    FT: 7,
    AET: 8,
    PEN: 9,
    ABD: 10,
    CANC: 11,
    INT: 12,
  };

  return translated && legacyMap[translated] !== undefined
    ? legacyMap[translated]
    : 0;
};

const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const extractScoreFromScores = (scores, location, participants) => {
  if (!Array.isArray(scores)) {
    return null;
  }

  const preferred = scores.find((score) => {
    const scoreLocation =
      resolveLocation(score) ||
      locationFromParticipantId(score.participant_id, participants);
    if (!scoreLocation) {
      return false;
    }
    if (scoreLocation !== location) {
      return false;
    }
    const descriptor = (score.description || "").toLowerCase();
    return descriptor.includes("current") || descriptor.includes("result");
  });

  const candidate = preferred || scores.find((score) => {
    const scoreLocation =
      resolveLocation(score) ||
      locationFromParticipantId(score.participant_id, participants);
    return scoreLocation === location;
  });

  if (!candidate) {
    return null;
  }

  const possibleValues = [
    candidate.score,
    candidate.score_participant,
    candidate.meta?.score?.goals,
    candidate.meta?.score,
    candidate.result,
  ];

  for (const value of possibleValues) {
    const parsed = parseNumeric(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const extractScoreValue = (fixture, location, participants) => {
  const fromScores = extractScoreFromScores(
    fixture?.scores?.data,
    location,
    participants
  );
  if (fromScores !== null) {
    return fromScores;
  }

  const directFields =
    location === "home"
      ? [
          fixture?.home_score,
          fixture?.localteam_score,
          fixture?.result?.home,
          fixture?.score?.home,
          fixture?.result_info?.home,
        ]
      : [
          fixture?.away_score,
          fixture?.visitorteam_score,
          fixture?.result?.away,
          fixture?.score?.away,
          fixture?.result_info?.away,
        ];

  for (const value of directFields) {
    const parsed = parseNumeric(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
};

const getKickoffTimestamp = (fixture) => {
  const tsFromField = parseNumeric(fixture?.starting_at_timestamp);
  if (tsFromField !== null) {
    return Math.floor(tsFromField);
  }

  if (!fixture?.starting_at) {
    return null;
  }

  const ms = Date.parse(fixture.starting_at);
  if (Number.isFinite(ms)) {
    return Math.floor(ms / 1000);
  }

  return null;
};

const summarizeEvents = (fixture, participants) => {
  const events = Array.isArray(fixture?.events?.data)
    ? fixture.events.data
    : [];

  const counts = {
    home: { corners: 0, yellow: 0, red: 0 },
    away: { corners: 0, yellow: 0, red: 0 },
  };

  events.forEach((event) => {
    const location =
      resolveLocation(event) ||
      locationFromParticipantId(event.participant_id, participants);
    if (location !== "home" && location !== "away") {
      return;
    }

    const normalizedCode = (
      event?.type?.data?.code ||
      event?.type?.data?.name ||
      event?.type?.data?.slug ||
      ""
    )
      .toString()
      .toLowerCase();

    if (normalizedCode.includes("yellow")) {
      counts[location].yellow += 1;
      return;
    }

    if (normalizedCode.includes("red")) {
      counts[location].red += 1;
      return;
    }

    if (normalizedCode.includes("corner")) {
      counts[location].corners += 1;
    }
  });

  return counts;
};

const buildScoreArray = (fixture, participants) => {
  const homeScore = extractScoreValue(fixture, "home", participants);
  const awayScore = extractScoreValue(fixture, "away", participants);
  const statusCode = computeStatusCode(fixture);
  const kickoff = getKickoffTimestamp(fixture);
  const eventSummary = summarizeEvents(fixture, participants);

  return [
    String(fixture?.id ?? ""),
    statusCode,
    [
      homeScore,
      0,
      eventSummary.home.red,
      eventSummary.home.yellow,
      eventSummary.home.corners,
      0,
      0,
    ],
    [
      awayScore,
      0,
      eventSummary.away.red,
      eventSummary.away.yellow,
      eventSummary.away.corners,
      0,
      0,
    ],
    kickoff,
    "",
  ];
};

const normalizeStats = (fixture, participants) => {
  const stats = Array.isArray(fixture?.statistics?.data)
    ? fixture.statistics.data
    : [];

  if (stats.length === 0) {
    return [];
  }

  const grouped = new Map();

  stats.forEach((stat) => {
    const type =
      stat?.type_id ||
      stat?.type?.data?.id ||
      stat?.type?.data?.code ||
      stat?.type?.data?.name ||
      stat?.name;

    if (!type) {
      return;
    }

    const location =
      locationFromParticipantId(stat.participant_id, participants) ||
      resolveLocation(stat);

    const value =
      parseNumeric(stat.value) ??
      parseNumeric(stat.data) ??
      parseNumeric(stat?.statistics);

    if (!location || value === null) {
      return;
    }

    const entry = grouped.get(type) || { type, home: 0, away: 0 };

    if (location === "away") {
      entry.away = value;
    } else {
      entry.home = value;
    }

    grouped.set(type, entry);
  });

  return Array.from(grouped.values());
};

const toPosition = (location) => {
  if (location === "away") {
    return 2;
  }
  if (location === "home") {
    return 1;
  }
  return 0;
};

const normalizeIncidents = (fixture, participants) => {
  const events = Array.isArray(fixture?.events?.data)
    ? fixture.events.data
    : [];

  if (events.length === 0) {
    return [];
  }

  return events
    .map((event) => {
      const location =
        resolveLocation(event) ||
        locationFromParticipantId(event.participant_id, participants);

      const playerName =
        event.player_name ||
        event.player?.data?.display_name ||
        event.player?.data?.fullname ||
        event.player?.data?.name ||
        null;

      const inPlayerName =
        event.related_player_name ||
        event.related_player?.data?.display_name ||
        event.player_in_name ||
        null;

      const outPlayerName =
        event.player_out_name ||
        event.related_out_player?.data?.display_name ||
        null;

      const homeScore =
        parseNumeric(event?.score?.home) ?? parseNumeric(event?.home_score);
      const awayScore =
        parseNumeric(event?.score?.away) ?? parseNumeric(event?.away_score);

      return {
        type:
          event?.type_id ||
          event?.type?.data?.id ||
          event?.type?.data?.code ||
          null,
        position: toPosition(location),
        time:
          event?.minute ??
          event?.time?.minute ??
          event?.time?.seconds ??
          null,
        home_score: homeScore ?? 0,
        away_score: awayScore ?? 0,
        player_name: playerName,
        in_player_name: inPlayerName,
        out_player_name: outPlayerName,
      };
    })
    .filter((incident) => incident.type !== null);
};

const normalizeFixture = (fixture) => {
  const participants = getParticipants(fixture);

  return {
    id: String(fixture?.id ?? ""),
    score: buildScoreArray(fixture, participants),
    stats: normalizeStats(fixture, participants),
    incidents: normalizeIncidents(fixture, participants),
    tlive: [],
  };
};

const fixtureParams = (options = {}) =>
  buildParams(options, { includeDefaults: true });

// retorna todos os livescores disponíveis respeitando filtros e includes opcionais
export const fetchLivescores = (options = {}) =>
  request("/livescores", fixtureParams(options));

// retorna apenas os jogos que estão em andamento neste momento
export const fetchLivescoresInplay = (options = {}) =>
  request("/livescores/inplay", fixtureParams(options));

// retorna os livescores que tiveram atualização mais recente
export const fetchLatestLivescores = (options = {}) =>
  request("/livescores/latest", fixtureParams(options));

// retorna a lista paginada de fixtures aplicando filtros padrão da api
export const fetchFixtures = (options = {}) =>
  request("/fixtures", fixtureParams(options));

// retorna uma fixture específica pelo id informado
export const fetchFixtureById = (fixtureId, options = {}) =>
  request(`/fixtures/${sanitizeSegment(fixtureId, "fixtureId")}`, fixtureParams(options));

// retorna múltiplas fixtures em uma única chamada usando vários ids
export const fetchFixturesByMultipleIds = (fixtureIds, options = {}) => {
  if (!Array.isArray(fixtureIds) || fixtureIds.length === 0) {
    throw new Error("fixtureIds deve ser um array com pelo menos um id");
  }

  const idsSegment = fixtureIds.map((id) => sanitizeSegment(id, "fixtureId")).join(",");
  return request(`/fixtures/multi/${idsSegment}`, fixtureParams(options));
};

// retorna fixtures que acontecem em uma data específica
export const fetchFixturesByDate = (date, options = {}) =>
  request(`/fixtures/date/${sanitizeSegment(date, "date")}`, fixtureParams(options));

// retorna fixtures compreendidas entre duas datas
export const fetchFixturesBetween = (startDate, endDate, options = {}) =>
  request(
    `/fixtures/between/${sanitizeSegment(startDate, "startDate")}/${sanitizeSegment(
      endDate,
      "endDate"
    )}`,
    fixtureParams(options)
  );

// retorna fixtures de um time dentro de um intervalo de datas
export const fetchFixturesBetweenForTeam = (
  startDate,
  endDate,
  teamId,
  options = {}
) =>
  request(
    `/fixtures/between/${sanitizeSegment(startDate, "startDate")}/${sanitizeSegment(
      endDate,
      "endDate"
    )}/${sanitizeSegment(teamId, "teamId")}`,
    fixtureParams(options)
  );

// retorna o histórico de confrontos diretos entre dois times
export const fetchFixturesHeadToHead = (firstTeamId, secondTeamId, options = {}) =>
  request(
    `/fixtures/head-to-head/${sanitizeSegment(firstTeamId, "firstTeamId")}/${sanitizeSegment(
      secondTeamId,
      "secondTeamId"
    )}`,
    fixtureParams(options)
  );

// retorna fixtures cujo nome combine com o termo pesquisado
export const searchFixturesByName = (name, options = {}) =>
  request(
    `/fixtures/search/${sanitizeSegment(name, "name")}`,
    fixtureParams(options)
  );

// retorna fixtures que sofreram atualização mais recente
export const fetchLatestFixtures = (options = {}) =>
  request("/fixtures/latest", fixtureParams(options));

// retorna a lista de ligas com suporte a filtros e includes customizados
export const fetchLeagues = (options = {}) =>
  request("/leagues", buildParams(options));

// retorna os dados de uma liga específica pelo id
export const fetchLeagueById = (leagueId, options = {}) =>
  request(`/leagues/${sanitizeSegment(leagueId, "leagueId")}`, buildParams(options));

// retorna apenas ligas com partidas em andamento
export const fetchLiveLeagues = (options = {}) =>
  request("/leagues/live", buildParams(options));

// retorna ligas filtrando por país
export const fetchLeaguesByCountry = (countryId, options = {}) =>
  request(
    `/leagues/countries/${sanitizeSegment(countryId, "countryId")}`,
    buildParams(options)
  );

// retorna ligas cujo nome combine com o termo pesquisado
export const searchLeaguesByName = (name, options = {}) =>
  request(`/leagues/search/${sanitizeSegment(name, "name")}`, buildParams(options));

// retorna todas as temporadas disponíveis respeitando filtros opcionais
export const fetchSeasons = (options = {}) =>
  request("/seasons", buildParams(options));

// retorna uma temporada específica
export const fetchSeasonById = (seasonId, options = {}) =>
  request(`/seasons/${sanitizeSegment(seasonId, "seasonId")}`, buildParams(options));

// retorna temporadas relacionadas a um time
export const fetchSeasonsByTeam = (teamId, options = {}) =>
  request(`/seasons/teams/${sanitizeSegment(teamId, "teamId")}`, buildParams(options));

// retorna temporadas filtradas por nome aproximado
export const searchSeasonsByName = (name, options = {}) =>
  request(`/seasons/search/${sanitizeSegment(name, "name")}`, buildParams(options));

// retorna standings de uma temporada específica
export const fetchStandingsBySeason = (seasonId, options = {}) =>
  request(
    `/standings/seasons/${sanitizeSegment(seasonId, "seasonId")}`,
    buildParams(options)
  );

// retorna standings em tempo real de uma liga
export const fetchLiveStandingsByLeague = (leagueId, options = {}) =>
  request(
    `/standings/live/leagues/${sanitizeSegment(leagueId, "leagueId")}`,
    buildParams(options)
  );

// retorna todos os times cadastrados
export const fetchTeams = (options = {}) =>
  request("/teams", buildParams(options));

// retorna detalhes de um time específico
export const fetchTeamById = (teamId, options = {}) =>
  request(`/teams/${sanitizeSegment(teamId, "teamId")}`, buildParams(options));

// retorna times cujo nome coincida com o termo informado
export const searchTeamsByName = (name, options = {}) =>
  request(`/teams/search/${sanitizeSegment(name, "name")}`, buildParams(options));

// retorna jogadores respeitando filtros e includes informados
export const fetchPlayers = (options = {}) =>
  request("/players", buildParams(options));

// retorna dados de um jogador específico
export const fetchPlayerById = (playerId, options = {}) =>
  request(`/players/${sanitizeSegment(playerId, "playerId")}`, buildParams(options));

// retorna jogadores cujo nome combine com o termo pesquisado
export const searchPlayersByName = (name, options = {}) =>
  request(`/players/search/${sanitizeSegment(name, "name")}`, buildParams(options));

// retorna os jogadores com atualização mais recente
export const fetchLatestPlayers = (options = {}) =>
  request("/players/latest", buildParams(options));

// retorna as partidas em andamento já normalizadas para o formato interno
export const getLiveMatches = async () => {
  const fixtures = await fetchLivescoresInplay();

  if (!Array.isArray(fixtures)) {
    return [];
  }

  return fixtures.map(normalizeFixture);
};

// retorna estatísticas completas de uma partida específica
export const getMatchStats = async (matchId) => {
  if (!matchId) {
    throw new Error("matchId é obrigatório");
  }

  const fixture = await fetchFixtureById(matchId);

  if (!fixture) {
    throw new Error("Partida não encontrada");
  }

  return normalizeFixture(
    Array.isArray(fixture?.data) ? fixture.data[0] : fixture
  );
};
