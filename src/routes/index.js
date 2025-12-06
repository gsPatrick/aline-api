import { Router } from "express";

// Importação das rotas de cada feature
import userRoutes from "../features/user/user.routes.js";
import planRoutes from "../features/plan/plan.routes.js";
import subRoutes from "../features/subscription/subscription.routes.js";
import adminRoutes from "../features/admin/admin.routes.js";
import leagueRoutes from "../features/league/league.routes.js";
import matchRoutes from "../features/match/match.routes.js";
import playerRoutes from "../features/player/player.routes.js";
import teamRoutes from "../features/team/team.routes.js";
import sportmonksRoutes from "../features/sportmonks/sportmonks.routes.js";

const router = Router();

// --- Rotas do Sistema (Auth, Pagamentos, Admin) ---

// Autenticação e Perfil de Usuário
router.use("/auth", userRoutes);

// Planos e Assinaturas (MercadoPago)
router.use("/plans", planRoutes);
router.use("/subscription", subRoutes);

// Painel Administrativo
router.use("/admin", adminRoutes);


// --- Rotas de Dados Esportivos (Sportmonks Integration) ---

// Ligas: Listagem, Detalhes e Tabelas de Classificação
router.use("/leagues", leagueRoutes);

// Partidas: Livescore, Detalhes (Stats, H2H, Odds) e Escalações
router.use("/matches", matchRoutes);

// Jogadores: Estatísticas individuais
router.use("/players", playerRoutes);

// Times: Calendário, Resultados, Elenco e Informações
router.use("/teams", teamRoutes);

// Novas Rotas de Análise (Gols, Cantos, Cartões)
router.use("/", sportmonksRoutes);

export default router;