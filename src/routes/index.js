
import { Router } from "express";
import userRoutes from "./user.routes.js";
import planRoutes from "./plan.routes.js";
import subRoutes from "./subscription.routes.js";
import adminRoutes from "./admin.routes.js";
import leagueRoutes from "./league.routes.js";
import matchRoutes from "./match.routes.js";
import playerRoutes from "./player.routes.js";

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