/**
 * PlayerStatsCache Model - SQLite
 * Caches player statistics per team to avoid repeated API calls
 */

export const definePlayerStatsCacheModel = (sequelize, DataTypes) => {
  const PlayerStatsCache = sequelize.define(
    "PlayerStatsCache",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // Cache key: teamId + statKey
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stat_key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'shots',
      },
      // Cached data as JSON
      data: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const raw = this.getDataValue('data');
          return raw ? JSON.parse(raw) : null;
        },
        set(value) {
          this.setDataValue('data', JSON.stringify(value));
        }
      },
      // TTL tracking
      cached_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "player_stats_cache",
      indexes: [
        {
          unique: true,
          fields: ["team_id", "stat_key"],
        },
        {
          fields: ["expires_at"],
        },
      ],
    }
  );

  return PlayerStatsCache;
};
