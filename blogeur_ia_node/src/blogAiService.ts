import fs from "fs";
import { marked } from "marked";
import { settings } from "./config";
import { CATEGORIES_BLOG_IDS, CATEGORIE_PRODUIT_ID, CATEGORIE_DEFAUT } from "./categories";
import { LLMClient } from "./llmClient";
import { serperSearch, serperNews, serperImages, serperVideos, serperPlaces } from "./serperClient";
import { extraireEmbedVideo, urlEstValide, embedMaps } from "./embedHelpers";
import { telechargerEtHebergerImage } from "./mediaStorage";

const TYPES_BLOC = ["image", "video", "carte_lieu", "article_lie", "encart_citation_visuelle"];

function styleHumain(): string {
  const interdits = settings.interdits.map((m) => `"${m}"`).join(", ");
  return `
CONSIGNES DE STYLE — impératif :
- Écris comme ${settings.personaName}, ${settings.personaBio}, pour un contenu éditorial et
  informatif — pas une publicité. Ton direct, centré sur le SUJET, pas sur la marque.
- Varie fortement la longueur des phrases et des paragraphes. Aucune structure répétitive.
- Interdit : ${interdits}, listes à puces systématiques, symétrie parfaite entre sections.
- Pas de méta-commentaire ("cet article va vous présenter"). Entre directement dans le sujet.
- Ancrage sectoriel : ${settings.secteur}, quand c'est pertinent, sans le forcer partout.
- Une seule opinion tranchée assumée par l'auteur dans l'article, pas plus.
- Longueur cible : ${settings.minWords} à ${settings.maxWords} mots — pas de remplissage artificiel.

RÈGLE STRICTE SUR LA PROMOTION DE ${settings.brandName.toUpperCase()} :
- Ce contenu est ÉDITORIAL — le lecteur ne doit jamais sentir qu'on lui vend quelque chose.
- Ne mentionne ${settings.brandName}, ses fonctionnalités ou son offre QUE SI le sujet en
  parle explicitement et directement.
- Pour un sujet générique, ZÉRO mention de la marque. L'autorité vient de la connaissance
  du sujet, pas du rappel de marque.
- Une signature discrète en fin d'article est acceptable UNE SEULE FOIS maximum.
`;
}

function chargerFicheTechnique(): string {
  if (!settings.ficheTechniquePath || !fs.existsSync(settings.ficheTechniquePath)) return "";
  return fs.readFileSync(settings.ficheTechniquePath, "utf-8");
}

function compterMentionsPromo(texte: string): number {
  const t = texte.toLowerCase();
  return settings.mentionsInterdites.reduce((acc, m) => acc + t.split(m).length - 1, 0);
}

// ── Étape 1 : brouillon ──────────────────────────────────────────
export async function genererBrouillon(promptAdmin: string, categorieIn: string, client: LLMClient) {
  let categorie = categorieIn;
  if (!CATEGORIES_BLOG_IDS.has(categorie)) categorie = CATEGORIE_DEFAUT;

  let systemPrompt =
    `Tu écris à la première personne pour ${settings.personaName}, ${settings.personaBio}, ` +
    `pour un blog d'information sur ${settings.secteur}. L'objectif est d'apporter une vraie ` +
    `valeur informative — pas de promouvoir un produit.` +
    styleHumain();

  const sujetLower = promptAdmin.toLowerCase();
  const mentionneMarque = settings.brandTriggerKeywords.some((mot) => sujetLower.includes(mot));
  const concerneMarque = categorie === CATEGORIE_PRODUIT_ID || mentionneMarque;

  if (concerneMarque) {
    const fiche = chargerFicheTechnique();
    if (fiche) {
      systemPrompt += `\n\nCe sujet concerne explicitement ${settings.brandName}. Voici la fiche ` +
        `technique officielle, seule source de vérité autorisée — n'invente et ne suppose ` +
        `jamais un détail absent de cette fiche :\n${fiche}`;
    }
  }

  const userPrompt = `Sujet demandé : ${promptAdmin}
Catégorie : ${categorie}

Rédige l'article complet en Markdown (titres ##/###, paragraphes). Traite le sujet pour
lui-même, sans le ramener artificiellement à un produit sauf si le sujet l'exige.

Réponds UNIQUEMENT en JSON strict :
{
  "titre": "...",
  "chapo": "...(160 caractères max, accrocheur)",
  "contenu_markdown": "...",
  "mots_cles_utilises": ["..."]
}`;

  let resultat = await client.chatJson(userPrompt, systemPrompt, settings.temperatureRedaction);

  if (
    settings.promoGuardEnabled &&
    !concerneMarque &&
    compterMentionsPromo(resultat.contenu_markdown || "") > 0
  ) {
    resultat = await client.chatJson(
      userPrompt +
        `\n\nATTENTION : ta première tentative mentionnait ${settings.brandName} alors ` +
        `que ce sujet est générique. Réécris entièrement sans AUCUNE mention de la marque ` +
        `ou de formulation promotionnelle.`,
      systemPrompt,
      settings.temperatureReecriture
    );
  }
  return resultat;
}

