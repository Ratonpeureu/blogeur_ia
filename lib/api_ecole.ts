// lib/api/api_ecole.ts
// Client HTTP du module École.
// Source de vérité unique :
//   - rh_manager/routes/route_ecole.py           (prefix "/api/ecole")
//   - rh_manager/routes/route_ecole_extended.py  (prefix "/api/ecole")
// Aucune route non exposée par le backend n'est déclarée ici.
// `entreprise_id` n'est JAMAIS envoyé par le client (Depends(verify_ip_allowed)),
// ni les champs dérivés de get_current_user (saisie_par, encaisse_par, fait_par,
// pointe_par, traite_par, decidee_par, demande_par, approuve_par, created_by,
// organisee_par, convoque_par).

import { api } from "../api";

const BASE = "/api/ecole";

// ═══════════════════════════════════════════════════════════════════════
// TYPES GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Les routes renvoient `model_dump()` de modèles SQLModel.
 * Les champs déclarés ci-dessous sont uniquement ceux effectivement
 * manipulés dans le code backend fourni ; la signature d'index conserve
 * les colonnes du modèle non visibles depuis les routes/services communiqués.
 */
export interface ModelDump {
  [key: string]: unknown;
}

/** Modèle dont aucune colonne n'est visible dans le code backend fourni. */
export type OpaqueModel = ModelDump;

/** Payload accepté tel quel par les routes déclarées `data: dict`. */
export type DictPayload = Record<string, unknown>;

export interface StatusSupprimee {
  status: "supprimee";
}
export interface StatusSupprime {
  status: "supprime";
}
export interface StatusApprouvee {
  status: "approuvee";
}
export interface StatusNotifie {
  status: "notifie";
}

// ═══════════════════════════════════════════════════════════════════════
// RÉFÉRENTIEL / CLASSES / EDT
// ═══════════════════════════════════════════════════════════════════════

export type TypeOrganisationEdt = "fixe" | "variable";

export interface Cycle extends ModelDump {
  id: string;
  entreprise_id: string;
  ordre: number;
  type_organisation_edt: TypeOrganisationEdt;
}

export interface Niveau extends ModelDump {
  id: string;
  cycle_id: string;
  libelle: string;
  ordre: number;
  a_series: boolean;
  type_organisation_edt: TypeOrganisationEdt | null;
}

export interface SerieLycee extends ModelDump {
  id: string;
  entreprise_id: string;
  actif: boolean;
}

export interface Classe extends ModelDump {
  id: string;
  entreprise_id: string;
  annee_scolaire_id: string;
  niveau_id: string;
  serie_id: string | null;
  libelle: string;
  effectif_max: number;
  type_organisation_edt_effectif: TypeOrganisationEdt;
}

/** Retour de classe_service.creer_classe */
export interface CreerClasseResult {
  classe: Classe;
  type_edt_resolu: TypeOrganisationEdt;
  /** Présent uniquement si type_edt_resolu === "fixe" et génération demandée. */
  horaire_genere?: number;
}

/** Retour de classe_service.basculer_type_edt */
export interface BasculerEdtResult {
  ancien_type: TypeOrganisationEdt;
  nouveau_type: TypeOrganisationEdt;
}

export interface CreneauJourneeComplete {
  heure_debut: string;
  heure_fin: string;
  type: "journee_complete";
}

export interface CreneauMatiere {
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string | null;
}

/**
 * Grille indexée par jour_semaine (0 = lundi … 6 = dimanche).
 * Les clés arrivent en JSON sous forme de chaînes.
 */
export type GrilleEdtClasse = Record<string, CreneauMatiere[]>;

/** Retour de get_emploi_du_temps_unifie */
export type EmploiDuTempsUnifie =
  | { mode: "fixe"; grille: Record<string, CreneauJourneeComplete[]> }
  | { mode: "variable"; grille: GrilleEdtClasse };

export interface CreneauEmploiDuTemps extends ModelDump {
  id: string;
  entreprise_id: string;
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  date_debut_validite?: string | null;
  date_fin_validite?: string | null;
  motif_changement?: string | null;
}

export type TypeConflitCreneau =
  | "conflit_enseignant"
  | "conflit_classe"
  | "conflit_salle";

export interface ConflitCreneau {
  type: TypeConflitCreneau;
  message: string;
  creneau_existant_id: string;
}

/** Retour de creer_creneau_avec_verification */
export interface CreerCreneauResult {
  creneau: CreneauEmploiDuTemps;
  conflits_ignores: ConflitCreneau[];
}

/** Retour de remplacer_creneau */
export interface RemplacerCreneauResult {
  ancien_creneau_cloture: string;
  nouveau_creneau: CreneauEmploiDuTemps;
}

/** Créneau tel que renvoyé par get_emploi_du_temps_enseignant */
export interface CreneauEnseignant {
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  classe: string;
  salle: string | null;
}

export interface EmploiDuTempsEnseignant {
  grille: Record<string, CreneauEnseignant[]>;
  total_heures_semaine: number;
}

// ── Matières / périodes / barèmes ──────────────────────────────────────

export interface Matiere extends ModelDump {
  id: string;
  entreprise_id: string;
  libelle: string;
}

export interface MatiereClasse extends ModelDump {
  id: string;
  matiere_id: string;
  classe_id: string;
  enseignant_id: string | null;
  coefficient: number;
}

/** Retour de GET /classes/{classe_id}/matieres (projection explicite). */
export interface MatiereClasseListItem {
  matiere_classe_id: string;
  matiere: string;
  coefficient: number;
  enseignant_id: string | null;
}

export interface Periode extends ModelDump {
  id: string;
  annee_scolaire_id: string;
  ordre: number;
}

export type BaremeNotation = ModelDump;
export type TypeEvaluation = ModelDump;

// ═══════════════════════════════════════════════════════════════════════
// ÉLÈVES / INSCRIPTIONS / NOTES / BULLETINS
// ═══════════════════════════════════════════════════════════════════════

export interface Eleve extends ModelDump {
  id: string;
  entreprise_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  statut: string;
  date_entree_etablissement: string;
  etablissement_provenance: string | null;
  allergies: string | null;
}

export type StatutInscription = "confirmee" | string;

export interface Inscription extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  classe_id: string;
  annee_scolaire_id: string;
  est_redoublant: boolean;
  date_inscription: string;
  statut_inscription: StatutInscription;
}

