export const defineMatchModel = (sequelize, DataTypes) =>
  sequelize.define(
    "Match",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      externalId: { type: DataTypes.INTEGER, unique: true, allowNull: false }, // ID da Sportmonks
      leagueId: { type: DataTypes.INTEGER, allowNull: false }, // Referência à nossa tabela League (externalId)
      date: { type: DataTypes.DATE },
      status: { type: DataTypes.STRING }, // NS, FT, LIVE, HT
      homeTeamName: { type: DataTypes.STRING },
      awayTeamName: { type: DataTypes.STRING },
      homeScore: { type: DataTypes.INTEGER, defaultValue: 0 },
      awayScore: { type: DataTypes.INTEGER, defaultValue: 0 },
      // O segredo: guardamos todo o objeto complexo aqui
      data: { type: DataTypes.JSONB },
      // Cache-related fields
      cached_at: { type: DataTypes.DATE, allowNull: true, comment: "When this match was cached" },
      cache_source: { type: DataTypes.STRING, allowNull: true, comment: "Source: 'precache', 'on-demand', 'refresh'" },
      team_ids: { type: DataTypes.JSON, allowNull: true, comment: "Array of team IDs for faster queries" },
      fixture_date: { type: DataTypes.DATE, allowNull: true, comment: "Parsed date for range queries" },
    },
    {
      tableName: "matches",
      timestamps: true,
      indexes: [
        { fields: ['externalId'] },
        { fields: ['leagueId'] },
        { fields: ['fixture_date'] },
        { fields: ['cached_at'] },
        { fields: ['status'] },
        // Composite indexes for common cache queries
        { fields: ['leagueId', 'fixture_date'] },
        { fields: ['status', 'cached_at'] },
      ]
    }
  );