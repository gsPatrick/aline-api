import { 
  fetchLeagues, 
  fetchLeagueById, 
  fetchStandingsBySeason, 
  fetchFixtures 
} from "../../services/sports.service.js";

export const listAllLeagues = async () => {
  // Busca ligas da Sportmonks
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
  // CORREÇÃO: Removido 'season' dos includes pois causava erro 404.
  // Usamos apenas 'country'. O 'current_season_id' já vem no objeto da liga.
  const league = await fetchLeagueById(leagueId, { include: ["country"] });
  
  if (!league) throw new Error("Liga não encontrada");

  // Tenta pegar o ID da temporada atual diretamente da propriedade da liga
  const currentSeasonId = league.current_season_id;
  
  let standings = [];
  if (currentSeasonId) {
    try {
      const stdData = await fetchStandingsBySeason(currentSeasonId);
      // A Sportmonks pode retornar os standings dentro de 'data' ou direto
      standings = Array.isArray(stdData) ? stdData : (stdData?.data || []);
    } catch (e) {
      console.log(`Sem standings disponíveis para a season ${currentSeasonId}:`, e.message);
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
  // Busca fixtures filtrando pela liga
  const fixtures = await fetchFixtures({ 
    league_id: leagueId, 
    include: ["participants", "scores", "state"] 
  });
  
  const now = new Date();
  
  if (!Array.isArray(fixtures)) return [];

  return fixtures
    .filter(f => new Date(f.starting_at) >= now) // Apenas jogos futuros
    .slice(0, 10) // Limita a 10 jogos
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