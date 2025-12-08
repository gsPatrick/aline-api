import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const isTest = process.env.NODE_ENV === 'test' || !process.env.DB_HOST;

export const sequelize = isTest
  ? new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  })
  : new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      logging: false,
    }
  );

