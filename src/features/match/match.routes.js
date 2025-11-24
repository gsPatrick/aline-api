import { Router } from "express";
import { live, daily, show } from "./match.controller.js";

const r = Router();

r.get("/live", live);   // Jogos Ao Vivo
r.get("/daily", daily); // Jogos do Dia (Novo)
r.get("/:id", show);    // Detalhes (IMPORTANTE: Deve ficar por último)

export default r;