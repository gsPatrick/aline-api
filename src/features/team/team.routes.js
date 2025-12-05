import { Router } from "express";
import { schedule, squad, info, getTeamStats } from "./team.controller.js";

const r = Router();

r.get("/:id/schedule", schedule);
r.get("/:id/squad", squad);
r.get("/:id/info", info);
r.get("/:id/stats", getTeamStats);

export default r;