export interface InscrireBody {
  eleve_id: string;
  classe_id: string;
  annee_scolaire_id: string;
  /** Défaut backend : false */
  est_redoublant?: boolean;
  date_inscription: string;
}

export interface InscrireResult {
  inscription: Inscription;
  /** Nombre d'échéances générées par generer_echeancier_inscription. */
  echeancier_genere: number;
}

export interface SaisirNoteBody {
  evaluation_id: string;
  eleve_id: string;
  valeur_numerique?: number | null;
  /** Défaut backend : false */
  absent?: boolean;
  commentaire?: string | null;
}

export interface Note extends ModelDump {
  id: string;
  entreprise_id: string;
  evaluation_id: string;
  eleve_id: string;
  valeur_numerique: number | null;
  absent: boolean;
  commentaire: string | null;
  saisie_par: string;
}

export interface LigneMatiereBulletin {
  matiere: string;
  coefficient: number;
  moyenne: number | null;
  appreciation: string | null;
}

/** model_dump de Bulletin — champs confirmés par generer_pdf_bulletin. */
export interface Bulletin extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  classe_id: string;
  periode_id: string;
  statut: string;
  detail_matieres: LigneMatiereBulletin[];
  moyenne_generale: number;
  moyenne_classe: number;
  rang_classe: number;
  effectif_classe: number;
  mention: string | null;
  nb_absences_periode: number;
  nb_retards_periode: number;
  appreciation_generale: string | null;
}

/** notes_service.calculer_bulletin_eleve — service non fourni, forme non supposée. */
export type ApercuBulletin = Record<string, unknown>;

/** notes_service.calculer_rangs_classe — service non fourni, forme non supposée. */
export type ClassementClasse = unknown;

export interface PublierBulletinBody {
  eleve_id: string;
  classe_id: string;
  periode_id: string;
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════════════════

export type StatutEcheance =
  | "a_venir"
  | "du"
  | "paye_partiel"
  | "paye"
  | "en_retard";

export interface EcheanceSituation {
  libelle: string;
  montant_du_fcfa: number;
  montant_paye_fcfa: number;
  date_echeance: string;
  statut: StatutEcheance;
}

export interface SituationFinanciereEleve {
  total_du_fcfa: number;
  total_paye_fcfa: number;
  solde_restant_fcfa: number;
  echeances: EcheanceSituation[];
}

/** get_situation_financiere_complete = base + crédit + pénalités. */
export interface SituationFinanciereComplete extends SituationFinanciereEleve {
  solde_credit_fcfa: number;
  total_penalites_fcfa: number;
}

export interface PaiementBody {
  eleve_id: string;
  montant_fcfa: number;
  mode_paiement: string;
  date_paiement: string;
  echeance_ids_prioritaires?: string[] | null;
}

/** Retour de finance_scolaire_service.enregistrer_paiement */
export interface PaiementResult {
  recu_numero: string;
  montant_affecte: number;
  excedent_non_affecte: number;
}

/** Retour de finance_avancee_service.enregistrer_paiement_avec_credit */
export interface PaiementAvecCreditResult extends PaiementResult {
  /** Présent uniquement si excedent_non_affecte > 0. */
  excedent_credite?: number;
}

export interface PaiementAvecCreditBody {
  eleve_id: string;
  montant_fcfa: number;
  mode_paiement: string;
  date_paiement: string;
}

export type FrequenceApplicationPenalite = "unique" | "mensuelle_recurrente";

export interface PolitiquePenaliteRetard extends ModelDump {
  id: string;
  entreprise_id: string;
  active: boolean;
  taux_penalite_pct: number;
  plafond_penalite_pct: number;
  delai_grace_jours: number;
  frequence_application: FrequenceApplicationPenalite;
}

/** Retour de appliquer_penalites_retard */
export interface AppliquerPenalitesResult {
  appliquees: number;
  /** Présent uniquement si la politique est inactive ou absente. */
  motif?: string;
}

export interface MouvementCredit extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  type_mouvement: "alimentation" | "utilisation";
  montant_fcfa: number;
  solde_apres_fcfa: number;
  reference_paiement_id?: string | null;
  reference_echeance_id?: string | null;
  note?: string | null;
}

export interface GrilleFraisScolarite extends ModelDump {
  id: string;
  entreprise_id: string;
  annee_scolaire_id: string;
  niveau_id: string;
  frais_inscription_fcfa: number;
  frais_scolarite_annuel_fcfa: number;
  nb_tranches_paiement: number;
  frais_cantine_mensuel_fcfa: number | null;
}

export interface DepenseEtablissement extends ModelDump {
  id: string;
  entreprise_id: string;
  date_depense: string;
}

