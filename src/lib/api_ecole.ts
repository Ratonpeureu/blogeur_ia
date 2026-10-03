// lib/api_ecole.ts
// Client HTTP du module École — source de vérité unique : le backend.
// `entreprise_id` n'est JAMAIS envoyé par le client, ni les champs dérivés
// de get_current_user.

import { api } from "@/lib/api";

const BASE = "/api/ecole";

// ═══════════════════════════════════════════════════════════════════════
// TYPES GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════════════

export interface ModelDump {
  [key: string]: unknown;
}

export type OpaqueModel = ModelDump;

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

export interface CreerClasseResult {
  classe: Classe;
  type_edt_resolu: TypeOrganisationEdt;
  horaire_genere?: number;
}

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

export type GrilleEdtClasse = Record<string, CreneauMatiere[]>;

export type EmploiDuTempsUnifie =
{mode: "fixe";grille: Record<string, CreneauJourneeComplete[]>;} |
{mode: "variable";grille: GrilleEdtClasse;};

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
"conflit_enseignant" |
"conflit_classe" |
"conflit_salle";

export interface ConflitCreneau {
  type: TypeConflitCreneau;
  message: string;
  creneau_existant_id: string;
}

export interface CreerCreneauResult {
  creneau: CreneauEmploiDuTemps;
  conflits_ignores: ConflitCreneau[];
}

export interface RemplacerCreneauResult {
  ancien_creneau_cloture: string;
  nouveau_creneau: CreneauEmploiDuTemps;
}

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


export interface AnneeScolaire extends ModelDump {
  id: string;
  libelle: string;
  est_active: boolean;
}

export async function ecoleListerAnnees(): Promise<AnneeScolaire[]> {
  return api(`${BASE}/annees`, { method: "GET" });
}

export async function ecoleAnneeActive(): Promise<AnneeScolaire | null> {
  return api(`${BASE}/annees/active`, { method: "GET" });
}
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
  est_redoublant?: boolean;
  date_inscription: string;
}

export interface InscrireResult {
  inscription: Inscription;
  echeancier_genere: number;
}

export interface SaisirNoteBody {
  evaluation_id: string;
  eleve_id: string;
  valeur_numerique?: number | null;
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

export type ApercuBulletin = Record<string, unknown>;
export type ClassementClasse = unknown;

export interface PublierBulletinBody {
  eleve_id: string;
  classe_id: string;
  periode_id: string;
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════════════════

export type StatutEcheance = "a_venir" | "du" | "paye_partiel" | "paye" | "en_retard";

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

export interface PaiementResult {
  recu_numero: string;
  montant_affecte: number;
  excedent_non_affecte: number;
}

export interface PaiementAvecCreditResult extends PaiementResult {
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

export interface AppliquerPenalitesResult {
  appliquees: number;
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
  type_repas?: string;
}

export type PointerRepasResult =
{deja_pointe: true;alerte_allergene: string[];} |
{pointe: true;alerte_allergene: string[];message_alerte: string | null;};

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
  renvoi_domicile?: boolean;
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

export interface VisiteInfirmerie extends ModelDump {
  id: string;
  entreprise_id: string;
  eleve_id: string;
  motif: string;
  traite_par: string;
  date_visite: string;
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

export async function ecoleCreerClasse(data: DictPayload): Promise<Classe> {
  return api(`${BASE}/classes`, { method: "POST", body: data });
}

export async function ecoleListClasses(annee_scolaire_id: string): Promise<Classe[]> {
  return api(`${BASE}/classes`, { method: "GET", query: { annee_scolaire_id } });
}

export async function ecoleCreerClasseDepuisReferentiel(body: {
  annee_scolaire_id?: string | null;   // ← facultatif
  niveau_id: string;
  libelle: string;
  serie_id?: string | null;
  effectif_max?: number;
}): Promise<CreerClasseResult> {
  return api(`${BASE}/classes/creer-depuis-referentiel`, { method: "POST", body });
}

export async function ecoleBasculerTypeEdt(
classe_id: string,
nouveau_type: TypeOrganisationEdt)
: Promise<BasculerEdtResult> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/basculer-type-edt`, {
    method: "POST",
    body: { nouveau_type }
  });
}

export async function ecoleGetEmploiDuTemps(classe_id: string): Promise<EmploiDuTempsUnifie> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/emploi-du-temps`, {
    method: "GET"
  });
}

export async function ecoleGetClassement(
classe_id: string,
periode_id: string)
: Promise<ClassementClasse> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/classement`, {
    method: "GET",
    query: { periode_id }
  });
}

export async function ecoleListerCycles(): Promise<Cycle[]> {
  return api(`${BASE}/referentiel/cycles`, { method: "GET" });
}

export async function ecoleListerNiveaux(cycle_id: string): Promise<Niveau[]> {
  return api(`${BASE}/referentiel/cycles/${encodeURIComponent(cycle_id)}/niveaux`, {
    method: "GET"
  });
}

export async function ecoleListerSeries(): Promise<SerieLycee[]> {
  return api(`${BASE}/referentiel/series`, { method: "GET" });
}

export async function ecoleCreerEleve(data: DictPayload): Promise<Eleve> {
  return api(`${BASE}/eleves`, { method: "POST", body: data });
}

export async function ecoleInscrireEleve(body: InscrireBody): Promise<InscrireResult> {
  return api(`${BASE}/inscriptions`, { method: "POST", body });
}

export async function ecoleGetSituationFinanciere(
eleve_id: string)
: Promise<SituationFinanciereEleve> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/situation-financiere`, {
    method: "GET"
  });
}

