import { Router, RequestHandler } from "express";
import { CATEGORIES_BLOG } from "../categories";
import { creerBrouillonDepuisSortie } from "../blogAutoService";
import { supprimerArticle, listArticlesAdmin, HttpError } from "../blogService";
import { enqueueGenerateArticle } from "../queue";

export interface BuildAdminRouterOptions {
  /** Votre middleware d'auth habituel (ex: vérifie un JWT admin). Si omis,
   * les routes sont exposées SANS auth — réservé au développement local. */
  authMiddleware?: RequestHandler;
}

export function buildAdminRouter(options: BuildAdminRouterOptions = {}): Router {
  const router = Router();
  if (options.authMiddleware) router.use(options.authMiddleware);

  router.get("/admin/blog/categories", (_req, res) => {
    res.json(CATEGORIES_BLOG);
  });

  router.get("/admin/blog", async (req, res) => {
    const statut = req.query.statut as string | undefined;
    const page = parseInt((req.query.page as string) || "1", 10);
    const articles = await listArticlesAdmin(statut, 20, (page - 1) * 20);
    res.json(
      articles.map((a) => ({
        slug: a.slug, titre: a.titre, chapo: a.chapo, categorie: a.categorie,
        statut: a.statut, source: a.source, image: a.imageCouvertureUrl,
        date: a.datePublication?.toISOString() ?? null,
        created_at: a.createdAt.toISOString(),
      }))
    );
  });

  router.post("/admin/blog/draft-from-release", async (req, res) => {
    const { titre, description, categorie } = req.body;
    await creerBrouillonDepuisSortie(titre, description, categorie);
    res.json({ status: "brouillon créé — à relire et publier manuellement" });
  });

  router.post("/admin/blog/generate", async (req, res) => {
    const { prompt, categorie = "guide", auto_publish = true } = req.body;
    const adminEmail = (req as any).currentAdmin?.username;
    const jobId = await enqueueGenerateArticle({
      promptAdmin: prompt, categorie, adminEmail, autoPublish: auto_publish,
    });
    res.json({ task_id: jobId, status: "génération lancée" });
  });

  router.delete("/admin/blog/:slug", async (req, res) => {
    try {
      await supprimerArticle(req.params.slug);
      res.json({ status: "article supprimé" });
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ detail: e.message });
      throw e;
    }
  });

  return router;
}