import { Router } from "express";

// Importação das rotas de cada feature
import userRoutes from "../features/user/user.routes.js";
import planRoutes from "../features/plan/plan.routes.js";
import subRoutes from "../features/subscription/subscription.routes.js";
import adminRoutes from "../features/admin/admin.routes.js";
import matchRoutes from "../features/match/match.routes.js";
import teamRoutes from "../features/team/team.routes.js";
import fixtureRoutes from "../features/fixture/fixture.routes.js";
import leagueRoutes from "../features/league/league.routes.js";
import searchRoutes from "../features/search/search.routes.js";

const router = Router();

// --- Rotas do Sistema (Auth, Pagamentos, Admin) ---

// Autenticação e Perfil de Usuário
router.use("/auth", userRoutes);

// Planos e Assinaturas (MercadoPago)
router.use("/plans", planRoutes);
router.use("/subscription", subRoutes);

// Painel Administrativo
router.use("/admin", adminRoutes);

// Match Stats (Heavy Fetch - Detailed Analysis)
router.use("/matches", matchRoutes);

// Team Stats
router.use("/teams", teamRoutes);

// Fixtures (Light Fetch - Dashboard Listing)
router.use("/fixtures", fixtureRoutes);

// Leagues (All 113 leagues)
router.use("/leagues", leagueRoutes);

// Search (Teams, Leagues, Players)
router.use("/search", searchRoutes);

// GoldStats (New Feature)
import goldStatsRoutes from "../features/goldstats/goldstats.routes.js";
router.use("/goldstats", goldStatsRoutes);

// AI Chat
import chatRoutes from "../features/chat/chat.routes.js";
router.use("/chat", chatRoutes);

export default router;