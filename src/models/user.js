import bcrypt from "bcrypt";

export const defineUserModel = (sequelize, DataTypes) =>
  sequelize.define(
    "User",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, unique: true, allowNull: false },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      role: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: "users" }
  );

export const hashPassword = async (pwd) => bcrypt.hash(pwd, 10);
export const comparePassword = async (pwd, hash) => bcrypt.compare(pwd, hash);
