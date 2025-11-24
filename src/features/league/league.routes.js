import { Router } from "express";
import { index, show, listByDate } from "./league.controller.js";

const r = Router();

r.get("/", index);
r.get("/date/:date", listByDate); // <--- Nova rota adicionada
r.get("/:id", show);

export default r;