
import { Router } from "express";
import { index, show, getMatchesByDate, getDetails, getFixturesByRound } from "./league.controller.js";

const r = Router();

r.get("/", index);
r.get("/:id", show);
// Nova rota para o calendário: /api/leagues/8/matches?date=2025-11-24
r.get("/:id/matches", getMatchesByDate);
// NEW: Complete league details (dashboard)
r.get("/:id/details", getDetails);
// NEW: Get fixtures for a specific round (for filter)
r.get("/:id/rounds/:roundId/fixtures", getFixturesByRound);

export default r;