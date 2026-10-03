import React, { useMemo, useState } from 'react';
import { FilterXIcon, UserPlusIcon, ClipboardPlusIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import {
  Avatar,
  Button,
  Divider,
  SearchInput,
  Select,
  StatTile,
  Toolbar,
  TextField,
  SelectField,
  CheckboxField,
  ErrorState,
  LoadingState } from
'../components/ui/primitives';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import { EleveDrawer } from '../components/eleves/EleveDrawer';
import { CreerCompteParentDrawer } from '../components/CreerCompteParentDrawer';
import { useResource, useSubmit } from '../hooks/useResource';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { aujourdHui, formatDate, initiales } from '../utils/format';
import { nomEleve, normaliser } from '../utils/labels';
import { ecoleCreerEleve, ecoleInscrireEleve, ecoleListerEleves, ecoleTauxRemplissage } from '../lib/api_ecole';
import type { Eleve, InscrireResult } from '../lib/api_ecole';

// La page Parents reste importable depuis ce fichier
export { Parents } from './Parents';

const STATUTS = [
{ value: 'actif', label: 'Actif' },
{ value: 'suspendu', label: 'Suspendu' },
{ value: 'sorti', label: 'Sorti' }];


const NOUVEL_ELEVE = {
  matricule: '',
  nom: '',
  prenom: '',
  date_naissance: '',
  sexe: 'M',
  statut: 'actif',
  date_entree_etablissement: aujourdHui(),
  etablissement_provenance: '',
  allergies: ''
};

export function Eleves() {
  const ref = useReferentielEcole();
  const { anneeId } = ref;

  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('tous');
  const [sexe, setSexe] = useState('tous');
  const [selection, setSelection] = useState<string[]>([]);
  const [ouvert, setOuvert] = useState<Eleve | null>(null);
  const [creation, setCreation] = useState(false);
  const [inscription, setInscription] = useState(false);
  const [creerParent, setCreerParent] = useState(false);
  const [resultatInscription, setResultatInscription] = useState<InscrireResult | null>(null);

  const eleves = useResource(
    () => ecoleListerEleves({ q: recherche.trim() || undefined, statut: statut !== 'tous' ? statut : undefined }),
    [recherche, statut]
  );
  const tousEleves = useResource(() => ecoleListerEleves(), []);
  const remplissage = useResource(() => ecoleTauxRemplissage(anneeId), [anneeId], !!anneeId);

  const creerForm = useSubmit();
  const inscrireForm = useSubmit();

  const [nouveau, setNouveau] = useState(NOUVEL_ELEVE);
  const [nouvelleInscription, setNouvelleInscription] = useState({
    eleve_id: '',
    classe_id: '',
    date_inscription: aujourdHui(),
    est_redoublant: false
  });

  const lignes = useMemo(
    () =>
    (eleves.data ?? []).filter((e) => {
      const q = normaliser(recherche);
      if (q && !normaliser(`${e.prenom} ${e.nom} ${e.matricule}`).includes(q)) return false;
      if (sexe !== 'tous' && e.sexe !== sexe) return false;
      return true;
    }),
    [eleves.data, recherche, sexe]
  );

  const remplissageParClasse = useMemo(
    () => new Map((remplissage.data ?? []).map((r) => [r.classe, r])),
    [remplissage.data]
  );

  const capaciteTotale = (remplissage.data ?? []).reduce((acc, c) => acc + c.effectif_max, 0);
  const effectifTotal = (remplissage.data ?? []).reduce((acc, c) => acc + c.effectif_actuel, 0);
  const placesRestantes = (remplissage.data ?? []).reduce((acc, c) => acc + c.places_restantes, 0);
  const tauxGlobal = capaciteTotale ? Math.round(effectifTotal / capaciteTotale * 100) : 0;

  const colonnes: Column<Eleve>[] = [
  {
    key: 'eleve',
    header: 'Élève',
    width: '28%',
    sortValue: (e) => `${e.nom} ${e.prenom}`,
    render: (e) =>
    <span className="flex items-center gap-2">
          <Avatar initiales={initiales(e.nom, e.prenom)} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-win-text">{nomEleve(e)}</span>
            <span className="block text-2xs text-win-faint">Matricule {e.matricule}</span>
          </span>
        </span>

  },
  { key: 'naissance', header: 'Né(e) le', sortValue: (e) => String(e.date_naissance), render: (e) => formatDate(e.date_naissance) },
  { key: 'sexe', header: 'Sexe', render: (e) => e.sexe === 'M' ? 'Masculin' : e.sexe === 'F' ? 'Féminin' : '—' },
  {
    key: 'entree',
    header: 'Entrée',
    sortValue: (e) => String(e.date_entree_etablissement),
    render: (e) => formatDate(e.date_entree_etablissement)
  },
  { key: 'provenance', header: 'Provenance', render: (e) => e.etablissement_provenance ?? '—' },
  {
    key: 'indicateurs',
    header: 'Indicateurs',
    width: '18%',
    render: (e) =>
    <span className="flex flex-wrap gap-1">
          <StatusBadge value={String(e.statut)} />
          {e.allergies && <Badge tone="warning">Allergies</Badge>}
        </span>

  }];


  function soumettreEleve() {
    if (!nouveau.matricule.trim() || !nouveau.nom.trim() || !nouveau.prenom.trim())
    return creerForm.setError('Matricule, nom et prénom sont obligatoires.');
    if (!nouveau.date_naissance) return creerForm.setError('La date de naissance est obligatoire.');
    creerForm.run(
      () =>
      ecoleCreerEleve({
        matricule: nouveau.matricule.trim(),
        nom: nouveau.nom.trim(),
        prenom: nouveau.prenom.trim(),
        date_naissance: nouveau.date_naissance,
        sexe: nouveau.sexe,
        statut: nouveau.statut,
        date_entree_etablissement: nouveau.date_entree_etablissement,
        etablissement_provenance: nouveau.etablissement_provenance.trim() || null,
        allergies: nouveau.allergies.trim() || null
      }),
      () => {
        setCreation(false);
        setNouveau(NOUVEL_ELEVE);
        eleves.reload();
        tousEleves.reload();
      }
    );
  }

  function soumettreInscription() {
    if (!nouvelleInscription.eleve_id) return inscrireForm.setError('Choisissez un élève.');
    if (!nouvelleInscription.classe_id) return inscrireForm.setError('Choisissez une classe.');
    inscrireForm.run(
      async () => {
        const r = await ecoleInscrireEleve({
          eleve_id: nouvelleInscription.eleve_id,
          classe_id: nouvelleInscription.classe_id,
          annee_scolaire_id: anneeId,
          est_redoublant: nouvelleInscription.est_redoublant,
          date_inscription: nouvelleInscription.date_inscription
        });
        setResultatInscription(r);
      },
      () => {
        setNouvelleInscription({ eleve_id: '', classe_id: '', date_inscription: aujourdHui(), est_redoublant: false });
        remplissage.reload();
        eleves.reload();
      }
    );
  }

  const optionsElevesActifs = (tousEleves.data ?? []).
  filter((e) => e.statut === 'actif').
  sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')).
  map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}`, hint: `Matricule ${e.matricule}` }));

  const optionsClasses = (ref.classes.data ?? []).
  slice().
  sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')).
  map((c) => {
    const r = remplissageParClasse.get(c.libelle);
    return {
      value: c.id,
      label: c.libelle,
      hint: r ?
      `${ref.niveauLabel(c.niveau_id)} · ${r.places_restantes} place(s) restante(s) sur ${r.effectif_max}` :
      ref.niveauLabel(c.niveau_id)
    };
  });

  const classeChoisie = ref.classesParId.get(nouvelleInscription.classe_id);
  const remplissageChoisi = classeChoisie ? remplissageParClasse.get(classeChoisie.libelle) : undefined;

  return (
    <>
      <PageHeader
        title="Dossiers élèves"
        description={`Registre central · ${ref.anneeLibelle}`}
        actions={
        <>
            <Button icon={<UsersIcon size={13} />} onClick={() => setCreerParent(true)}>
              Compte parent
            </Button>
            <Button
            icon={<ClipboardPlusIcon size={13} />}
            onClick={() => {
              setResultatInscription(null);
              setInscription(true);
            }}
            disabled={!anneeId}>
            
              Nouvelle inscription
            </Button>
            <Button variant="primary" icon={<UserPlusIcon size={13} />} onClick={() => setCreation(true)}>
              Nouvel élève
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Effectif inscrit"
          value={remplissage.data ? effectifTotal : '—'}
          hint={capaciteTotale ? `${tauxGlobal} % des ${capaciteTotale} places` : 'Aucune capacité déclarée'}
          tone="accent" />
        
        <StatTile label="Élèves enregistrés" value={(tousEleves.data ?? []).length} hint="Tous statuts" tone="neutral" />
        <StatTile label="Classes de l’année" value={(ref.classes.data ?? []).length} hint={ref.anneeLibelle} tone="success" />
        <StatTile label="Places restantes" value={remplissage.data ? placesRestantes : '—'} hint="Toutes classes confondues" tone="warning" />
      </div>

      <Toolbar>
        <SearchInput value={recherche} onChange={setRecherche} placeholder="Nom, prénom ou matricule…" className="w-64" />
        <Divider />
        <Select label="Statut" value={statut} onChange={setStatut} options={[{ value: 'tous', label: 'Tous' }, ...STATUTS]} />
        <Select
          label="Sexe"
          value={sexe}
          onChange={setSexe}
          options={[
          { value: 'tous', label: 'Tous' },
          { value: 'M', label: 'Masculin' },
          { value: 'F', label: 'Féminin' }]
          } />
        
        <Divider />
        <Button
          size="sm"
          variant="ghost"
          icon={<FilterXIcon size={12} />}
          onClick={() => {
            setRecherche('');
            setStatut('tous');
            setSexe('tous');
          }}>
          
          Réinitialiser
        </Button>
      </Toolbar>

      {selection.length > 0 &&
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-win border border-win-accent bg-win-accentSoft px-3 py-2">
          <span className="text-xs font-medium text-win-accent">{selection.length} élève(s) sélectionné(s)</span>
          <Divider />
          <Button size="sm" variant="ghost" onClick={() => setSelection([])}>
            Vider la sélection
          </Button>
        </div>
      }

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {eleves.loading && <LoadingState />}
          {eleves.error && <ErrorState message={eleves.error} onRetry={eleves.reload} />}
          <DataTable
            columns={colonnes}
            rows={lignes}
            rowKey={(e) => e.id}
            selectable
            selected={selection}
            onSelectedChange={setSelection}
            onRowClick={(e) => setOuvert(e)}
            maxHeight="calc(100vh - 380px)"
            emptyLabel="Aucun élève ne correspond à ces critères." />
          
        </div>

        <section aria-label="Remplissage des classes" className="rounded-win border border-win-border bg-win-surface shadow-win">
          <h2 className="border-b border-win-border px-3 py-2 text-xs font-semibold text-win-text">Remplissage des classes</h2>
          {remplissage.loading && <LoadingState />}
          <ul className="max-h-[calc(100vh-420px)] divide-y divide-win-border overflow-auto">
            {(remplissage.data ?? []).
            slice().
            sort((a, b) => b.taux_remplissage_pct - a.taux_remplissage_pct).
            map((r) =>
            <li key={r.classe} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-2xs">
                    <span className="font-medium text-win-text">{r.classe}</span>
                    <span className="tabular-nums text-win-muted">
                      {r.effectif_actuel}/{r.effectif_max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-win-sunken">
                    <div
                  className={`h-full ${r.taux_remplissage_pct >= 100 ? 'bg-state-dangerFg' : r.taux_remplissage_pct >= 85 ? 'bg-state-warnFg' : 'bg-win-accent'}`}
                  style={{ width: `${Math.min(100, r.taux_remplissage_pct)}%` }} />
                
                  </div>
                </li>
            )}
            {!remplissage.loading && (remplissage.data ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucune classe pour cette année.</li>
            }
          </ul>
        </section>
      </div>

      <EleveDrawer eleve={ouvert} eleveId={ouvert?.id ?? null} onClose={() => setOuvert(null)} />
      <CreerCompteParentDrawer open={creerParent} onClose={() => setCreerParent(false)} />

      <FormDrawer
        open={creation}
        onClose={() => {
          setCreation(false);
          creerForm.setError(null);
        }}
        title="Nouvel élève"
        onSubmit={soumettreEleve}
        submitting={creerForm.submitting}
        error={creerForm.error}
        submitLabel="Créer l’élève">
        
        <TextField label="Matricule" required value={nouveau.matricule} onChange={(v) => setNouveau({ ...nouveau, matricule: v })} />
        <TextField label="Nom" required value={nouveau.nom} onChange={(v) => setNouveau({ ...nouveau, nom: v })} />
        <TextField label="Prénom" required value={nouveau.prenom} onChange={(v) => setNouveau({ ...nouveau, prenom: v })} />
        <TextField
          label="Date de naissance"
          type="date"
          required
          value={nouveau.date_naissance}
          onChange={(v) => setNouveau({ ...nouveau, date_naissance: v })} />
        
        <SelectField
          label="Sexe"
          required
          value={nouveau.sexe}
          onChange={(v) => setNouveau({ ...nouveau, sexe: v })}
          options={[
          { value: 'M', label: 'Masculin' },
          { value: 'F', label: 'Féminin' }]
          } />
        
        <SelectField label="Statut" required value={nouveau.statut} onChange={(v) => setNouveau({ ...nouveau, statut: v })} options={STATUTS} />
        <TextField
          label="Entrée dans l’établissement"
          type="date"
          value={nouveau.date_entree_etablissement}
          onChange={(v) => setNouveau({ ...nouveau, date_entree_etablissement: v })} />
        
        <TextField
          label="Établissement de provenance"
          value={nouveau.etablissement_provenance}
          onChange={(v) => setNouveau({ ...nouveau, etablissement_provenance: v })} />
        
        <TextField label="Allergies" value={nouveau.allergies} onChange={(v) => setNouveau({ ...nouveau, allergies: v })} />
      </FormDrawer>

      <FormDrawer
        open={inscription}
        onClose={() => {
          setInscription(false);
          inscrireForm.setError(null);
        }}
        title="Nouvelle inscription"
        subtitle={`${ref.anneeLibelle} · l’échéancier est généré automatiquement`}
        onSubmit={soumettreInscription}
        submitting={inscrireForm.submitting}
        error={inscrireForm.error}
        submitLabel="Inscrire">
        
        {resultatInscription &&
        <p className="rounded-win border border-state-successFg/30 bg-win-panel px-3 py-2 text-2xs text-state-successFg">
            Inscription enregistrée — {resultatInscription.echeancier_genere} échéance(s) générée(s). Vous pouvez inscrire un autre élève.
          </p>
        }
        <ComboboxField
          label="Élève"
          required
          value={nouvelleInscription.eleve_id}
          onChange={(v) => setNouvelleInscription({ ...nouvelleInscription, eleve_id: v })}
          loading={tousEleves.loading}
          emptyLabel="Aucun élève actif — créez d’abord le dossier."
          options={optionsElevesActifs} />
        
        <ComboboxField
          label="Classe"
          required
          value={nouvelleInscription.classe_id}
          onChange={(v) => setNouvelleInscription({ ...nouvelleInscription, classe_id: v })}
          loading={ref.classes.loading}
          emptyLabel="Aucune classe pour cette année."
          options={optionsClasses} />
        
        {remplissageChoisi && remplissageChoisi.places_restantes <= 0 &&
        <p className="rounded-win border border-state-warnFg/30 bg-state-warnBg px-3 py-2 text-2xs text-state-warnFg">
            Cette classe est complète ({remplissageChoisi.effectif_actuel}/{remplissageChoisi.effectif_max}).
          </p>
        }
        <TextField
          label="Date d’inscription"
          type="date"
          required
          value={nouvelleInscription.date_inscription}
          onChange={(v) => setNouvelleInscription({ ...nouvelleInscription, date_inscription: v })} />
        
        <CheckboxField
          label="Élève redoublant"
          checked={nouvelleInscription.est_redoublant}
          onChange={(v) => setNouvelleInscription({ ...nouvelleInscription, est_redoublant: v })} />
        
      </FormDrawer>
    </>);

}