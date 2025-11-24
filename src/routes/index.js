
import { Router } from "express";
import userRoutes from "../features/user/user.routes.js";
import planRoutes from "../featuresplan.routes.js";
import subRoutes from "../featuressubscription.routes.js";
import adminRoutes from "../featuresadmin.routes.js";
import leagueRoutes from "../featuresleague.routes.js";
import matchRoutes from "../featuresmatch.routes.js";
import playerRoutes from "../featuresplayer.routes.js";

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