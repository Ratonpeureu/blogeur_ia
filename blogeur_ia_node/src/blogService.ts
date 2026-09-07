import { Op } from "sequelize";
import { BlogArticle } from "./models/BlogArticle";
import { slugify } from "./utils";

export async function generateUniqueArticleSlug(titre: string): Promise<string> {
  const base = slugify(titre, 80);
  let candidate = base;
  let counter = 2;
  while (await BlogArticle.findOne({ where: { slug: candidate } })) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

export interface CreerArticleInput {
  titre: string;
  chapo: string;
  contenuHtml: string;
  categorie: string;
  tags: string[];
  auteur: string;
  createdBy: string;
  imageCouvertureUrl?: string | null;
  source?: string;
  publierImmediatement?: boolean;
}

export async function creerArticle(input: CreerArticleInput): Promise<BlogArticle> {
  const slug = await generateUniqueArticleSlug(input.titre);
  return BlogArticle.create({
    slug,
    titre: input.titre,
    chapo: input.chapo,
    contenuHtml: input.contenuHtml,
    categorie: input.categorie,
    tags: input.tags,
    auteur: input.auteur,
    imageCouvertureUrl: input.imageCouvertureUrl ?? null,
    statut: input.publierImmediatement ? "publie" : "brouillon",
    source: input.source || "manuel",
    createdBy: input.createdBy,
    datePublication: input.publierImmediatement ? new Date() : null,
  } as any);
}

export async function publierArticle(slug: string): Promise<BlogArticle> {
  const article = await BlogArticle.findOne({ where: { slug } });
  if (!article) throw new HttpError(404, "Article introuvable");
  article.statut = "publie";
  article.datePublication = article.datePublication || new Date();
  await article.save();
  return article;
}

export async function getArticlePublie(slug: string): Promise<BlogArticle> {
  const article = await BlogArticle.findOne({ where: { slug, statut: "publie" } });
  if (!article) throw new HttpError(404, "Article introuvable");
  return article;
}

export async function listArticlesPublies(
  categorie?: string, limit = 20, offset = 0
): Promise<BlogArticle[]> {
  const where: any = { statut: "publie" };
  if (categorie) where.categorie = categorie;
  return BlogArticle.findAll({ where, order: [["datePublication", "DESC"]], limit, offset });
}

export async function listArticlesSimilaires(slugActuel: string, limit = 4): Promise<BlogArticle[]> {
  const actuel = await BlogArticle.findOne({ where: { slug: slugActuel } });
  if (!actuel) return [];

  let resultats = await BlogArticle.findAll({
    where: { statut: "publie", slug: { [Op.ne]: slugActuel }, categorie: actuel.categorie },
    order: [["datePublication", "DESC"]],
    limit,
  });

  if (resultats.length < limit && actuel.tags?.length) {
    const deja = new Set([...resultats.map((a) => a.id), actuel.id]);
    const candidats = await BlogArticle.findAll({
      where: { statut: "publie", id: { [Op.notIn]: Array.from(deja) } },
      order: [["datePublication", "DESC"]],
      limit: 30,
    });
    const scores = candidats
      .map((a) => ({ a, score: (a.tags || []).filter((t) => actuel.tags.includes(t)).length }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);
    for (const { a } of scores) {
      if (resultats.length >= limit) break;
      resultats.push(a);
    }
  }

  if (resultats.length < limit) {
    const deja = new Set([...resultats.map((a) => a.id), actuel.id]);
    const fallback = await BlogArticle.findAll({
      where: { statut: "publie", id: { [Op.notIn]: Array.from(deja) } },
      order: [["datePublication", "DESC"]],
      limit: limit - resultats.length,
    });
    resultats = resultats.concat(fallback);
  }

  return resultats.slice(0, limit);
}

export async function supprimerArticle(slug: string): Promise<void> {
  const article = await BlogArticle.findOne({ where: { slug } });
  if (!article) throw new HttpError(404, "Article introuvable");
  await article.destroy();
}

export async function listArticlesAdmin(
  statut?: string, limit = 20, offset = 0
): Promise<BlogArticle[]> {
  const where: any = {};
  if (statut) where.statut = statut;
  return BlogArticle.findAll({ where, order: [["createdAt", "DESC"]], limit, offset });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}