export async function ecoleSaisirNote(body: SaisirNoteBody): Promise<Note> {
  return api(`${BASE}/notes`, { method: "POST", body });
}

export async function ecoleApercuBulletin(params: {
  eleve_id: string;
  classe_id: string;
  periode_id: string;
}): Promise<ApercuBulletin> {
  return api(`${BASE}/bulletins/apercu`, { method: "GET", query: params });
}

export async function ecolePublierBulletin(body: PublierBulletinBody): Promise<Bulletin> {
  return api(`${BASE}/bulletins/publier`, { method: "POST", body });
}

export async function ecoleEnregistrerPaiement(body: PaiementBody): Promise<PaiementResult> {
  return api(`${BASE}/paiements`, { method: "POST", body });
}

export async function ecoleFaireAppel(body: AppelBody): Promise<AppelResult> {
  return api(`${BASE}/appels`, { method: "POST", body });
}

// ═══════════════════════════════════════════════════════════════════════
// ══  ROUTER route_ecole_extended.py
// ═══════════════════════════════════════════════════════════════════════

export async function ecoleCreerMatiere(data: DictPayload): Promise<Matiere> {
  return api(`${BASE}/matieres`, { method: "POST", body: data });
}

export async function ecoleListerMatieres(): Promise<Matiere[]> {
  return api(`${BASE}/matieres`, { method: "GET" });
}

export async function ecoleSupprimerMatiere(matiere_id: string): Promise<StatusSupprimee> {
  return api(`${BASE}/matieres/${encodeURIComponent(matiere_id)}`, { method: "DELETE" });
}

export async function ecoleAffecterMatiereClasse(data: DictPayload): Promise<MatiereClasse> {
  return api(`${BASE}/matieres-classe`, { method: "POST", body: data });
}

export async function ecoleListerMatieresClasse(
classe_id: string)
: Promise<MatiereClasseListItem[]> {
  return api(`${BASE}/classes/${encodeURIComponent(classe_id)}/matieres`, { method: "GET" });
}

export async function ecoleRetirerMatiereClasse(
matiere_classe_id: string)
: Promise<StatusSupprime> {
  return api(`${BASE}/matieres-classe/${encodeURIComponent(matiere_classe_id)}`, {
    method: "DELETE"
  });
}

export async function ecoleCreerPeriode(data: DictPayload): Promise<Periode> {
  return api(`${BASE}/periodes`, { method: "POST", body: data });
}

