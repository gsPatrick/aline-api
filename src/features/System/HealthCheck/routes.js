import { Router } from "express";
import { healthCheckController } from "./controller.js";

const router = Router();

router.get("/", healthCheckController);

export default router;
