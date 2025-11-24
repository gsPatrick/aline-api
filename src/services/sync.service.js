import { League, Match } from "../models/index.js";
import { 
  fetchLeagues, 
  fetchFixturesBetween, 
  normalizeFixture 
} from "./sports.service.js"; // Usa o sports.service que criamos anteriormente

/**
 * Sincroniza Ligas Ativas
 */
export const syncLeagues = async () => {
  console.log("🔄 Iniciando sincronização de ligas...");
  
  // Pega todas as ligas da API
  const leaguesData = await fetchLeagues();
  
  if (!leaguesData) return;

  for (const l of leaguesData) {
    await League.upsert({
      externalId: l.id,
      name: l.name,
      logo: l.image_path,
      country: l.country?.data?.name,
      flag: l.country?.data?.image_path,
      currentSeasonId: l.current_season_id || l.currentSeason?.data?.id,
      active: l.active
    });
  }
  console.log(`✅ ${leaguesData.length} ligas sincronizadas.`);
};

/**
 * Sincroniza Jogos (Passados e Futuros Próximos)
 * Recomendado: Rodar 1x por dia para jogos futuros, e a cada minuto para jogos do dia
 */
export const syncFixtures = async (daysBack = 3, daysAhead = 14) => {
  console.log(`🔄 Sincronizando jogos de -${daysBack} a +${daysAhead} dias...`);

  const today = new Date();
  
  const startDate = new Date();
  startDate.setDate(today.getDate() - daysBack);
  
  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Busca na API Sportmonks
  const fixtures = await fetchFixturesBetween(startStr, endStr);

  if (!fixtures || fixtures.length === 0) {
    console.log("⚠️ Nenhum jogo encontrado no período.");
    return;
  }

  let count = 0;
  for (const f of fixtures) {
    // Normaliza os dados usando nossa função robusta do sports.service
    const normalized = normalizeFixture(f);
    
    if (normalized) {
      await Match.upsert({
        externalId: normalized.id,
        leagueId: normalized.league.id,
        date: normalized.starting_at,
        status: normalized.status.short,
        homeTeamName: normalized.teams.home.name,
        awayTeamName: normalized.teams.away.name,
        homeScore: normalized.teams.home.score,
        awayScore: normalized.teams.away.score,
        data: normalized // Salva o objeto completo JSON no banco
      });
      count++;
    }
  }
  console.log(`✅ ${count} partidas sincronizadas.`);
};