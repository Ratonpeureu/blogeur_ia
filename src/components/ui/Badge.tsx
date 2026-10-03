import React from 'react';
import type { Tone } from '../../types';
import { humanize } from '../../utils/format';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-state-neutralBg text-state-neutralFg border-win-border',
  info: 'bg-state-infoBg text-state-infoFg border-[#BFD4EC]',
  success: 'bg-state-successBg text-state-successFg border-[#BCDFC6]',
  warning: 'bg-state-warnBg text-state-warnFg border-[#EBD3A2]',
  danger: 'bg-state-dangerBg text-state-dangerFg border-[#EFC2C2]',
  accent: 'bg-win-accentSoft text-win-accent border-[#BFD0EA]'
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  onClick?: () => void;
  active?: boolean;
}

export function Badge({ tone = 'neutral', children, icon, title, onClick, active }: BadgeProps) {
  const base = `inline-flex items-center gap-1 border px-1.5 py-[1px] text-2xs font-medium rounded-win whitespace-nowrap ${TONE_CLASSES[tone]}`;
  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={`${base} transition-colors duration-150 ease-out hover:brightness-95 ${active ? 'ring-1 ring-win-accent' : ''}`}>
        
        {icon}
        {children}
      </button>);

  }
  return (
    <span className={base} title={title}>
      {icon}
      {children}
    </span>);

}

/* Correspondances statut → ton, partagées par tous les modules */
const TONE_MAP: Record<string, Tone> = {
  actif: 'success',
  suspendu: 'warning',
  sorti: 'neutral',
  paye: 'success',
  paye_partiel: 'warning',
  du: 'info',
  a_venir: 'neutral',
  en_retard: 'danger',
  en_cours: 'info',
  rendu: 'success',
  perdu: 'danger',
  recue: 'neutral',
  test_planifie: 'info',
  test_effectue: 'accent',
  acceptee: 'success',
  approuvee: 'success',
  liste_attente: 'warning',
  refusee: 'danger',
  a_faire: 'warning',
  fait: 'success',
  dispense: 'neutral',
  refuse_parent: 'danger',
  envoyee: 'info',
  confirmee: 'accent',
  honoree: 'success',
  absente: 'danger',
  envoye: 'success',
  en_attente: 'warning',
  echec: 'danger',
  neuf: 'success',
  bon: 'info',
  use: 'warning',
  hors_service: 'danger',
  retour_classe: 'success',
  observation: 'warning',
  renvoi: 'warning',
  hopital: 'danger',
  passage: 'success',
  redoublement: 'danger',
  orientation: 'warning',
  quotidien: 'accent',
  jours_specifiques: 'info',
  ponctuel: 'neutral',
  aller: 'info',
  retour: 'accent',
  descente_manquante: 'danger',
  aucun_pointage: 'warning',
  retard_circuit: 'warning',
  avertissement: 'warning',
  retenue: 'info',
  blame: 'warning',
  exclusion_temporaire: 'danger',
  fixe: 'info',
  variable: 'accent'
};

export function StatusBadge({ value, label }: {value: string;label?: string;}) {
  return <Badge tone={TONE_MAP[value] ?? 'neutral'}>{label ?? humanize(value)}</Badge>;
}

const ALLERGENE_LABEL: Record<string, string> = {
  gluten: 'Gluten',
  lactose: 'Lactose',
  arachide: 'Arachide',
  fruits_a_coque: 'Fruits à coque',
  oeuf: 'Œuf',
  poisson: 'Poisson'
};

export function AllergeneBadge({ code, danger }: {code: string;danger?: boolean;}) {
  return (
    <Badge tone={danger ? 'danger' : 'warning'} title={`Allergène : ${ALLERGENE_LABEL[code] ?? code}`}>
      {ALLERGENE_LABEL[code] ?? code}
    </Badge>);

}