// ── Étape 2 : plan de contenu mixte ───────────────────────────────
export async function planifierContenu(contenuMarkdown: string, titre: string, client: LLMClient) {
  const systemPrompt =
    "Tu es directeur de contenu pour un blog professionnel bien référencé. Tu décides, " +
    "pour CET article précis, quels blocs multimédias inclure. Rien n'est figé : varie " +
    "selon ce que l'article justifie réellement.";
  const userPrompt = `Titre : ${titre}
Article (Markdown) :
${contenuMarkdown}

Types de blocs disponibles : ${JSON.stringify(TYPES_BLOC)}

Règles :
- "image" et "encart_citation_visuelle" : illustrent un propos précis d'un paragraphe.
- "video" : uniquement si le sujet s'y prête vraiment.
- "carte_lieu" : uniquement si l'article mentionne un lieu concret.
- "article_lie" : renvoie vers un article externe complémentaire, présenté "à lire aussi".
- Entre 2 et 6 blocs au total, jamais un nombre fixe d'un article à l'autre.
- Pour chaque bloc : ancrage = 6-8 premiers mots exacts du paragraphe visé (ou "DEBUT").
- "requete_recherche" : requête concrète adaptée au type.

Réponds UNIQUEMENT en JSON strict :
{"blocs": [{"id": "b1", "type": "image", "ancrage": "DEBUT", "requete_recherche": "...", "legende": "..."}]}`;
  const result = await client.chatJson(userPrompt, systemPrompt, 0.8);
  return (result.blocs || []).slice(0, 6);
}

interface BlocResolu {
  type: string;
  [key: string]: any;
}

export async function resoudreBloc(bloc: any): Promise<BlocResolu | null> {
  const t = bloc.type;
  const q = bloc.requete_recherche || "";

  if (t === "image" || t === "encart_citation_visuelle") {
    const candidats = await serperImages(q, 5);
    for (const c of candidats) {
      const urlSource = c.imageUrl;
      if (!urlSource) continue;
      const urlHebergee = await telechargerEtHebergerImage(urlSource);
      if (urlHebergee) return { type: t, url: urlHebergee, creditLien: c.link || "" };
    }
    return null;
  }

  if (t === "video") {
    for (const c of await serperVideos(q, 5)) {
      const embed = extraireEmbedVideo(c.link || "");
      if (embed) {
        return {
          type: "video", embedUrl: embed.embedUrl,
          titreVideo: c.title || "", source: c.channel || c.source || "",
        };
      }
    }
    return null;
  }

  if (t === "carte_lieu") {
    for (const c of await serperPlaces(q, 3)) {
      if (c.latitude && c.longitude) {
        return {
          type: "carte_lieu", embedUrl: embedMaps(c.latitude, c.longitude),
          nomLieu: c.title || "", adresse: c.address || "",
        };
      }
    }
    return null;
  }

  if (t === "article_lie") {
    const candidats = (await serperNews(q, 5)).length ? await serperNews(q, 5) : await serperSearch(q, 5);
    for (const c of candidats) {
      const url = c.link;
      if (!url || !(await urlEstValide(url))) continue;
      const imageHebergee = c.imageUrl ? await telechargerEtHebergerImage(c.imageUrl) : null;
      return {
        type: "article_lie", url, titreExterne: c.title || "",
        extrait: (c.snippet || "").slice(0, 180),
        source: c.source || new URL(url).hostname, image: imageHebergee,
      };
    }
    return null;
  }

  return null;
}

