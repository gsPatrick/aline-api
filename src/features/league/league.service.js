import { fetchLeagues } from "../../services/sports.service.js";

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