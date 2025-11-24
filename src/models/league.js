export const defineLeagueModel = (sequelize, DataTypes) =>
  sequelize.define(
    "League",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      externalId: { type: DataTypes.INTEGER, unique: true, allowNull: false }, // ID da Sportmonks
      name: { type: DataTypes.STRING, allowNull: false },
      country: { type: DataTypes.STRING },
      logo: { type: DataTypes.STRING },
      flag: { type: DataTypes.STRING },
      currentSeasonId: { type: DataTypes.INTEGER },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: "leagues", timestamps: true }
  );