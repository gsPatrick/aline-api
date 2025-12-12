import { Subscription } from "../models/index.js";
import { redis } from "./redis.js";
import { Op } from "sequelize";
import { performIncrementalUpdate, updateLiveMatches } from "./cache.service.js";
import { Match } from "../models/index.js";

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

// Cache refresh cron jobs
const startCacheRefreshJobs = () => {
  // Every 5 minutes: Update live matches
  setInterval(async () => {
    try {
      console.log('🔄 [Cron] Updating live matches cache...');
      await updateLiveMatches();
    } catch (error) {
      console.error('[Cron] Error updating live matches:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Every hour: Incremental cache update
  setInterval(async () => {
    try {
      console.log('🔄 [Cron] Performing incremental cache update...');
      await performIncrementalUpdate();
    } catch (error) {
      console.error('[Cron] Error in incremental update:', error.message);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Every day at 3 AM: Cleanup old cached matches
  const scheduleCleanup = () => {
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(3, 0, 0, 0);

    // If 3 AM already passed today, schedule for tomorrow
    if (now > next3AM) {
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const msUntil3AM = next3AM.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        console.log('🔄 [Cron] Cleaning up old cached matches...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 60); // Keep last 60 days

        const deleted = await Match.destroy({
          where: {
            fixture_date: { [Op.lt]: cutoffDate },
            status: 'FT'
          }
        });

        console.log(`✅ [Cron] Deleted ${deleted} old matches`);
      } catch (error) {
        console.error('[Cron] Error cleaning up old matches:', error.message);
      }

      // Schedule next cleanup (24 hours later)
      setInterval(async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 60);
        const deleted = await Match.destroy({
          where: {
            fixture_date: { [Op.lt]: cutoffDate },
            status: 'FT'
          }
        });
        console.log(`✅ [Cron] Deleted ${deleted} old matches`);
      }, 24 * 60 * 60 * 1000);
    }, msUntil3AM);
  };

  scheduleCleanup();
  console.log("Cron cache refresh jobs started");
};

export const startCron = () => {
  scheduleDailyCheck();
  startCacheRefreshJobs();
};
