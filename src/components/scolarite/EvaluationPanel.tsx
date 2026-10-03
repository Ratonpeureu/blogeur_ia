// components/scolarite/EvaluationPanel.tsx
// Périodes de l'année, barèmes de notation et types d'évaluation.
import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { FormDrawer } from '../ui/FormDrawer';
import { Button, ErrorState, LoadingState, Panel, TextField } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useApp, periodeLabel } from '../../contexts/AppContext';
import { formatDate, str } from '../../utils/format';
import { ecoleCreerBareme, ecoleCreerPeriode, ecoleCreerTypeEvaluation, ecoleListerBaremes, ecoleListerPeriodes, ecoleListerTypesEvaluation } from '../../lib/api_ecole';

type Rec = Record<string, unknown>;

export function EvaluationPanel({ anneeLibelle }: {anneeLibelle: string;}) {
  const { anneeId } = useApp();
  const periodes = useResource(() => ecoleListerPeriodes(anneeId), [anneeId], !!anneeId);
  const baremes = useResource(() => ecoleListerBaremes(), []);
  const typesEval = useResource(() => ecoleListerTypesEvaluation(), []);

  const creerPeriode = useSubmit();
  const creerBareme = useSubmit();
  const creerTypeEval = useSubmit();

  const [formPeriode, setFormPeriode] = useState(false);
  const [formBareme, setFormBareme] = useState(false);
  const [formTypeEval, setFormTypeEval] = useState(false);

  const [periode, setPeriode] = useState({ libelle: '', ordre: '1', date_debut: '', date_fin: '' });
  const [bareme, setBareme] = useState({ libelle: '', note_max: '20' });
  const [typeEval, setTypeEval] = useState({ libelle: '', coefficient: '1' });

  const listePeriodes = (periodes.data ?? []).slice().sort((a, b) => a.ordre - b.ordre);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel
          title="Périodes"
          subtitle={anneeLibelle}
          action={
          <Button
            size="sm"
            icon={<PlusIcon size={12} />}
            onClick={() => {
              setPeriode({ libelle: '', ordre: String(listePeriodes.length + 1), date_debut: '', date_fin: '' });
              setFormPeriode(true);
            }}>
            
              Ajouter
            </Button>
          }
          bodyClassName="">
          
          {periodes.loading && <LoadingState />}
          {periodes.error && <ErrorState message={periodes.error} onRetry={periodes.reload} />}
          <ol className="divide-y divide-win-border">
            {listePeriodes.map((p) =>
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-xs font-medium text-win-text">{periodeLabel(p)}</span>
                <span className="text-2xs tabular-nums text-win-muted">
                  {p.date_debut ? formatDate(String(p.date_debut)) : '—'} → {p.date_fin ? formatDate(String(p.date_fin)) : '—'}
                </span>
              </li>
            )}
            {!periodes.loading && listePeriodes.length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucune période.</li>}
          </ol>
        </Panel>

        <Panel
          title="Barèmes de notation"
          action={
          <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormBareme(true)}>
              Ajouter
            </Button>
          }
          bodyClassName="">
          
          {baremes.loading && <LoadingState />}
          <ul className="divide-y divide-win-border">
            {(baremes.data ?? []).map((b, i) =>
            <li key={String((b as Rec).id ?? i)} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-xs font-medium text-win-text">{str((b as Rec).libelle as string)}</span>
                {(b as Rec).note_max !== undefined && <span className="text-2xs text-win-muted">Sur {String((b as Rec).note_max)}</span>}
              </li>
            )}
            {!baremes.loading && (baremes.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun barème.</li>}
          </ul>
        </Panel>

        <Panel
          title="Types d’évaluation"
          action={
          <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormTypeEval(true)}>
              Ajouter
            </Button>
          }
          bodyClassName="">
          
          {typesEval.loading && <LoadingState />}
          <ul className="divide-y divide-win-border">
            {(typesEval.data ?? []).map((t, i) =>
            <li key={String((t as Rec).id ?? i)} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-xs font-medium text-win-text">{str((t as Rec).libelle as string)}</span>
                {(t as Rec).coefficient !== undefined && <span className="text-2xs text-win-muted">Coef. {String((t as Rec).coefficient)}</span>}
              </li>
            )}
            {!typesEval.loading && (typesEval.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun type d’évaluation.</li>}
          </ul>
        </Panel>
      </div>

      <FormDrawer
        open={formPeriode}
        onClose={() => {
          setFormPeriode(false);
          creerPeriode.setError(null);
        }}
        title="Nouvelle période"
        subtitle={anneeLibelle}
        submitting={creerPeriode.submitting}
        error={creerPeriode.error}
        onSubmit={() => {
          if (!periode.libelle.trim()) return creerPeriode.setError('Le libellé est obligatoire.');
          if (periode.date_debut && periode.date_fin && periode.date_fin < periode.date_debut)
          return creerPeriode.setError('La date de fin précède la date de début.');
          creerPeriode.run(
            () =>
            ecoleCreerPeriode({
              annee_scolaire_id: anneeId || null,
              libelle: periode.libelle.trim(),
              ordre: Number(periode.ordre) || 1,
              date_debut: periode.date_debut || null,
              date_fin: periode.date_fin || null
            }),
            () => {
              setFormPeriode(false);
              periodes.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={periode.libelle} onChange={(v) => setPeriode({ ...periode, libelle: v })} />
        <TextField label="Ordre" type="number" required value={periode.ordre} onChange={(v) => setPeriode({ ...periode, ordre: v })} />
        <TextField label="Début" type="date" value={periode.date_debut} onChange={(v) => setPeriode({ ...periode, date_debut: v })} />
        <TextField label="Fin" type="date" value={periode.date_fin} onChange={(v) => setPeriode({ ...periode, date_fin: v })} />
      </FormDrawer>

      <FormDrawer
        open={formBareme}
        onClose={() => {
          setFormBareme(false);
          creerBareme.setError(null);
        }}
        title="Nouveau barème de notation"
        submitting={creerBareme.submitting}
        error={creerBareme.error}
        onSubmit={() => {
          if (!bareme.libelle.trim()) return creerBareme.setError('Le libellé est obligatoire.');
          creerBareme.run(
            () => ecoleCreerBareme({ libelle: bareme.libelle.trim(), note_max: Number(bareme.note_max) || 20 }),
            () => {
              setFormBareme(false);
              setBareme({ libelle: '', note_max: '20' });
              baremes.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={bareme.libelle} onChange={(v) => setBareme({ ...bareme, libelle: v })} />
        <TextField label="Note maximale" type="number" value={bareme.note_max} onChange={(v) => setBareme({ ...bareme, note_max: v })} />
      </FormDrawer>

      <FormDrawer
        open={formTypeEval}
        onClose={() => {
          setFormTypeEval(false);
          creerTypeEval.setError(null);
        }}
        title="Nouveau type d’évaluation"
        submitting={creerTypeEval.submitting}
        error={creerTypeEval.error}
        onSubmit={() => {
          if (!typeEval.libelle.trim()) return creerTypeEval.setError('Le libellé est obligatoire.');
          creerTypeEval.run(
            () => ecoleCreerTypeEvaluation({ libelle: typeEval.libelle.trim(), coefficient: Number(typeEval.coefficient) || 1 }),
            () => {
              setFormTypeEval(false);
              setTypeEval({ libelle: '', coefficient: '1' });
              typesEval.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={typeEval.libelle} onChange={(v) => setTypeEval({ ...typeEval, libelle: v })} />
        <TextField label="Coefficient" type="number" value={typeEval.coefficient} onChange={(v) => setTypeEval({ ...typeEval, coefficient: v })} />
      </FormDrawer>
    </>);

}