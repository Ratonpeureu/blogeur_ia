import { creerArticle } from "./blogService";
import { settings } from "./config";

export async function creerBrouillonDepuisSortie(
  titreFeature: string, descriptionFeature: string, categorie?: string
): Promise<void> {
  const cat = categorie || settings.categorieProduitId;
  const contenuHtml = `
    <p>${descriptionFeature}</p>
    <p>Cette fonctionnalité est désormais disponible sur ${settings.brandName}.</p>
  `;
  await creerArticle({
    titre: `Nouveauté : ${titreFeature}`,
    chapo: descriptionFeature.slice(0, 160),
    contenuHtml,
    categorie: cat,
    tags: ["nouveaute", "produit"],
    auteur: settings.authorDefault,
    createdBy: "system_auto",
    source: "auto_release",
    publierImmediatement: false,
  });
}