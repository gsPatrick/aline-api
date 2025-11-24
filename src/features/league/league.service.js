// Importando explicitamente as funções que acabamos de garantir que existem no sports.service.js
import { 
  fetchLeagues, 
  fetchLeagueById, 
  fetchStandingsBySeason, 
  fetchFixtures 
} from "../../services/sports.service.js";

export const listAllLeagues = async () => {
  // Adicionamos include country para ter a bandeira
  const leagues = await fetchLeagues({ include: ["country"] }); 
  
  // Tratamento de erro caso a API da Sportmonks falhe ou retorne vazio
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
  const league = await fetchLeagueById(leagueId, { include: ["country", "season"] });
  
  if (!league) throw new Error("Liga não encontrada");

  const currentSeasonId = league.current_season_id || league.season?.data?.id;
  
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
  const fixtures = await fetchFixtures({ 
    league_id: leagueId, 
    include: ["participants", "scores", "state"] 
  });
  
  const now = new Date();
  
  if (!Array.isArray(fixtures)) return [];

  return fixtures
    .filter(f => new Date(f.starting_at) >= now)
    .slice(0, 10)
    .map(f => {
        // Lógica de participantes similar ao normalizeFixture
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