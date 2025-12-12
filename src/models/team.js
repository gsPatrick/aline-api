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
        // Cache tracking fields
        history_cached_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "When team history (90 matches) was last cached",
        },
        history_match_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: "Number of matches in cache for this team",
        },
        league_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "Primary league for this team (most recent)",
        },
    });

    return Team;
};
