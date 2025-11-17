import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { register, login, forgot, reset, me, updateProfile } from "./user.controller.js";

const r = Router();
r.post("/register", register);
r.post("/login", login);
r.post("/forgot-password", forgot);
r.post("/reset-password", reset);
r.get("/me", auth, me);
r.put("/me", auth, updateProfile);
export default r;

