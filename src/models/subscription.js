export const defineSubscriptionModel = (sequelize, DataTypes) =>
  sequelize.define(
    "Subscription",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      planId: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "active", "canceled", "expired"),
        defaultValue: "pending",
      },
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      paymentId: DataTypes.STRING,
    },
    { tableName: "subscriptions" }
  );


