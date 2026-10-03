// lib/api_ecole_extended.ts
// Extension du module École — regroupement de toutes les routes ajoutées
// dans route_ecole_extended.py qui ne concernent pas le flux standard.
// Garde api_ecole.ts léger et thématique : ici, on isole photos de classe,
// matériel, parcours longitudinal, analytics, grille de frais détaillée,
// config finance, catalogue dépenses, seed et cartes scolaires.

import { api } from "@/lib/api";
import type { ModelDump, DictPayload, Eleve, Classe } from "./api_ecole";

const BASE = "/api/ecole";

// ═══════════════════════════════════════════════════════════════════════
// HELPERS BINAIRES (images, PDF)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Construit une URL absolue ou relative pour un endpoint qui renvoie
 * un binaire (image/png, application/pdf). Le front l'utilise
 * directement dans <img src> ou via window.open().
 * Le token doit être ajouté séparément (header Authorization) — donc
 * en pratique on utilise cette URL avec fetch() pour les PDF, ou avec
 * un composant <img> qui pose le header via un proxy interne.
 */
export function ecoleBinaryUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    }
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function fetchBinary(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): Promise<Blob> {
  const url = ecoleBinaryUrl(path, query);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Erreur ${res.status} sur ${url}`);
  }
  return await res.blob();
}

// ═══════════════════════════════════════════════════════════════════════
// PHOTOS DE CLASSE
// ═══════════════════════════════════════════════════════════════════════

export interface PhotoClasseAnnee extends ModelDump {
  id: string;
  entreprise_id: string;
  classe_id: string;
  annee_scolaire_id: string;
  periode_id: string | null;
  titre: string;
  description: string | null;
  legende: string | null;
  evenement_id: string | null;
  url_photo: string;
  url_thumbnail: string | null;
  url_originale: string | null;
  largeur_px: number | null;
  hauteur_px: number | null;
  taille_ko: number | null;
  date_prise: string | null;
  lieu_prise: string | null;
  photographe: string | null;
  eleves_presents: string[];
  nb_eleves_visibles: number | null;
  tags: string[];
  ordre_affichage: number;
  est_publiee: boolean;
  ajoutee_par: string;
  created_at: string;
  updated_at: string;
}

export interface AjouterPhotoClasseBody {
  annee_scolaire_id: string;
  periode_id?: string | null;
  titre: string;
  description?: string | null;
  legende?: string | null;
  evenement_id?: string | null;
  url_photo: string;
  url_thumbnail?: string | null;
  url_originale?: string | null;
  largeur_px?: number | null;
  hauteur_px?: number | null;
  taille_ko?: number | null;
  date_prise?: string | null;
  lieu_prise?: string | null;
  photographe?: string | null;
  eleves_presents?: string[];
  tags?: string[];
  ordre_affichage?: number;
  est_publiee?: boolean;
}

export async function ecoleListerPhotosClasse(
  classe_id: string,
  params?: { annee_scolaire_id?: string; periode_id?: string },
): Promise<PhotoClasseAnnee[]> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/photos`, {
    method: "GET",
    query: params,
  });
}

export async function ecoleAjouterPhotoClasse(
  classe_id: string,
  body: AjouterPhotoClasseBody,
): Promise<PhotoClasseAnnee> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/photos`, {
    method: "POST",
    body,
  });
}

export async function ecoleSupprimerPhoto(photo_id: string): Promise<{ status: string }> {
  return api(`${BASE}/photos/${encodeURIComponent(photo_id)}`, { method: "DELETE" });
}

export async function ecolePhotosEleve(eleve_id: string): Promise<PhotoClasseAnnee[]> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/photos`, { method: "GET" });
}

// ═══════════════════════════════════════════════════════════════════════
// MATÉRIEL SCOLAIRE — CATALOGUE + AFFECTATIONS CLASSE
// ═══════════════════════════════════════════════════════════════════════

export interface MaterielScolaireCatalogue extends ModelDump {
  id: string;
  code: string;
  libelle: string;
  categorie: string;
  sous_categorie: string | null;
  description: string | null;
  unite_mesure: string;
  duree_vie_estimee_mois: number | null;
  prix_unitaire_reference_fcfa: number | null;
  icone: string | null;
  actif: boolean;
}

