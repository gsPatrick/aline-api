import { Router } from "express";
import { getMatchStatsController } from "./match.controller.js";

const router = Router();

// GET /api/matches/:id/stats - Legacy endpoint
router.get("/:id/stats", getMatchStatsController);

// GET /api/matches/:id/analysis - Main endpoint for match analysis
router.get("/:id/analysis", getMatchStatsController);

export default router;
