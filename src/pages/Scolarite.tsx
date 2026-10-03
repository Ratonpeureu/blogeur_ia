import React, { useMemo, useState } from 'react';
import { BookPlusIcon, GraduationCapIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import {
  Button,
  Divider,
  ErrorState,
  LoadingState,
  SearchInput,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { ClasseDrawer } from '../components/scolarite/ClasseDrawer';
import { ReferentielPanel } from '../components/scolarite/ReferentielPanel';
import { EvaluationPanel } from '../components/scolarite/EvaluationPanel';
import { BulletinsPanel } from '../components/scolarite/BulletinsPanel';
import { PerformancesPanel } from '../components/scolarite/PerformancesPanel';
import { useResource, useSubmit } from '../hooks/useResource';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { useEnseignants } from '../hooks/useEnseignants';
import { libelleDe, normaliser } from '../utils/labels';
import {
  ecoleAffecterMatiereClasse,
  ecoleCreerClasseDepuisReferentiel,
  ecoleCreerMatiere,
  ecoleListerBaremes,
  ecoleListerMatieres,
  ecoleListerMatieresClasse,
  ecoleListerPeriodes,
  ecoleListerTypesEvaluation,
  ecoleRetirerMatiereClasse,
  ecoleSupprimerMatiere,
  ecoleTauxRemplissage } from
'../lib/api_ecole';
import type { Classe, Matiere, MatiereClasseListItem, TauxRemplissageClasse } from '../lib/api_ecole';

const CLASSE_VIDE = { niveau_id: '', libelle: '', serie_id: '', effectif_max: '40' };
const AFFECTATION_VIDE = { matiere_id: '', enseignant_id: '', coefficient: '1' };

export function Scolarite() {
  const ref = useReferentielEcole();
  const { anneeId, anneeLibelle } = ref;
  const enseignants = useEnseignants();

  const [tab, setTab] = useState('classes');
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [classeOuverte, setClasseOuverte] = useState<Classe | null>(null);
  const [classeSelection, setClasseSelection] = useState('');
  const [rechercheMatiere, setRechercheMatiere] = useState('');

  const [formClasse, setFormClasse] = useState(false);
  const [formMatiere, setFormMatiere] = useState(false);
  const [formAffectation, setFormAffectation] = useState(false);

  const matieres = useResource(() => ecoleListerMatieres(), []);
  const periodes = useResource(() => ecoleListerPeriodes(anneeId), [anneeId], !!anneeId);
  const baremes = useResource(() => ecoleListerBaremes(), []);
  const typesEval = useResource(() => ecoleListerTypesEvaluation(), []);
  const remplissage = useResource(() => ecoleTauxRemplissage(anneeId), [anneeId], !!anneeId);
  const matieresClasse = useResource(() => ecoleListerMatieresClasse(classeSelection), [classeSelection], !!classeSelection);

  const creerClasse = useSubmit();
  const creerMatiere = useSubmit();
  const affecter = useSubmit();
  const suppression = useSubmit();

  const [nouvelleClasse, setNouvelleClasse] = useState(CLASSE_VIDE);
  const [nouvelleMatiere, setNouvelleMatiere] = useState({ libelle: '', code: '' });
  const [affectation, setAffectation] = useState(AFFECTATION_VIDE);

  // Le backend renvoie le taux de remplissage par libellé de classe
  const remplissageParLibelle = useMemo(
    () => new Map<string, TauxRemplissageClasse>((remplissage.data ?? []).map((r) => [r.classe, r])),
    [remplissage.data]
  );

  const classes = ref.classes.data ?? [];
  const niveauChoisi = ref.niveauxParId.get(nouvelleClasse.niveau_id);

  const classesFiltrees = classes.
  filter((c) => !filtreNiveau || c.niveau_id === filtreNiveau).
  filter((c) => !recherche.trim() || normaliser(c.libelle).includes(normaliser(recherche)));

  const matieresFiltrees = (matieres.data ?? []).filter(
    (m) => !rechercheMatiere.trim() || normaliser(`${m.libelle} ${String(m.code ?? '')}`).includes(normaliser(rechercheMatiere))
  );

  const dejaAffectees = new Set((matieresClasse.data ?? []).map((m) => m.matiere));
  const optionsMatieresAffectables = (matieres.data ?? []).
  filter((m) => !dejaAffectees.has(m.libelle)).
  sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')).
  map((m) => ({ value: m.id, label: m.libelle, hint: typeof m.code === 'string' ? m.code : undefined }));

  const effectifTotal = (remplissage.data ?? []).reduce((acc, r) => acc + r.effectif_actuel, 0);
  const capaciteTotale = (remplissage.data ?? []).reduce((acc, r) => acc + r.effectif_max, 0);
  const sansEnseignant = (matieresClasse.data ?? []).filter((m) => !m.enseignant_id).length;
  const totalCoef = (matieresClasse.data ?? []).reduce((acc, m) => acc + m.coefficient, 0);

  const colonnesClasses: Column<Classe>[] = [
  {
    key: 'libelle',
    header: 'Classe',
    sortValue: (c) => c.libelle,
    render: (c) => <span className="font-medium text-win-text">{c.libelle}</span>
  },
  { key: 'niveau', header: 'Niveau', sortValue: (c) => ref.niveauAvecCycle(c.niveau_id), render: (c) => ref.niveauAvecCycle(c.niveau_id) },
  { key: 'serie', header: 'Série', render: (c) => c.serie_id ? ref.serieLabel(c.serie_id) : '—' },
  {
    key: 'effectif',
    header: 'Effectif',
    align: 'right',
    sortValue: (c) => remplissageParLibelle.get(c.libelle)?.effectif_actuel ?? 0,
    render: (c) => {
      const r = remplissageParLibelle.get(c.libelle);
      return r ? `${r.effectif_actuel} / ${r.effectif_max}` : `— / ${c.effectif_max}`;
    }
  },
  {
    key: 'remplissage',
    header: 'Remplissage',
    align: 'right',
    sortValue: (c) => remplissageParLibelle.get(c.libelle)?.taux_remplissage_pct ?? 0,
    render: (c) => {
      const r = remplissageParLibelle.get(c.libelle);
      if (!r) return '—';
      const tone = r.places_restantes <= 0 ? 'danger' : r.taux_remplissage_pct >= 90 ? 'warning' : 'success';
      return <Badge tone={tone}>{r.places_restantes <= 0 ? 'Complète' : `${r.taux_remplissage_pct} %`}</Badge>;
    }
  },
  {
    key: 'edt',
    header: 'Emploi du temps',
    render: (c) => c.type_organisation_edt_effectif === 'fixe' ? 'Journée fixe' : 'Par matière'
  }];


  const colonnesMatieres: Column<Matiere>[] = [
  {
    key: 'libelle',
    header: 'Matière',
    sortValue: (m) => m.libelle,
    render: (m) => <span className="font-medium text-win-text">{m.libelle}</span>
  },
  { key: 'code', header: 'Code', render: (m) => typeof m.code === 'string' && m.code ? m.code : '—' },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (m) =>
    <Button
      size="sm"
      variant="danger"
      icon={<Trash2Icon size={12} />}
      disabled={suppression.submitting}
      onClick={() => {
        if (window.confirm(`Supprimer la matière « ${m.libelle} » du catalogue ?`))
        suppression.run(() => ecoleSupprimerMatiere(m.id), () => matieres.reload());
      }}>
      
          Supprimer
        </Button>

  }];


  const colonnesMatiereClasse: Column<MatiereClasseListItem>[] = [
  {
    key: 'matiere',
    header: 'Matière',
    sortValue: (m) => m.matiere,
    render: (m) => <span className="font-medium text-win-text">{m.matiere}</span>
  },
  { key: 'coef', header: 'Coefficient', align: 'right', sortValue: (m) => m.coefficient, render: (m) => m.coefficient },
  {
    key: 'enseignant',
    header: 'Enseignant',
    sortValue: (m) => enseignants.nom(m.enseignant_id),
    render: (m) =>
    m.enseignant_id ?
    enseignants.nom(m.enseignant_id) :

    <Badge tone="warning">Non affecté</Badge>

  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (m) =>
    <Button
      size="sm"
      variant="danger"
      icon={<Trash2Icon size={12} />}
      disabled={suppression.submitting}
      onClick={() => {
        if (window.confirm(`Retirer « ${m.matiere} » de ${ref.classeLabel(classeSelection)} ?`))
        suppression.run(() => ecoleRetirerMatiereClasse(m.matiere_classe_id), () => matieresClasse.reload());
      }}>
      
          Retirer
        </Button>

  }];


  return (
    <>
      <PageHeader
        title="Scolarité & classes"
        description={`Classes, matières, référentiel, périodes, bulletins et performances · ${anneeLibelle}`}
        actions={
        <>
            <Button icon={<BookPlusIcon size={13} />} onClick={() => setFormMatiere(true)}>
              Nouvelle matière
            </Button>
            <Button variant="primary" icon={<GraduationCapIcon size={13} />} onClick={() => setFormClasse(true)}>
              Nouvelle classe
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Classes de l’année" value={classes.length} hint={anneeLibelle} tone="accent" />
        <StatTile
          label="Élèves inscrits"
          value={remplissage.data ? effectifTotal : '—'}
          hint={capaciteTotale ? `${capaciteTotale} places au total` : 'Capacité non renseignée'}
          tone="neutral" />
        
        <StatTile label="Matières au catalogue" value={(matieres.data ?? []).length} hint="Toutes classes" tone="success" />
        <StatTile
          label="Périodes"
          value={(periodes.data ?? []).length}
          hint={`${(typesEval.data ?? []).length} type(s) d’évaluation · ${(baremes.data ?? []).length} barème(s)`}
          tone="warning" />
        
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'classes', label: 'Classes', count: classes.length },
        { id: 'matieres', label: 'Matières', count: (matieres.data ?? []).length },
        { id: 'affectations', label: 'Matières par classe' },
        { id: 'referentiel', label: 'Référentiel' },
        { id: 'evaluation', label: 'Périodes & barèmes', count: (periodes.data ?? []).length },
        { id: 'bulletins', label: 'Bulletins' },
        { id: 'performances', label: 'Performances' }]
        } />
      

      <div className="mt-3 space-y-3">
        {suppression.error && <ErrorState message={suppression.error} onRetry={() => suppression.setError(null)} />}

        {tab === 'classes' &&
        <>
            <Toolbar>
              <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher une classe…" className="w-64" />
              <Divider />
              <ComboboxField
              label="Niveau"
              allowEmpty
              placeholder="Tous les niveaux"
              value={filtreNiveau}
              onChange={setFiltreNiveau}
              loading={ref.niveaux.loading}
              options={ref.niveauOptions}
              className="w-56" />
            
            </Toolbar>
            {ref.classes.loading && <LoadingState />}
            {ref.classes.error && <ErrorState message={ref.classes.error} onRetry={ref.classes.reload} />}
            <DataTable
            columns={colonnesClasses}
            rows={classesFiltrees}
            rowKey={(c) => c.id}
            onRowClick={(c) => setClasseOuverte(c)}
            emptyLabel={anneeId ? 'Aucune classe pour cette année scolaire.' : 'Chargement de l’année scolaire…'} />
          
          </>
        }

        {tab === 'matieres' &&
        <>
            <Toolbar>
              <SearchInput value={rechercheMatiere} onChange={setRechercheMatiere} placeholder="Rechercher une matière…" className="w-64" />
              <Divider />
              <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormMatiere(true)}>
                Nouvelle matière
              </Button>
            </Toolbar>
            {matieres.loading && <LoadingState />}
            {matieres.error && <ErrorState message={matieres.error} onRetry={matieres.reload} />}
            <DataTable columns={colonnesMatieres} rows={matieresFiltrees} rowKey={(m) => m.id} emptyLabel="Aucune matière au catalogue." />
          </>
        }

        {tab === 'affectations' &&
        <>
            <Toolbar>
              <ComboboxField
              label="Classe"
              value={classeSelection}
              onChange={setClasseSelection}
              loading={ref.classes.loading}
              options={ref.classeOptions}
              placeholder="Choisir une classe…"
              className="w-64" />
            
              <Divider />
              <Button
              size="sm"
              icon={<PlusIcon size={12} />}
              disabled={!classeSelection}
              onClick={() => {
                setAffectation(AFFECTATION_VIDE);
                setFormAffectation(true);
              }}>
              
                Affecter une matière
              </Button>
              {classeSelection && matieresClasse.data &&
            <>
                  <Divider />
                  <span className="text-2xs text-win-muted">
                    {matieresClasse.data.length} matière(s) · coefficients {totalCoef}
                  </span>
                  {sansEnseignant > 0 && <Badge tone="warning">{sansEnseignant} sans enseignant</Badge>}
                </>
            }
            </Toolbar>
            {matieresClasse.loading && <LoadingState />}
            {matieresClasse.error && <ErrorState message={matieresClasse.error} onRetry={matieresClasse.reload} />}
            <DataTable
            columns={colonnesMatiereClasse}
            rows={matieresClasse.data ?? []}
            rowKey={(m) => m.matiere_classe_id}
            emptyLabel={classeSelection ? 'Aucune matière affectée à cette classe.' : 'Choisissez une classe pour voir ses matières.'} />
          
          </>
        }

        {tab === 'referentiel' && <ReferentielPanel />}
        {tab === 'evaluation' && <EvaluationPanel anneeLibelle={anneeLibelle} />}
        {tab === 'bulletins' && <BulletinsPanel />}
        {tab === 'performances' && <PerformancesPanel />}
      </div>

      <ClasseDrawer
        classe={classeOuverte}
        niveau={classeOuverte ? ref.niveauAvecCycle(classeOuverte.niveau_id) : ''}
        serie={classeOuverte?.serie_id ? ref.serieLabel(classeOuverte.serie_id) : null}
        remplissage={classeOuverte ? remplissageParLibelle.get(classeOuverte.libelle) : undefined}
        onClose={() => setClasseOuverte(null)} />
      

      {/* ── Nouvelle classe ── */}
      <FormDrawer
        open={formClasse}
        onClose={() => {
          setFormClasse(false);
          creerClasse.setError(null);
        }}
        title="Nouvelle classe"
        subtitle={anneeLibelle}
        submitting={creerClasse.submitting}
        error={creerClasse.error}
        submitLabel="Créer la classe"
        onSubmit={() => {
          if (!nouvelleClasse.niveau_id) return creerClasse.setError('Choisissez un niveau.');
          if (!nouvelleClasse.libelle.trim()) return creerClasse.setError('Le nom de la classe est obligatoire.');
          if (classes.some((c) => normaliser(c.libelle) === normaliser(nouvelleClasse.libelle)))
          return creerClasse.setError('Une classe porte déjà ce nom cette année.');
          creerClasse.run(
            () =>
            ecoleCreerClasseDepuisReferentiel({
              annee_scolaire_id: anneeId || null,
              niveau_id: nouvelleClasse.niveau_id,
              libelle: nouvelleClasse.libelle.trim(),
              serie_id: niveauChoisi?.a_series ? nouvelleClasse.serie_id || null : null,
              effectif_max: Number(nouvelleClasse.effectif_max) || undefined
            }),
            () => {
              setFormClasse(false);
              setNouvelleClasse(CLASSE_VIDE);
              ref.classes.reload();
              remplissage.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Niveau"
          required
          value={nouvelleClasse.niveau_id}
          onChange={(v) => setNouvelleClasse({ ...nouvelleClasse, niveau_id: v, serie_id: '' })}
          loading={ref.niveaux.loading}
          emptyLabel="Le référentiel est en cours de préparation."
          options={ref.niveauOptions} />
        
        {niveauChoisi &&
        <p className="text-2xs text-win-muted">
            {ref.cycleLabel(niveauChoisi.cycle_id)} · emploi du temps{' '}
            {(niveauChoisi.type_organisation_edt ?? ref.cyclesParId.get(niveauChoisi.cycle_id)?.type_organisation_edt) === 'fixe' ?
          'à journée fixe' :
          'par matière'}
          </p>
        }
        {niveauChoisi?.a_series &&
        <SelectField
          label="Série"
          value={nouvelleClasse.serie_id}
          onChange={(v) => setNouvelleClasse({ ...nouvelleClasse, serie_id: v })}
          options={[
          { value: '', label: 'Aucune série' },
          ...(ref.series.data ?? []).filter((s) => s.actif).map((s) => ({ value: s.id, label: libelleDe(s) }))]
          } />

        }
        <TextField
          label="Nom de la classe"
          required
          value={nouvelleClasse.libelle}
          onChange={(v) => setNouvelleClasse({ ...nouvelleClasse, libelle: v })} />
        
        <TextField
          label="Effectif maximum"
          type="number"
          value={nouvelleClasse.effectif_max}
          onChange={(v) => setNouvelleClasse({ ...nouvelleClasse, effectif_max: v })} />
        
      </FormDrawer>

      {/* ── Nouvelle matière ── */}
      <FormDrawer
        open={formMatiere}
        onClose={() => {
          setFormMatiere(false);
          creerMatiere.setError(null);
        }}
        title="Nouvelle matière"
        submitting={creerMatiere.submitting}
        error={creerMatiere.error}
        onSubmit={() => {
          if (!nouvelleMatiere.libelle.trim()) return creerMatiere.setError('Le libellé est obligatoire.');
          if ((matieres.data ?? []).some((m) => normaliser(m.libelle) === normaliser(nouvelleMatiere.libelle)))
          return creerMatiere.setError('Cette matière existe déjà au catalogue.');
          creerMatiere.run(
            () => ecoleCreerMatiere({ libelle: nouvelleMatiere.libelle.trim(), code: nouvelleMatiere.code.trim() || null }),
            () => {
              setFormMatiere(false);
              setNouvelleMatiere({ libelle: '', code: '' });
              matieres.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={nouvelleMatiere.libelle} onChange={(v) => setNouvelleMatiere({ ...nouvelleMatiere, libelle: v })} />
        <TextField label="Code" value={nouvelleMatiere.code} onChange={(v) => setNouvelleMatiere({ ...nouvelleMatiere, code: v })} />
      </FormDrawer>

      {/* ── Affecter une matière ── */}
      <FormDrawer
        open={formAffectation}
        onClose={() => {
          setFormAffectation(false);
          affecter.setError(null);
        }}
        title="Affecter une matière"
        subtitle={ref.classeLabel(classeSelection)}
        submitting={affecter.submitting}
        error={affecter.error}
        submitLabel="Affecter"
        onSubmit={() => {
          if (!classeSelection) return affecter.setError('Choisissez une classe.');
          if (!affectation.matiere_id) return affecter.setError('Choisissez une matière.');
          affecter.run(
            () =>
            ecoleAffecterMatiereClasse({
              matiere_id: affectation.matiere_id,
              classe_id: classeSelection,
              enseignant_id: affectation.enseignant_id || null,
              coefficient: Number(affectation.coefficient) || 1
            }),
            () => {
              setFormAffectation(false);
              setAffectation(AFFECTATION_VIDE);
              matieresClasse.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Matière"
          required
          value={affectation.matiere_id}
          onChange={(v) => setAffectation({ ...affectation, matiere_id: v })}
          loading={matieres.loading}
          emptyLabel="Toutes les matières du catalogue sont déjà affectées."
          options={optionsMatieresAffectables} />
        
        <ComboboxField
          label="Enseignant"
          allowEmpty
          placeholder="Non affecté pour l’instant"
          value={affectation.enseignant_id}
          onChange={(v) => setAffectation({ ...affectation, enseignant_id: v })}
          loading={enseignants.stats.loading}
          emptyLabel="Aucun enseignant référencé pour cette année."
          options={enseignants.options} />
        
        <TextField
          label="Coefficient"
          type="number"
          value={affectation.coefficient}
          onChange={(v) => setAffectation({ ...affectation, coefficient: v })} />
        
      </FormDrawer>
    </>);

}