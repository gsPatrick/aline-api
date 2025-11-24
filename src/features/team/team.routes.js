import { Router } from "express";
import { schedule, squad, info } from "./team.controller.js";

const r = Router();

r.get("/:id/schedule", schedule); // Jogos
r.get("/:id/squad", squad);       // Elenco (NOVO)
r.get("/:id/info", info); // <--- Nova rota

export default r;