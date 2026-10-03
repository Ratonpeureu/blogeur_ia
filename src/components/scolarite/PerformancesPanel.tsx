// components/scolarite/PerformancesPanel.tsx
// Analyses de l'année : classes, enseignants et équipes pédagogiques.
import React, { useState } from 'react';
import { RefreshCcwIcon } from 'lucide-react';
import { DataTable, type Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { Button, Divider, ErrorState, LoadingState, Select, Toolbar } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useReferentielEcole } from '../../hooks/useReferentielEcole';
import { formatDate } from '../../utils/format';
import {
  ecoleClassementClasses,
  ecoleClassementCombinaisons,
  ecoleClassementEnseignants,
  ecoleRecalculerCombinaisonsProfs,
  ecoleRecalculerParcoursTous,
  ecoleRecalculerStatClasse,
  ecoleRecalculerStatEnseignant } from
'../../lib/api_ecole_extended';
import type {
  FiabiliteCombinaison,
  StatistiqueClasseAnnuelle,
  StatistiqueCombinaisonProfs,
  StatistiqueEnseignantAnnuelle } from
'../../lib/api_ecole_extended';

const FIABILITE_TON: Record<FiabiliteCombinaison, 'neutral' | 'warning' | 'success'> = {
  faible: 'neutral',
  moyenne: 'warning',
  haute: 'success'
};

const pct = (v: number | null | undefined) => v == null ? '—' : `${v} %`;
const num = (v: number | null | undefined) => v == null ? '—' : String(v);

