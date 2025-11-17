import { Router } from "express";
import { create, index, update, remove } from "./plan.controller.js";
import { auth, isAdmin } from "../../middleware/auth.middleware.js";

const r = Router();
r.get("/", auth, index);
r.post("/", auth, isAdmin, create);
r.put("/:id", auth, isAdmin, update);
r.delete("/:id", auth, isAdmin, remove);
export default r;
