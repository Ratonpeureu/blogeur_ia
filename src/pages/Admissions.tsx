import React, { useState } from 'react';
import { UserPlusIcon, UserRoundCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { Drawer } from '../components/ui/Drawer';
import {
  Button,
  Divider,
  ErrorState,
  FieldRow,
  LoadingState,
  Panel,
  ProgressBar,
  SearchInput,
  SelectField,
  StatTile,
  TextAreaField,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { useApp } from '../contexts/AppContext';
import { aujourdHui, formatDate, str } from '../utils/format';
import {
  ecoleCreerCandidature,
  ecoleConvertirCandidature,
  ecoleListerCandidatures,
  ecoleStatuerCandidature,
  ecoleTauxRemplissage } from
'../lib/api_ecole';
import type { CandidatureAdmission } from '../lib/api_ecole';

const STATUTS = [
{ value: 'recue', label: 'Reçue' },
{ value: 'test_planifie', label: 'Test planifié' },
{ value: 'test_effectue', label: 'Test effectué' },
{ value: 'acceptee', label: 'Acceptée' },
{ value: 'liste_attente', label: 'Liste d’attente' },
{ value: 'refusee', label: 'Refusée' }];


export function Admissions() {
  const { anneeId } = useApp();
  const [tab, setTab] = useState('toutes');
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState<CandidatureAdmission | null>(null);
  const [formCandidature, setFormCandidature] = useState(false);
  const [nouveauStatut, setNouveauStatut] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [matricule, setMatricule] = useState('');

  const candidatures = useResource(() => ecoleListerCandidatures(), []);
  const remplissage = useResource(() => ecoleTauxRemplissage(anneeId), [anneeId], !!anneeId);

  const creation = useSubmit();
  const statuer = useSubmit();
  const convertir = useSubmit();

  const [nouvelle, setNouvelle] = useState({
    nom_candidat: '',
    prenom_candidat: '',
    date_naissance: '',
    etablissement_provenance: '',
    date_candidature: aujourdHui(),
    statut: 'recue'
  });

  const liste = (candidatures.data ?? []).filter((c) => {
    if (tab !== 'toutes' && c.statut !== tab) return false;
    const q = recherche.trim().toLowerCase();
    if (q && !`${c.prenom_candidat} ${c.nom_candidat}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const colonnes: Column<CandidatureAdmission>[] = [
  {
    key: 'candidat',
    header: 'Candidat',
    width: '26%',
    sortValue: (c) => `${c.nom_candidat} ${c.prenom_candidat}`,
    render: (c) =>
    <span className="min-w-0">
          <span className="block truncate font-medium text-win-text">
            {c.prenom_candidat} {c.nom_candidat}
          </span>
          <span className="block text-2xs text-win-faint">{formatDate(c.date_naissance)}</span>
        </span>

  },
  { key: 'provenance', header: 'Provenance', render: (c) => str(c.etablissement_provenance) },
  { key: 'depot', header: 'Déposée le', sortValue: (c) => c.date_candidature, render: (c) => formatDate(c.date_candidature) },
  {
    key: 'attente',
    header: 'Liste d’attente',
    align: 'right',
    render: (c) => c.position_liste_attente === null ? '—' : `#${c.position_liste_attente}`
  },
  { key: 'statut', header: 'Statut', render: (c) => <StatusBadge value={c.statut} /> }];


  const compte = (statut: string) => (candidatures.data ?? []).filter((c) => c.statut === statut).length;

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Candidatures, décisions et conversion en dossiers élèves"
        actions={
        <Button variant="primary" icon={<UserPlusIcon size={13} />} onClick={() => setFormCandidature(true)}>
            Nouvelle candidature
          </Button>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Candidatures" value={(candidatures.data ?? []).length} hint="Tous statuts" tone="accent" />
        <StatTile label="À statuer" value={compte('recue') + compte('test_effectue')} hint="Reçues et tests effectués" tone="warning" />
        <StatTile label="Acceptées" value={compte('acceptee')} hint="À convertir en élèves" tone="success" />
        <StatTile label="Liste d’attente" value={compte('liste_attente')} hint="Places à libérer" tone="neutral" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'toutes', label: 'Toutes', count: (candidatures.data ?? []).length },
        ...STATUTS.map((s) => ({ id: s.value, label: s.label, count: compte(s.value) }))]
        } />
      

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Toolbar>
            <SearchInput value={recherche} onChange={setRecherche} placeholder="Nom du candidat…" className="w-64" />
            <Divider />
            <Badge tone="neutral">{liste.length} dossier(s)</Badge>
          </Toolbar>
          {candidatures.loading && <LoadingState />}
          {candidatures.error && <ErrorState message={candidatures.error} onRetry={candidatures.reload} />}
          <DataTable
            columns={colonnes}
            rows={liste}
            rowKey={(c) => c.id}
            onRowClick={(c) => {
              setOuverte(c);
              setNouveauStatut(c.statut);
              setCommentaire('');
              setMatricule('');
            }}
            maxHeight="calc(100vh - 430px)"
            emptyLabel="Aucune candidature pour ce filtre." />
          
        </div>

        <Panel title="Taux de remplissage" subtitle="Capacité déclarée vs inscriptions">
          {remplissage.loading && <LoadingState />}
          {remplissage.error && <ErrorState message={remplissage.error} onRetry={remplissage.reload} />}
          <ul className="space-y-2">
            {(remplissage.data ?? []).map((c) =>
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
            {!remplissage.loading && (remplissage.data ?? []).length === 0 &&
            <li className="py-4 text-center text-2xs text-win-muted">Aucune donnée de remplissage.</li>
            }
          </ul>
        </Panel>
      </div>

      <Drawer
        open={!!ouverte}
        onClose={() => setOuverte(null)}
        title={ouverte ? `${ouverte.prenom_candidat} ${ouverte.nom_candidat}` : ''}
        subtitle={ouverte ? `Dossier déposé le ${formatDate(ouverte.date_candidature)}` : undefined}
        width="w-[560px]"
        footer={
        <div className="flex items-center justify-end gap-2">
            <Button
            onClick={() =>
            ouverte &&
            statuer.run(
              () => ecoleStatuerCandidature(ouverte.id, { nouveau_statut: nouveauStatut, commentaire: commentaire || null }),
              () => {
                candidatures.reload();
                setOuverte(null);
              }
            )
            }
            disabled={statuer.submitting}>
            
              Enregistrer la décision
            </Button>
            <Button
            variant="primary"
            icon={<UserRoundCheckIcon size={12} />}
            disabled={!matricule || convertir.submitting}
            onClick={() =>
            ouverte &&
            convertir.run(
              () => ecoleConvertirCandidature(ouverte.id, matricule),
              () => {
                candidatures.reload();
                setOuverte(null);
              }
            )
            }>
            
              Convertir en élève
            </Button>
          </div>
        }>
        
        {ouverte &&
        <div className="space-y-3">
            {(statuer.error || convertir.error) &&
          <p className="border border-[#EFC2C2] bg-state-dangerBg px-2 py-1.5 text-2xs text-state-dangerFg rounded-win">
                {statuer.error ?? convertir.error}
              </p>
          }
            <Panel title="Dossier">
              <dl>
                <FieldRow label="Identifiant">{ouverte.id}</FieldRow>
                <FieldRow label="Date de naissance">{formatDate(ouverte.date_naissance)}</FieldRow>
                <FieldRow label="Provenance">{str(ouverte.etablissement_provenance)}</FieldRow>
                <FieldRow label="Statut actuel">
                  <StatusBadge value={ouverte.statut} />
                </FieldRow>
                <FieldRow label="Position liste d’attente">
                  {ouverte.position_liste_attente === null ? '—' : `#${ouverte.position_liste_attente}`}
                </FieldRow>
                <FieldRow label="Commentaire évaluateur">{str(ouverte.commentaire_evaluateur)}</FieldRow>
              </dl>
            </Panel>

            <Panel title="Statuer sur la candidature" subtitle="La décision est enregistrée côté backend">
              <div className="space-y-3">
                <SelectField label="Nouveau statut" required value={nouveauStatut} onChange={setNouveauStatut} options={STATUTS} />
                <TextAreaField label="Commentaire" value={commentaire} onChange={setCommentaire} />
              </div>
            </Panel>

            <Panel title="Conversion en élève" subtitle="Crée le dossier élève à partir de la candidature">
              <TextField label="Matricule attribué" required value={matricule} onChange={setMatricule} />
            </Panel>
          </div>
        }
      </Drawer>

      <FormDrawer
        open={formCandidature}
        onClose={() => setFormCandidature(false)}
        title="Nouvelle candidature"
        submitting={creation.submitting}
        error={creation.error}
        submitLabel="Enregistrer la candidature"
        onSubmit={() =>
        creation.run(
          () =>
          ecoleCreerCandidature({
            nom_candidat: nouvelle.nom_candidat,
            prenom_candidat: nouvelle.prenom_candidat,
            date_naissance: nouvelle.date_naissance,
            etablissement_provenance: nouvelle.etablissement_provenance || null,
            date_candidature: nouvelle.date_candidature,
            statut: nouvelle.statut
          }),
          () => {
            setFormCandidature(false);
            candidatures.reload();
          }
        )
        }>
        
        <TextField label="Nom du candidat" required value={nouvelle.nom_candidat} onChange={(v) => setNouvelle({ ...nouvelle, nom_candidat: v })} />
        <TextField label="Prénom du candidat" required value={nouvelle.prenom_candidat} onChange={(v) => setNouvelle({ ...nouvelle, prenom_candidat: v })} />
        <TextField label="Date de naissance" type="date" required value={nouvelle.date_naissance} onChange={(v) => setNouvelle({ ...nouvelle, date_naissance: v })} />
        <TextField
          label="Établissement de provenance"
          value={nouvelle.etablissement_provenance}
          onChange={(v) => setNouvelle({ ...nouvelle, etablissement_provenance: v })} />
        
        <TextField label="Date de candidature" type="date" required value={nouvelle.date_candidature} onChange={(v) => setNouvelle({ ...nouvelle, date_candidature: v })} />
        <SelectField label="Statut initial" required value={nouvelle.statut} onChange={(v) => setNouvelle({ ...nouvelle, statut: v })} options={STATUTS} />
      </FormDrawer>
    </>);

}