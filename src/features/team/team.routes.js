import { Router } from 'express';
import * as teamController from './team.controller.js';

const router = Router();

router.get('/:id', teamController.getTeam);

export default router;
