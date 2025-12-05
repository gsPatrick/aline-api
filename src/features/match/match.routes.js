import { Router } from "express";
import { live, daily, show, h2h, getMatchAnalysis } from "./match.controller.js";

const r = Router();

r.get("/live", live);
r.get("/daily", daily);
r.get("/:id", show);
r.get("/:id/h2h", h2h);
r.get("/:id/analysis", getMatchAnalysis);

export default r;