export async function ecoleListerPeriodes(annee_scolaire_id: string): Promise<Periode[]> {
  return api(`${BASE}/annees/${encodeURIComponent(annee_scolaire_id)}/periodes`, {
    method: "GET"
  });
}

export async function ecoleCreerBareme(data: DictPayload): Promise<BaremeNotation> {
  return api(`${BASE}/baremes-notation`, { method: "POST", body: data });
}

export async function ecoleListerBaremes(): Promise<BaremeNotation[]> {
  return api(`${BASE}/baremes-notation`, { method: "GET" });
}

export async function ecoleCreerTypeEvaluation(data: DictPayload): Promise<TypeEvaluation> {
  return api(`${BASE}/types-evaluation`, { method: "POST", body: data });
}

export async function ecoleListerTypesEvaluation(): Promise<TypeEvaluation[]> {
  return api(`${BASE}/types-evaluation`, { method: "GET" });
}

export async function ecoleCreerCandidature(
data: DictPayload)
: Promise<CandidatureAdmission> {
  return api(`${BASE}/admissions/candidatures`, { method: "POST", body: data });
}

export async function ecoleListerCandidatures(
statut?: string)
: Promise<CandidatureAdmission[]> {
  return api(`${BASE}/admissions/candidatures`, { method: "GET", query: { statut } });
}

export async function ecoleGetCandidature(
candidature_id: string)
: Promise<CandidatureAdmission> {
  return api(`${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}`, {
    method: "GET"
  });
}

export async function ecoleStatuerCandidature(
candidature_id: string,
body: {nouveau_statut: string;commentaire?: string | null;})
: Promise<CandidatureAdmission> {
  return api(
    `${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}/statuer`,
    { method: "POST", body }
  );
}

export async function ecoleConvertirCandidature(
candidature_id: string,
matricule: string)
: Promise<Eleve> {
  return api(
    `${BASE}/admissions/candidatures/${encodeURIComponent(candidature_id)}/convertir`,
    { method: "POST", body: { matricule } }
  );
}

export async function ecoleTauxRemplissage(
annee_scolaire_id: string)
: Promise<TauxRemplissageClasse[]> {
  return api(`${BASE}/admissions/taux-remplissage`, {
    method: "GET",
    query: { annee_scolaire_id }
  });
}

export async function ecoleCreerOuvrage(data: DictPayload): Promise<Ouvrage> {
  return api(`${BASE}/bibliotheque/ouvrages`, { method: "POST", body: data });
}

export async function ecoleListerOuvrages(q?: string): Promise<Ouvrage[]> {
  return api(`${BASE}/bibliotheque/ouvrages`, { method: "GET", query: { q } });
}

export async function ecoleSupprimerOuvrage(ouvrage_id: string): Promise<StatusSupprime> {
  return api(`${BASE}/bibliotheque/ouvrages/${encodeURIComponent(ouvrage_id)}`, {
    method: "DELETE"
  });
}

export async function ecoleEmprunter(body: EmprunterBody): Promise<EmpruntOuvrage> {
  return api(`${BASE}/bibliotheque/emprunts`, { method: "POST", body });
}

export async function ecoleRetournerEmprunt(emprunt_id: string): Promise<RetournerResult> {
  return api(
    `${BASE}/bibliotheque/emprunts/${encodeURIComponent(emprunt_id)}/retourner`,
    { method: "POST" }
  );
}

export async function ecoleListerEmprunts(params?: {
  eleve_id?: string;
  statut?: StatutEmprunt | string;
}): Promise<EmpruntOuvrage[]> {
  return api(`${BASE}/bibliotheque/emprunts`, { method: "GET", query: params });
}

export async function ecoleCreerMenu(data: DictPayload): Promise<MenuCantine> {
  return api(`${BASE}/cantine/menus`, { method: "POST", body: data });
}

