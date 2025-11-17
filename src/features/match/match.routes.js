import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { live, stats } from "./match.controller.js";

const r = Router();
r.get("/live", live);
r.get("/:id/stats", auth, requiresPremium, stats);
export default r;

