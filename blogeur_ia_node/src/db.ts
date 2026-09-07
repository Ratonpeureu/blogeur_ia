import { Sequelize } from "sequelize";
import { settings } from "./config";

export const sequelize = new Sequelize(settings.databaseUrl, {
  logging: false,
});

export async function initDb(): Promise<void> {
  // Démarrage rapide : crée/synchronise les tables. Pour la production,
  // préférez des migrations versionnées (sequelize-cli / umzug).
  await sequelize.authenticate();
  const { BlogArticle } = await import("./models/BlogArticle");
  await BlogArticle.sync();
}