export interface MaterielClasse extends ModelDump {
  id: string;
  entreprise_id: string;
  classe_id: string;
  materiel_catalogue_id: string | null;
  designation: string;
  quantite: number;
  etat: string;
  valeur_acquisition_fcfa: number | null;
  date_acquisition: string | null;
  date_derniere_verification: string | null;
  numero_serie: string | null;
  localisation_detail: string | null;
  photo_url: string | null;
  remarques: string | null;
  created_at: string;
  updated_at: string;
}

export interface AjouterMaterielClasseBody {
  materiel_catalogue_id?: string | null;
  designation: string;
  quantite?: number;
  etat?: string;
  valeur_acquisition_fcfa?: number | null;
  date_acquisition?: string | null;
  numero_serie?: string | null;
  localisation_detail?: string | null;
  photo_url?: string | null;
  remarques?: string | null;
}

export async function ecoleCatalogueMateriel(params?: {
  categorie?: string;
  q?: string;
}): Promise<MaterielScolaireCatalogue[]> {
  return api(`${BASE}/materiel-scolaire/catalogue`, { method: "GET", query: params });
}

export async function ecoleCategoriesMateriel(): Promise<string[]> {
  return api(`${BASE}/materiel-scolaire/categories`, { method: "GET" });
}

export async function ecoleListerMaterielClasse(classe_id: string): Promise<MaterielClasse[]> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/materiel`, { method: "GET" });
}

export async function ecoleAjouterMaterielClasse(
  classe_id: string,
  body: AjouterMaterielClasseBody,
): Promise<MaterielClasse> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/materiel`, {
    method: "POST",
    body,
  });
}

export async function ecoleModifierMateriel(
  materiel_id: string,
  body: Partial<AjouterMaterielClasseBody>,
): Promise<MaterielClasse> {
  return api(`${BASE}/materiel/${encodeURIComponent(materiel_id)}`, {
    method: "PATCH",
    body,
  });
}

export async function ecoleSupprimerMateriel(materiel_id: string): Promise<{ status: string }> {
  return api(`${BASE}/materiel/${encodeURIComponent(materiel_id)}`, { method: "DELETE" });
}

// ═══════════════════════════════════════════════════════════════════════
// PARCOURS LONGITUDINAL ÉLÈVE
// ═══════════════════════════════════════════════════════════════════════

export interface BulletinPeriodeSnapshot {
  periode_id: string;
  periode: string;
  moyenne: number | null;
  rang: number | null;
  effectif: number | null;
  mention: string | null;
}

export interface EnseignantAnneSnapshot {
  employe_id: string;
  nom_complet: string;
  matiere: string;
  coefficient: number;
}

export interface MoyenneMatiereSnapshot {
  moyenne: number | null;
  coefficient: number;
  prof_id: string | null;
}

export interface AnneeParcours {
  annee_scolaire_id: string;
  classe_libelle: string;
  niveau: string;
  cycle: string;
  serie: string | null;
  moyenne_annuelle: number | null;
  rang_annuel: number | null;
  effectif_classe: number;
  mention: string | null;
  decision_conseil: string | null;
  bulletins: BulletinPeriodeSnapshot[];
  moyennes_par_matiere: Record<string, MoyenneMatiereSnapshot>;
  enseignants: EnseignantAnneSnapshot[];
  nb_camarades: number;
  finance: {
    total_du_fcfa: number;
    total_paye_fcfa: number;
    solde_fcfa: number;
  };
  photos_ids: string[];
}

export interface EnseignantHistorique {
  employe_id: string;
  nom_complet: string;
  matieres_enseignees: string[];
  nb_annees_contact: number;
}

export interface CamaradeHistorique {
  eleve_id: string;
  nom_complet: string;
  nb_annees_ensemble: number;
}

export interface ProgressionMatiere {
  moyennes_par_annee: (number | null)[];
  tendance: "hausse" | "baisse" | "stable";
}

