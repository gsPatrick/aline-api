// Search Routes
import { Router } from 'express';
import * as searchController from './search.controller.js';

const router = Router();

// GET /api/search?q={query}&type={all|teams|leagues|players}
router.get('/', searchController.search);

export default router;
