// hooks/useReferentielEcole.ts
// Référentiel partagé (années, cycles, niveaux, séries, classes) chargé depuis le backend,
// avec les fonctions de traduction identifiant → libellé utilisées par toutes les pages.
import { useMemo } from 'react';
import { useResource } from './useResource';
import { useApp } from '../contexts/AppContext';
import { libelleDe } from '../utils/labels';
import {
  ecoleListClasses,
  ecoleListerAnnees,
  ecoleListerCycles,
  ecoleListerNiveaux,
  ecoleListerSeries } from
'../lib/api_ecole';
import type { Niveau } from '../lib/api_ecole';

export interface OptionListe {
  value: string;
  label: string;
  hint?: string;
}

export function useReferentielEcole() {
  const { anneeId } = useApp();

  const annees = useResource(() => ecoleListerAnnees(), []);
  const cycles = useResource(() => ecoleListerCycles(), []);
  const niveaux = useResource(async (): Promise<Niveau[]> => {
    const liste = await ecoleListerCycles();
    const parCycle = await Promise.all(liste.map((c) => ecoleListerNiveaux(c.id)));
    return parCycle.flat();
  }, []);
  const series = useResource(() => ecoleListerSeries(), []);
  const classes = useResource(() => ecoleListClasses(anneeId), [anneeId], !!anneeId);

  const cyclesParId = useMemo(() => new Map((cycles.data ?? []).map((c) => [c.id, c])), [cycles.data]);
  const niveauxParId = useMemo(() => new Map((niveaux.data ?? []).map((n) => [n.id, n])), [niveaux.data]);
  const seriesParId = useMemo(() => new Map((series.data ?? []).map((s) => [s.id, s])), [series.data]);
  const classesParId = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c])), [classes.data]);

  const anneeCourante = (annees.data ?? []).find((a) => a.id === anneeId) ?? null;

  const cycleLabel = (id?: string | null) => id ? libelleDe(cyclesParId.get(id), 'Cycle inconnu') : '—';
  const niveauLabel = (id?: string | null) => id ? niveauxParId.get(id)?.libelle ?? 'Niveau inconnu' : '—';
  const serieLabel = (id?: string | null) => id ? libelleDe(seriesParId.get(id), 'Série inconnue') : '—';
  const classeLabel = (id?: string | null) => id ? classesParId.get(id)?.libelle ?? 'Classe inconnue' : '—';
  const niveauAvecCycle = (id?: string | null) => {
    if (!id) return '—';
    const n = niveauxParId.get(id);
    return n ? `${cycleLabel(n.cycle_id)} · ${n.libelle}` : 'Niveau inconnu';
  };

  const niveauOptions: OptionListe[] = useMemo(() => {
    const ordreCycle = (id: string) => cyclesParId.get(id)?.ordre ?? 0;
    return (niveaux.data ?? []).
    slice().
    sort((a, b) => ordreCycle(a.cycle_id) - ordreCycle(b.cycle_id) || a.ordre - b.ordre).
    map((n) => ({ value: n.id, label: n.libelle, hint: libelleDe(cyclesParId.get(n.cycle_id), '') }));
  }, [niveaux.data, cyclesParId]);

  const classeOptions: OptionListe[] = useMemo(
    () =>
    (classes.data ?? []).
    slice().
    sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')).
    map((c) => ({ value: c.id, label: c.libelle, hint: niveauxParId.get(c.niveau_id)?.libelle })),
    [classes.data, niveauxParId]
  );

  return {
    anneeId,
    anneeCourante,
    anneeLibelle: anneeCourante?.libelle ?? (anneeId ? 'Année en cours' : 'Aucune année sélectionnée'),
    annees,
    cycles,
    niveaux,
    series,
    classes,
    cyclesParId,
    niveauxParId,
    seriesParId,
    classesParId,
    cycleLabel,
    niveauLabel,
    serieLabel,
    classeLabel,
    niveauAvecCycle,
    niveauOptions,
    classeOptions
  };
}