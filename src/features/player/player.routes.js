import { Router } from "express";
import { auth, requiresPremium } from "../../middleware/auth.middleware.js";
import { show } from "./player.controller.js";

const r = Router();
r.get("/:id", auth, requiresPremium, show);
export default r;