export interface ParcoursCompletEleve {
  eleve_id: string;
  nb_annees: number;
  annees: AnneeParcours[];
  enseignants_historique: EnseignantHistorique[];
  camarades_historique: CamaradeHistorique[];
  progression_par_matiere: Record<string, ProgressionMatiere>;
}

export async function ecoleParcoursCompletV2(eleve_id: string): Promise<ParcoursCompletEleve> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/parcours-complet`, {
    method: "GET",
  });
}

export async function ecoleRecalculerParcoursEleve(
  eleve_id: string,
): Promise<{ annees: number }> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/recalculer-parcours`, {
    method: "POST",
  });
}

export async function ecoleRecalculerParcoursTous(): Promise<{
  reconstruits: number;
  erreurs: number;
}> {
  return api(`${BASE}/parcours/recalculer-tous`, { method: "POST" });
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS — ENSEIGNANTS / CLASSES / COMBINAISONS
// ═══════════════════════════════════════════════════════════════════════

export interface ClasseDetailStat extends ModelDump {
  classe_id: string;
  classe_libelle: string;
  matieres: string[];
  nb_eleves: number;
  moyenne_classe: number | null;
  taux_reussite: number | null;
}

export interface StatistiqueEnseignantAnnuelle extends ModelDump {
  id: string;
  entreprise_id: string;
  employe_id: string;
  annee_scolaire_id: string;
  nom_enseignant_snapshot: string;
  poste_snapshot: string;
  nb_classes_enseignees: number;
  nb_matieres_enseignees: number;
  nb_eleves_total: number;
  volume_horaire_hebdo_moyen: number;
  moyenne_generale_classes: number | null;
  taux_reussite_pct: number | null;
  taux_absence_eleves_pct: number | null;
  classes_detaillees: ClasseDetailStat[];
  evolution_par_periode: Array<{
    periode: string;
    moyenne: number;
    rang_moyen: number;
  }>;
  ecart_vs_moyenne_etablissement: number | null;
  percentile_etablissement: number | null;
  score_performance: number | null;
  recalcule_le: string;
}

export interface TopEleveStat {
  eleve_id: string;
  moyenne: number | null;
  rang: number | null;
}

export interface StatistiqueClasseAnnuelle extends ModelDump {
  id: string;
  entreprise_id: string;
  classe_id: string;
  annee_scolaire_id: string;
  classe_libelle_snapshot: string;
  effectif_debut: number;
  effectif_fin: number;
  nb_redoublants: number;
  nb_arrivees: number;
  nb_departs: number;
  moyenne_generale_classe: number | null;
  moyenne_max_classe: number | null;
  moyenne_min_classe: number | null;
  ecart_type_moyennes: number | null;
  mediane_moyennes: number | null;
  taux_reussite_pct: number;
  taux_absenteisme_pct: number | null;
  top_eleves: TopEleveStat[];
  moyennes_par_matiere: Record<
    string,
    { moyenne_classe: number; max: number; min: number; ecart_type: number }
  >;
  annee_precedente_id: string | null;
  evolution_moyenne_vs_n1: number | null;
  recalcule_le: string;
}

export interface ClasseConcerneeCombinaison {
  classe_id: string;
  classe_libelle: string;
  annee_scolaire_id: string;
  moyenne_finale: number | null;
  taux_reussite: number | null;
}

export type FiabiliteCombinaison = "faible" | "moyenne" | "haute";

export interface StatistiqueCombinaisonProfs extends ModelDump {
  id: string;
  entreprise_id: string;
  combinaison_hash: string;
  employe_ids: string[];
  employes_noms: string[];
  nb_employes: number;
  classes_concernees: ClasseConcerneeCombinaison[];
  nb_utilisations: number;
  moyenne_generale_moyenne: number | null;
  taux_reussite_moyen: number | null;
  ecart_type: number | null;
  score_combinaison: number | null;
  fiabilite: FiabiliteCombinaison;
  recalcule_le: string;
}

export async function ecoleRecalculerStatEnseignant(
  employe_id: string,
  annee_scolaire_id: string,
): Promise<StatistiqueEnseignantAnnuelle> {
  return api(
    `${BASE}/analytics/enseignants/${encodeURIComponent(employe_id)}/recalculer`,
    { method: "POST", query: { annee_scolaire_id } },
  );
}

export async function ecoleClassementEnseignants(
  annee_scolaire_id: string,
  tri: "score" | "moyenne" | "taux_reussite" = "score",
): Promise<StatistiqueEnseignantAnnuelle[]> {
  return api(`${BASE}/analytics/enseignants`, {
    method: "GET",
    query: { annee_scolaire_id, tri },
  });
}

export async function ecoleRecalculerStatClasse(
  classe_id: string,
  annee_scolaire_id: string,
): Promise<StatistiqueClasseAnnuelle> {
  return api(
    `${BASE}/analytics/classes/${encodeURIComponent(classe_id)}/recalculer`,
    { method: "POST", query: { annee_scolaire_id } },
  );
}

export async function ecoleClassementClasses(
  annee_scolaire_id: string,
): Promise<StatistiqueClasseAnnuelle[]> {
  return api(`${BASE}/analytics/classes`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

export async function ecoleRecalculerCombinaisonsProfs(): Promise<{
  combinaisons_traitees: number;
}> {
  return api(`${BASE}/analytics/combinaisons-profs/recalculer`, { method: "POST" });
}

export async function ecoleClassementCombinaisons(
  fiabilite_min: FiabiliteCombinaison = "faible",
): Promise<StatistiqueCombinaisonProfs[]> {
  return api(`${BASE}/analytics/combinaisons-profs`, {
    method: "GET",
    query: { fiabilite_min },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// GRILLE DE FRAIS DÉTAILLÉE + CONFIG FINANCE ÉTABLISSEMENT
// ═══════════════════════════════════════════════════════════════════════

export type TypeFrais =
  | "inscription"
  | "scolarite_mensuelle"
  | "scolarite_trimestrielle"
  | "scolarite_annuelle"
  | "cantine_mensuelle"
  | "transport_mensuel"
  | "uniforme"
  | "fournitures"
  | "examen"
  | "activite_extra"
  | "autre";

export interface GrilleFraisDetail extends ModelDump {
  id: string;
  grille_id: string;
  entreprise_id: string;
  ordre: number;
  libelle: string;
  type_frais: TypeFrais;
  montant_fcfa: number;
  mois_declenchement: number | null;
  jour_du_mois: number | null;
  date_echeance_fixe: string | null;
  obligatoire: boolean;
  description: string | null;
  ordre_affichage: number;
  created_at: string;
}

export interface AjouterEcheanceGrilleBody {
  ordre: number;
  libelle: string;
  type_frais: TypeFrais;
  montant_fcfa: number;
  mois_declenchement?: number | null;
  jour_du_mois?: number | null;
  date_echeance_fixe?: string | null;
  obligatoire?: boolean;
  description?: string | null;
  ordre_affichage?: number;
}

export interface AutoGenererEcheancesBody {
  nb_tranches?: number;
  mois_debut?: number;
  jour_du_mois?: number;
  mode?: "mensuelle" | "trimestrielle" | "annuelle";
}

export interface OptionGrille {
  annees_scolaires: Array<ModelDump>;
  niveaux: Array<ModelDump>;
  types_frais: Array<{ value: TypeFrais; label: string }>;
  modes_facturation: Array<{ value: string; label: string }>;
  mois: Array<{ value: number; label: string }>;
}

export interface ConfigurationFinanceEtablissement extends ModelDump {
  id: string;
  entreprise_id: string;
  mois_debut_annee_financiere: number;
  jour_facturation_mensuelle: number;
  jours_grace_avant_retard: number;
  autoriser_paiement_partiel: boolean;
  autoriser_paiement_anticipe: boolean;
  appliquer_penalites_retard: boolean;
  generer_recus_automatiquement: boolean;
  envoyer_rappel_avant_jours: number;
  canaux_notification: string[];
  compte_bancaire_principal: string | null;
  operateur_mobile_money: string | null;
  numero_mobile_money: string | null;
  updated_at: string;
  updated_by: string;
}

export async function ecoleDetailGrille(grille_id: string): Promise<GrilleFraisDetail[]> {
  return api(`${BASE}/finance/grille-frais/${encodeURIComponent(grille_id)}/detail`, {
    method: "GET",
  });
}

export async function ecoleAjouterEcheanceGrille(
  grille_id: string,
  body: AjouterEcheanceGrilleBody,
): Promise<GrilleFraisDetail> {
  return api(`${BASE}/finance/grille-frais/${encodeURIComponent(grille_id)}/detail`, {
    method: "POST",
    body,
  });
}

export async function ecoleSupprimerEcheanceGrille(
  detail_id: string,
): Promise<{ status: string }> {
  return api(`${BASE}/finance/grille-frais/detail/${encodeURIComponent(detail_id)}`, {
    method: "DELETE",
  });
}

export async function ecoleAutoGenererEcheances(
  grille_id: string,
  body: AutoGenererEcheancesBody,
): Promise<GrilleFraisDetail[]> {
  return api(
    `${BASE}/finance/grille-frais/${encodeURIComponent(grille_id)}/detail/auto-generer`,
    { method: "POST", body },
  );
}

export async function ecoleOptionsGrille(niveau_id?: string): Promise<OptionGrille> {
  return api(`${BASE}/finance/options-grille`, {
    method: "GET",
    query: { niveau_id },
  });
}

export async function ecoleGetConfigFinance(): Promise<ConfigurationFinanceEtablissement | null> {
  return api(`${BASE}/finance/config-etablissement`, { method: "GET" });
}

export async function ecoleSetConfigFinance(
  body: Partial<ConfigurationFinanceEtablissement>,
): Promise<ConfigurationFinanceEtablissement> {
  return api(`${BASE}/finance/config-etablissement`, { method: "POST", body });
}

// ═══════════════════════════════════════════════════════════════════════
// CATÉGORIES DE DÉPENSES — CATALOGUE + CUSTOM
// ═══════════════════════════════════════════════════════════════════════

export interface CategorieDepenseEtablissement extends ModelDump {
  id: string;
  entreprise_id: string | null;
  code: string;
  libelle: string;
  parent_id: string | null;
  compte_comptable_ohada: string | null;
  description: string | null;
  ordre: number;
  actif: boolean;
  enfants?: CategorieDepenseEtablissement[];
}

export interface CreerCategorieDepenseBody {
  code: string;
  libelle: string;
  parent_id?: string | null;
  compte_comptable_ohada?: string | null;
  description?: string | null;
  ordre?: number;
}

export async function ecoleCategoriesDepenses(): Promise<CategorieDepenseEtablissement[]> {
  return api(`${BASE}/finance/categories-depenses`, { method: "GET" });
}

export async function ecoleCreerCategorieDepense(
  body: CreerCategorieDepenseBody,
): Promise<CategorieDepenseEtablissement> {
  return api(`${BASE}/finance/categories-depenses`, { method: "POST", body });
}

// ═══════════════════════════════════════════════════════════════════════
// SEED — CATALOGUES GLOBAUX
// ═══════════════════════════════════════════════════════════════════════

export interface SeedCataloguesResult {
  materiel: { crees: number; existants: number };
  depenses: { crees: number; existants: number };
}

export async function ecoleSeedCataloguesGlobaux(): Promise<SeedCataloguesResult> {
  return api(`${BASE}/seed/catalogues-globaux`, { method: "POST" });
}

// ═══════════════════════════════════════════════════════════════════════
// CARTES SCOLAIRES — BINAIRES (PNG aperçu + PDF recto/verso)
// ═══════════════════════════════════════════════════════════════════════

export type CarteTemplate = "Classique" | "Moderne" | "Primaire" | "Lycée";
export type CarteFace = "recto" | "verso";

export interface CarteTemplateInfo {
  id: CarteTemplate;
  desc: string;
  accent: string;
  accent_light: string;
  bg: string;
  text: string;
  sec: string;
}

export interface CarteTailleInfo {
  id: string;
  w: number;
  h: number;
}

export interface CartesTemplatesResponse {
  templates: CarteTemplateInfo[];
  sizes: CarteTailleInfo[];
}

/** URL directe de l'aperçu PNG — à utiliser dans <img src>. */
export function ecoleCarteApercuUrl(
  eleve_id: string,
  face: CarteFace = "recto",
  template?: CarteTemplate,
): string {
  return ecoleBinaryUrl(`/eleves/${encodeURIComponent(eleve_id)}/carte/apercu`, {
    face,
    template,
  });
}

/** Télécharge le PDF recto+verso d'un élève (Blob → déclenche download). */
export async function ecoleTelechargerCartePDF(
  eleve_id: string,
  template?: CarteTemplate,
  persist: boolean = false,
): Promise<Blob> {
  return fetchBinary(`/eleves/${encodeURIComponent(eleve_id)}/carte/pdf`, {
    template,
    persist,
  });
}

/** Télécharge la planche PDF de toute une classe (Blob). */
export async function ecoleTelechargerPlancheCartesPDF(
  classe_id: string,
  template?: CarteTemplate,
): Promise<Blob> {
  return fetchBinary(`/classes/${encodeURIComponent(classe_id)}/cartes/pdf`, {
    template,
  });
}

export async function ecoleCartesTemplates(): Promise<CartesTemplatesResponse> {
  return api(`${BASE}/cartes/templates`, { method: "GET" });
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITAIRES — déclenchement download depuis un Blob
// ═══════════════════════════════════════════════════════════════════════

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// ═══════════════════════════════════════════════════════════════════════
// ENSEIGNANTS — affectations, charge, historique
// ═══════════════════════════════════════════════════════════════════════

export interface AffectationEnseignant {
  affectation_id: string;
  matiere_classe_id: string;
  matiere_id: string;
  matiere: string;
  code_matiere: string;
  classe_id: string;
  classe_libelle: string;
  coefficient: number;
  volume_horaire_hebdo: number;
  annee_scolaire_id: string;
  date_debut: string;
  date_fin: string | null;
  statut: "actif" | "termine" | "annule";
  motif: string | null;
  note: string | null;
}

export interface ChargeHoraireClasse {
  classe_id: string;
  classe_libelle: string;
  matieres: { matiere: string; coefficient: number; heures_hebdo: number }[];
  heures_hebdo: number;
}

export interface ChargeHoraireEnseignant {
  employe_id: string;
  nom_complet: string;
  volume_horaire_contractuel: number | null;
  total_heures_hebdo_reelles: number;
  ecart_vs_contrat: number | null;
  alerte_charge: string | null;
  nb_classes: number;
  nb_matieres: number;
  detail_par_classe: ChargeHoraireClasse[];
}

export interface HistoriqueCreneau {
  creneau_id: string;
  matiere: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  date_debut_validite: string;
  date_fin_validite: string | null;
  motif_changement: string | null;
  actif_actuellement: boolean;
}

export async function ecoleActiverPortailEnseignant(
  employe_id: string,
  mot_de_passe?: string,
): Promise<{ status: string; mot_de_passe_temporaire: string | null; avertissement: string }> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/activer-portail`, {
    method: "POST",
    body: { mot_de_passe },
  });
}

export async function ecoleListerAffectationsEnseignant(
  employe_id: string,
  params?: { annee_scolaire_id?: string; inclure_historique?: boolean },
): Promise<AffectationEnseignant[]> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/affectations`, {
    method: "GET",
    query: params,
  });
}

export async function ecoleAffecterMasse(
  employe_id: string,
  body: {
    annee_scolaire_id: string;
    matiere_classe_ids: string[];
    date_debut?: string;
    forcer_remplacement?: boolean;
  },
): Promise<{ crees: number; affectation_ids: string[] }> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/affectations`, {
    method: "POST",
    body,
  });
}

export async function ecoleRetirerAffectation(
  matiere_classe_id: string,
  params?: { date_fin?: string; motif?: string },
): Promise<{ status: string; creneaux_edt_restants: number; avertissement: string | null }> {
  return api(
    `${BASE}/matieres-classe/${encodeURIComponent(matiere_classe_id)}/enseignant`,
    { method: "DELETE", query: params },
  );
}

export async function ecoleChangerEnseignant(
  matiere_classe_id: string,
  body: { nouveau_enseignant_id: string; date_effet: string; motif: string },
): Promise<{
  ancien_enseignant_id: string;
  ancien_date_fin: string;
  nouvelle_affectation_id: string;
  nouveau_enseignant_id: string;
  date_debut: string;
}> {
  return api(
    `${BASE}/matieres-classe/${encodeURIComponent(matiere_classe_id)}/changer-enseignant`,
    { method: "POST", body },
  );
}

export async function ecoleChargeHoraireEnseignant(
  employe_id: string,
  annee_scolaire_id?: string,
): Promise<ChargeHoraireEnseignant> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/charge-horaire`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

export interface CreneauBulkItem {
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
}

export async function ecoleCreerCreneauxBulk(
  classe_id: string,
  body: { creneaux: CreneauBulkItem[]; forcer_malgre_conflits?: boolean },
): Promise<{ crees: number; creneau_ids: string[] }> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}/bulk`, {
    method: "POST",
    body,
  });
}

export async function ecoleHistoriqueEdt(
  classe_id: string,
  params?: { date_debut?: string; date_fin?: string },
): Promise<HistoriqueCreneau[]> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}/historique`, {
    method: "GET",
    query: params,
  });
}



// ═══════════════════════════════════════════════════════════════════════
// ENSEIGNANTS — parcours & statistiques cumulées
// ═══════════════════════════════════════════════════════════════════════

export interface ClasseDetailleeParcours {
  classe_id: string;
  classe_libelle: string;
  matieres: string[];
  heures_hebdo: number;
  nb_eleves: number;
}

export interface EvolutionPeriode {
  periode: string;
  moyenne: number;
  nb_notes: number;
}

export interface AnneeParcoursEnseignant {
  annee_scolaire_id: string;
  nom_complet: string;
  poste: string;
  specialite: string | null;
  heures_contractuelles_hebdo: number | null;
  heures_reelles_moyenne_hebdo: number;
  heures_totales_annuelles: number;
  taux_occupation_pct: number | null;
  nb_classes_distinctes: number;
  nb_matieres_enseignees: number;
  nb_eleves_total: number;
  classes_detaillees: ClasseDetailleeParcours[];
  moyenne_eleves_globale: number | null;
  taux_reussite_pct: number | null;
  evolution_par_periode: EvolutionPeriode[];
  nb_remplacements_subis: number;
  nb_remplacements_effectues: number;
  score_performance: number | null;
}

export interface CumulsCarriereEnseignant {
  heures_totales: number;
  nb_annees_enseignement: number;
  nb_eleves_cumules: number;
  nb_classes_distinctes: number;
  matieres_enseignees: string[];
  moyenne_carriere: number | null;
  tendance: "hausse" | "baisse" | "stable";
}

export interface ParcoursCompletEnseignant {
  employe_id: string;
  nb_annees: number;
  annees: AnneeParcoursEnseignant[];
  cumuls_carriere: CumulsCarriereEnseignant;
}

export async function ecoleParcoursEnseignant(
  employe_id: string,
): Promise<ParcoursCompletEnseignant> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/parcours`, {
    method: "GET",
  });
}

export async function ecoleRecalculerParcoursEnseignant(
  employe_id: string,
): Promise<{ annees_reconstruites: number }> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/parcours/recalculer`, {
    method: "POST",
  });
}

export async function ecoleRecalculerParcoursTousEnseignants(): Promise<{
  reconstruits: number;
  erreurs: number;
}> {
  return api(`${BASE}/enseignants/parcours/recalculer-tous`, { method: "POST" });
}

export async function ecoleStatsCumuleesEnseignant(
  employe_id: string,
): Promise<{ employe_id: string } & CumulsCarriereEnseignant> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}/stats-cumulees`, {
    method: "GET",
  });
}







