import fs from "fs";
import ini from "ini";
import dotenv from "dotenv";

dotenv.config();

function splitCsv(value: string): string[] {
  return (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseIdsLabels(value: string): { id: string; label: string }[] {
  return splitCsv(value)
    .map((pair) => {
      const [id, label] = pair.split(":");
      return id && label ? { id: id.trim(), label: label.trim() } : null;
    })
    .filter((x): x is { id: string; label: string } => x !== null);
}

export interface Settings {
  databaseUrl: string;
  redisUrl: string;
  serperApiKey: string;
  llmApiKey: string;

  brandName: string;
  baseUrl: string;
  authorDefault: string;
  personaName: string;
  personaBio: string;

  secteur: string;
  minWords: number;
  maxWords: number;
  temperatureRedaction: number;
  temperatureReecriture: number;
  interdits: string[];

  promoGuardEnabled: boolean;
  brandTriggerKeywords: string[];
  mentionsInterdites: string[];

  categories: { id: string; label: string }[];
  categorieProduitId: string;
  categorieDefaut: string;

  motsClesPool: string[];

  ficheTechniquePath: string;

  storageDir: string;
  storageBaseUrl: string;
  storageMaxSizeMb: number;

  serperGl: string;
  serperHl: string;

  llmProvider: string;
  llmModel: string;

  queueName: string;
}

function loadSettings(): Settings {
  const confPath = process.env.BLOGUEUR_IA_CONF || "blogueur_ia.conf";
  if (!fs.existsSync(confPath)) {
    throw new Error(
      `Fichier de configuration introuvable : ${confPath}. Copiez blogueur_ia.conf.example vers blogueur_ia.conf et adaptez-le.`
    );
  }
  const conf = ini.parse(fs.readFileSync(confPath, "utf-8"));
  const g = (section: string, key: string, def = ""): string =>
    conf[section]?.[key] ?? def;

  return {
    databaseUrl: process.env.DATABASE_URL || "",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    serperApiKey: process.env.SERPER_API_KEY || "",
    llmApiKey: process.env.LLM_API_KEY || "",

    brandName: g("brand", "name", "Mon Entreprise"),
    baseUrl: g("brand", "base_url", "https://exemple.com").replace(/\/$/, ""),
    authorDefault: g("brand", "author_default", "Équipe Éditoriale"),
    personaName: g("brand", "persona_name", "Auteur"),
    personaBio: g("brand", "persona_bio", "professionnel du secteur"),

    secteur: g("style", "secteur", "votre secteur d'activité"),
    minWords: parseInt(g("style", "min_words", "900"), 10),
    maxWords: parseInt(g("style", "max_words", "1600"), 10),
    temperatureRedaction: parseFloat(g("style", "temperature_redaction", "0.9")),
    temperatureReecriture: parseFloat(g("style", "temperature_reecriture", "0.7")),
    interdits: splitCsv(g("style", "interdits", "")),

    promoGuardEnabled: g("promo_guard", "enabled", "true").toLowerCase() === "true",
    brandTriggerKeywords: splitCsv(g("promo_guard", "brand_trigger_keywords", "")),
    mentionsInterdites: splitCsv(g("promo_guard", "mentions_interdites", "")),

    categories: parseIdsLabels(g("categories", "ids_labels", "guide:Guide")),
    categorieProduitId: g("categories", "categorie_produit_id", "produit"),
    categorieDefaut: g("categories", "categorie_defaut", "guide"),

    motsClesPool: splitCsv(g("mots_cles_seo", "pool", "")),

    ficheTechniquePath: g("fiche_technique", "path", ""),

    storageDir: g("storage", "dir", "./uploads/blog"),
    storageBaseUrl: g("storage", "base_url", "https://exemple.com/uploads/blog").replace(/\/$/, ""),
    storageMaxSizeMb: parseInt(g("storage", "max_size_mb", "6"), 10),

    serperGl: g("serper", "gl", "sn"),
    serperHl: g("serper", "hl", "fr"),

    llmProvider: g("llm", "provider", "anthropic"),
    llmModel: g("llm", "model", "claude-sonnet-4-5"),

    queueName: g("queue", "name", "blogueur-ia-articles"),
  };
}

export const settings = loadSettings();