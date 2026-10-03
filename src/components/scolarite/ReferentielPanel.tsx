// components/scolarite/ReferentielPanel.tsx
// Référentiel pédagogique initialisé par le serveur : cycles → niveaux, séries.
import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { LoadingState, Panel } from '../ui/primitives';
import { useReferentielEcole } from '../../hooks/useReferentielEcole';
import { libelleDe } from '../../utils/labels';

export function ReferentielPanel() {
  const ref = useReferentielEcole();
  const [cycleId, setCycleId] = useState('');

  const cycles = (ref.cycles.data ?? []).slice().sort((a, b) => a.ordre - b.ordre);

  useEffect(() => {
    if (!cycleId && cycles.length) setCycleId(cycles[0].id);
  }, [cycleId, cycles]);

  const niveaux = (ref.niveaux.data ?? []).filter((n) => n.cycle_id === cycleId).sort((a, b) => a.ordre - b.ordre);
  const nbClassesParNiveau = (id: string) => (ref.classes.data ?? []).filter((c) => c.niveau_id === id).length;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <Panel title="Cycles" bodyClassName="">
        {ref.cycles.loading && <LoadingState />}
        <ul className="divide-y divide-win-border" role="listbox" aria-label="Cycles">
          {cycles.map((c) =>
          <li key={c.id}>
              <button
              type="button"
              role="option"
              aria-selected={c.id === cycleId}
              onClick={() => setCycleId(c.id)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out ${
              c.id === cycleId ? 'bg-win-accentSoft' : 'hover:bg-win-panel'}`
              }>
              
                <span className="text-xs font-medium text-win-text">{libelleDe(c)}</span>
                <span className="text-2xs text-win-muted">{c.type_organisation_edt === 'fixe' ? 'Journée fixe' : 'Par matière'}</span>
              </button>
            </li>
          )}
          {!ref.cycles.loading && cycles.length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun cycle.</li>}
        </ul>
      </Panel>

      <Panel title="Niveaux" subtitle={cycleId ? ref.cycleLabel(cycleId) : 'Sélectionnez un cycle'} bodyClassName="">
        {ref.niveaux.loading && <LoadingState />}
        <ul className="divide-y divide-win-border">
          {niveaux.map((n) =>
          <li key={n.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs font-medium text-win-text">{n.libelle}</span>
              <span className="flex items-center gap-1.5">
                {n.a_series && <Badge tone="accent">Séries</Badge>}
                {n.type_organisation_edt &&
              <Badge tone="neutral">{n.type_organisation_edt === 'fixe' ? 'Journée fixe' : 'Par matière'}</Badge>
              }
                <span className="text-2xs tabular-nums text-win-muted">{nbClassesParNiveau(n.id)} classe(s)</span>
              </span>
            </li>
          )}
          {!ref.niveaux.loading && niveaux.length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun niveau.</li>}
        </ul>
      </Panel>

      <Panel title="Séries (lycée)" bodyClassName="">
        {ref.series.loading && <LoadingState />}
        <ul className="divide-y divide-win-border">
          {(ref.series.data ?? []).map((s) =>
          <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs font-medium text-win-text">{libelleDe(s)}</span>
              <Badge tone={s.actif ? 'success' : 'neutral'}>{s.actif ? 'Active' : 'Inactive'}</Badge>
            </li>
          )}
          {!ref.series.loading && (ref.series.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucune série.</li>}
        </ul>
      </Panel>
    </div>);

}