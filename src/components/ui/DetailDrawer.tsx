import React from 'react';
import { Drawer } from './Drawer';
import { FieldRow } from './primitives';
import { StatusBadge } from './Badge';
import { formatDate, humanize } from '../../utils/format';

const DATE_KEY = /(date|_le|debut|fin|echeance|naissance)/i;
const STATUT_KEY = /(statut|status|etat|type_mouvement)/i;

function renderValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  if (STATUT_KEY.test(key)) return <StatusBadge value={s} />;
  if (DATE_KEY.test(key) && /^\d{4}-\d{2}-\d{2}/.test(s)) return formatDate(s);
  return s;
}

/**
 * Détail générique d'un enregistrement renvoyé par le backend.
 * Affiche fidèlement tous les champs du model_dump, sans rien inventer.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  record,
  hiddenKeys = ['entreprise_id'],
  children,
  footer









}: {open: boolean;onClose: () => void;title: string;subtitle?: string;record: Record<string, unknown> | null;hiddenKeys?: string[];children?: React.ReactNode;footer?: React.ReactNode;}) {
  const entries = record ?
  Object.entries(record).filter(([k]) => !hiddenKeys.includes(k)) :
  [];

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
      {children}
      <dl className="mt-3 border border-win-border bg-win-surface px-3 py-1 shadow-win rounded-win">
        {entries.map(([key, value]) =>
        <FieldRow key={key} label={humanize(key)}>
            {renderValue(key, value)}
          </FieldRow>
        )}
      </dl>
    </Drawer>);

}