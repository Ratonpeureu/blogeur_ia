import { settings } from "./config";

export const CATEGORIES_BLOG = settings.categories;
export const CATEGORIES_BLOG_IDS = new Set(CATEGORIES_BLOG.map((c) => c.id));
export const CATEGORIE_PRODUIT_ID = settings.categorieProduitId;
export const CATEGORIE_DEFAUT = settings.categorieDefaut;