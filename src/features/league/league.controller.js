import { listAllLeagues, getLeagueDetails, getLeagueFixtures } from "./league.service.js";

export const index = async (req, res, next) => {
  try {
    const data = await listAllLeagues();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    const details = await getLeagueDetails(id);
    const fixtures = await getLeagueFixtures(id);
    
    res.json({ ...details, upcoming_matches: fixtures });
  } catch (e) {
    next(e);
  }
};