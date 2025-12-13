import { Router } from 'express';
import * as teamController from './team.controller.js';

const router = Router();

// Team info endpoints
router.get('/:id', teamController.getTeam);
router.get('/:id/info', teamController.getTeamInfo);
router.get('/:id/schedule', teamController.getTeamSchedule);
router.get('/:id/squad', teamController.getTeamSquad);
router.get('/:id/stats', teamController.getTeamStats);
router.get('/:id/player-stats', teamController.getTeamPlayerStats);

export default router;
