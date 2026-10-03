const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d} ${MOIS_COURT[m - 1]} ${y}`;
}

export function formatDateLongue(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const jour = new Date(y, m - 1, d).getDay();
  return `${JOURS[(jour + 6) % 7]} ${d} ${MOIS[m - 1]} ${y}`;
}

export function formatFcfa(montant: number): string {
  return `${Math.round(montant || 0).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} F`;
}

export function formatFcfaCourt(montant: number): string {
  const v = montant || 0;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M F`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)} k F`;
  return `${v} F`;
}

export function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export function humanize(value: string): string {
  const s = String(value ?? '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pourcent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round(value / total * 1000) / 10;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso) + days * 86400000);
  return d.toISOString().slice(0, 10);
}

export function moisLibelle(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MOIS[m - 1]} ${y}`;
}

/** Date du jour (ISO court) — horloge locale, aucune donnée inventée. */
export function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function initiales(nom?: string | null, prenom?: string | null): string {
  const a = (prenom ?? '').trim().charAt(0);
  const b = (nom ?? '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '—';
}

export function str(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}