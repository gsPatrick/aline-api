import { Router } from "express";

// Importação das rotas de cada feature
import userRoutes from "../features/user/user.routes.js";
import planRoutes from "../features/plan/plan.routes.js";
import subRoutes from "../features/subscription/subscription.routes.js";
import adminRoutes from "../features/admin/admin.routes.js";
import matchRoutes from "../features/match/match.routes.js";
import teamRoutes from "../features/team/team.routes.js";
import fixtureRoutes from "../features/fixture/fixture.routes.js";

const router = Router();

// --- Rotas do Sistema (Auth, Pagamentos, Admin) ---

// Autenticação e Perfil de Usuário
router.use("/auth", userRoutes);

// Planos e Assinaturas (MercadoPago)
router.use("/plans", planRoutes);
router.use("/subscription", subRoutes);

// Painel Administrativo
router.use("/admin", adminRoutes);

// Match Stats
router.use("/matches", matchRoutes);

// Team Stats
router.use("/teams", teamRoutes);

// Fixtures (Light Fetch - Dashboard Listing)
router.use("/fixtures", fixtureRoutes);

export default router;