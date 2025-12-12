export const defineCacheMetadataModel = (sequelize, DataTypes) => {
    const CacheMetadata = sequelize.define(
        "CacheMetadata",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            resource_type: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "Type: 'league', 'team', 'match', 'team_history'",
            },
            resource_id: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "External ID of the resource",
            },
            league_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: "League grouping for easier queries",
            },
            last_updated: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
            data_hash: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "MD5 hash to detect data changes",
            },
            match_count: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                comment: "For team_history: number of matches cached",
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: "When this cache should be refreshed",
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: "pending",
                comment: "Status: 'fresh', 'stale', 'warming', 'error', 'pending'",
            },
            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "Error details if status is 'error'",
            },
            retry_count: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                comment: "Number of retry attempts for failed resources",
            },
        },
        {
            tableName: "cache_metadata",
            timestamps: true,
            indexes: [
                { fields: ["resource_type"] },
                { fields: ["resource_id"] },
                { fields: ["league_id"] },
                { fields: ["status"] },
                { fields: ["expires_at"] },
                // Composite index for common queries
                { fields: ["resource_type", "league_id"] },
                { fields: ["resource_type", "status"] },
            ],
        }
    );

    return CacheMetadata;
};