export function PerformancesPanel() {
  const ref = useReferentielEcole();
  const { anneeId } = ref;
  const [vue, setVue] = useState('classes');
  const [tri, setTri] = useState<'score' | 'moyenne' | 'taux_reussite'>('score');
  const [fiabilite, setFiabilite] = useState<FiabiliteCombinaison>('faible');
  const [message, setMessage] = useState<string | null>(null);

  const classes = useResource(() => ecoleClassementClasses(anneeId), [anneeId], !!anneeId && vue === 'classes');
  const enseignants = useResource(() => ecoleClassementEnseignants(anneeId, tri), [anneeId, tri], !!anneeId && vue === 'enseignants');
  const combinaisons = useResource(() => ecoleClassementCombinaisons(fiabilite), [fiabilite], vue === 'combinaisons');

  const recalcul = useSubmit();

  function recalculer() {
    setMessage(null);
    if (vue === 'classes') {
      recalcul.run(
        async () => {
          const liste = ref.classes.data ?? [];
          for (const c of liste) await ecoleRecalculerStatClasse(c.id, anneeId);
          setMessage(`${liste.length} classe(s) recalculée(s).`);
        },
        () => classes.reload()
      );
    } else if (vue === 'enseignants') {
      recalcul.run(
        async () => {
          const liste = enseignants.data ?? [];
          for (const e of liste) await ecoleRecalculerStatEnseignant(e.employe_id, anneeId);
          setMessage(`${liste.length} enseignant(s) recalculé(s).`);
        },
        () => enseignants.reload()
      );
    } else {
      recalcul.run(
        async () => {
          const r = await ecoleRecalculerCombinaisonsProfs();
          setMessage(`${r.combinaisons_traitees} équipe(s) analysée(s).`);
        },
        () => combinaisons.reload()
      );
    }
  }

  const colonnesClasses: Column<StatistiqueClasseAnnuelle>[] = [
  { key: 'classe', header: 'Classe', sortValue: (s) => s.classe_libelle_snapshot, render: (s) => <span className="font-medium text-win-text">{s.classe_libelle_snapshot}</span> },
  { key: 'moyenne', header: 'Moyenne', align: 'right', sortValue: (s) => s.moyenne_generale_classe ?? 0, render: (s) => num(s.moyenne_generale_classe) },
  { key: 'reussite', header: 'Réussite', align: 'right', sortValue: (s) => s.taux_reussite_pct, render: (s) => pct(s.taux_reussite_pct) },
  { key: 'absences', header: 'Absentéisme', align: 'right', sortValue: (s) => s.taux_absenteisme_pct ?? 0, render: (s) => pct(s.taux_absenteisme_pct) },
  { key: 'effectif', header: 'Effectif', align: 'right', render: (s) => `${s.effectif_debut} → ${s.effectif_fin}` },
  {
    key: 'evolution',
    header: 'vs N-1',
    align: 'right',
    sortValue: (s) => s.evolution_moyenne_vs_n1 ?? 0,
    render: (s) =>
    s.evolution_moyenne_vs_n1 == null ?
    '—' :

    <span className={s.evolution_moyenne_vs_n1 >= 0 ? 'text-state-successFg' : 'text-state-dangerFg'}>
            {s.evolution_moyenne_vs_n1 > 0 ? '+' : ''}
            {s.evolution_moyenne_vs_n1}
          </span>

  },
  { key: 'maj', header: 'Calculé le', render: (s) => formatDate(s.recalcule_le) }];


  const colonnesEnseignants: Column<StatistiqueEnseignantAnnuelle>[] = [
  {
    key: 'nom',
    header: 'Enseignant',
    sortValue: (s) => s.nom_enseignant_snapshot,
    render: (s) =>
    <span className="min-w-0">
          <span className="block font-medium text-win-text">{s.nom_enseignant_snapshot}</span>
          <span className="block text-2xs text-win-faint">{s.poste_snapshot}</span>
        </span>

  },
  { key: 'classes', header: 'Classes', align: 'right', render: (s) => s.nb_classes_enseignees },
  { key: 'eleves', header: 'Élèves', align: 'right', render: (s) => s.nb_eleves_total },
  { key: 'heures', header: 'h / semaine', align: 'right', render: (s) => s.volume_horaire_hebdo_moyen },
  { key: 'moyenne', header: 'Moyenne', align: 'right', sortValue: (s) => s.moyenne_generale_classes ?? 0, render: (s) => num(s.moyenne_generale_classes) },
  { key: 'reussite', header: 'Réussite', align: 'right', sortValue: (s) => s.taux_reussite_pct ?? 0, render: (s) => pct(s.taux_reussite_pct) },
  {
    key: 'ecart',
    header: 'Écart étab.',
    align: 'right',
    render: (s) =>
    s.ecart_vs_moyenne_etablissement == null ?
    '—' :

    <span className={s.ecart_vs_moyenne_etablissement >= 0 ? 'text-state-successFg' : 'text-state-dangerFg'}>
            {s.ecart_vs_moyenne_etablissement > 0 ? '+' : ''}
            {s.ecart_vs_moyenne_etablissement}
          </span>

  },
  { key: 'score', header: 'Score', align: 'right', sortValue: (s) => s.score_performance ?? 0, render: (s) => <span className="font-semibold">{num(s.score_performance)}</span> }];


  const colonnesCombinaisons: Column<StatistiqueCombinaisonProfs>[] = [
  {
    key: 'equipe',
    header: 'Équipe pédagogique',
    render: (s) =>
    <span className="min-w-0">
          <span className="block font-medium text-win-text">{s.employes_noms.join(', ')}</span>
          <span className="block text-2xs text-win-faint">
            {s.classes_concernees.map((c) => c.classe_libelle).join(', ')}
          </span>
        </span>

  },
  { key: 'usages', header: 'Classes suivies', align: 'right', sortValue: (s) => s.nb_utilisations, render: (s) => s.nb_utilisations },
  { key: 'moyenne', header: 'Moyenne', align: 'right', sortValue: (s) => s.moyenne_generale_moyenne ?? 0, render: (s) => num(s.moyenne_generale_moyenne) },
  { key: 'reussite', header: 'Réussite', align: 'right', sortValue: (s) => s.taux_reussite_moyen ?? 0, render: (s) => pct(s.taux_reussite_moyen) },
  { key: 'score', header: 'Score', align: 'right', sortValue: (s) => s.score_combinaison ?? 0, render: (s) => <span className="font-semibold">{num(s.score_combinaison)}</span> },
  { key: 'fiabilite', header: 'Fiabilité', render: (s) => <Badge tone={FIABILITE_TON[s.fiabilite]}>{s.fiabilite}</Badge> }];


  const ressource = vue === 'classes' ? classes : vue === 'enseignants' ? enseignants : combinaisons;

  return (
    <div className="space-y-3">
      <Tabs
        value={vue}
        onChange={(v) => {
          setVue(v);
          setMessage(null);
        }}
        items={[
        { id: 'classes', label: 'Classes' },
        { id: 'enseignants', label: 'Enseignants' },
        { id: 'combinaisons', label: 'Équipes pédagogiques' }]
        } />
      
      <Toolbar>
        {vue === 'enseignants' &&
        <>
            <Select
            label="Trier par"
            value={tri}
            onChange={(v) => setTri(v as typeof tri)}
            options={[
            { value: 'score', label: 'Score global' },
            { value: 'moyenne', label: 'Moyenne' },
            { value: 'taux_reussite', label: 'Taux de réussite' }]
            } />
          
            <Divider />
          </>
        }
        {vue === 'combinaisons' &&
        <>
            <Select
            label="Fiabilité minimale"
            value={fiabilite}
            onChange={(v) => setFiabilite(v as FiabiliteCombinaison)}
            options={[
            { value: 'faible', label: 'Toutes' },
            { value: 'moyenne', label: 'Moyenne et haute' },
            { value: 'haute', label: 'Haute uniquement' }]
            } />
          
            <Divider />
          </>
        }
        <Button size="sm" icon={<RefreshCcwIcon size={12} />} onClick={recalculer} disabled={recalcul.submitting || !anneeId && vue !== 'combinaisons'}>
          {recalcul.submitting ? 'Calcul en cours…' : 'Recalculer'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={recalcul.submitting}
          onClick={() =>
          recalcul.run(async () => {
            const r = await ecoleRecalculerParcoursTous();
            setMessage(`Parcours élèves : ${r.reconstruits} reconstruit(s), ${r.erreurs} erreur(s).`);
          })
          }>
          
          Reconstruire les parcours élèves
        </Button>
        {message && <span className="text-2xs text-state-successFg">{message}</span>}
        {recalcul.error && <span className="text-2xs text-state-dangerFg">{recalcul.error}</span>}
      </Toolbar>

      {ressource.loading && <LoadingState />}
      {ressource.error && <ErrorState message={ressource.error} onRetry={ressource.reload} />}

      {vue === 'classes' &&
      <DataTable columns={colonnesClasses} rows={classes.data ?? []} rowKey={(s) => s.id} emptyLabel="Aucune statistique — lancez le calcul." />
      }
      {vue === 'enseignants' &&
      <DataTable
        columns={colonnesEnseignants}
        rows={enseignants.data ?? []}
        rowKey={(s) => s.id}
        emptyLabel="Aucune statistique enseignant pour cette année." />

      }
      {vue === 'combinaisons' &&
      <DataTable columns={colonnesCombinaisons} rows={combinaisons.data ?? []} rowKey={(s) => s.id} emptyLabel="Aucune équipe analysée." />
      }
    </div>);

}