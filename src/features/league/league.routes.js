import { Router } from "express";
import { index } from "./league.controller.js";
const r = Router();
r.get("/", index);
export default r;