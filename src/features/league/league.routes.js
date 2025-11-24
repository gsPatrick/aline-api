import { Router } from "express";
import { index, show } from "./league.controller.js";

const r = Router();
r.get("/", index);
r.get("/:id", show); // Nova rota para detalhes
export default r;