import jwt from "jsonwebtoken";
import { Subscription } from "../models/index.js";
import { redis } from "../services/redis.js";
import { Op } from "sequelize";

export const auth = (req, res, next) => {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token ausente" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};

export const isAdmin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ error: "Acesso negado" });

export const requiresPremium = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    const cacheKey = `premium:${req.user.id}`;
    let cached = null;

    try {
      cached = await redis.get(cacheKey);
    } catch (_redisErr) {
      console.warn("Redis indisponível, consultando banco diretamente");
    }

    if (cached === "true") {
      return next();
    }
    if (cached === "false") {
      return res.status(402).json({ error: "Plano ativo necessário" });
    }

    const now = new Date();
    const hasActive = await Subscription.findOne({
      where: {
        userId: req.user.id,
        status: "active",
        endDate: { [Op.gte]: now },
      },
    });

    const isPremium = !!hasActive;

    try {
      await redis.setex(cacheKey, 300, isPremium ? "true" : "false");
    } catch (_redisErr) {
      console.warn("Redis indisponível para cache");
    }

    if (isPremium) return next();
    return res.status(402).json({ error: "Plano ativo necessário" });
  } catch (_e) {
    return res.status(500).json({ error: "Falha ao verificar plano" });
  }
};