export async function ecoleListerMenus(date_service?: string): Promise<MenuCantine[]> {
  return api(`${BASE}/cantine/menus`, { method: "GET", query: { date_service } });
}

export async function ecoleCreerAbonnementCantine(
data: DictPayload)
: Promise<AbonnementCantine> {
  return api(`${BASE}/cantine/abonnements`, { method: "POST", body: data });
}

export async function ecoleAbonnementsCantineEleve(
eleve_id: string)
: Promise<AbonnementCantine[]> {
  return api(`${BASE}/cantine/eleves/${encodeURIComponent(eleve_id)}/abonnements`, {
    method: "GET"
  });
}

export async function ecolePointerRepas(body: PointerRepasBody): Promise<PointerRepasResult> {
  return api(`${BASE}/cantine/pointer`, { method: "POST", body });
}

export async function ecoleMenuDuJour(params: {
  date_service: string;
  classe_id: string;
}): Promise<MenuDuJourAvecAlertes> {
  return api(`${BASE}/cantine/menu-du-jour`, { method: "GET", query: params });
}

export async function ecoleFacturationCantine(
eleve_id: string,
mois: string)
: Promise<FacturationCantineResult> {
  return api(`${BASE}/cantine/eleves/${encodeURIComponent(eleve_id)}/facturation`, {
    method: "GET",
    query: { mois }
  });
}

export async function ecoleCreerVehicule(data: DictPayload): Promise<Vehicule> {
  return api(`${BASE}/transport/vehicules`, { method: "POST", body: data });
}

export async function ecoleListerVehicules(): Promise<Vehicule[]> {
  return api(`${BASE}/transport/vehicules`, { method: "GET" });
}

export async function ecoleCreerCircuit(data: DictPayload): Promise<CircuitTransport> {
  return api(`${BASE}/transport/circuits`, { method: "POST", body: data });
}

export async function ecoleListerCircuits(): Promise<CircuitTransport[]> {
  return api(`${BASE}/transport/circuits`, { method: "GET" });
}

export async function ecoleCreerAbonnementTransport(
data: DictPayload)
: Promise<AbonnementTransport> {
  return api(`${BASE}/transport/abonnements`, { method: "POST", body: data });
}

export async function ecolePointerTransport(
body: PointerTransportBody)
: Promise<PointerTransportResult> {
  return api(`${BASE}/transport/pointer`, { method: "POST", body });
}

export async function ecoleAnomaliesTransport(
date_trajet: string)
: Promise<AnomalieTransport[]> {
  return api(`${BASE}/transport/anomalies`, { method: "GET", query: { date_trajet } });
}

export async function ecoleEnregistrerVisite(
body: VisiteInfirmerieBody)
: Promise<VisiteInfirmerie> {
  return api(`${BASE}/infirmerie/visites`, { method: "POST", body });
}

export async function ecoleListerVisites(eleve_id?: string): Promise<VisiteInfirmerie[]> {
  return api(`${BASE}/infirmerie/visites`, { method: "GET", query: { eleve_id } });
}

export async function ecoleContactUrgence(eleve_id: string): Promise<ContactUrgenceEleve> {
  return api(`${BASE}/infirmerie/eleves/${encodeURIComponent(eleve_id)}/contact-urgence`, {
    method: "GET"
  });
}

export async function ecoleCreerProtocole(
data: DictPayload)
: Promise<ProtocoleUrgenceEleve> {
  return api(`${BASE}/infirmerie/protocoles`, { method: "POST", body: data });
}

export async function ecoleGetProtocole(
eleve_id: string)
: Promise<ProtocoleUrgenceEleve | null> {
  return api(`${BASE}/infirmerie/eleves/${encodeURIComponent(eleve_id)}/protocole`, {
    method: "GET"
  });
}

export async function ecoleCreerVaccination(data: DictPayload): Promise<VaccinationEleve> {
  return api(`${BASE}/infirmerie/vaccinations`, { method: "POST", body: data });
}

