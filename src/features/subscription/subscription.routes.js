import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { subscribe, webhook, me } from "./subscription.controller.js";

const r = Router();
r.post("/subscribe", auth, subscribe);
r.get("/me", auth, me);
r.post("/webhook", webhook);
export default r;

