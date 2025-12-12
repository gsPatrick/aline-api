import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// PostgreSQL - Para dados críticos (users, subscriptions, plans)
export const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

// SQLite - Para cache (leagues, teams, matches, cache_metadata)
// Persiste em arquivo local - sobrevive a restarts!
export const sequelizeCache = new Sequelize({
  dialect: "sqlite",
  storage: process.env.CACHE_DB_PATH || "./data/cache.db",
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

// Apply SQLite performance optimizations after sync
sequelizeCache.addHook('afterBulkSync', async () => {
  try {
    await sequelizeCache.query('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging
    await sequelizeCache.query('PRAGMA synchronous = NORMAL;'); // Faster writes
    await sequelizeCache.query('PRAGMA cache_size = -64000;'); // 64MB cache
    await sequelizeCache.query('PRAGMA temp_store = MEMORY;'); // Temp tables in memory
    console.log("✅ SQLite optimizations applied (WAL mode, 64MB cache)");
  } catch (error) {
    console.warn("⚠️  SQLite optimizations failed:", error.message);
  }
});

console.log("📊 Database configuration:");
console.log("  - PostgreSQL (users/subscriptions):", process.env.DB_HOST);
console.log("  - SQLite (cache):", process.env.CACHE_DB_PATH || "./data/cache.db");