export async function ecoleVaccinationsARelancer(
jours_avant?: number)
: Promise<VaccinationARelancer[]> {
  return api(`${BASE}/infirmerie/vaccinations/a-relancer`, {
    method: "GET",
    query: { jours_avant }
  });
}

export async function ecoleDefinirPolitiquePenalite(
data: DictPayload)
: Promise<PolitiquePenaliteRetard> {
  return api(`${BASE}/finance/politique-penalite`, { method: "POST", body: data });
}

export async function ecoleGetPolitiquePenalite(): Promise<PolitiquePenaliteRetard | null> {
  return api(`${BASE}/finance/politique-penalite`, { method: "GET" });
}

export async function ecoleAppliquerPenalites(): Promise<AppliquerPenalitesResult> {
  return api(`${BASE}/finance/penalites/appliquer`, { method: "POST" });
}

export async function ecolePaiementAvecCredit(
body: PaiementAvecCreditBody)
: Promise<PaiementAvecCreditResult> {
  return api(`${BASE}/finance/paiements-avec-credit`, { method: "POST", body });
}

export async function ecoleSituationComplete(
eleve_id: string)
: Promise<SituationFinanciereComplete> {
  return api(`${BASE}/finance/eleves/${encodeURIComponent(eleve_id)}/situation-complete`, {
    method: "GET"
  });
}

export async function ecoleMouvementsCredit(eleve_id: string): Promise<MouvementCredit[]> {
  return api(`${BASE}/finance/eleves/${encodeURIComponent(eleve_id)}/mouvements-credit`, {
    method: "GET"
  });
}

export async function ecoleCreerGrilleFrais(
data: DictPayload)
: Promise<GrilleFraisScolarite> {
  return api(`${BASE}/finance/grilles-frais`, { method: "POST", body: data });
}

export async function ecoleListerGrillesFrais(
annee_scolaire_id: string)
: Promise<GrilleFraisScolarite[]> {
  return api(`${BASE}/finance/grilles-frais`, {
    method: "GET",
    query: { annee_scolaire_id }
  });
}

export async function ecoleListerDepenses(): Promise<DepenseEtablissement[]> {
  return api(`${BASE}/finance/depenses`, { method: "GET" });
}

export async function ecoleCreerDepense(
data: DictPayload)
: Promise<DepenseEtablissement> {
  return api(`${BASE}/finance/depenses`, { method: "POST", body: data });
}

export async function ecoleCreerDemandeAchat(data: DictPayload): Promise<DemandeAchat> {
  return api(`${BASE}/finance/demandes-achat`, { method: "POST", body: data });
}

export async function ecoleListerDemandesAchat(statut?: string): Promise<DemandeAchat[]> {
  return api(`${BASE}/finance/demandes-achat`, { method: "GET", query: { statut } });
}

export async function ecoleApprouverDemandeAchat(
demande_id: string)
: Promise<StatusApprouvee> {
  return api(
    `${BASE}/finance/demandes-achat/${encodeURIComponent(demande_id)}/approuver`,
    { method: "POST" }
  );
}

export async function ecoleCreerCreneau(body: {
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
  forcer_malgre_conflits?: boolean;
}): Promise<CreerCreneauResult> {
  return api(`${BASE}/edt/creneaux`, { method: "POST", body });
}

export async function ecoleVerifierConflitsCreneau(params: {
  matiere_classe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle?: string | null;
}): Promise<ConflitCreneau[]> {
  return api(`${BASE}/edt/creneaux/verifier-conflits`, { method: "GET", query: params });
}

export async function ecoleRemplacerCreneau(
creneau_id: string,
body: {
  heure_debut?: string | null;
  heure_fin?: string | null;
  salle?: string | null;
  jour_semaine?: number | null;
  date_effet: string;
  motif: string;
})
: Promise<RemplacerCreneauResult> {
  return api(`${BASE}/edt/creneaux/${encodeURIComponent(creneau_id)}/remplacer`, {
    method: "POST",
    body
  });
}

