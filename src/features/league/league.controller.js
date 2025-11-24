import { listAllLeagues } from "./league.service.js";

export const index = async (req, res, next) => {
  try {
    const data = await listAllLeagues();
    res.json(data);
  } catch (e) {
    next(e);
  }
};