import { Router } from "express";
import { getMatchStatsController } from "./match.controller.js";

const router = Router();

router.get("/:id/stats", getMatchStatsController);

export default router;
