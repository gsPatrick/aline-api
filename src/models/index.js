import { DataTypes } from "sequelize";
import { sequelize } from "../services/db.js";
import { defineUserModel, hashPassword, comparePassword } from "./user.js";
import { defineSubscriptionModel } from "./subscription.js";
import { definePlanModel } from "./plan.js";
import { defineNotificationModel } from "./notification.js";
import { defineLeagueModel } from "./league.js"; // Novo
import { defineMatchModel } from "./match.js";   // Novo
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

const League = defineLeagueModel(sequelize, DataTypes);
const Match = defineMatchModel(sequelize, DataTypes);

export {
  sequelize,
  User,
  Subscription,
  Plan,
  Notification,
    League,
  Match,
  hashPassword,
  comparePassword,
};
