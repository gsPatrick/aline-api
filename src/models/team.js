export const defineTeamModel = (sequelize, DataTypes) => {
    const Team = sequelize.define("Team", {
        externalId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        statsData: {
            type: DataTypes.JSONB, // Use JSONB for Postgres, JSON for others if needed
            allowNull: true,
        },
        statsLastUpdated: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    });

    return Team;
};