export async function resoudreTousLesBlocs(blocs: any[]): Promise<Record<string, BlocResolu>> {
  const resolus: Record<string, BlocResolu> = {};
  for (const bloc of blocs) {
    const contenu = await resoudreBloc(bloc);
    if (contenu) {
      contenu.legende = bloc.legende || "";
      resolus[bloc.id] = contenu;
    }
  }
  return resolus;
}

// ── Étape 3 : backlinks SEO ───────────────────────────────────────
export async function choisirRequetesRecherche(titre: string, contenuMarkdown: string, client: LLMClient): Promise<string[]> {
  const prompt = `Titre : ${titre}
Article :
${contenuMarkdown}

Propose 4 à 6 requêtes pour trouver de VRAIES sources externes crédibles qui appuient
les arguments de cet article. Requêtes précises, pas vagues.
Réponds UNIQUEMENT en JSON : {"requetes": ["..."]}`;
  const result = await client.chatJson(prompt, "Tu es un assistant de recherche documentaire rigoureux.", 0.3);
  return result.requetes || [];
}

export async function rechercherBacklinks(requetes: string[]): Promise<any[]> {
  let candidats: any[] = [];
  for (const q of requetes) {
    candidats = candidats.concat(await serperSearch(q, 5));
    candidats = candidats.concat(await serperNews(q, 3));
  }
  const valides = [];
  for (const c of candidats) {
    const url = c.link;
    if (url && (await urlEstValide(url))) {
      valides.push({ url, titre: c.title || "", extrait: c.snippet || "" });
    }
  }
  return valides;
}

// ── Étape 4 : réécriture avec liens + mots-clés ───────────────────
export async function reecrireAvecLiens(
  titre: string, contenuMarkdown: string, sources: any[], client: LLMClient
) {
  if (!sources.length) {
    return {
      contenu_markdown_final: contenuMarkdown, liens_utilises: [],
      mots_cles_seo_utilises: [], meta_title: titre.slice(0, 60), meta_description: "",
    };
  }
  const sourcesTxt = sources.map((s) => `- ${s.titre} — ${s.url} — ${s.extrait || ""}`).join("\n");
  const systemPrompt =
    "Tu réécris l'article en y intégrant, naturellement, entre 5 et 10 liens sortants " +
    "choisis EXCLUSIVEMENT dans la liste fournie — n'invente JAMAIS une URL." + styleHumain();

  const motsCles = settings.motsClesPool.length
    ? [...settings.motsClesPool].sort(() => Math.random() - 0.5).slice(0, 10)
    : [];

  const userPrompt = `Titre : ${titre}

Article original (Markdown) :
${contenuMarkdown}

Sources réelles disponibles :
${sourcesTxt}

Réécris en intégrant les liens pertinents en Markdown ([texte](url)) pour appuyer des
arguments — jamais en liste à la fin. Intègre aussi naturellement quelques mots-clés parmi :
${motsCles.join(", ")}

Réponds UNIQUEMENT en JSON strict :
{"contenu_markdown_final": "...", "liens_utilises": ["..."], "mots_cles_seo_utilises": ["..."],
  "meta_title": "...(60 caractères max)", "meta_description": "...(155 caractères max)"}`;
  return client.chatJson(userPrompt, systemPrompt, settings.temperatureReecriture);
}

// ── Étape 5 : assemblage HTML ──────────────────────────────────────
function htmlImage(b: BlocResolu): string {
  return `<figure class="article-img"><img src="${b.url}" alt="${b.legende || ""}" loading="lazy"/><figcaption>${b.legende || ""}</figcaption></figure>`;
}
function htmlVideo(b: BlocResolu): string {
  const caption = b.legende || b.titreVideo;
  return `<div class="article-video-embed"><iframe src="${b.embedUrl}" title="${b.titreVideo || ""}" frameborder="0" allowfullscreen loading="lazy"></iframe>${caption ? `<p class="video-caption">${caption}</p>` : ""}</div>`;
}
function htmlCarte(b: BlocResolu): string {
  const adresse = b.adresse ? `<p class="map-address">${b.nomLieu || ""} — ${b.adresse}</p>` : "";
  return `<div class="article-map-embed"><iframe src="${b.embedUrl}" frameborder="0" loading="lazy" allowfullscreen></iframe>${adresse}</div>`;
}
function htmlArticleLie(b: BlocResolu): string {
  const img = b.image ? `<img src="${b.image}" alt="" loading="lazy"/>` : "";
  return `<a class="article-related-card" href="${b.url}" target="_blank" rel="noopener noreferrer">${img}<div class="related-card-body"><span class="related-tag">À lire aussi</span><h4>${b.titreExterne || ""}</h4><p>${b.extrait || ""}</p><span class="related-source">${b.source || ""}</span></div></a>`;
}

