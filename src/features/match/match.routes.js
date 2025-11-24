
import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { live, show, lineups } from "./match.controller.js"; // Importe o novo controller

const r = Router();

r.get("/live", live); // Lista de jogos (Publico ou Autenticado simples)
r.get("/:id", auth, requiresPremium, show); // Detalhes (Premium)
r.get("/:id/lineups", auth, requiresPremium, lineups); // Rota protegida


// Rota para listar jogos ao vivo: GET /api/matches/live


// Rota para detalhes da partida: GET /api/matches/12345
r.get("/:id", show);

export default r;