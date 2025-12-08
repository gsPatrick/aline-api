// Fixture Routes

import { Router } from 'express';
import { getByDate, getLive, getToday, getWeek } from './fixture.controller.js';

const router = Router();

// GET /api/fixtures/live - Live fixtures
router.get('/live', getLive);

// GET /api/fixtures/today - Today's fixtures
router.get('/today', getToday);

// GET /api/fixtures/week - Next 7 days
router.get('/week', getWeek);

// GET /api/fixtures/date/:date - Fixtures by specific date
router.get('/date/:date', getByDate);

export default router;
