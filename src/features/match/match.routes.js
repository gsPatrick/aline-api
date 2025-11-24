
import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { live, show } from "./match.controller.js";

const r = Router();

r.get("/live", live); // Lista de jogos (Publico ou Autenticado simples)
r.get("/:id", auth, requiresPremium, show); // Detalhes (Premium)

export default r;