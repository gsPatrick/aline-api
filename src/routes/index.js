
import { Router } from "express";
import userRoutes from "../features/user/user.routes.js";
import planRoutes from "../features/plan/plan.routes.js";
import subRoutes from "../features/subscription/subscription.routes.js";
import adminRoutes from "../features/admin/admin.routes.js";
import leagueRoutes from "../features/league/league.routes.js";
import matchRoutes from "../features/match/match.routes.js";
import playerRoutes from "../features/player/player.routes.js";

const router = Router();

// Rotas de Autenticação e Perfil
router.use("/auth", userRoutes);

// Rotas de Planos e Assinaturas
router.use("/plans", planRoutes);
router.use("/subscription", subRoutes);

// Rotas Administrativas
router.use("/admin", adminRoutes);

// --- Rotas de Futebol (Sportmonks Integration) ---
router.use("/leagues", leagueRoutes); // Listagem e Tabela
router.use("/matches", matchRoutes);  // Livescore e Detalhes
router.use("/players", playerRoutes); // Estatísticas de Jogador

export default router;