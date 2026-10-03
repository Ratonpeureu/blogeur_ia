import React, { useState } from 'react';
import { PercentIcon, PlusIcon, SettingsIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import {
  Button,
  CheckboxField,
  Divider,
  ErrorState,
  FieldRow,
  LoadingState,
  Panel,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { useApp, periodeLabel } from '../contexts/AppContext';
import { str } from '../utils/format';
import { getEntreprise } from '@/lib/api';
import {
  ecoleAppliquerPenalites,
  ecoleCreerBareme,
  ecoleCreerPeriode,
  ecoleCreerTypeEvaluation,
  ecoleDefinirPolitiquePenalite,
  ecoleGetPolitiquePenalite,
  ecoleListerBaremes,
  ecoleListerCycles,
  ecoleListerNiveaux,
  ecoleListerSeries,
  ecoleListerTypesEvaluation } from
'../lib/api_ecole';

export function Parametres() {
  const { anneeId, setAnneeId, periodeId, setPeriodeId, periodes, reloadPeriodes } = useApp();
  const [tab, setTab] = useState('etablissement');
  const [cycleId, setCycleId] = useState('');
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formPolitique, setFormPolitique] = useState(false);
  const [formPeriode, setFormPeriode] = useState(false);
  const [formBareme, setFormBareme] = useState(false);
  const [formTypeEval, setFormTypeEval] = useState(false);
  const [resultatPenalites, setResultatPenalites] = useState<string | null>(null);

  const entreprise = getEntreprise();
  const politique = useResource(() => ecoleGetPolitiquePenalite(), []);
  const cycles = useResource(() => ecoleListerCycles(), []);
  const niveaux = useResource(() => ecoleListerNiveaux(cycleId), [cycleId], !!cycleId);
  const series = useResource(() => ecoleListerSeries(), []);
  const baremes = useResource(() => ecoleListerBaremes(), []);
  const typesEval = useResource(() => ecoleListerTypesEvaluation(), []);

  const politiqueForm = useSubmit();
  const periodeForm = useSubmit();
  const baremeForm = useSubmit();
  const typeEvalForm = useSubmit();
  const penalites = useSubmit();

  const [politiqueData, setPolitiqueData] = useState({
    active: true,
    taux_penalite_pct: '2',
    plafond_penalite_pct: '20',
    delai_grace_jours: '7',
    frequence_application: 'mensuelle_recurrente'
  });
  const [periodeData, setPeriodeData] = useState({ libelle: '', ordre: '1', date_debut: '', date_fin: '' });
  const [baremeData, setBaremeData] = useState({ libelle: '', note_max: '20' });
  const [typeEvalData, setTypeEvalData] = useState({ libelle: '', coefficient: '1' });

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Établissement, année scolaire, référentiel et règles financières"
        actions={
        <>
            <Button
            icon={<PercentIcon size={13} />}
            onClick={() =>
            penalites.run(async () => {
              const res = await ecoleAppliquerPenalites();
              setResultatPenalites(
                res.motif ? `Aucune pénalité appliquée : ${res.motif}` : `${res.appliquees} pénalité(s) appliquée(s)`
              );
            })
            }>
            
              Appliquer les pénalités
            </Button>
            <Button variant="primary" icon={<SettingsIcon size={13} />} onClick={() => setFormPolitique(true)}>
              Politique de pénalité
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Établissement" value={str(entreprise?.nom)} hint={str(entreprise?.email)} tone="accent" />
        <StatTile label="Année active" value={anneeId || '—'} hint={`${periodes.length} période(s)`} tone="neutral" />
        <StatTile
          label="Politique de pénalité"
          value={politique.data ? politique.data.active ? 'Active' : 'Inactive' : '—'}
          hint={politique.data ? `${politique.data.taux_penalite_pct} % · plafond ${politique.data.plafond_penalite_pct} %` : 'Non définie'}
          tone={politique.data?.active ? 'danger' : 'neutral'} />
        
        <StatTile label="Cycles du référentiel" value={(cycles.data ?? []).length} hint={`${(series.data ?? []).length} série(s)`} tone="success" />
      </div>

      {resultatPenalites &&
      <p className="mb-3 border border-[#BFD0EA] bg-win-accentSoft px-3 py-2 text-2xs text-win-accent rounded-win">
          {resultatPenalites}
        </p>
      }

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'etablissement', label: 'Établissement' },
        { id: 'annee', label: 'Année & périodes', count: periodes.length },
        { id: 'referentiel', label: 'Référentiel', count: (cycles.data ?? []).length },
        { id: 'evaluation', label: 'Barèmes & évaluations', count: (baremes.data ?? []).length + (typesEval.data ?? []).length },
        { id: 'finance', label: 'Règles financières' }]
        } />
      

      <div className="mt-3 space-y-3">
        {tab === 'etablissement' &&
        <Panel title="Compte connecté" subtitle="Informations issues de la session backend">
            <dl>
              <FieldRow label="Nom">{str(entreprise?.nom)}</FieldRow>
              <FieldRow label="Email">{str(entreprise?.email)}</FieldRow>
              <FieldRow label="Identifiant entreprise">{str(entreprise?.id)}</FieldRow>
              <FieldRow label="Console">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheckIcon size={11} className="text-win-faint" />
                  rhmanager.site
                </span>
              </FieldRow>
            </dl>
          </Panel>
        }

        {tab === 'annee' &&
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Année scolaire active" subtitle="Identifiant utilisé par toutes les requêtes backend">
              <TextField label="Identifiant de l’année scolaire" value={anneeId} onChange={setAnneeId} hint="annee_scolaire_id" />
              <div className="mt-3">
                <Button size="sm" onClick={reloadPeriodes}>Recharger les périodes</Button>
              </div>
            </Panel>
            <Panel
            title="Périodes"
            action={<Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormPeriode(true)} disabled={!anneeId}>Ajouter</Button>}
            bodyClassName="">
            
              <ul className="divide-y divide-win-border">
                {periodes.map((p) =>
              <li key={p.id}>
                    <button
                  type="button"
                  onClick={() => {
                    setPeriodeId(p.id);
                    setDetail({ titre: periodeLabel(p), record: p });
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                  
                      <span className="text-xs font-medium text-win-text">{periodeLabel(p)}</span>
                      {p.id === periodeId ? <Badge tone="accent">Active</Badge> : <span className="text-2xs text-win-faint">Ordre {p.ordre}</span>}
                    </button>
                  </li>
              )}
                {periodes.length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucune période pour cette année.</li>}
              </ul>
            </Panel>
          </div>
        }

        {tab === 'referentiel' &&
        <>
            <Toolbar>
              <SelectField
              label="Cycle"
              value={cycleId}
              onChange={setCycleId}
              options={(cycles.data ?? []).map((c) => ({ value: c.id, label: str(c.libelle as string) || c.id }))} />
            
              <Divider />
              <Badge tone="neutral">{(niveaux.data ?? []).length} niveau(x)</Badge>
            </Toolbar>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Panel title="Cycles" bodyClassName="">
                {cycles.loading && <LoadingState />}
                {cycles.error && <ErrorState message={cycles.error} onRetry={cycles.reload} />}
                <ul className="divide-y divide-win-border">
                  {(cycles.data ?? []).map((c) =>
                <li key={c.id}>
                      <button
                    type="button"
                    onClick={() => {
                      setCycleId(c.id);
                      setDetail({ titre: str(c.libelle as string) || c.id, record: c });
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                    
                        <span className="text-xs font-medium text-win-text">{str(c.libelle as string) || c.id}</span>
                        <StatusBadge value={String(c.type_organisation_edt)} />
                      </button>
                    </li>
                )}
                  {(cycles.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun cycle.</li>}
                </ul>
              </Panel>
              <Panel title="Niveaux" bodyClassName="">
                <ul className="divide-y divide-win-border">
                  {(niveaux.data ?? []).map((n) =>
                <li key={n.id}>
                      <button
                    type="button"
                    onClick={() => setDetail({ titre: n.libelle, record: n })}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                    
                        <span className="text-xs font-medium text-win-text">{n.libelle}</span>
                        {n.a_series && <Badge tone="accent">Séries</Badge>}
                      </button>
                    </li>
                )}
                  {(niveaux.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Sélectionnez un cycle.</li>}
                </ul>
              </Panel>
              <Panel title="Séries" bodyClassName="">
                <ul className="divide-y divide-win-border">
                  {(series.data ?? []).map((s) =>
                <li key={s.id}>
                      <button
                    type="button"
                    onClick={() => setDetail({ titre: str(s.libelle as string) || s.id, record: s })}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                    
                        <span className="text-xs font-medium text-win-text">{str(s.libelle as string) || s.id}</span>
                        <Badge tone={s.actif ? 'success' : 'neutral'}>{s.actif ? 'Active' : 'Inactive'}</Badge>
                      </button>
                    </li>
                )}
                  {(series.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucune série.</li>}
                </ul>
              </Panel>
            </div>
          </>
        }

        {tab === 'evaluation' &&
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel
            title="Barèmes de notation"
            action={<Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormBareme(true)}>Ajouter</Button>}
            bodyClassName="">
            
              <ul className="divide-y divide-win-border">
                {(baremes.data ?? []).map((b, i) =>
              <li key={String((b as Record<string, unknown>).id ?? i)}>
                    <button
                  type="button"
                  onClick={() => setDetail({ titre: 'Barème', record: b as Record<string, unknown> })}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                  
                      <span className="text-xs font-medium text-win-text">{str((b as Record<string, unknown>).libelle as string)}</span>
                      <span className="text-2xs text-win-faint">{str((b as Record<string, unknown>).note_max as string)}</span>
                    </button>
                  </li>
              )}
                {(baremes.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun barème.</li>}
              </ul>
            </Panel>
            <Panel
            title="Types d’évaluation"
            action={<Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormTypeEval(true)}>Ajouter</Button>}
            bodyClassName="">
            
              <ul className="divide-y divide-win-border">
                {(typesEval.data ?? []).map((t, i) =>
              <li key={String((t as Record<string, unknown>).id ?? i)}>
                    <button
                  type="button"
                  onClick={() => setDetail({ titre: 'Type d’évaluation', record: t as Record<string, unknown> })}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                  
                      <span className="text-xs font-medium text-win-text">{str((t as Record<string, unknown>).libelle as string)}</span>
                      <span className="text-2xs text-win-faint">{str((t as Record<string, unknown>).coefficient as string)}</span>
                    </button>
                  </li>
              )}
                {(typesEval.data ?? []).length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun type d’évaluation.</li>}
              </ul>
            </Panel>
          </div>
        }

        {tab === 'finance' &&
        <Panel title="Politique de pénalité de retard" subtitle="Une seule politique par établissement">
            {politique.loading && <LoadingState />}
            {politique.error && <ErrorState message={politique.error} onRetry={politique.reload} />}
            {politique.data ?
          <dl>
                <FieldRow label="État">
                  <Badge tone={politique.data.active ? 'danger' : 'neutral'}>{politique.data.active ? 'Active' : 'Inactive'}</Badge>
                </FieldRow>
                <FieldRow label="Taux de pénalité">{politique.data.taux_penalite_pct} %</FieldRow>
                <FieldRow label="Plafond">{politique.data.plafond_penalite_pct} %</FieldRow>
                <FieldRow label="Délai de grâce">{politique.data.delai_grace_jours} jour(s)</FieldRow>
                <FieldRow label="Fréquence">{str(politique.data.frequence_application)}</FieldRow>
              </dl> :

          <p className="text-xs text-win-muted">Aucune politique définie.</p>
          }
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => setFormPolitique(true)}>Modifier la politique</Button>
            </div>
          </Panel>
        }
      </div>

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        subtitle="Détail renvoyé par le backend"
        record={detail?.record ?? null} />
      

      <FormDrawer
        open={formPolitique}
        onClose={() => setFormPolitique(false)}
        title="Politique de pénalité de retard"
        submitting={politiqueForm.submitting}
        error={politiqueForm.error}
        onSubmit={() =>
        politiqueForm.run(
          () =>
          ecoleDefinirPolitiquePenalite({
            active: politiqueData.active,
            taux_penalite_pct: Number(politiqueData.taux_penalite_pct) || 0,
            plafond_penalite_pct: Number(politiqueData.plafond_penalite_pct) || 0,
            delai_grace_jours: Number(politiqueData.delai_grace_jours) || 0,
            frequence_application: politiqueData.frequence_application
          }),
          () => {
            setFormPolitique(false);
            politique.reload();
          }
        )
        }>
        
        <CheckboxField label="Politique active" checked={politiqueData.active} onChange={(v) => setPolitiqueData({ ...politiqueData, active: v })} />
        <TextField label="Taux de pénalité (%)" type="number" value={politiqueData.taux_penalite_pct} onChange={(v) => setPolitiqueData({ ...politiqueData, taux_penalite_pct: v })} />
        <TextField label="Plafond (%)" type="number" value={politiqueData.plafond_penalite_pct} onChange={(v) => setPolitiqueData({ ...politiqueData, plafond_penalite_pct: v })} />
        <TextField label="Délai de grâce (jours)" type="number" value={politiqueData.delai_grace_jours} onChange={(v) => setPolitiqueData({ ...politiqueData, delai_grace_jours: v })} />
        <SelectField
          label="Fréquence d’application"
          value={politiqueData.frequence_application}
          onChange={(v) => setPolitiqueData({ ...politiqueData, frequence_application: v })}
          options={[
          { value: 'unique', label: 'Unique' },
          { value: 'mensuelle_recurrente', label: 'Mensuelle récurrente' }]
          } />
        
      </FormDrawer>

      <FormDrawer
        open={formPeriode}
        onClose={() => setFormPeriode(false)}
        title="Nouvelle période"
        submitting={periodeForm.submitting}
        error={periodeForm.error}
        onSubmit={() =>
        periodeForm.run(
          () =>
          ecoleCreerPeriode({
            annee_scolaire_id: anneeId,
            libelle: periodeData.libelle,
            ordre: Number(periodeData.ordre) || 1,
            date_debut: periodeData.date_debut || null,
            date_fin: periodeData.date_fin || null
          }),
          () => {
            setFormPeriode(false);
            reloadPeriodes();
          }
        )
        }>
        
        <TextField label="Libellé" required value={periodeData.libelle} onChange={(v) => setPeriodeData({ ...periodeData, libelle: v })} />
        <TextField label="Ordre" type="number" required value={periodeData.ordre} onChange={(v) => setPeriodeData({ ...periodeData, ordre: v })} />
        <TextField label="Début" type="date" value={periodeData.date_debut} onChange={(v) => setPeriodeData({ ...periodeData, date_debut: v })} />
        <TextField label="Fin" type="date" value={periodeData.date_fin} onChange={(v) => setPeriodeData({ ...periodeData, date_fin: v })} />
      </FormDrawer>

      <FormDrawer
        open={formBareme}
        onClose={() => setFormBareme(false)}
        title="Nouveau barème"
        submitting={baremeForm.submitting}
        error={baremeForm.error}
        onSubmit={() =>
        baremeForm.run(
          () => ecoleCreerBareme({ libelle: baremeData.libelle, note_max: Number(baremeData.note_max) || 20 }),
          () => {
            setFormBareme(false);
            baremes.reload();
          }
        )
        }>
        
        <TextField label="Libellé" required value={baremeData.libelle} onChange={(v) => setBaremeData({ ...baremeData, libelle: v })} />
        <TextField label="Note maximale" type="number" value={baremeData.note_max} onChange={(v) => setBaremeData({ ...baremeData, note_max: v })} />
      </FormDrawer>

      <FormDrawer
        open={formTypeEval}
        onClose={() => setFormTypeEval(false)}
        title="Nouveau type d’évaluation"
        submitting={typeEvalForm.submitting}
        error={typeEvalForm.error}
        onSubmit={() =>
        typeEvalForm.run(
          () => ecoleCreerTypeEvaluation({ libelle: typeEvalData.libelle, coefficient: Number(typeEvalData.coefficient) || 1 }),
          () => {
            setFormTypeEval(false);
            typesEval.reload();
          }
        )
        }>
        
        <TextField label="Libellé" required value={typeEvalData.libelle} onChange={(v) => setTypeEvalData({ ...typeEvalData, libelle: v })} />
        <TextField label="Coefficient" type="number" value={typeEvalData.coefficient} onChange={(v) => setTypeEvalData({ ...typeEvalData, coefficient: v })} />
      </FormDrawer>
    </>);

}