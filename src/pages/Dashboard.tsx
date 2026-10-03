import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangleIcon,
  BusIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  HeartPulseIcon,
  LibraryIcon,
  TrendingUpIcon,
  UsersIcon,
  UtensilsCrossedIcon,
  WalletIcon } from
'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { Panel, ProgressBar, SegmentedControl, StatTile, Button, LoadingState, ErrorState } from '../components/ui/primitives';
import { AllergeneBadge, Badge, StatusBadge } from '../components/ui/Badge';
import { useResource } from '../hooks/useResource';
import { useApp } from '../contexts/AppContext';
import { addDays, aujourdHui, formatDate, formatFcfa, formatFcfaCourt, str } from '../utils/format';
import {
  ecoleAnomaliesTransport,
  ecoleAnneeActive,
  ecoleDashboardDirection,
  ecoleListerCandidatures,
  ecoleListerCycles,
  ecoleListerEmprunts,
  ecoleListerEvenements,
  ecoleListerMenus,
  ecoleListerSignatures,
  ecoleTauxAbsenteisme,
  ecoleTauxRemplissage,
  ecoleVaccinationsARelancer } from
'../lib/api_ecole';
import { BoutonInitialisation } from '../components/BoutonInitialisation';

export const ECOLE_BASE = '/app/ecole';

export const ecolePath = (p = '') =>
  `${ECOLE_BASE}/${p.replace(/^\/+/, '')}`.replace(/\/+$/, '') || ECOLE_BASE;

type Priorite = 'critique' | 'important' | 'suivi';

interface Alerte {
  id: string;
  priorite: Priorite;
  domaine: string;
  icon: React.ReactNode;
  titre: string;
  detail: string;
  lien: string;
  badge?: React.ReactNode;
}

