import { 
  fetchLeagues, 
  fetchLeagueById, 
  fetchStandingsBySeason, 
  fetchFixturesBetween,
  fetchTopscorersBySeason,
  fetchLiveFixtures,
  fetchFixtureById,
  normalizeFixture
} from "./sports.service.js";

/**
 * Lista todas as ligas disponíveis com detalhes do país.
 */
export const listAllLeagues = async () => {
  const leagues = await fetchLeagues();
  
  if (!Array.isArray(leagues)) return [];

  return leagues.map(l => ({
    id: l.id,
    name: l.name,
    logo: l.image_path,
    type: l.type, // 'league', 'cup'
    country: l.country?.data?.name || "Internacional",
    country_flag: l.country?.data?.image_path,
    current_season_id: l.current_season_id || l.currentSeason?.data?.id
  }));
};

/**
 * Obtém detalhes completos de uma liga: Info, Tabela e Artilharia.
 */
export const getLeagueDetails = async (leagueId) => {
  // 1. Busca dados básicos da liga
  const leagueData = await fetchLeagueById(leagueId);
  if (!leagueData) throw new Error("Liga não encontrada");

  const currentSeasonId = leagueData.current_season_id || leagueData.currentSeason?.data?.id;

  // 2. Paraleliza buscas dependentes da temporada (Tabela e Artilharia)
  let standingsData = [];
  let topScorersData = [];

  if (currentSeasonId) {
    try {
      const [stdRes, scorersRes] = await Promise.all([
        fetchStandingsBySeason(currentSeasonId),
        fetchTopscorersBySeason(currentSeasonId)
      ]);
      standingsData = stdRes || [];
      topScorersData = scorersRes || [];
    } catch (error) {
      console.warn("Erro ao buscar dados da temporada:", error);
    }
  }

  // 3. Normaliza Tabela (Standings)
  const standings = Array.isArray(standingsData) ? standingsData.map(s => ({
    position: s.position,
    team_id: s.participant_id,
    team_name: s.participant?.data?.name,
    team_logo: s.participant?.data?.image_path,
    points: s.points,
    played: s.details?.find(d => d.type_id === 129)?.value || 0, // Exemplo de ID, varia
    won: s.details?.find(d => d.type_id === 130)?.value || 0,
    draw: s.details?.find(d => d.type_id === 131)?.value || 0,
    lost: s.details?.find(d => d.type_id === 132)?.value || 0,
    form: s.form // WWDLW
  })) : [];

  // 4. Normaliza Artilharia
  const topScorers = Array.isArray(topScorersData) ? topScorersData.slice(0, 10).map(t => ({
    player_name: t.player?.data?.display_name,
    player_image: t.player?.data?.image_path,
    team_name: t.participant?.data?.name,
    goals: t.total, // Dependendo do type_id (goals=83)
    position: t.position
  })) : [];

  return {
    info: {
      id: leagueData.id,
      name: leagueData.name,
      logo: leagueData.image_path,
      country: leagueData.country?.data?.name
    },
    standings,
    topScorers
  };
};

/**
 * Busca jogos de uma liga específica em um intervalo de datas.
 * Útil para "Próximos Jogos" ou "Resultados".
 */
export const getLeagueFixtures = async (leagueId, daysAhead = 14) => {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysAhead);

  const startDate = today.toISOString().split('T')[0];
  const endDate = future.toISOString().split('T')[0];

  const fixtures = await fetchFixturesBetween(startDate, endDate, { 
    league_id: leagueId 
  });

  if (!Array.isArray(fixtures)) return [];

  // Usa o normalizador centralizado
  return fixtures.map(normalizeFixture);
};

/**
 * Busca jogos ao vivo de qualquer liga ou filtrado por uma.
 */
export const getLiveMatches = async (filterLeagueId = null) => {
  const fixtures = await fetchLiveFixtures();
  if (!Array.isArray(fixtures)) return [];

  let normalized = fixtures.map(normalizeFixture);

  if (filterLeagueId) {
    normalized = normalized.filter(m => m.league.id == filterLeagueId);
  }

  return normalized;
};

/**
 * Obtém a "Tela da Partida" completa (Stats, Lineups, Events).
 */
export const getMatchFullDetails = async (fixtureId) => {
  if (!fixtureId) throw new Error("ID da partida obrigatório");
  
  const fixtureRaw = await fetchFixtureById(fixtureId);
  if (!fixtureRaw) throw new Error("Partida não encontrada");

  // A função fetchFixtureById já usa os includes completos, 
  // então normalizeFixture vai extrair tudo: lineups, stats, events.
  return normalizeFixture(fixtureRaw);
};