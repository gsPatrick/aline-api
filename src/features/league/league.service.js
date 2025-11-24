import { 
  fetchLeagues, 
  fetchLeagueById, 
  fetchStandingsBySeason, 
  fetchFixturesBetween
} from "../../services/sports.service.js";

export const listAllLeagues = async () => {
  const leagues = await fetchLeagues({ include: ["country"] }); 
  
  if (!Array.isArray(leagues)) {
    console.error("Erro: fetchLeagues não retornou um array", leagues);
    return [];
  }

  return leagues.map(l => ({
    id: l.id,
    name: l.name,
    logo: l.image_path,
    country: l.country?.data?.name,
    country_flag: l.country?.data?.image_path
  }));
};

export const getLeagueDetails = async (leagueId) => {
  // 1. Buscamos a liga incluindo a temporada atual para garantir o ID
  const league = await fetchLeagueById(leagueId, { include: ["country", "currentSeason"] });
  
  if (!league) throw new Error("Liga não encontrada");

  // 2. Identificamos a temporada atual
  const currentSeasonId = league.current_season_id || league.currentSeason?.data?.id;
  
  // 3. Buscamos a tabela (Standings)
  let standings = [];
  if (currentSeasonId) {
    try {
      const stdData = await fetchStandingsBySeason(currentSeasonId);
      standings = Array.isArray(stdData) ? stdData : (stdData?.data || []);
    } catch (e) {
      console.log(`Aviso: Sem standings para a season ${currentSeasonId}`);
    }
  }

  return {
    id: league.id,
    name: league.name,
    logo: league.image_path,
    country: league.country?.data?.name,
    season_id: currentSeasonId,
    standings
  };
};

export const getLeagueFixtures = async (leagueId) => {
  // 1. Define intervalo de datas (Hoje até +30 dias)
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + 30);

  const startDate = today.toISOString().split('T')[0];
  const endDate = future.toISOString().split('T')[0];

  // 2. Usa o endpoint BETWEEN para filtrar na API (não no código)
  // Passamos league_id como filtro adicional
  const fixtures = await fetchFixturesBetween(startDate, endDate, { 
    league_id: leagueId, 
    include: ["participants", "scores"] 
  });
  
  if (!Array.isArray(fixtures)) return [];

  // 3. Mapeia para o formato do frontend
  return fixtures
    .slice(0, 10) // Pega apenas os 10 próximos
    .map(f => {
        const participants = f.participants?.data || [];
        const home = participants.find(p => p.meta?.location === 'home');
        const away = participants.find(p => p.meta?.location === 'away');

        return {
            id: f.id,
            time: f.starting_at,
            status_id: f.state_id,
            homeTeam: {
                name: home?.name || "Casa",
                image_path: home?.image_path
            },
            awayTeam: {
                name: away?.name || "Fora",
                image_path: away?.image_path
            }
        };
    });
};