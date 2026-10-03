// utils/labels.ts
// Transforme les données renvoyées par le backend en libellés lisibles
// pour un directeur d'établissement : aucun identifiant technique n'est affiché.
import { formatDate, humanize } from './format';

type Enregistrement = Record<string, unknown>;

/** Clés techniques jamais montrées à l'utilisateur */
const CLES_TECHNIQUES =
  /^(id|entreprise_id|created_by|updated_by|saisie_par|ajoutee_par|traite_par|decidee_par|convoque_par|organisee_par|demande_par|approuve_par|cree_par_admin|combinaison_hash|recalcule_le)$|_id$|_ids$/;

export function estCleTechnique(cle: string): boolean {
  return CLES_TECHNIQUES.test(cle);
}

/** Premier champ lisible d'un enregistrement (jamais son identifiant) */
export function libelleDe(rec: Enregistrement | null | undefined, repli = '—'): string {
  if (!rec) return repli;
  for (const cle of ['libelle', 'nom', 'titre', 'designation', 'code']) {
    const v = rec[cle];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return repli;
}

export function nomEleve(e?: { nom?: unknown; prenom?: unknown } | null): string {
  if (!e) return '—';
  return `${String(e.prenom ?? '')} ${String(e.nom ?? '')}`.trim() || '—';
}

export function valeurLisible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'number') return new Intl.NumberFormat('fr-FR').format(v);
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDate(v) : v;
  if (Array.isArray(v)) return v.length ? v.map(valeurLisible).join(', ') : '—';
  if (typeof v === 'object') return libelleDe(v as Enregistrement);
  return String(v);
}

export interface ChampLisible {
  cle: string;
  label: string;
  valeur: string;
}

/** Champs affichables d'un enregistrement : sans identifiants ni objets imbriqués */
export function champsLisibles(rec: Enregistrement | null | undefined, exclure: string[] = []): ChampLisible[] {
  if (!rec) return [];
  return Object.entries(rec)
    .filter(([cle, v]) => {
      if (estCleTechnique(cle) || exclure.includes(cle)) return false;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) return false;
      if (Array.isArray(v) && v.some((x) => x !== null && typeof x === 'object')) return false;
      return true;
    })
    .map(([cle, v]) => ({ cle, label: humanize(cle), valeur: valeurLisible(v) }));
}

export function indexer<T extends { id: string }>(items: T[] | null | undefined): Map<string, T> {
  return new Map((items ?? []).map((i) => [i.id, i]));
}

export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