export async function ecoleEdtClasse(classe_id: string): Promise<GrilleEdtClasse> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}`, { method: "GET" });
}

export async function ecoleEdtClasseADate(
classe_id: string,
date_reference: string)
: Promise<GrilleEdtClasse> {
  return api(`${BASE}/edt/classes/${encodeURIComponent(classe_id)}/a-date`, {
    method: "GET",
    query: { date_reference }
  });
}

export async function ecoleEdtEnseignant(
enseignant_id: string)
: Promise<EmploiDuTempsEnseignant> {
  return api(`${BASE}/edt/enseignants/${encodeURIComponent(enseignant_id)}`, {
    method: "GET"
  });
}

export async function ecoleDashboardDirection(
annee_scolaire_id: string)
: Promise<DashboardDirection> {
  return api(`${BASE}/dashboard/direction`, {
    method: "GET",
    query: { annee_scolaire_id }
  });
}

export async function ecoleTauxAbsenteisme(params: {
  date_debut: string;
  date_fin: string;
}): Promise<TauxAbsenteismeClasse[]> {
  return api(`${BASE}/dashboard/absenteisme`, { method: "GET", query: params });
}

export async function ecoleLivretAnnuel(
eleve_id: string,
annee_scolaire_id: string)
: Promise<LivretAnnuel> {
  return api(
    `${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/annees/${encodeURIComponent(annee_scolaire_id)}`,
    { method: "GET" }
  );
}

export async function ecoleCloturerAnnee(
eleve_id: string,
annee_scolaire_id: string,
body: ClotureAnneeBody)
: Promise<LivretCloture> {
  return api(
    `${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/annees/${encodeURIComponent(annee_scolaire_id)}/cloturer`,
    { method: "POST", body }
  );
}

export async function ecoleParcoursComplet(
eleve_id: string)
: Promise<ParcoursCompletEleve> {
  return api(`${BASE}/livret/eleves/${encodeURIComponent(eleve_id)}/parcours`, {
    method: "GET"
  });
}

export async function ecoleGenererCodeAcces(
eleve_id: string)
: Promise<GenererCodeAccesResult> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/generer-code-acces`, {
    method: "POST"
  });
}

