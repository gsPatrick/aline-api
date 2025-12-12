import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./services/socket.js";
import { sequelize } from "./models/index.js";
import { startCron } from "./services/cron.js";
import { initializeCache, getCacheStatus } from "./services/cache.service.js";

const port = process.env.PORT;
const httpServer = createServer(app);
initSocket(httpServer);

const start = async () => {
  try {
    // 1. Database sync
    await sequelize.sync();
    console.log("✅ Database synced");

    // 2. Cache initialization (BEFORE starting HTTP server)
    console.log("🔄 Initializing cache system...");
    const cacheResult = await initializeCache();

    if (cacheResult.success) {
      console.log(`✅ Cache ready: ${cacheResult.message}`);
      console.log(`   📊 Statistics:`);
      console.log(`      - Leagues: ${cacheResult.stats.leagues || 0}`);
      console.log(`      - Teams: ${cacheResult.stats.teams || 0}`);
      console.log(`      - Matches: ${cacheResult.stats.matches || 0}`);
    } else {
      console.warn(`⚠️  ${cacheResult.message}`);
      console.warn(`   Server will start without pre-cached data`);
    }

    // 3. Start HTTP server
    httpServer.listen(port, () => {
      console.log(`🚀 API running at http://localhost:${port}`);
    });

    // 4. Start cron jobs (including cache refresh)
    startCron();
  } catch (err) {
    console.error("❌ Server startup failed", err);
    process.exit(1);
  }
};

start();
