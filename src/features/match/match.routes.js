
import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { live, show, lineups } from "./match.controller.js"; // Importe o novo controller

const r = Router();

r.get("/live", live); // Lista de jogos (Publico ou Autenticado simples)
r.get("/:id", auth, requiresPremium, show); // Detalhes (Premium)
r.get("/:id/lineups", auth, requiresPremium, lineups); // Rota protegida

export default r;