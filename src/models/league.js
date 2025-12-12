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
      // Cache status fields
      teams_cached_at: { type: DataTypes.DATE, allowNull: true, comment: "When teams were last synced" },
      team_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "Number of teams in this league" },
      cache_priority: { type: DataTypes.INTEGER, defaultValue: 1, comment: "Cache priority (higher = more important)" },
      cache_status: { type: DataTypes.STRING, defaultValue: 'pending', comment: "Status: 'pending', 'caching', 'cached', 'error'" },
    },
    { tableName: "leagues", timestamps: true }
  );