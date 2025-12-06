import { Router } from "express";

// --- IMPORTAÇÃO DOS CONTROLLERS DE ANÁLISE (NOVOS) ---
// Ajuste os caminhos relativos (./) conforme onde você salvou os arquivos
import MatchGoalsAnalysis from "../features/sportmonks/MatchGoalsAnalysis/MatchGoalsAnalysis.js";
import MatchCornersAnalysis from "../features/sportmonks/MatchCornersAnalysis/MatchCornersAnalysis.js";
import MatchCardsAnalysis from "../features/sportmonks/MatchCardsAnalysis/MatchCardsAnalysis.js";

// --- IMPORTAÇÃO DOS CONTROLLERS GERAIS (ANTIGOS) ---
import MatchAnalysis from "../features/sportmonks/matchAnalysis.js";
import TeamCompetitions from "../features/sportmonks/teamCompetitions/TeamCompetitions.js";
import TeamFixtures from "../features/sportmonks/teamFixtures/TeamFixtures.js";

const router = Router();

// ==================================================================
// 1. ROTAS DE ANÁLISE DETALHADA (Estilo CornerPro)
// ==================================================================

// Gols: Médias, Intervalos, 1º a Marcar e Tabela de Previsões
// Rota: /sportmonks/match/:fixtureId/goals-analysis
router.get(MatchGoalsAnalysis.path, MatchGoalsAnalysis.handler);

// Cantos: Race to X, Intervalos, Handicaps e Previsões
// Rota: /sportmonks/match/:fixtureId/corners-analysis
router.get(MatchCornersAnalysis.path, MatchCornersAnalysis.handler);

// Cartões: Árbitro, Médias por Tempo, Overs e Previsões
// Rota: /sportmonks/match/:fixtureId/cards-analysis
router.get(MatchCardsAnalysis.path, MatchCardsAnalysis.handler);


// ==================================================================
// 2. ROTAS GERAIS DE PARTIDA
// ==================================================================

// Análise Geral: H2H, Classificação, Lineups e Lesões
// Rota: /sportmonks/match/:fixtureId/analysis
router.get(MatchAnalysis.path, MatchAnalysis.handler);


// ==================================================================
// 3. ROTAS DE TIMES
// ==================================================================

// Competições: Histórico de Ligas e Forma (W-D-L)
// Rota: /sportmonks/team/:teamId/competitions
router.get(TeamCompetitions.path, TeamCompetitions.handler);

// Calendário: Jogos Passados e Futuros (Schedule)
// Nota: O TeamFixtures original retornava um array de rotas, tratamos isso aqui:
if (Array.isArray(TeamFixtures)) {
    TeamFixtures.forEach(route => {
        if (route.method === 'GET') {
            router.get(route.path, route.handler);
        }
    });
} else {
    // Caso tenha refatorado para objeto único
    router.get(TeamFixtures.path, TeamFixtures.handler);
}

export default router;