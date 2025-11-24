import { apiGetPlayerStats } from "../services/sports.service.js";

export const show = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await apiGetPlayerStats(id);
    if (!stats) return res.status(404).json({ error: "Jogador não encontrado" });
    res.json(stats);
  } catch (e) {
    next(e);
  }
};

