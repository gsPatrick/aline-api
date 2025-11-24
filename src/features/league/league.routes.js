
import { Router } from "express";
import { index, show } from "./league.controller.js";

const r = Router();

// Rota para listar todas as ligas (Sidebar)
// URL: /api/leagues
r.get("/", index);

// Rota para buscar jogos de uma liga específica por data (Calendário)
// IMPORTANTE: Esta rota deve vir ANTES da rota /:id para não confundir "date" com um ID
// URL: /api/leagues/:id/matches?date=2025-11-24


// Rota para carregar os dados da página da liga (Info + Tabela + Próximos Jogos Gerais)
// URL: /api/leagues/8
r.get("/:id", show);

export default r;