const RENDERERS: Record<string, (b: BlocResolu) => string> = {
  image: htmlImage,
  encart_citation_visuelle: htmlImage,
  video: htmlVideo,
  carte_lieu: htmlCarte,
  article_lie: htmlArticleLie,
};

export function assemblerHtml(
  contenuMarkdown: string, blocs: any[], resolus: Record<string, BlocResolu>
): string {
  let contenu = contenuMarkdown;
  const heroBloc = blocs.find((b) => b.ancrage === "DEBUT" && resolus[b.id]);

  for (const bloc of blocs) {
    if (bloc === heroBloc || !resolus[bloc.id]) continue;
    const data = resolus[bloc.id];
    const renderer = RENDERERS[data.type];
    if (!renderer) continue;
    const htmlBloc = renderer(data);
    const ancrage = bloc.ancrage || "";
    if (ancrage && contenu.includes(ancrage)) {
      const idx = contenu.indexOf(ancrage);
      const finIdx = contenu.indexOf("\n", idx);
      const fin = finIdx !== -1 ? finIdx : contenu.length;
      contenu = contenu.slice(0, fin) + `\n\n${htmlBloc}\n\n` + contenu.slice(fin);
    } else {
      contenu += `\n\n${htmlBloc}\n`;
    }
  }

  let htmlCorps = marked.parse(contenu, { async: false }) as string;

  if (heroBloc) {
    const data = resolus[heroBloc.id];
    const renderer = RENDERERS[data.type];
    if (renderer) htmlCorps = renderer(data) + htmlCorps;
  }
  return htmlCorps;
}

export interface ArticleGenere {
  titre: string;
  chapo: string;
  contenuHtml: string;
  imageCouvertureUrl: string | null;
  metaTitle?: string;
  metaDescription?: string;
  liensExternes: string[];
  motsClesSeo: string[];
  blocsMedia: { id: string; type: string }[];
  categorie: string;
}

export async function genererArticleIa(
  promptAdmin: string, categorie: string
): Promise<ArticleGenere> {
  const client = new LLMClient();

  const brouillon = await genererBrouillon(promptAdmin, categorie, client);
  const titre = brouillon.titre;
  const contenuMd = brouillon.contenu_markdown;

  const blocs = await planifierContenu(contenuMd, titre, client);
  const resolus = await resoudreTousLesBlocs(blocs);

  const requetes = await choisirRequetesRecherche(titre, contenuMd, client);
  const sources = requetes.length ? await rechercherBacklinks(requetes) : [];

  const reecriture = await reecrireAvecLiens(titre, contenuMd, sources, client);
  const contenuHtml = assemblerHtml(reecriture.contenu_markdown_final, blocs, resolus);

  const heroBloc = blocs.find((b: any) => b.ancrage === "DEBUT" && resolus[b.id]);
  let imageCouverture: string | null = heroBloc ? resolus[heroBloc.id].url ?? null : null;
  if (!imageCouverture) {
    for (const data of Object.values(resolus)) {
      if (data.url) {
        imageCouverture = data.url;
        break;
      }
    }
  }

  return {
    titre,
    chapo: (brouillon.chapo || "").slice(0, 160),
    contenuHtml,
    imageCouvertureUrl: imageCouverture,
    metaTitle: reecriture.meta_title,
    metaDescription: reecriture.meta_description,
    liensExternes: reecriture.liens_utilises || [],
    motsClesSeo: reecriture.mots_cles_seo_utilises || [],
    blocsMedia: Object.entries(resolus).map(([id, v]) => ({ id, type: v.type })),
    categorie,
  };
}