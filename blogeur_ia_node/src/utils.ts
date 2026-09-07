import { v4 as uuidv4 } from "uuid";

export function genId(): string {
  return uuidv4().replace(/-/g, "");
}

export function slugify(texte: string, maxLen = 90): string {
  const sansAccents = texte
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  let s = sansAccents.toLowerCase().trim();
  s = s.replace(/[^\w\s-]/g, "");
  s = s.replace(/[\s_]+/g, "-");
  s = s.replace(/-+/g, "-");
  return s.slice(0, maxLen);
}