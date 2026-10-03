// components/scolarite/BulletinsPanel.tsx
// Aperçu puis publication d'un bulletin ; classement de la classe pour la période.
import React, { useEffect, useState } from 'react';
import { EyeIcon, SendIcon } from 'lucide-react';
import { ComboboxField } from '../ui/ComboboxField';
import { Badge } from '../ui/Badge';
import { Button, ErrorState, FieldRow, LoadingState, Panel, Select } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useApp } from '../../contexts/AppContext';
import { useReferentielEcole } from '../../hooks/useReferentielEcole';
import { useEleves } from '../../hooks/useEleves';
import { formatDate } from '../../utils/format';
import { champsLisibles } from '../../utils/labels';
import { ecoleApercuBulletin, ecoleGetClassement, ecoleListerPeriodes, ecolePublierBulletin } from '../../lib/api_ecole';
import type { ApercuBulletin, Bulletin } from '../../lib/api_ecole';

type Rec = Record<string, unknown>;

export function BulletinsPanel() {
  const { anneeId, periodeId } = useApp();
  const ref = useReferentielEcole();
  const { options: optionsEleves, eleves, nom: nomEleveDe } = useEleves();

  const periodes = useResource(() => ecoleListerPeriodes(anneeId), [anneeId], !!anneeId);
  const [classeId, setClasseId] = useState('');
  const [periode, setPeriode] = useState(periodeId);
  const [eleveId, setEleveId] = useState('');
  const [apercu, setApercu] = useState<ApercuBulletin | null>(null);
  const [publie, setPublie] = useState<Bulletin | null>(null);

  useEffect(() => {
    if (!periode && periodeId) setPeriode(periodeId);
  }, [periode, periodeId]);

  const classement = useResource(() => ecoleGetClassement(classeId, periode), [classeId, periode], !!classeId && !!periode);

  const chargementApercu = useSubmit();
  const publication = useSubmit();

  const pret = !!classeId && !!periode && !!eleveId;
  const params = { eleve_id: eleveId, classe_id: classeId, periode_id: periode };

  useEffect(() => {
    setApercu(null);
    setPublie(null);
  }, [classeId, periode, eleveId]);

  const lignesClassement: Rec[] = Array.isArray(classement.data) ?
  (classement.data as unknown[]).filter((x): x is Rec => !!x && typeof x === 'object') :
  [];

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title="Bulletin d’un élève" subtitle="Aperçu calculé par le serveur avant publication">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ComboboxField label="Classe" required value={classeId} onChange={setClasseId} loading={ref.classes.loading} options={ref.classeOptions} />
          <Select
            label="Période"
            value={periode}
            onChange={setPeriode}
            options={[
            { value: '', label: periodes.loading ? 'Chargement…' : 'Sélectionner…' },
            ...(periodes.data ?? []).
            slice().
            sort((a, b) => a.ordre - b.ordre).
            map((p) => ({ value: p.id, label: String(p.libelle ?? `Période ${p.ordre}`) }))]
            } />
          
          <ComboboxField label="Élève" required value={eleveId} onChange={setEleveId} loading={eleves.loading} options={optionsEleves} />
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            icon={<EyeIcon size={12} />}
            disabled={!pret || chargementApercu.submitting}
            onClick={() => chargementApercu.run(async () => setApercu(await ecoleApercuBulletin(params)))}>
            
            {chargementApercu.submitting ? 'Calcul…' : 'Aperçu'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<SendIcon size={12} />}
            disabled={!pret || publication.submitting}
            onClick={() => publication.run(async () => setPublie(await ecolePublierBulletin(params)), () => classement.reload())}>
            
            Publier le bulletin
          </Button>
        </div>
        {chargementApercu.error && <p className="mt-2 text-2xs text-state-dangerFg">{chargementApercu.error}</p>}
        {publication.error && <p className="mt-2 text-2xs text-state-dangerFg">{publication.error}</p>}

        {publie &&
        <div className="mt-3 rounded-win border border-state-successFg/30 bg-win-panel p-3" role="status">
            <p className="text-xs font-semibold text-win-text">Bulletin publié pour {nomEleveDe(publie.eleve_id)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-2xs sm:grid-cols-4">
              <span>
                <span className="block text-win-muted">Moyenne</span>
                <span className="text-sm font-semibold tabular-nums text-win-text">{publie.moyenne_generale}</span>
              </span>
              <span>
                <span className="block text-win-muted">Rang</span>
                <span className="text-sm font-semibold tabular-nums text-win-text">
                  {publie.rang_classe} / {publie.effectif_classe}
                </span>
              </span>
              <span>
                <span className="block text-win-muted">Moyenne de classe</span>
                <span className="text-sm font-semibold tabular-nums text-win-text">{publie.moyenne_classe}</span>
              </span>
              <span>
                <span className="block text-win-muted">Mention</span>
                <span className="text-sm font-semibold text-win-text">{publie.mention ?? '—'}</span>
              </span>
            </div>
            <ul className="mt-3 divide-y divide-win-border rounded-win border border-win-border bg-win-surface">
              {publie.detail_matieres.map((m) =>
            <li key={m.matiere} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <span className="min-w-0">
                    <span className="block text-win-text">{m.matiere}</span>
                    {m.appreciation && <span className="block text-2xs text-win-muted">{m.appreciation}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-win-muted">
                    {m.moyenne ?? '—'} <span className="text-win-faint">· coef. {m.coefficient}</span>
                  </span>
                </li>
            )}
            </ul>
            <p className="mt-2 text-2xs text-win-muted">
              {publie.nb_absences_periode} absence(s) · {publie.nb_retards_periode} retard(s)
              {publie.appreciation_generale ? ` · ${publie.appreciation_generale}` : ''}
            </p>
          </div>
        }

        {apercu && !publie &&
        <div className="mt-3 rounded-win border border-win-border bg-win-panel p-3">
            <p className="mb-1 text-xs font-semibold text-win-text">Aperçu — {nomEleveDe(eleveId)}</p>
            <dl>
              {champsLisibles(apercu).map((c) =>
            <FieldRow key={c.cle} label={c.label}>
                  {c.valeur}
                </FieldRow>
            )}
            </dl>
            {Array.isArray(apercu.detail_matieres) &&
          <ul className="mt-2 divide-y divide-win-border rounded-win border border-win-border bg-win-surface">
                {(apercu.detail_matieres as Rec[]).map((m, i) =>
            <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <span className="text-win-text">{String(m.matiere ?? '—')}</span>
                    <span className="tabular-nums text-win-muted">
                      {m.moyenne == null ? '—' : String(m.moyenne)}
                      {m.coefficient != null && <span className="text-win-faint"> · coef. {String(m.coefficient)}</span>}
                    </span>
                  </li>
            )}
              </ul>
          }
          </div>
        }
      </Panel>

      <Panel
        title="Classement de la classe"
        subtitle={classeId && periode ? ref.classeLabel(classeId) : 'Choisissez une classe et une période'}
        bodyClassName="">
        
        {classement.loading && <LoadingState />}
        {classement.error && <ErrorState message={classement.error} onRetry={classement.reload} />}
        <ol className="divide-y divide-win-border">
          {lignesClassement.map((l, i) => {
            const champs = champsLisibles(l);
            const eleve = typeof l.eleve_id === 'string' ? nomEleveDe(l.eleve_id) : champs[0]?.valeur ?? '—';
            return (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="text-win-text">
                  <span className="mr-1.5 tabular-nums text-win-muted">{l.rang != null ? String(l.rang) : i + 1}.</span>
                  {eleve}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums text-win-muted">
                  {l.moyenne != null ? String(l.moyenne) : l.moyenne_generale != null ? String(l.moyenne_generale) : ''}
                  {typeof l.mention === 'string' && l.mention && <Badge tone="accent">{l.mention}</Badge>}
                </span>
              </li>);

          })}
          {!classement.loading && classeId && periode && lignesClassement.length === 0 &&
          <li className="px-3 py-4 text-2xs text-win-muted">Aucun classement disponible pour cette période.</li>
          }
        </ol>
        {publie && <p className="px-3 pb-2 text-2xs text-win-faint">Mis à jour le {formatDate(new Date().toISOString())}</p>}
      </Panel>
    </div>);

}