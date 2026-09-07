import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { settings } from "./config";
import { genererArticleIa } from "./blogAiService";
import { creerArticle } from "./blogService";
import { BlogArticle } from "./models/BlogArticle";

const connection = new IORedis(settings.redisUrl, { maxRetriesPerRequest: null });

export interface GenerateArticleJobData {
  promptAdmin: string;
  categorie: string;
  adminEmail?: string;
  autoPublish: boolean;
}

export const articleQueue = new Queue<GenerateArticleJobData>(settings.queueName, { connection });

export async function enqueueGenerateArticle(data: GenerateArticleJobData): Promise<string> {
  const job = await articleQueue.add("generate", data);
  return job.id as string;
}

/** À appeler une seule fois côté process worker de l'app hôte (ou lancer ce
 * fichier en standalone). N'est PAS auto-démarré à l'import, pour laisser
 * l'app hôte décider où tourne le worker. */
export function startArticleWorker(): Worker<GenerateArticleJobData> {
  return new Worker<GenerateArticleJobData>(
    settings.queueName,
    async (job: Job<GenerateArticleJobData>) => {
      const { promptAdmin, categorie, adminEmail, autoPublish } = job.data;
      const data = await genererArticleIa(promptAdmin, categorie);

      const article = await creerArticle({
        titre: data.titre,
        chapo: data.chapo,
        contenuHtml: data.contenuHtml,
        categorie: data.categorie,
        tags: data.motsClesSeo,
        auteur: adminEmail || "IA",
        createdBy: adminEmail || "admin_ia",
        source: "ia_admin",
        imageCouvertureUrl: data.imageCouvertureUrl,
        publierImmediatement: autoPublish,
      });

      await BlogArticle.update(
        {
          liensExternes: data.liensExternes,
          imagesMeta: data.blocsMedia,
          motsClesSeo: data.motsClesSeo,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        },
        { where: { id: article.id } }
      );

      return { slug: article.slug, titre: article.titre, statut: article.statut };
    },
    { connection }
  );
}