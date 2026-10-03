import {
  LayoutDashboardIcon,
  UsersIcon,
  GraduationCapIcon,
  CalendarRangeIcon,
  CalendarDaysIcon,
  WalletIcon,
  UserCogIcon,
  UserPlusIcon,
  UtensilsCrossedIcon,
  BusIcon,
  HeartPulseIcon,
  LibraryIcon,
  PackageIcon,
  MegaphoneIcon,
  SettingsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Préfixe sous lequel le module école est monté dans le routeur principal */
export const ECOLE_BASE = '/app/ecole';

/** ecolePath('finances') → '/app/ecole/finances' ; ecolePath() → '/app/ecole' */
export const ecolePath = (p = '') => {
  const clean = p.replace(/^\/+|\/+$/g, '');
  return clean ? `${ECOLE_BASE}/${clean}` : ECOLE_BASE;
};

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: 'pilotage' | 'scolarite' | 'services' | 'systeme';
}

export const navItems: NavItem[] = [
  { to: ecolePath(), label: 'Tableau de bord', icon: LayoutDashboardIcon, group: 'pilotage' },
  { to: ecolePath('eleves'), label: 'Élèves', icon: UsersIcon, group: 'scolarite' },
  { to: ecolePath('parents'), label: 'Parents', icon: UserCogIcon, group: 'scolarite' },
  { to: ecolePath('scolarite'), label: 'Scolarité & classes', icon: GraduationCapIcon, group: 'scolarite' },
  { to: ecolePath('emploi-du-temps'), label: 'Emploi du temps', icon: CalendarRangeIcon, group: 'scolarite' },
  { to: ecolePath('calendrier'), label: 'Calendrier & événements', icon: CalendarDaysIcon, group: 'scolarite' },
  { to: ecolePath('finances'), label: 'Finances', icon: WalletIcon, group: 'pilotage' },
  { to: ecolePath('admissions'), label: 'Admissions', icon: UserPlusIcon, group: 'pilotage' },
  { to: ecolePath('enseignants'), label: 'Enseignants', icon: UserCogIcon, group: 'scolarite' },
  { to: ecolePath('cantine'), label: 'Cantine', icon: UtensilsCrossedIcon, group: 'services' },
  { to: ecolePath('transport'), label: 'Transport', icon: BusIcon, group: 'services' },
  { to: ecolePath('infirmerie'), label: 'Infirmerie', icon: HeartPulseIcon, group: 'services' },
  { to: ecolePath('bibliotheque'), label: 'Bibliothèque', icon: LibraryIcon, group: 'services' },
  { to: ecolePath('patrimoine'), label: 'Patrimoine & salles', icon: PackageIcon, group: 'services' },
  { to: ecolePath('communication'), label: 'Communication', icon: MegaphoneIcon, group: 'pilotage' },
  { to: ecolePath('parametres'), label: 'Paramètres', icon: SettingsIcon, group: 'systeme' },
];