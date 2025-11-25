import { Router } from "express";
import { live, daily, show,h2h } from "./match.controller.js";

const r = Router();

r.get("/live", live);   // Jogos Ao Vivo
r.get("/daily", daily); // Jogos do Dia (Novo)
r.get("/:id", show);    // Detalhes (IMPORTANTE: Deve ficar por último)
r.get("/:id/h2h", h2h); // Nova rota

export default r;