export async function ecoleGetCodeAcces(eleve_id: string): Promise<CodeAccesEnfant | null> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}/code-acces`, { method: "GET" });
}

export async function ecoleCreerSanction(
data: DictPayload)
: Promise<SanctionDisciplinaire> {
  return api(`${BASE}/discipline/sanctions`, { method: "POST", body: data });
}

export async function ecoleSanctionsEleve(
eleve_id: string)
: Promise<SanctionDisciplinaire[]> {
  return api(`${BASE}/discipline/eleves/${encodeURIComponent(eleve_id)}/sanctions`, {
    method: "GET"
  });
}

export async function ecoleCreerSalle(data: DictPayload): Promise<Salle> {
  return api(`${BASE}/patrimoine/salles`, { method: "POST", body: data });
}

export async function ecoleListerSalles(): Promise<Salle[]> {
  return api(`${BASE}/patrimoine/salles`, { method: "GET" });
}

export async function ecoleCreerMateriel(
data: DictPayload)
: Promise<MaterielPedagogique> {
  return api(`${BASE}/patrimoine/materiel`, { method: "POST", body: data });
}

export async function ecoleListerMateriel(): Promise<MaterielPedagogique[]> {
  return api(`${BASE}/patrimoine/materiel`, { method: "GET" });
}

export async function ecoleCreerEvenement(data: DictPayload): Promise<EvenementEcole> {
  return api(`${BASE}/evenements`, { method: "POST", body: data });
}

export async function ecoleListerEvenements(): Promise<EvenementEcole[]> {
  return api(`${BASE}/evenements`, { method: "GET" });
}

export async function ecoleCreerReunion(
data: DictPayload)
: Promise<ReunionParentsEnseignants> {
  return api(`${BASE}/reunions`, { method: "POST", body: data });
}

export async function ecoleListerReunions(): Promise<ReunionParentsEnseignants[]> {
  return api(`${BASE}/reunions`, { method: "GET" });
}

export async function ecoleCreerConvocation(data: DictPayload): Promise<Convocation> {
  return api(`${BASE}/convocations`, { method: "POST", body: data });
}

export async function ecoleListerConvocations(statut?: string): Promise<Convocation[]> {
  return api(`${BASE}/convocations`, { method: "GET", query: { statut } });
}

export async function ecoleCreerSignatureRequise(
data: DictPayload)
: Promise<SignatureRequise> {
  return api(`${BASE}/signatures`, { method: "POST", body: data });
}

export async function ecoleListerSignatures(params?: {
  eleve_id?: string;
  signe?: boolean;
}): Promise<SignatureRequise[]> {
  return api(`${BASE}/signatures`, { method: "GET", query: params });
}

export async function ecoleNotifierAbsence(
body: NotifierAbsenceBody)
: Promise<StatusNotifie> {
  return api(`${BASE}/notifications/absence`, { method: "POST", body });
}

export async function ecoleNotifierUrgenceSante(
body: NotifierUrgenceBody)
: Promise<StatusNotifie> {
  return api(`${BASE}/notifications/urgence-sante`, { method: "POST", body });
}

export async function ecoleJournalNotifications(
eleve_id?: string)
: Promise<NotificationParent[]> {
  return api(`${BASE}/notifications/journal`, { method: "GET", query: { eleve_id } });
}






export interface ListerElevesParams {
  q?: string;
  statut?: string;
}

export async function ecoleListerEleves(
  params?: ListerElevesParams
): Promise<Eleve[]> {
  return api(`${BASE}/eleves`, { method: "GET", query: params });
}

export async function ecoleGetEleve(eleve_id: string): Promise<Eleve> {
  return api(`${BASE}/eleves/${encodeURIComponent(eleve_id)}`, { method: "GET" });
}

export interface InitialiserEtablissementResult {
  entreprise_id: string;
  stats: {
    cycles?: number;
    niveaux?: number;
    series?: number;
    annee_creee?: boolean;
    periodes_creees?: number;
  };
}

export async function ecoleInitialiserEtablissement(): Promise<InitialiserEtablissementResult> {
  return api(`${BASE}/initialiser-etablissement`, { method: "POST" });
}





// ═══════════════════════════════════════════════════════════════════════
// PARENTS — liste + création de compte par l'admin
// ═══════════════════════════════════════════════════════════════════════

export interface Parent extends ModelDump {
  id: string;
  entreprise_id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string | null;
  peut_se_connecter_portail: boolean;
  doit_changer_mot_de_passe: boolean;
  cree_par_admin: string | null;
  created_at?: string;
}

export async function ecoleListerParents(q?: string): Promise<Parent[]> {
  return api(`${BASE}/parents`, { method: "GET", query: { q } });
}

export interface CreerCompteParentBody {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string | null;
}

export interface CreerCompteParentResult {
  parent_id: string;
  identifiant_connexion: string;
  mot_de_passe_temporaire: string;
  avertissement: string;
}

export async function ecoleCreerCompteParent(
  body: CreerCompteParentBody,
): Promise<CreerCompteParentResult> {
  return api(`${BASE}/parents/creer-compte`, { method: "POST", body });
}


// ═══════════════════════════════════════════════════════════════════════
// PARENTS — détail
// ═══════════════════════════════════════════════════════════════════════

export interface ParentDetail extends ModelDump {
  id: string;
  entreprise_id: string;
  nom: string;
  prenom: string;
  profession: string | null;
  telephone: string;
  telephone_secondaire: string | null;
  email: string | null;
  adresse: string | null;
  doit_changer_mot_de_passe: boolean;
  cree_par_admin: string;
  peut_se_connecter_portail: boolean;
  created_at?: string;
}

export interface EnfantDuParent {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  photo_url: string | null;
  statut: string;
  lien: string;
}

export async function ecoleGetParent(parent_id: string): Promise<ParentDetail> {
  return api(`${BASE}/parents/${encodeURIComponent(parent_id)}`, { method: "GET" });
}

export async function ecoleEnfantsDuParent(parent_id: string): Promise<EnfantDuParent[]> {
  return api(`${BASE}/parents/${encodeURIComponent(parent_id)}/enfants`, { method: "GET" });
}

export interface LierEnfantAdminBody {
  code: string;
  lien?: string;
}

export async function ecoleLierEnfantAuParent(
  parent_id: string,
  body: LierEnfantAdminBody,
): Promise<{ status: string }> {
  return api(`${BASE}/parents/${encodeURIComponent(parent_id)}/lier-enfant`, {
    method: "POST",
    body,
  });
}



// ═══════════════════════════════════════════════════════════════════════
// ENSEIGNANTS — CRUD admin
// ═══════════════════════════════════════════════════════════════════════

export interface Enseignant extends ModelDump {
  id: string;
  entreprise_id: string;
  nom: string;
  prenom: string;
  email: string;
  email_interne: string;
  telephone: string;
  poste: string;
  specialite_principale: string | null;
  volume_horaire_contractuel: number | null;
  type_contrat: string;
  date_embauche: string;
  actif: number;
  est_enseignant: boolean;
  nb_affectations_actives: number;
}

export interface CreerEnseignantBody {
  nom: string;
  prenom: string;
  email?: string;
  email_interne?: string;
  telephone?: string;
  poste?: string;
  specialite_principale?: string;
  volume_horaire_contractuel?: number;
  type_contrat?: string;
  date_embauche?: string;
  adresse?: string;
  creer_portail?: boolean;
  mot_de_passe_portail?: string;
}

export interface CreerEnseignantResult extends Enseignant {
  identifiant_portail?: string;
  mot_de_passe_portail_temporaire?: string;
  avertissement_portail?: string;
}

export async function ecoleListerEnseignants(params?: {
  q?: string;
  actif_seulement?: boolean;
}): Promise<Enseignant[]> {
  return api(`${BASE}/enseignants`, { method: "GET", query: params });
}

export async function ecoleGetEnseignant(employe_id: string): Promise<Enseignant> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}`, { method: "GET" });
}

