import { Router } from "express";
import { listArticlesPublies, getArticlePublie, listArticlesSimilaires, HttpError } from "../blogService";

export const publicRouter = Router();

publicRouter.get("/api/blog/articles", async (req, res) => {
  const categorie = req.query.categorie as string | undefined;
  const page = parseInt((req.query.page as string) || "1", 10);
  const articles = await listArticlesPublies(categorie, 20, (page - 1) * 20);
  res.json(
    articles.map((a) => ({
      slug: a.slug, titre: a.titre, chapo: a.chapo, categorie: a.categorie,
      image: a.imageCouvertureUrl, date: a.datePublication?.toISOString() ?? null,
    }))
  );
});

publicRouter.get("/api/blog/articles/:slug", async (req, res) => {
  try {
    const a = await getArticlePublie(req.params.slug);
    res.json({
      slug: a.slug, titre: a.titre, contenu_html: a.contenuHtml, chapo: a.chapo,
      auteur: a.auteur, categorie: a.categorie, image: a.imageCouvertureUrl,
      tags: a.tags, date: a.datePublication?.toISOString() ?? null,
    });
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ detail: e.message });
    throw e;
  }
});

publicRouter.get("/api/blog/articles/:slug/suggestions", async (req, res) => {
  const articles = await listArticlesSimilaires(req.params.slug, 4);
  res.json(
    articles.map((a) => ({
      slug: a.slug, titre: a.titre, chapo: a.chapo, categorie: a.categorie,
      image: a.imageCouvertureUrl, date: a.datePublication?.toISOString() ?? null,
    }))
  );
});