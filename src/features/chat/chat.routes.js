import { Router } from 'express';
import { chatWithMatch } from './chat.controller.js';

const router = Router();

// POST /chat/match/:id - Chat with AI about a match
router.post('/match/:id', chatWithMatch);

export default router;
