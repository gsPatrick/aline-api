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
    },
    { tableName: "matches", timestamps: true }
  );