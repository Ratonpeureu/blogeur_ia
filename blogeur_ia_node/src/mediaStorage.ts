import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { settings } from "./config";

const EXTENSIONS_AUTORISEES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function extFromUrl(url: string): string | null {
  const match = url.split("?")[0].match(/\.(jpe?g|png|webp)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

export async function telechargerEtHebergerImage(url: string): Promise<string | null> {
  if (!url) return null;
  const tailleMax = settings.storageMaxSizeMb * 1024 * 1024;
  try {
    const resp = await axios.get<ArrayBuffer>(url, {
      timeout: 12000,
      maxRedirects: 5,
      responseType: "arraybuffer",
      headers: { "User-Agent": "Mozilla/5.0 (BlogueurIA/1.0)" },
      validateStatus: () => true,
    });
    if (resp.status !== 200) return null;

    const contentType = String(resp.headers["content-type"] || "").split(";")[0].trim();
    let ext = EXTENSIONS_AUTORISEES[contentType];
    if (!ext) {
      const guessed = extFromUrl(url);
      if (!guessed) return null;
      ext = guessed;
    }

    const buffer = Buffer.from(resp.data);
    if (buffer.length > tailleMax || buffer.length < 500) return null;

    const digest = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 24);
    const now = new Date();
    const sousDossier = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const dossierComplet = path.join(settings.storageDir, sousDossier);
    fs.mkdirSync(dossierComplet, { recursive: true });

    const nomFichier = `${digest}${ext}`;
    const cheminLocal = path.join(dossierComplet, nomFichier);
    if (!fs.existsSync(cheminLocal)) {
      fs.writeFileSync(cheminLocal, buffer);
    }

    return `${settings.storageBaseUrl}/${sousDossier}/${nomFichier}`;
  } catch {
    return null;
  }
}