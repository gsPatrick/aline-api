import { DataTypes } from "sequelize";
import { sequelize, sequelizeCache } from "../services/db.js";
import { defineUserModel, hashPassword, comparePassword } from "./user.js";
import { defineSubscriptionModel } from "./subscription.js";
import { definePlanModel } from "./plan.js";
import { defineNotificationModel } from "./notification.js";
import { defineLeagueModel } from "./league.js"; // Novo
import { defineMatchModel } from "./match.js";   // Novo
import { defineTeamModel } from "./team.js";   // Novo
import { defineCacheMetadataModel } from "./cache_metadata.js"; // Cache system

// PostgreSQL Models - Critical data
const User = defineUserModel(sequelize, DataTypes);
const Subscription = defineSubscriptionModel(sequelize, DataTypes);
const Plan = definePlanModel(sequelize, DataTypes);
const Notification = defineNotificationModel(sequelize, DataTypes);

Subscription.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Subscription, { foreignKey: "userId" });

Notification.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Notification, { foreignKey: "userId" });

Subscription.belongsTo(Plan, { foreignKey: "planId" });
Plan.hasMany(Subscription, { foreignKey: "planId" });

// SQLite Models - Cache data (persists across restarts!)
const League = defineLeagueModel(sequelizeCache, DataTypes);
const Match = defineMatchModel(sequelizeCache, DataTypes);
const Team = defineTeamModel(sequelizeCache, DataTypes);
const CacheMetadata = defineCacheMetadataModel(sequelizeCache, DataTypes);

export {
  sequelize,
  sequelizeCache,
  User,
  Subscription,
  Plan,
  Notification,
  League,
  Match,
  Team,
  CacheMetadata,
  hashPassword,
  comparePassword,
};
