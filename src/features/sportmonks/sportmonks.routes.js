import { Router } from 'express';
import goalsAnalysis from './GoalsAnalysisService/GoalsAnalysisService.js.js';
import cornersAnalysis from './MatchCornersAnalysis/MatchCornersAnalysis.js';
import cardsAnalysis from './MatchCardsAnalysis/MatchCardsAnalysis.js';

const router = Router();

// Helper para registrar rotas baseadas no objeto exportado { path, method, handler }
const register = (routeObj) => {
    if (routeObj.method === 'GET') {
        router.get(routeObj.path, routeObj.handler);
    } else if (routeObj.method === 'POST') {
        router.post(routeObj.path, routeObj.handler);
    }
};

register(goalsAnalysis);
register(cornersAnalysis);
register(cardsAnalysis);

export default router;
