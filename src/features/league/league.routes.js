
import { Router } from "express";
import { index, show, getMatchesByDate } from "./league.controller.js";

const r = Router();

r.get("/", index);
r.get("/:id", show);
// Nova rota para o calendário: /api/leagues/8/matches?date=2025-11-24
r.get("/:id/matches", getMatchesByDate); 

export default r;