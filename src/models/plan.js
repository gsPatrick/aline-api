export const definePlanModel = (sequelize, DataTypes) =>
  sequelize.define(
    "Plan",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING, defaultValue: "BRL" },
      frequency: { type: DataTypes.INTEGER, defaultValue: 1 },
      frequency_type: { type: DataTypes.ENUM("days", "months", "years"), defaultValue: "months" },
      mpPlanId: { type: DataTypes.STRING, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: "plans" }
  );


