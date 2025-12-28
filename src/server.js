import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./services/socket.js";
import { sequelize, sequelizeCache } from "./models/index.js";
import { startCron } from "./services/cron.js";
import { initializeCache, getCacheStatus } from "./services/cache.service.js";
import { startLiveMatchPolling } from "./services/live-updates.service.js";
import * as MatchService from "./features/match/match.service.js";

const port = process.env.PORT;
const httpServer = createServer(app);
initSocket(httpServer);

const start = async () => {
  try {
    // 1. Database sync - Both databases
    await sequelize.sync();
    console.log("✅ PostgreSQL synced (users, subscriptions)");

    await sequelizeCache.sync();
    console.log("✅ SQLite synced (cache - persistent across restarts!)");

    // 2. Start HTTP server FIRST (don't wait for cache)
    const port = process.env.PORT || 3333;
    httpServer.listen(port, () => {
      console.log(`🚀 API running at http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });

    // 3. Start cron jobs
    startCron();

    // 4. Start Live Match Polling
    startLiveMatchPolling(MatchService);

    // 4. CACHE INITIALIZATION - TEMPORARILY DISABLED TO PREVENT RATE LIMITING
    // Uncomment when ready to use cache warming again
    console.log("⏸️  Cache initialization DISABLED - avoiding rate limits");
    /*
    initializeCache()
      .then((cacheResult) => {
        if (cacheResult.success) {
          console.log(`✅ Cache ready: ${cacheResult.message}`);
          console.log(`   📊 Statistics:`);
          console.log(`      - Leagues: ${cacheResult.stats.leagues || 0}`);
          console.log(`      - Teams: ${cacheResult.stats.teams || 0}`);
          console.log(`      - Matches: ${cacheResult.stats.matches || 0}`);
        } else {
          console.warn(`⚠️  ${cacheResult.message}`);
        }
      })
      .catch((err) => {
        console.error("❌ Cache initialization error:", err.message);
        // Don't crash the server if cache fails
      });
    */

  } catch (err) {
    console.error("❌ Server startup failed", err);
    process.exit(1);
  }
};

start();
