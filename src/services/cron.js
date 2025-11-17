import { Subscription } from "../models/index.js";
import { redis } from "./redis.js";
import { Op } from "sequelize";

export const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    const expired = await Subscription.findAll({
      where: {
        status: "active",
        endDate: {
          [Op.lt]: now,
          [Op.ne]: null,
        },
      },
    });

    if (expired.length === 0) {
      return { updated: 0 };
    }

    const userIds = expired.map((sub) => sub.userId);

    await Subscription.update(
      { status: "expired" },
      {
        where: {
          id: { [Op.in]: expired.map((s) => s.id) },
        },
      }
    );

    for (const userId of userIds) {
      try {
        await redis.del(`premium:${userId}`);
      } catch (_redisErr) {
        console.warn(
          `Redis indisponível para limpar cache do usuário ${userId}`
        );
      }
    }

    return { updated: expired.length };
  } catch (err) {
    console.error("Erro ao verificar assinaturas expiradas:", err);
    return { updated: 0, error: err.message };
  }
};

const getNextMidnight = () => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  return msUntilMidnight;
};

const scheduleDailyCheck = () => {
  const runCheck = async () => {
    const result = await checkExpiredSubscriptions();
    if (result.updated > 0) {
      console.log(
        `Cron: ${result.updated} assinatura(s) marcada(s) como expirada(s)`
      );
    }
  };

  const scheduleNext = () => {
    const msUntilMidnight = getNextMidnight();
    setTimeout(() => {
      runCheck();
      setInterval(runCheck, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  };

  scheduleNext();
  console.log(
    "Cron iniciado: verificação de assinaturas 1 vez por dia (meia-noite)"
  );

  checkExpiredSubscriptions();
};

export const startCron = scheduleDailyCheck;