export async function ecoleCreerEnseignant(
  body: CreerEnseignantBody,
): Promise<CreerEnseignantResult> {
  return api(`${BASE}/enseignants`, { method: "POST", body });
}

export async function ecoleModifierEnseignant(
  employe_id: string,
  body: Partial<CreerEnseignantBody>,
): Promise<Enseignant> {
  return api(`${BASE}/enseignants/${encodeURIComponent(employe_id)}`, {
    method: "PATCH",
    body,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PARENTS — codes d'activation enveloppe
// ═══════════════════════════════════════════════════════════════════════

export interface CodeEnveloppe {
  code: string | null;
  code_id?: string;
  deja_active: boolean;
  created_at?: string;
  active_le?: string;
  code_utilise?: string;
  message?: string;
}

export interface CodeEnveloppeHistorique {
  id: string;
  code: string;
  utilise: boolean;
  created_at: string;
  date_utilisation: string | null;
}

export async function ecoleGenererCodeEnveloppeParent(
  parent_id: string,
  force_nouveau: boolean = false,
): Promise<CodeEnveloppe> {
  return api(
    `${BASE}/parents/${encodeURIComponent(parent_id)}/generer-code-enveloppe`,
    { method: "POST", query: { force_nouveau } },
  );
}

export async function ecoleGetCodeEnveloppeParent(
  parent_id: string,
): Promise<CodeEnveloppe> {
  return api(`${BASE}/parents/${encodeURIComponent(parent_id)}/code-enveloppe`, {
    method: "GET",
  });
}

export async function ecoleHistoriqueCodesEnveloppe(
  parent_id: string,
): Promise<CodeEnveloppeHistorique[]> {
  return api(`${BASE}/parents/${encodeURIComponent(parent_id)}/codes-enveloppe`, {
    method: "GET",
  });
}











