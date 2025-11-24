import { Router } from "express";
import userRoutes from "../features/user/user.routes.js";
import subscriptionRoutes from "../features/subscription/subscription.routes.js";
import matchRoutes from "../features/match/match.routes.js";
import adminRoutes from "../features/admin/admin.routes.js";
import planRoutes from "../features/plan/plan.routes.js";
import leagueRoutes from "../features/league/league.routes.js";

const router = Router();

router.use("/auth", userRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/matches", matchRoutes);
router.use("/admin", adminRoutes);
router.use("/plans", planRoutes);
router.use("/leagues", leagueRoutes);


router.get("/health", (req, res) => res.json({ ok: true }));

export default router;

