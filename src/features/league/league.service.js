import { 
  fetchLeagueById, 
  fetchStandingsBySeason, 
  fetchFixtures 
} from "../../services/sports.service.js";


export const listAllLeagues = async () => {
  // Busca ligas da Sportmonks (pode adicionar cache Redis aqui futuramente)
  const leagues = await fetchLeagues({ include: ["country"] }); 
  
  return leagues.map(l => ({
    id: l.id,
    name: l.name,
    logo: l.image_path,
    country: l.country?.data?.name,
    country_flag: l.country?.data?.image_path
  }));
};


export const getLeagueDetails = async (leagueId) => {
  const league = await fetchLeagueById(leagueId, { include: ["country", "season"] });
  
  // Tenta pegar a temporada atual
  const currentSeasonId = league.current_season_id || league.season?.data?.id;
  
  // Busca standings se tiver temporada atual
  let standings = [];
  if (currentSeasonId) {
    try {
      const stdData = await fetchStandingsBySeason(currentSeasonId);
      standings = stdData || [];
    } catch (e) {
      console.log("Sem standings disponíveis");
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
  // Busca próximos jogos desta liga
  // Nota: Precisamos passar filtros de data no futuro, aqui pegamos os gerais filtrados pela liga
  // A Sportmonks pede start_date e end_date normalmente, ou filtragem no array.
  // Vamos simplificar pedindo fixtures e filtrando ou usando endpoint de season se disponível.
  
  // Para simplificar a integração agora, vamos usar o endpoint de fixtures genérico filtrando por ligaId
  // (No mundo ideal, usaria /fixtures/between com league_id no parametro, mas vamos usar o wrapper existente)
  const fixtures = await fetchFixtures({ 
    // Se sua função fetchFixtures aceitar params adicionais de query string:
    league_id: leagueId, 
    include: ["participants", "scores"] // Garante dados dos times
  });
  
  // Filtra apenas futuros ou ao vivo no JS se a API retornar tudo
  const now = new Date();
  return fixtures
    .filter(f => new Date(f.starting_at) >= now) // Apenas futuros
    .slice(0, 10) // Limita a 10 jogos
    .map(f => ({
       id: f.id,
       time: f.starting_at, // Timestamp ou string
       status_id: f.state_id,
       homeTeam: {
         name: f.participants?.data?.find(p => p.meta.location === 'home')?.name,
         image_path: f.participants?.data?.find(p => p.meta.location === 'home')?.image_path,
         score: 0 // Jogos futuros começam 0-0
       },
       awayTeam: {
         name: f.participants?.data?.find(p => p.meta.location === 'away')?.name,
         image_path: f.participants?.data?.find(p => p.meta.location === 'away')?.image_path,
         score: 0
       }
    }));
};