export interface DemandeAchat extends ModelDump {
  id: string;
  entreprise_id: string;
  statut: string;
  demande_par: string;
  approuve_par?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// PRÉSENCES
// ═══════════════════════════════════════════════════════════════════════

/** Élément du tableau `presences` attendu par POST /appels. */
export interface PresenceEleveInput {
  eleve_id: string;
  statut: string;
  minutes_retard?: number;
}

export interface AppelBody {
  matiere_classe_id: string;
  date_appel: string;
  heure_debut: string;
  presences: PresenceEleveInput[];
}

export interface AppelResult {
  appel_id: string;
  nb_eleves: number;
}

// ═══════════════════════════════════════════════════════════════════════
// ADMISSIONS
// ═══════════════════════════════════════════════════════════════════════

export interface CandidatureAdmission extends ModelDump {
  id: string;
  entreprise_id: string;
  statut: string;
  date_candidature: string;
  nom_candidat: string;
  prenom_candidat: string;
  date_naissance: string;
  etablissement_provenance: string | null;
  commentaire_evaluateur: string | null;
  position_liste_attente: number | null;
}

/** Retour de get_taux_remplissage_classes */
export interface TauxRemplissageClasse {
  classe: string;
  effectif_actuel: number;
  effectif_max: number;
  places_restantes: number;
  taux_remplissage_pct: number;
}

// ═══════════════════════════════════════════════════════════════════════
// BIBLIOTHÈQUE
// ═══════════════════════════════════════════════════════════════════════

export interface Ouvrage extends ModelDump {
  id: string;
  entreprise_id: string;
  titre: string;
  nb_exemplaires_total: number;
  nb_exemplaires_disponibles: number;
}

export type StatutEmprunt = "en_cours" | "rendu" | "en_retard";

export interface EmpruntOuvrage extends ModelDump {
  id: string;
  entreprise_id: string;
  ouvrage_id: string;
  eleve_id: string | null;
  employe_id: string | null;
  date_emprunt: string;
  date_retour_prevue: string;
  date_retour_effective: string | null;
  statut: StatutEmprunt;
}

export interface EmprunterBody {
  ouvrage_id: string;
  eleve_id?: string | null;
  employe_id?: string | null;
}

export interface RetournerResult {
  statut: "rendu";
}

// ═══════════════════════════════════════════════════════════════════════
// CANTINE
// ═══════════════════════════════════════════════════════════════════════

export interface MenuCantine extends ModelDump {
  id: string;
  entreprise_id: string;
  date_service: string;
  type_repas: string;
  allergenes_presents: string[];
}

export type AbonnementCantine = ModelDump;

export interface PointerRepasBody {
  eleve_id: string;
  date_service: string;
  /** Défaut backend : "dejeuner" */
  type_repas?: string;
}

/** Retour de cantine_service.pointer_repas (deux formes possibles). */
export type PointerRepasResult =
  | { deja_pointe: true; alerte_allergene: string[] }
  | {
      pointe: true;
      alerte_allergene: string[];
      message_alerte: string | null;
    };

export interface EleveARisqueAllergene {
  eleve_id: string;
  nom: string;
  type_repas: string;
  allergenes_conflit: string[];
}

export interface MenuDuJourAvecAlertes {
  menus: MenuCantine[];
  eleves_a_risque: EleveARisqueAllergene[];
}

export interface FacturationCantineResult {
  mois: string;
  montant_fcfa: number;
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSPORT
// ═══════════════════════════════════════════════════════════════════════

export type Vehicule = ModelDump;

export type CircuitTransport = ModelDump;

export interface AbonnementTransport extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  circuit_aller_id: string | null;
  actif: boolean;
}

export interface PointerTransportBody {
  eleve_id: string;
  circuit_id: string;
  date_trajet: string;
  /** Valeurs exploitées par detecter_anomalies_transport : "montee" | "descente". */
  evenement: string;
}

export interface PointerTransportResult {
  pointe: true;
}

export type TypeAnomalieTransport = "descente_manquante" | "aucun_pointage";

export interface AnomalieTransport {
  eleve_id: string;
  type: TypeAnomalieTransport;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════
// INFIRMERIE
// ═══════════════════════════════════════════════════════════════════════

export interface VisiteInfirmerieBody {
  eleve_id: string;
  motif: string;
  symptomes?: string | null;
  soin_administre?: string | null;
  medicament_donne?: string | null;
  temperature_c?: number | null;
  /** Défaut backend : false */
  renvoi_domicile?: boolean;
  /** Défaut backend : false */
  parent_contacte?: boolean;
  suite_donnee?: string | null;
}

export interface ProtocoleUrgenceEleve extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  condition: string;
  protocole_texte: string;
  medicament_urgence: string | null;
  localisation_medicament: string | null;
}

/** Retour de enregistrer_visite : model_dump de la visite + protocole éventuel. */
export interface VisiteInfirmerie extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  motif: string;
  traite_par: string;
  date_visite: string;
  /** Présent uniquement si un protocole d'urgence existe pour l'élève. */
  protocole_urgence_existant?: {
    condition: string;
    protocole: string;
    medicament: string | null;
    localisation: string | null;
  };
}

export interface ContactUrgence {
  nom: string;
  telephone: string | null;
  lien: string;
  principal: boolean;
}

export interface ContactUrgenceEleve {
  contacts_urgence: ContactUrgence[];
  protocole_medical: ProtocoleUrgenceEleve | null;
}

export type VaccinationEleve = ModelDump;

/** Retour de get_vaccinations_a_relancer */
export interface VaccinationARelancer {
  eleve: string;
  vaccin: string;
  date_rappel: string;
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD DIRECTION
// ═══════════════════════════════════════════════════════════════════════

export interface SanctionRecenteDashboard {
  eleve_id: string;
  type: string;
  date: string;
  motif: string;
}

export interface DashboardDirection {
  effectifs: {
    total_eleves: number;
    nb_enseignants: number;
  };
  finance: {
    total_du_fcfa: number;
    total_encaisse_fcfa: number;
    taux_recouvrement_pct: number;
    nb_familles_en_retard: number;
  };
  discipline: {
    sanctions_recentes: SanctionRecenteDashboard[];
  };
  pedagogie: {
    nb_bulletins_publies: number;
  };
}

export interface TauxAbsenteismeClasse {
  classe: string;
  taux_absenteisme_pct: number;
}

// ═══════════════════════════════════════════════════════════════════════
// LIVRET / CODE D'ACCÈS / DISCIPLINE / PATRIMOINE / VIE SCOLAIRE
// ═══════════════════════════════════════════════════════════════════════

/** livret_service non fourni : formes de retour non supposées. */
export type LivretAnnuel = Record<string, unknown>;
export type LivretCloture = ModelDump;
export type ParcoursCompletEleve = unknown;

export interface ClotureAnneeBody {
  classe_id: string;
  decision: string;
  observations?: string | null;
}

export interface GenererCodeAccesResult {
  code: string;
}

export interface CodeAccesEnfant extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  code: string;
  actif: boolean;
  nb_utilisations: number;
}

export interface SanctionDisciplinaire extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  type_sanction: string;
  date_sanction: string;
  motif: string;
  decidee_par: string;
}

export type Salle = ModelDump;
export type MaterielPedagogique = ModelDump;

export interface EvenementEcole extends ModelDump {
  id: string;
  entreprise_id: string;
  date_debut: string;
  created_by: string;
}

export interface ReunionParentsEnseignants extends ModelDump {
  id: string;
  entreprise_id: string;
  date_reunion: string;
  organisee_par: string;
}

export interface Convocation extends ModelDump {
  id: string;
  entreprise_id: string;
  statut: string;
  date_convocation: string;
  convoque_par: string;
}

export interface SignatureRequise extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  signe: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════

export interface NotifierAbsenceBody {
  eleve_id: string;
  eleve_nom: string;
  date_absence: string;
  /** Défaut backend : false */
  justifiee?: boolean;
}

