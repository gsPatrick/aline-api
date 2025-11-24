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

--- START OF FILE routes/player.routes.js ---
import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { show } from "./player.controller.js";

const r = Router();
r.get("/:id", auth, requiresPremium, show);
export default r;