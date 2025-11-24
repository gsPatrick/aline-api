import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js"; // Opcional, se quiser proteger
import { schedule } from "./team.controller.js";

const r = Router();

// Rota: /api/teams/:id/schedule
r.get("/:id/schedule", schedule);

export default r;