export interface NotifierUrgenceBody {
  eleve_id: string;
  eleve_nom: string;
  motif: string;
}

export interface NotificationParent extends ModelDump {
  id: string;
  entreprise_id: string;
  parent_id: string;
  eleve_id: string;
  type_notification: string;
  canal: string;
  contenu: string;
  statut_envoi: string;
  envoye_le: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ══  ROUTER route_ecole.py
// ═══════════════════════════════════════════════════════════════════════

// ── Classes ────────────────────────────────────────────────────────────

/** POST /api/ecole/classes — dict libre transmis tel quel au modèle Classe. */
export async function ecoleCreerClasse(data: DictPayload): Promise<Classe> {
  return api(`${BASE}/classes`, { method: "POST", body: data });
}

/** GET /api/ecole/classes?annee_scolaire_id=... */
export async function ecoleListClasses(
  annee_scolaire_id: string,
): Promise<Classe[]> {
  return api(`${BASE}/classes`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

/** POST /api/ecole/classes/creer-depuis-referentiel */
export async function ecoleCreerClasseDepuisReferentiel(body: {
  annee_scolaire_id: string;
  niveau_id: string;
  libelle: string;
  serie_id?: string | null;
  /** Défaut backend : 40 */
  effectif_max?: number;
}): Promise<CreerClasseResult> {
  return api(`${BASE}/classes/creer-depuis-referentiel`, {
    method: "POST",
    body,
  });
}

/** POST /api/ecole/classes/{classe_id}/basculer-type-edt */
export async function ecoleBasculerTypeEdt(
  classe_id: string,
  nouveau_type: TypeOrganisationEdt,
): Promise<BasculerEdtResult> {
  return api(
    `${BASE}/classes/${encodeURIComponent(classe_id)}/basculer-type-edt`,
    { method: "POST", body: { nouveau_type } },
  );
}

/** GET /api/ecole/classes/{classe_id}/emploi-du-temps — route unifiée fixe/variable. */
export async function ecoleGetEmploiDuTemps(
  classe_id: string,
): Promise<EmploiDuTempsUnifie> {
  return api(
    `${BASE}/classes/${encodeURIComponent(classe_id)}/emploi-du-temps`,
    { method: "GET" },
  );
}

/** GET /api/ecole/classes/{classe_id}/classement?periode_id=... */
export async function ecoleGetClassement(
  classe_id: string,
  periode_id: string,
): Promise<ClassementClasse> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/classement`, {
    method: "GET",
    query: { periode_id },
  });
}

// ── Référentiel ────────────────────────────────────────────────────────

/** GET /api/ecole/referentiel/cycles */
export async function ecoleListerCycles(): Promise<Cycle[]> {
  return api(`${BASE}/referentiel/cycles`, { method: "GET" });
}

/** GET /api/ecole/referentiel/cycles/{cycle_id}/niveaux */
export async function ecoleListerNiveaux(cycle_id: string): Promise<Niveau[]> {
  return api(
    `${BASE}/referentiel/cycles/${encodeURIComponent(cycle_id)}/niveaux`,
    { method: "GET" },
  );
}

/** GET /api/ecole/referentiel/series */
export async function ecoleListerSeries(): Promise<SerieLycee[]> {
  return api(`${BASE}/referentiel/series`, { method: "GET" });
}

// ── Élèves & inscriptions ──────────────────────────────────────────────

/** POST /api/ecole/eleves — dict libre transmis tel quel au modèle Eleve. */
export async function ecoleCreerEleve(data: DictPayload): Promise<Eleve> {
  return api(`${BASE}/eleves`, { method: "POST", body: data });
}

/** POST /api/ecole/inscriptions — génère automatiquement l'échéancier. */
export async function ecoleInscrireEleve(
  body: InscrireBody,
): Promise<InscrireResult> {
  return api(`${BASE}/inscriptions`, { method: "POST", body });
}

/** GET /api/ecole/eleves/{eleve_id}/situation-financiere */
export async function ecoleGetSituationFinanciere(
  eleve_id: string,
): Promise<SituationFinanciereEleve> {
  return api(
    `${BASE}/eleves/${encodeURIComponent(eleve_id)}/situation-financiere`,
    { method: "GET" },
  );
}

// ── Notes ──────────────────────────────────────────────────────────────

/** POST /api/ecole/notes — upsert sur (evaluation_id, eleve_id). */
export async function ecoleSaisirNote(body: SaisirNoteBody): Promise<Note> {
  return api(`${BASE}/notes`, { method: "POST", body });
}

// ── Bulletins ──────────────────────────────────────────────────────────

/** GET /api/ecole/bulletins/apercu — calcul à la volée, non figé. */
export async function ecoleApercuBulletin(params: {
  eleve_id: string;
  classe_id: string;
  periode_id: string;
}): Promise<ApercuBulletin> {
  return api(`${BASE}/bulletins/apercu`, { method: "GET", query: params });
}

/** POST /api/ecole/bulletins/publier */
export async function ecolePublierBulletin(
  body: PublierBulletinBody,
): Promise<Bulletin> {
  return api(`${BASE}/bulletins/publier`, { method: "POST", body });
}

// ── Finance scolaire ───────────────────────────────────────────────────

/** POST /api/ecole/paiements — affectation FIFO, sauf echeance_ids_prioritaires. */
export async function ecoleEnregistrerPaiement(
  body: PaiementBody,
): Promise<PaiementResult> {
  return api(`${BASE}/paiements`, { method: "POST", body });
}

// ── Présences ──────────────────────────────────────────────────────────

/** POST /api/ecole/appels */
export async function ecoleFaireAppel(body: AppelBody): Promise<AppelResult> {
  return api(`${BASE}/appels`, { method: "POST", body });
}

// ═══════════════════════════════════════════════════════════════════════
// ══  ROUTER route_ecole_extended.py
// ═══════════════════════════════════════════════════════════════════════

// ── Matières ───────────────────────────────────────────────────────────

/** POST /api/ecole/matieres */
export async function ecoleCreerMatiere(data: DictPayload): Promise<Matiere> {
  return api(`${BASE}/matieres`, { method: "POST", body: data });
}

/** GET /api/ecole/matieres */
export async function ecoleListerMatieres(): Promise<Matiere[]> {
  return api(`${BASE}/matieres`, { method: "GET" });
}

/** DELETE /api/ecole/matieres/{matiere_id} */
export async function ecoleSupprimerMatiere(
  matiere_id: string,
): Promise<StatusSupprimee> {
  return api(`${BASE}/matieres/${encodeURIComponent(matiere_id)}`, {
    method: "DELETE",
  });
}

/** POST /api/ecole/matieres-classe */
export async function ecoleAffecterMatiereClasse(
  data: DictPayload,
): Promise<MatiereClasse> {
  return api(`${BASE}/matieres-classe`, { method: "POST", body: data });
}

/** GET /api/ecole/classes/{classe_id}/matieres */
export async function ecoleListerMatieresClasse(
  classe_id: string,
): Promise<MatiereClasseListItem[]> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/matieres`, {
    method: "GET",
  });
}

/** DELETE /api/ecole/matieres-classe/{matiere_classe_id} */
export async function ecoleRetirerMatiereClasse(
  matiere_classe_id: string,
): Promise<StatusSupprime> {
  return api(
    `${BASE}/matieres-classe/${encodeURIComponent(matiere_classe_id)}`,
    { method: "DELETE" },
  );
}

// ── Périodes / barèmes / types d'évaluation ────────────────────────────

/** POST /api/ecole/periodes */
export async function ecoleCreerPeriode(data: DictPayload): Promise<Periode> {
  return api(`${BASE}/periodes`, { method: "POST", body: data });
}

/** GET /api/ecole/annees/{annee_scolaire_id}/periodes */
export async function ecoleListerPeriodes(
  annee_scolaire_id: string,
): Promise<Periode[]> {
  return api(
    `${BASE}/annees/${encodeURIComponent(annee_scolaire_id)}/periodes`,
    { method: "GET" },
  );
}

/** POST /api/ecole/baremes-notation */
export async function ecoleCreerBareme(
  data: DictPayload,
): Promise<BaremeNotation> {
  return api(`${BASE}/baremes-notation`, { method: "POST", body: data });
}

/** GET /api/ecole/baremes-notation */
export async function ecoleListerBaremes(): Promise<BaremeNotation[]> {
  return api(`${BASE}/baremes-notation`, { method: "GET" });
}

/** POST /api/ecole/types-evaluation */
export async function ecoleCreerTypeEvaluation(
  data: DictPayload,
): Promise<TypeEvaluation> {
  return api(`${BASE}/types-evaluation`, { method: "POST", body: data });
}

/** GET /api/ecole/types-evaluation */
export async function ecoleListerTypesEvaluation(): Promise<TypeEvaluation[]> {
  return api(`${BASE}/types-evaluation`, { method: "GET" });
}

// ── Admissions ─────────────────────────────────────────────────────────

/** POST /api/ecole/admissions/candidatures */
export async function ecoleCreerCandidature(
  data: DictPayload,
): Promise<CandidatureAdmission> {
  return api(`${BASE}/admissions/candidatures`, { method: "POST", body: data });
}

/** GET /api/ecole/admissions/candidatures?statut=... */
export async function ecoleListerCandidatures(
  statut?: string,
): Promise<CandidatureAdmission[]> {
  return api(`${BASE}/admissions/candidatures`, {
    method: "GET",
    query: { statut },
  });
}

/** GET /api/ecole/admissions/candidatures/{candidature_id} */
export async function ecoleGetCandidature(
  candidature_id: string,
): Promise<CandidatureAdmission> {
  return api(
    `${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}`,
    { method: "GET" },
  );
}

/** POST /api/ecole/admissions/candidatures/{candidature_id}/statuer */
export async function ecoleStatuerCandidature(
  candidature_id: string,
  body: { nouveau_statut: string; commentaire?: string | null },
): Promise<CandidatureAdmission> {
  return api(
    `${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}/statuer`,
    { method: "POST", body },
  );
}

/** POST /api/ecole/admissions/candidatures/{candidature_id}/convertir */
export async function ecoleConvertirCandidature(
  candidature_id: string,
  matricule: string,
): Promise<Eleve> {
  return api(
    `${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}/convertir`,
    { method: "POST", body: { matricule } },
  );
}

/** GET /api/ecole/admissions/taux-remplissage?annee_scolaire_id=... */
export async function ecoleTauxRemplissage(
  annee_scolaire_id: string,
): Promise<TauxRemplissageClasse[]> {
  return api(`${BASE}/admissions/taux-remplissage`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

// ── Bibliothèque ───────────────────────────────────────────────────────

/**
 * POST /api/ecole/bibliotheque/ouvrages
 * Le backend initialise nb_exemplaires_disponibles depuis
 * data.nb_exemplaires_total (défaut 1).
 */
export async function ecoleCreerOuvrage(data: DictPayload): Promise<Ouvrage> {
  return api(`${BASE}/bibliotheque/ouvrages`, { method: "POST", body: data });
}

/** GET /api/ecole/bibliotheque/ouvrages?q=... (recherche sur le titre) */
export async function ecoleListerOuvrages(q?: string): Promise<Ouvrage[]> {
  return api(`${BASE}/bibliotheque/ouvrages`, { method: "GET", query: { q } });
}

/** DELETE /api/ecole/bibliotheque/ouvrages/{ouvrage_id} */
export async function ecoleSupprimerOuvrage(
  ouvrage_id: string,
): Promise<StatusSupprime> {
  return api(
    `${BASE}/bibliotheque/ouvrages/${encodeURIComponent(ouvrage_id)}`,
    { method: "DELETE" },
  );
}

/** POST /api/ecole/bibliotheque/emprunts */
export async function ecoleEmprunter(
  body: EmprunterBody,
): Promise<EmpruntOuvrage> {
  return api(`${BASE}/bibliotheque/emprunts`, { method: "POST", body });
}

/** POST /api/ecole/bibliotheque/emprunts/{emprunt_id}/retourner */
export async function ecoleRetournerEmprunt(
  emprunt_id: string,
): Promise<RetournerResult> {
  return api(
    `${BASE}/bibliotheque/emprunts/${encodeURIComponent(emprunt_id)}/retourner`,
    { method: "POST" },
  );
}

/** GET /api/ecole/bibliotheque/emprunts?eleve_id=...&statut=... */
export async function ecoleListerEmprunts(params?: {
  eleve_id?: string;
  statut?: StatutEmprunt | string;
}): Promise<EmpruntOuvrage[]> {
  return api(`${BASE}/bibliotheque/emprunts`, {
    method: "GET",
    query: params,
  });
}

// ── Cantine ────────────────────────────────────────────────────────────

/** POST /api/ecole/cantine/menus */
export async function ecoleCreerMenu(data: DictPayload): Promise<MenuCantine> {
  return api(`${BASE}/cantine/menus`, { method: "POST", body: data });
}

/** GET /api/ecole/cantine/menus?date_service=... */
export async function ecoleListerMenus(
  date_service?: string,
): Promise<MenuCantine[]> {
  return api(`${BASE}/cantine/menus`, {
    method: "GET",
    query: { date_service },
  });
}

/** POST /api/ecole/cantine/abonnements */
export async function ecoleCreerAbonnementCantine(
  data: DictPayload,
): Promise<AbonnementCantine> {
  return api(`${BASE}/cantine/abonnements`, { method: "POST", body: data });
}

/** GET /api/ecole/cantine/eleves/{eleve_id}/abonnements */
export async function ecoleAbonnementsCantineEleve(
  eleve_id: string,
): Promise<AbonnementCantine[]> {
  return api(
    `${BASE}/cantine/eleves/${encodeURIComponent(eleve_id)}/abonnements`,
    { method: "GET" },
  );
}

/** POST /api/ecole/cantine/pointer — contrôle allergènes inclus. */
export async function ecolePointerRepas(
  body: PointerRepasBody,
): Promise<PointerRepasResult> {
  return api(`${BASE}/cantine/pointer`, { method: "POST", body });
}

/** GET /api/ecole/cantine/menu-du-jour?date_service=...&classe_id=... */
export async function ecoleMenuDuJour(params: {
  date_service: string;
  classe_id: string;
}): Promise<MenuDuJourAvecAlertes> {
  return api(`${BASE}/cantine/menu-du-jour`, { method: "GET", query: params });
}

/** GET /api/ecole/cantine/eleves/{eleve_id}/facturation?mois=... */
export async function ecoleFacturationCantine(
  eleve_id: string,
  mois: string,
): Promise<FacturationCantineResult> {
  return api(
    `${BASE}/cantine/eleves/${encodeURIComponent(eleve_id)}/facturation`,
    { method: "GET", query: { mois } },
  );
}

// ── Transport ──────────────────────────────────────────────────────────

/** POST /api/ecole/transport/vehicules */
export async function ecoleCreerVehicule(data: DictPayload): Promise<Vehicule> {
  return api(`${BASE}/transport/vehicules`, { method: "POST", body: data });
}

/** GET /api/ecole/transport/vehicules */
export async function ecoleListerVehicules(): Promise<Vehicule[]> {
  return api(`${BASE}/transport/vehicules`, { method: "GET" });
}

/** POST /api/ecole/transport/circuits */
export async function ecoleCreerCircuit(
  data: DictPayload,
): Promise<CircuitTransport> {
  return api(`${BASE}/transport/circuits`, { method: "POST", body: data });
}

/** GET /api/ecole/transport/circuits */
export async function ecoleListerCircuits(): Promise<CircuitTransport[]> {
  return api(`${BASE}/transport/circuits`, { method: "GET" });
}

/** POST /api/ecole/transport/abonnements */
export async function ecoleCreerAbonnementTransport(
  data: DictPayload,
): Promise<AbonnementTransport> {
  return api(`${BASE}/transport/abonnements`, { method: "POST", body: data });
}

/** POST /api/ecole/transport/pointer */
export async function ecolePointerTransport(
  body: PointerTransportBody,
): Promise<PointerTransportResult> {
  return api(`${BASE}/transport/pointer`, { method: "POST", body });
}

/** GET /api/ecole/transport/anomalies?date_trajet=... */
export async function ecoleAnomaliesTransport(
  date_trajet: string,
): Promise<AnomalieTransport[]> {
  return api(`${BASE}/transport/anomalies`, {
    method: "GET",
    query: { date_trajet },
  });
}

// ── Infirmerie ─────────────────────────────────────────────────────────

/** POST /api/ecole/infirmerie/visites */
export async function ecoleEnregistrerVisite(
  body: VisiteInfirmerieBody,
): Promise<VisiteInfirmerie> {
  return api(`${BASE}/infirmerie/visites`, { method: "POST", body });
}

/** GET /api/ecole/infirmerie/visites?eleve_id=... */
export async function ecoleListerVisites(
  eleve_id?: string,
): Promise<VisiteInfirmerie[]> {
  return api(`${BASE}/infirmerie/visites`, {
    method: "GET",
    query: { eleve_id },
  });
}

/** GET /api/ecole/infirmerie/eleves/{eleve_id}/contact-urgence */
export async function ecoleContactUrgence(
  eleve_id: string,
): Promise<ContactUrgenceEleve> {
  return api(
    `${BASE}/infirmerie/eleves/${encodeURIComponent(eleve_id)}/contact-urgence`,
    { method: "GET" },
  );
}

/** POST /api/ecole/infirmerie/protocoles */
export async function ecoleCreerProtocole(
  data: DictPayload,
): Promise<ProtocoleUrgenceEleve> {
  return api(`${BASE}/infirmerie/protocoles`, { method: "POST", body: data });
}

/** GET /api/ecole/infirmerie/eleves/{eleve_id}/protocole — null si absent. */
export async function ecoleGetProtocole(
  eleve_id: string,
): Promise<ProtocoleUrgenceEleve | null> {
  return api(
    `${BASE}/infirmerie/eleves/${encodeURIComponent(eleve_id)}/protocole`,
    { method: "GET" },
  );
}

/** POST /api/ecole/infirmerie/vaccinations */
export async function ecoleCreerVaccination(
  data: DictPayload,
): Promise<VaccinationEleve> {
  return api(`${BASE}/infirmerie/vaccinations`, { method: "POST", body: data });
}

/** GET /api/ecole/infirmerie/vaccinations/a-relancer?jours_avant=30 */
export async function ecoleVaccinationsARelancer(
  jours_avant?: number,
): Promise<VaccinationARelancer[]> {
  return api(`${BASE}/infirmerie/vaccinations/a-relancer`, {
    method: "GET",
    query: { jours_avant },
  });
}

// ── Finance avancée ───────────────────────────────────────────────────

/** POST /api/ecole/finance/politique-penalite — upsert (une par entreprise). */
export async function ecoleDefinirPolitiquePenalite(
  data: DictPayload,
): Promise<PolitiquePenaliteRetard> {
  return api(`${BASE}/finance/politique-penalite`, {
    method: "POST",
    body: data,
  });
}

/** GET /api/ecole/finance/politique-penalite — null si non définie. */
export async function ecoleGetPolitiquePenalite(): Promise<PolitiquePenaliteRetard | null> {
  return api(`${BASE}/finance/politique-penalite`, { method: "GET" });
}

/** POST /api/ecole/finance/penalites/appliquer */
export async function ecoleAppliquerPenalites(): Promise<AppliquerPenalitesResult> {
  return api(`${BASE}/finance/penalites/appliquer`, { method: "POST" });
}

/** POST /api/ecole/finance/paiements-avec-credit — l'excédent part en crédit. */
export async function ecolePaiementAvecCredit(
  body: PaiementAvecCreditBody,
): Promise<PaiementAvecCreditResult> {
  return api(`${BASE}/finance/paiements-avec-credit`, { method: "POST", body });
}

/** GET /api/ecole/finance/eleves/{eleve_id}/situation-complete */
export async function ecoleSituationComplete(
  eleve_id: string,
): Promise<SituationFinanciereComplete> {
  return api(
    `${BASE}/finance/eleves/${encodeURIComponent(eleve_id)}/situation-complete`,
    { method: "GET" },
  );
}

/** GET /api/ecole/finance/eleves/{eleve_id}/mouvements-credit */
export async function ecoleMouvementsCredit(
  eleve_id: string,
): Promise<MouvementCredit[]> {
  return api(
    `${BASE}/finance/eleves/${encodeURIComponent(eleve_id)}/mouvements-credit`,
    { method: "GET" },
  );
}

/** POST /api/ecole/finance/grilles-frais */
export async function ecoleCreerGrilleFrais(
  data: DictPayload,
): Promise<GrilleFraisScolarite> {
  return api(`${BASE}/finance/grilles-frais`, { method: "POST", body: data });
}

/** GET /api/ecole/finance/grilles-frais?annee_scolaire_id=... */
export async function ecoleListerGrillesFrais(
  annee_scolaire_id: string,
): Promise<GrilleFraisScolarite[]> {
  return api(`${BASE}/finance/grilles-frais`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

/** GET /api/ecole/finance/depenses */
export async function ecoleListerDepenses(): Promise<DepenseEtablissement[]> {
  return api(`${BASE}/finance/depenses`, { method: "GET" });
}

/** POST /api/ecole/finance/depenses */
export async function ecoleCreerDepense(
  data: DictPayload,
): Promise<DepenseEtablissement> {
  return api(`${BASE}/finance/depenses`, { method: "POST", body: data });
}

/** POST /api/ecole/finance/demandes-achat */
export async function ecoleCreerDemandeAchat(
  data: DictPayload,
): Promise<DemandeAchat> {
  return api(`${BASE}/finance/demandes-achat`, { method: "POST", body: data });
}

/** GET /api/ecole/finance/demandes-achat?statut=... */
export async function ecoleListerDemandesAchat(
  statut?: string,
): Promise<DemandeAchat[]> {
  return api(`${BASE}/finance/demandes-achat`, {
    method: "GET",
    query: { statut },
  });
}

/** POST /api/ecole/finance/demandes-achat/{demande_id}/approuver */
export async function ecoleApprouverDemandeAchat(
  demande_id: string,
): Promise<StatusApprouvee> {
  return api(
    `${BASE}/finance/demandes-achat/${encodeURIComponent(demande_id)}/approuver`,
    { method: "POST" },
  );
}

// ── Emploi du temps variable ───────────────────────────────────────────

/** POST /api/ecole/edt/creneaux — 409 si conflits et forcer_malgre_conflits=false. */
export async function ecoleCreerCreneau(body: {
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
  /** Défaut backend : false */
  forcer_malgre_conflits?: boolean;
}): Promise<CreerCreneauResult> {
  return api(`${BASE}/edt/creneaux`, { method: "POST", body });
}

/** GET /api/ecole/edt/creneaux/verifier-conflits */
export async function ecoleVerifierConflitsCreneau(params: {
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
}): Promise<ConflitCreneau[]> {
  return api(`${BASE}/edt/creneaux/verifier-conflits`, {
    method: "GET",
    query: params,
  });
}

/** POST /api/ecole/edt/creneaux/{creneau_id}/remplacer */
export async function ecoleRemplacerCreneau(
  creneau_id: string,
  body: {
    heure_debut?: string | null;
    heure_fin?: string | null;
    salle?: string | null;
    jour_semaine?: number | null;
    date_effet: string;
    motif: string;
  },
): Promise<RemplacerCreneauResult> {
  return api(`${BASE}/edt/creneaux/${encodeURIComponent(creneau_id)}/remplacer`, {
    method: "POST",
    body,
  });
}

/** GET /api/ecole/edt/classes/{classe_id} */
export async function ecoleEdtClasse(
  classe_id: string,
): Promise<GrilleEdtClasse> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}`, {
    method: "GET",
  });
}

/** GET /api/ecole/edt/classes/{classe_id}/a-date?date_reference=... */
export async function ecoleEdtClasseADate(
  classe_id: string,
  date_reference: string,
): Promise<GrilleEdtClasse> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}/a-date`, {
    method: "GET",
    query: { date_reference },
  });
}

/** GET /api/ecole/edt/enseignants/{enseignant_id} */
export async function ecoleEdtEnseignant(
  enseignant_id: string,
): Promise<EmploiDuTempsEnseignant> {
  return api(`${BASE}/edt/enseignants/${encodeURIComponent(enseignant_id)}`, {
    method: "GET",
  });
}

// ── Dashboard direction ────────────────────────────────────────────────

/** GET /api/ecole/dashboard/direction?annee_scolaire_id=... */
export async function ecoleDashboardDirection(
  annee_scolaire_id: string,
): Promise<DashboardDirection> {
  return api(`${BASE}/dashboard/direction`, {
    method: "GET",
    query: { annee_scolaire_id },
  });
}

/** GET /api/ecole/dashboard/absenteisme?date_debut=...&date_fin=... */
export async function ecoleTauxAbsenteisme(params: {
  date_debut: string;
  date_fin: string;
}): Promise<TauxAbsenteismeClasse[]> {
  return api(`${BASE}/dashboard/absenteisme`, { method: "GET", query: params });
}

// ── Livret scolaire pluriannuel ────────────────────────────────────────

/** GET /api/ecole/livret/eleves/{eleve_id}/annees/{annee_scolaire_id} */
export async function ecoleLivretAnnuel(
  eleve_id: string,
  annee_scolaire_id: string,
): Promise<LivretAnnuel> {
  return api(
    `${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/annees/${encodeURIComponent(annee_scolaire_id)}`,
    { method: "GET" },
  );
}

/** POST /api/ecole/livret/eleves/{eleve_id}/annees/{annee_scolaire_id}/cloturer */
export async function ecoleCloturerAnnee(
  eleve_id: string,
  annee_scolaire_id: string,
  body: ClotureAnneeBody,
): Promise<LivretCloture> {
  return api(
    `${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/annees/${encodeURIComponent(annee_scolaire_id)}/cloturer`,
    { method: "POST", body },
  );
}

/** GET /api/ecole/livret/eleves/{eleve_id}/parcours */
export async function ecoleParcoursComplet(
  eleve_id: string,
): Promise<ParcoursCompletEleve> {
  return api(`${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/parcours`, {
    method: "GET",
  });
}

// ── Code d'accès enfant ────────────────────────────────────────────────

/** POST /api/ecole/eleves/{eleve_id}/generer-code-acces */
export async function ecoleGenererCodeAcces(
  eleve_id: string,
): Promise<GenererCodeAccesResult> {
  return api(
    `${BASE}/eleves/${encodeURIComponent(eleve_id)}/generer-code-acces`,
    { method: "POST" },
  );
}

/** GET /api/ecole/eleves/{eleve_id}/code-acces — null si aucun code. */
export async function ecoleGetCodeAcces(
  eleve_id: string,
): Promise<CodeAccesEnfant | null> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/code-acces`, {
    method: "GET",
  });
}

// ── Discipline ─────────────────────────────────────────────────────────

/** POST /api/ecole/discipline/sanctions */
export async function ecoleCreerSanction(
  data: DictPayload,
): Promise<SanctionDisciplinaire> {
  return api(`${BASE}/discipline/sanctions`, { method: "POST", body: data });
}

/** GET /api/ecole/discipline/eleves/{eleve_id}/sanctions */
export async function ecoleSanctionsEleve(
  eleve_id: string,
): Promise<SanctionDisciplinaire[]> {
  return api(
    `${BASE}/discipline/eleves/${encodeURIComponent(eleve_id)}/sanctions`,
    { method: "GET" },
  );
}

// ── Patrimoine ─────────────────────────────────────────────────────────

/** POST /api/ecole/patrimoine/salles */
export async function ecoleCreerSalle(data: DictPayload): Promise<Salle> {
  return api(`${BASE}/patrimoine/salles`, { method: "POST", body: data });
}

/** GET /api/ecole/patrimoine/salles */
export async function ecoleListerSalles(): Promise<Salle[]> {
  return api(`${BASE}/patrimoine/salles`, { method: "GET" });
}

/** POST /api/ecole/patrimoine/materiel */
export async function ecoleCreerMateriel(
  data: DictPayload,
): Promise<MaterielPedagogique> {
  return api(`${BASE}/patrimoine/materiel`, { method: "POST", body: data });
}

/** GET /api/ecole/patrimoine/materiel */
export async function ecoleListerMateriel(): Promise<MaterielPedagogique[]> {
  return api(`${BASE}/patrimoine/materiel`, { method: "GET" });
}

// ── Événements / réunions / convocations / signatures ──────────────────

/** POST /api/ecole/evenements */
export async function ecoleCreerEvenement(
  data: DictPayload,
): Promise<EvenementEcole> {
  return api(`${BASE}/evenements`, { method: "POST", body: data });
}

/** GET /api/ecole/evenements */
export async function ecoleListerEvenements(): Promise<EvenementEcole[]> {
  return api(`${BASE}/evenements`, { method: "GET" });
}

/** POST /api/ecole/reunions */
export async function ecoleCreerReunion(
  data: DictPayload,
): Promise<ReunionParentsEnseignants> {
  return api(`${BASE}/reunions`, { method: "POST", body: data });
}

/** GET /api/ecole/reunions */
export async function ecoleListerReunions(): Promise<
  ReunionParentsEnseignants[]
> {
  return api(`${BASE}/reunions`, { method: "GET" });
}

/** POST /api/ecole/convocations */
export async function ecoleCreerConvocation(
  data: DictPayload,
): Promise<Convocation> {
  return api(`${BASE}/convocations`, { method: "POST", body: data });
}

/** GET /api/ecole/convocations?statut=... */
export async function ecoleListerConvocations(
  statut?: string,
): Promise<Convocation[]> {
  return api(`${BASE}/convocations`, { method: "GET", query: { statut } });
}

/** POST /api/ecole/signatures */
export async function ecoleCreerSignatureRequise(
  data: DictPayload,
): Promise<SignatureRequise> {
  return api(`${BASE}/signatures`, { method: "POST", body: data });
}

/**
 * GET /api/ecole/signatures?eleve_id=...&signe=...
 * `signe` est filtré côté backend uniquement s'il est fourni ; ne pas
 * passer la clé pour ne pas filtrer.
 */
export async function ecoleListerSignatures(params?: {
  eleve_id?: string;
  signe?: boolean;
}): Promise<SignatureRequise[]> {
  return api(`${BASE}/signatures`, { method: "GET", query: params });
}

// ── Notifications ──────────────────────────────────────────────────────

/** POST /api/ecole/notifications/absence */
export async function ecoleNotifierAbsence(
  body: NotifierAbsenceBody,
): Promise<StatusNotifie> {
  return api(`${BASE}/notifications/absence`, { method: "POST", body });
}

/** POST /api/ecole/notifications/urgence-sante */
export async function ecoleNotifierUrgenceSante(
  body: NotifierUrgenceBody,
): Promise<StatusNotifie> {
  return api(`${BASE}/notifications/urgence-sante`, { method: "POST", body });
}

/** GET /api/ecole/notifications/journal?eleve_id=... (200 dernières) */
export async function ecoleJournalNotifications(
  eleve_id?: string,
): Promise<NotificationParent[]> {
  return api(`${BASE}/notifications/journal`, {
    method: "GET",
    query: { eleve_id },
  });
}