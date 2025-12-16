import { Router } from "express";
import * as goldStatsController from "./goldstats.controller.js";

const router = Router();

// /api/goldstats/home
router.get("/home", goldStatsController.getHomeData);

// /api/goldstats/match/:id
router.get("/match/:id", goldStatsController.getMatchHeader);
router.get("/match/:id/next-matches", goldStatsController.getNextMatches);
router.get("/match/:id/last-matches", goldStatsController.getLastMatches);
router.get("/match/:id/analysis", goldStatsController.getAIAnalysis);

export default router;
