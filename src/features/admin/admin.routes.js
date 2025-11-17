import { Router } from "express";
import { auth, isAdmin } from "../../middleware/auth.middleware.js";
import {
  listUsers,
  updateUser,
  listSubscriptions,
  listNotifications,
} from "./admin.controller.js";
import { notifyUser } from "../../services/notification.service.js";

const r = Router();
r.use(auth, isAdmin);

r.get("/users", listUsers);
r.put("/users/:id", updateUser);
r.get("/subscriptions", listSubscriptions);
r.get("/notifications", listNotifications);

r.post("/alerts", async (req, res, next) => {
  try {
    const { userId, message, via = ["websocket"] } = req.body;
    const result = await notifyUser({ userId, message, via });
    res.json({ ok: true, result });
  } catch (e) {
    next(e);
  }
});

export default r;