export function Dashboard() {
  const { anneeId, periodeLibelle } = useApp();
  const [filtrePriorite, setFiltrePriorite] = useState<'toutes' | Priorite>('toutes');
  const today = aujourdHui();

  const direction = useResource(() => ecoleDashboardDirection(anneeId), [anneeId], !!anneeId);
  const absenteisme = useResource(
    () => ecoleTauxAbsenteisme({ date_debut: addDays(today, -30), date_fin: today }),
    [today]
  );
  const remplissage = useResource(() => ecoleTauxRemplissage(anneeId), [anneeId], !!anneeId);
  const menus = useResource(() => ecoleListerMenus(today), [today]);
  const evenements = useResource(() => ecoleListerEvenements(), []);
  const anomalies = useResource(() => ecoleAnomaliesTransport(today), [today]);
  const vaccinations = useResource(() => ecoleVaccinationsARelancer(), []);
  const empruntsRetard = useResource(() => ecoleListerEmprunts({ statut: 'en_retard' }), []);
  const candidatures = useResource(() => ecoleListerCandidatures(), []);
  const signatures = useResource(() => ecoleListerSignatures({ signe: false }), []);

  const cycles = useResource(() => ecoleListerCycles(), []);
  const anneeActive = useResource(() => ecoleAnneeActive(), []);
  const referentielPret = (cycles.data ?? []).length > 0 && !!anneeActive.data;
  const etatInitCharge = !cycles.loading && !anneeActive.loading;

  const alertes = useMemo<Alerte[]>(() => {
    const list: Alerte[] = [];
    (anomalies.data ?? []).forEach((a, i) => {
      list.push({
        id: `tr-${a.eleve_id}-${i}`,
        priorite: a.type === 'descente_manquante' ? 'critique' : 'important',
        domaine: 'Transport',
        icon: <BusIcon size={14} />,
        titre: `${a.eleve_id} — ${a.type === 'descente_manquante' ? 'descente non pointée' : 'aucun pointage'}`,
        detail: a.message,
        lien: '/app/ecole/transport',
        badge: <StatusBadge value={a.type} />
      });
    });
    (vaccinations.data ?? []).slice(0, 4).forEach((v, i) => {
      list.push({
        id: `vac-${i}`,
        priorite: 'suivi',
        domaine: 'Infirmerie',
        icon: <HeartPulseIcon size={14} />,
        titre: `${v.eleve} — rappel ${v.vaccin}`,
        detail: `Rappel prévu le ${formatDate(v.date_rappel)}`,
        lien: '/app/ecole/infirmerie',
        badge: <StatusBadge value="a_faire" />
      });
    });
    (direction.data?.discipline.sanctions_recentes ?? []).slice(0, 5).forEach((s, i) => {
      list.push({
        id: `disc-${i}`,
        priorite: 'important',
        domaine: 'Vie scolaire',
        icon: <AlertTriangleIcon size={14} />,
        titre: `${s.eleve_id} — ${s.type}`,
        detail: s.motif,
        lien: '/app/ecole/communication',
        badge: <StatusBadge value={s.type} />
      });
    });
    (empruntsRetard.data ?? []).slice(0, 3).forEach((e) => {
      list.push({
        id: `bib-${e.id}`,
        priorite: 'suivi',
        domaine: 'Bibliothèque',
        icon: <LibraryIcon size={14} />,
        titre: `${str(e.eleve_id)} — ouvrage non rendu`,
        detail: `Retour prévu le ${formatDate(e.date_retour_prevue)}`,
        lien: '/app/ecole/bibliotheque',
        badge: <StatusBadge value="en_retard" />
      });
    });
    (candidatures.data ?? []).
    filter((c) => c.statut === 'recue' || c.statut === 'test_effectue').
    slice(0, 4).
    forEach((c) => {
      list.push({
        id: `adm-${c.id}`,
        priorite: 'suivi',
        domaine: 'Admissions',
        icon: <CheckCircle2Icon size={14} />,
        titre: `${c.prenom_candidat} ${c.nom_candidat} — dossier à statuer`,
        detail: `Déposé le ${formatDate(c.date_candidature)}`,
        lien: '/app/ecole/admissions',
        badge: <StatusBadge value={c.statut} />
      });
    });
    const ordre: Record<Priorite, number> = { critique: 0, important: 1, suivi: 2 };
    return list.sort((a, b) => ordre[a.priorite] - ordre[b.priorite]);
  }, [anomalies.data, vaccinations.data, direction.data, empruntsRetard.data, candidatures.data]);

  const alertesFiltrees = filtrePriorite === 'toutes' ? alertes : alertes.filter((a) => a.priorite === filtrePriorite);

  const prochainsEvenements = (evenements.data ?? []).
  filter((e) => String(e.date_debut).slice(0, 10) >= today).
  sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut))).
  slice(0, 5);

  const absList = absenteisme.data ?? [];
  const absMax = Math.max(1, ...absList.map((c) => c.taux_absenteisme_pct));

  const remplissageCritique = [...(remplissage.data ?? [])].sort((a, b) => b.taux_remplissage_pct - a.taux_remplissage_pct).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Tableau de bord — direction"
        description={`${anneeId || 'Aucune année sélectionnée'} · ${periodeLibelle || 'Aucune période'} · données consolidées au ${formatDate(today)}`}
        actions={
        <>
            <Button icon={<TrendingUpIcon size={13} />} onClick={() => direction.reload()}>Actualiser</Button>
            <Link to="/app/ecole/calendrier">
              <Button variant="primary" icon={<CalendarDaysIcon size={13} />}>
                Ouvrir le calendrier
              </Button>
            </Link>
          </>
        } />

      {etatInitCharge && !referentielPret && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-win-accent bg-win-accentSoft px-3 py-2.5 rounded-win">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-win-text">
              Établissement non initialisé
            </p>
            <p className="text-2xs text-win-muted">
              Créez le référentiel (cycles, niveaux, séries) et l’année scolaire active —
              une seule fois, à faire avant toute création de classe ou d’élève.
            </p>
          </div>
          <BoutonInitialisation
            onDone={() => {
              cycles.reload();
              anneeActive.reload();
              direction.reload();
              remplissage.reload();
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <Link to="/app/ecole/eleves" className="grid">
          <StatTile
            label="Effectif inscrit"
            value={direction.data?.effectifs.total_eleves ?? '—'}
            hint={`${direction.data?.effectifs.nb_enseignants ?? '—'} enseignants`}
            tone="accent"
            icon={<UsersIcon size={18} />} />
        </Link>
        <Link to="/app/ecole/finances" className="grid">
          <StatTile
            label="Taux de recouvrement"
            value={direction.data ? `${direction.data.finance.taux_recouvrement_pct} %` : '—'}
            hint={direction.data ? `${formatFcfaCourt(direction.data.finance.total_du_fcfa - direction.data.finance.total_encaisse_fcfa)} restant à encaisser` : '—'}
            tone={(direction.data?.finance.taux_recouvrement_pct ?? 0) > 80 ? 'success' : 'warning'}
            icon={<WalletIcon size={18} />} />
        </Link>
        <Link to="/app/ecole/finances" className="grid">
          <StatTile
            label="Familles en retard"
            value={direction.data?.finance.nb_familles_en_retard ?? '—'}
            hint="Échéances dépassées"
            tone="warning"
            icon={<WalletIcon size={18} />} />
        </Link>
        <StatTile
          label="Alertes critiques"
          value={alertes.filter((a) => a.priorite === 'critique').length}
          hint="Transport et sécurité"
          tone="danger"
          icon={<AlertTriangleIcon size={18} />} />
        <Link to="/app/ecole/admissions" className="grid">
          <StatTile
            label="Candidatures à traiter"
            value={(candidatures.data ?? []).filter((c) => c.statut === 'recue' || c.statut === 'test_effectue').length}
            hint={`${(candidatures.data ?? []).length} dossiers au total`}
            tone="neutral"
            icon={<CheckCircle2Icon size={18} />} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Alertes à traiter aujourd’hui"
          subtitle="Croisement transport, santé, discipline, bibliothèque et admissions"
          bodyClassName=""
          action={
          <SegmentedControl
            value={filtrePriorite}
            onChange={(v) => setFiltrePriorite(v as typeof filtrePriorite)}
            options={[
            { value: 'toutes', label: `Toutes (${alertes.length})` },
            { value: 'critique', label: `Critiques (${alertes.filter((a) => a.priorite === 'critique').length})` },
            { value: 'important', label: 'Importantes' },
            { value: 'suivi', label: 'Suivi' }]
            } />
          }>
          <ul className="max-h-[430px] divide-y divide-win-border overflow-auto">
            {alertesFiltrees.map((a) =>
            <li key={a.id}>
                <Link
                to={a.lien}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                  <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-win ${
                  a.priorite === 'critique' ?
                  'bg-state-dangerBg text-state-dangerFg' :
                  a.priorite === 'important' ?
                  'bg-state-warnBg text-state-warnFg' :
                  'bg-state-neutralBg text-state-neutralFg'}`
                  }>
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-win-text">{a.titre}</span>
                      {a.badge}
                    </span>
                    <span className="mt-0.5 block text-2xs text-win-muted">{a.detail}</span>
                  </span>
                  <span className="shrink-0 text-2xs uppercase tracking-wide text-win-faint">{a.domaine}</span>
                </Link>
              </li>
            )}
            {alertesFiltrees.length === 0 &&
            <li className="px-3 py-10 text-center text-xs text-win-muted">Aucune alerte pour ce niveau de priorité.</li>
            }
          </ul>
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title="Menus du jour" subtitle={formatDate(today)} bodyClassName="">
            {menus.loading && <LoadingState />}
            {menus.error && <ErrorState message={menus.error} onRetry={menus.reload} />}
            <ul className="divide-y divide-win-border">
              {(menus.data ?? []).map((m) =>
              <li key={m.id} className="px-3 py-2">
                  <p className="text-sm font-semibold text-win-text">{str(m.type_repas)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(m.allergenes_presents ?? []).map((a) =>
                  <AllergeneBadge key={a} code={a} />
                  )}
                  </div>
                </li>
              )}
              {!menus.loading && (menus.data ?? []).length === 0 &&
              <li className="px-3 py-4 text-2xs text-win-muted">Aucun menu publié pour aujourd’hui.</li>
              }
            </ul>
            <div className="flex items-center justify-between border-t border-win-border px-3 py-2 text-2xs">
              <span className="text-win-muted">{(menus.data ?? []).length} service(s)</span>
              <Link to="/app/ecole/cantine">
                <Badge tone="accent">
                  <UtensilsCrossedIcon size={11} /> Ouvrir la cantine
                </Badge>
              </Link>
            </div>
          </Panel>

          <Panel title="Prochains rendez-vous" bodyClassName="">
            <ul className="divide-y divide-win-border">
              {prochainsEvenements.map((e) =>
              <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center bg-win-sunken text-win-text rounded-win">
                    <span className="text-[13px] font-semibold leading-none">{String(e.date_debut).slice(8, 10)}</span>
                    <span className="text-[9px] uppercase text-win-muted">{formatDate(String(e.date_debut)).split(' ')[1]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-win-text">{str(e.titre as string)}</span>
                    <span className="block truncate text-2xs text-win-muted">{str(e.lieu as string)}</span>
                  </span>
                </li>
              )}
              {prochainsEvenements.length === 0 &&
              <li className="px-3 py-4 text-2xs text-win-muted">Aucun événement à venir.</li>
              }
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title="Absentéisme par classe" subtitle="30 derniers jours">
          {absenteisme.loading && <LoadingState />}
          {absenteisme.error && <ErrorState message={absenteisme.error} onRetry={absenteisme.reload} />}
          <ul className="space-y-2">
            {absList.slice(0, 8).map((c) =>
            <li key={c.classe}>
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-medium text-win-text">{c.classe}</span>
                  <span className="tabular-nums text-win-muted">{c.taux_absenteisme_pct} %</span>
                </div>
                <div className="mt-1">
                  <ProgressBar
                  value={c.taux_absenteisme_pct / absMax * 100}
                  tone={c.taux_absenteisme_pct > 7 ? 'danger' : c.taux_absenteisme_pct > 4 ? 'warning' : 'accent'} />
                </div>
              </li>
            )}
            {!absenteisme.loading && absList.length === 0 &&
            <li className="py-4 text-center text-2xs text-win-muted">Aucune donnée d’absentéisme.</li>
            }
          </ul>
        </Panel>

        <Panel title="Remplissage des classes" subtitle="Capacité déclarée vs inscriptions confirmées">
          {remplissage.loading && <LoadingState />}
          <ul className="space-y-2">
            {remplissageCritique.map((c) =>
            <li key={c.classe}>
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-medium text-win-text">{c.classe}</span>
                  <span className="tabular-nums text-win-muted">
                    {c.effectif_actuel}/{c.effectif_max} · {c.places_restantes} place(s)
                  </span>
                </div>
                <div className="mt-1">
                  <ProgressBar
                  value={c.taux_remplissage_pct}
                  tone={c.taux_remplissage_pct >= 95 ? 'danger' : c.taux_remplissage_pct >= 80 ? 'warning' : 'success'} />
                </div>
              </li>
            )}
            {!remplissage.loading && remplissageCritique.length === 0 &&
            <li className="py-4 text-center text-2xs text-win-muted">Aucune classe pour cette année.</li>
            }
          </ul>
        </Panel>

        <Panel title="Sanctions récentes" bodyClassName="">
          <ul className="divide-y divide-win-border">
            {(direction.data?.discipline.sanctions_recentes ?? []).map((s, i) =>
            <li key={`${s.eleve_id}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-win-text">{s.eleve_id}</span>
                  <span className="block truncate text-2xs text-win-muted">{s.motif}</span>
                </span>
                <span className="shrink-0 text-2xs text-win-faint">{formatDate(s.date)}</span>
              </li>
            )}
            {(direction.data?.discipline.sanctions_recentes ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucune sanction récente.</li>
            }
          </ul>
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Link to="/app/ecole/communication" className="grid">
          <StatTile
            label="Signatures en attente"
            value={(signatures.data ?? []).length}
            hint="Documents parents"
            tone="warning" />
        </Link>
        <Link to="/app/ecole/scolarite" className="grid">
          <StatTile
            label="Bulletins publiés"
            value={direction.data?.pedagogie.nb_bulletins_publies ?? '—'}
            hint="Période en cours"
            tone="success" />
        </Link>
        <Link to="/app/ecole/finances" className="grid">
          <StatTile
            label="Total encaissé"
            value={direction.data ? formatFcfa(direction.data.finance.total_encaisse_fcfa) : '—'}
            hint={direction.data ? `sur ${formatFcfa(direction.data.finance.total_du_fcfa)} dus` : '—'}
            tone="accent" />
        </Link>
        <Link to="/app/ecole/bibliotheque" className="grid">
          <StatTile
            label="Emprunts en retard"
            value={(empruntsRetard.data ?? []).length}
            hint="Bibliothèque"
            tone="danger" />
        </Link>
      </div>
    </>);
}