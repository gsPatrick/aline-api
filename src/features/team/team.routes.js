import { Router } from "express";
import { schedule, squad } from "./team.controller.js";

const r = Router();

r.get("/:id/schedule", schedule); // Jogos
r.get("/:id/squad", squad);       // Elenco (NOVO)

export default r;