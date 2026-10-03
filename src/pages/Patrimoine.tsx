import React, { useMemo, useState } from 'react';
import { DoorOpenIcon, PackagePlusIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { InfoDrawer } from '../components/ui/InfoDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import { Button, ErrorState, LoadingState, SearchInput, SelectField, StatTile, TextField, Toolbar } from '../components/ui/primitives';
import { MaterielClassePanel } from '../components/patrimoine/MaterielClassePanel';
import { CatalogueMaterielPanel } from '../components/patrimoine/CatalogueMaterielPanel';
import { useResource, useSubmit } from '../hooks/useResource';
import { formatFcfa, humanize, str } from '../utils/format';
import { champsLisibles, normaliser } from '../utils/labels';
import { ecoleCreerMateriel, ecoleCreerSalle, ecoleListerMateriel, ecoleListerSalles } from '../lib/api_ecole';
import type { MaterielPedagogique, Salle } from '../lib/api_ecole';

type Rec = Record<string, unknown>;

const TYPES_SALLE = [
{ value: 'classe', label: 'Classe' },
{ value: 'laboratoire', label: 'Laboratoire' },
{ value: 'informatique', label: 'Informatique' },
{ value: 'sport', label: 'Sport' },
{ value: 'amphi', label: 'Amphithéâtre' }];

const CATEGORIES_MATERIEL = [
{ value: 'informatique', label: 'Informatique' },
{ value: 'mobilier', label: 'Mobilier' },
{ value: 'sport', label: 'Sport' },
{ value: 'laboratoire', label: 'Laboratoire' },
{ value: 'autre', label: 'Autre' }];

const ETATS = [
{ value: 'neuf', label: 'Neuf' },
{ value: 'bon', label: 'Bon' },
{ value: 'use', label: 'Usé' },
{ value: 'hors_service', label: 'Hors service' }];

const labelDe = (l: {value: string;label: string;}[], v: unknown) => l.find((x) => x.value === v)?.label ?? (v ? humanize(String(v)) : '—');

export function Patrimoine() {
  const [tab, setTab] = useState('salles');
  const [recherche, setRecherche] = useState('');
  const [detail, setDetail] = useState<{titre: string;record: Rec;} | null>(null);
  const [formSalle, setFormSalle] = useState(false);
  const [formMateriel, setFormMateriel] = useState(false);

  const salles = useResource(() => ecoleListerSalles(), []);
  const materiel = useResource(() => ecoleListerMateriel(), []);

  const creerSalle = useSubmit();
  const creerMateriel = useSubmit();

  const [salleData, setSalleData] = useState({ nom: '', capacite: '', type: 'classe', equipements: '' });
  const materielVide = { designation: '', categorie: 'informatique', quantite_totale: '1', salle_id: '', etat: 'neuf', valeur_fcfa: '' };
  const [materielData, setMaterielData] = useState(materielVide);

  const nomsSalles = useMemo(
    () => new Map((salles.data ?? []).map((s) => [String((s as Rec).id), str((s as Rec).nom as string)])),
    [salles.data]
  );
  const filtre = (v: string) => !recherche.trim() || normaliser(v).includes(normaliser(recherche));

  const capaciteTotale = (salles.data ?? []).reduce((acc, s) => acc + Number((s as Rec).capacite ?? 0), 0);
  const valeurInventaire = (materiel.data ?? []).reduce((acc, m) => acc + Number((m as Rec).valeur_fcfa ?? 0), 0);
  const horsService = (materiel.data ?? []).filter((m) => (m as Rec).etat === 'hors_service').length;

  const colonnesSalles: Column<Salle>[] = [
  { key: 'nom', header: 'Salle', sortValue: (s) => str((s as Rec).nom as string), render: (s) => <span className="font-medium text-win-text">{str((s as Rec).nom as string)}</span> },
  { key: 'type', header: 'Type', render: (s) => <Badge tone="accent">{labelDe(TYPES_SALLE, (s as Rec).type)}</Badge> },
  { key: 'capacite', header: 'Capacité', align: 'right', sortValue: (s) => Number((s as Rec).capacite ?? 0), render: (s) => (s as Rec).capacite ? `${(s as Rec).capacite} places` : '—' },
  {
    key: 'equipements',
    header: 'Équipements',
    render: (s) => {
      const eq = (s as Rec).equipements;
      return Array.isArray(eq) && eq.length ? <span className="text-win-muted">{eq.join(', ')}</span> : '—';
    }
  },
  {
    key: 'actif',
    header: 'Statut',
    render: (s) =>
    <Badge tone={(s as Rec).actif === false ? 'neutral' : 'success'}>{(s as Rec).actif === false ? 'Indisponible' : 'Disponible'}</Badge>

  }];


  const colonnesMateriel: Column<MaterielPedagogique>[] = [
  { key: 'designation', header: 'Désignation', sortValue: (m) => str((m as Rec).designation as string), render: (m) => <span className="font-medium text-win-text">{str((m as Rec).designation as string)}</span> },
  { key: 'categorie', header: 'Catégorie', render: (m) => labelDe(CATEGORIES_MATERIEL, (m as Rec).categorie) },
  { key: 'quantite', header: 'Quantité', align: 'right', render: (m) => str((m as Rec).quantite_totale as string) },
  { key: 'salle', header: 'Salle', render: (m) => (m as Rec).salle_id ? nomsSalles.get(String((m as Rec).salle_id)) ?? 'Salle supprimée' : 'Non affecté' },
  { key: 'etat', header: 'État', render: (m) => <StatusBadge value={String((m as Rec).etat ?? 'bon')} label={labelDe(ETATS, (m as Rec).etat)} /> },
  {
    key: 'valeur',
    header: 'Valeur',
    align: 'right',
    sortValue: (m) => Number((m as Rec).valeur_fcfa ?? 0),
    render: (m) => {
      const v = (m as Rec).valeur_fcfa;
      return v === undefined || v === null ? '—' : formatFcfa(Number(v));
    }
  }];


  return (
    <>
      <PageHeader
        title="Patrimoine & salles"
        description="Salles, matériel pédagogique, inventaire par classe et catalogue de référence"
        actions={
        <>
            <Button icon={<DoorOpenIcon size={13} />} onClick={() => setFormSalle(true)}>
              Nouvelle salle
            </Button>
            <Button variant="primary" icon={<PackagePlusIcon size={13} />} onClick={() => setFormMateriel(true)}>
              Nouveau matériel
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Salles" value={(salles.data ?? []).length} hint={`${capaciteTotale} places au total`} tone="accent" />
        <StatTile label="Matériel pédagogique" value={(materiel.data ?? []).length} hint="Références en inventaire" tone="neutral" />
        <StatTile label="Hors service" value={horsService} hint="À remplacer ou réparer" tone="danger" />
        <StatTile label="Valeur de l’inventaire" value={formatFcfa(valeurInventaire)} hint="Somme déclarée" tone="success" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'salles', label: 'Salles', count: (salles.data ?? []).length },
        { id: 'materiel', label: 'Matériel pédagogique', count: (materiel.data ?? []).length },
        { id: 'classes', label: 'Matériel par classe' },
        { id: 'catalogue', label: 'Catalogue de référence' }]
        } />
      

      <div className="mt-3 space-y-3">
        {(tab === 'salles' || tab === 'materiel') &&
        <Toolbar>
            <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher…" className="w-64" />
          </Toolbar>
        }

        {tab === 'salles' &&
        <>
            {salles.loading && <LoadingState />}
            {salles.error && <ErrorState message={salles.error} onRetry={salles.reload} />}
            <DataTable
            columns={colonnesSalles}
            rows={(salles.data ?? []).filter((s) => filtre(str((s as Rec).nom as string)))}
            rowKey={(s) => String((s as Rec).id)}
            onRowClick={(s) => setDetail({ titre: str((s as Rec).nom as string), record: s as Rec })}
            emptyLabel="Aucune salle enregistrée." />
          
          </>
        }

        {tab === 'materiel' &&
        <>
            {materiel.loading && <LoadingState />}
            {materiel.error && <ErrorState message={materiel.error} onRetry={materiel.reload} />}
            <DataTable
            columns={colonnesMateriel}
            rows={(materiel.data ?? []).filter((m) => filtre(str((m as Rec).designation as string)))}
            rowKey={(m) => String((m as Rec).id)}
            onRowClick={(m) => setDetail({ titre: str((m as Rec).designation as string), record: m as Rec })}
            emptyLabel="Aucun matériel enregistré." />
          
          </>
        }

        {tab === 'classes' && <MaterielClassePanel />}
        {tab === 'catalogue' && <CatalogueMaterielPanel />}
      </div>

      <InfoDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        fields={[
        ...(detail?.record.salle_id !== undefined ?
        [{ label: 'Salle', value: detail?.record.salle_id ? nomsSalles.get(String(detail.record.salle_id)) ?? 'Salle supprimée' : 'Non affecté' }] :
        []),
        ...champsLisibles(detail?.record).map((c) => ({
          label: c.label,
          value: c.cle === 'type' ? labelDe(TYPES_SALLE, detail?.record.type) : c.cle === 'etat' ? labelDe(ETATS, detail?.record.etat) : c.cle === 'categorie' ? labelDe(CATEGORIES_MATERIEL, detail?.record.categorie) : /fcfa/i.test(c.cle) ? formatFcfa(Number(detail?.record[c.cle] ?? 0)) : c.valeur
        }))]
        } />
      

      <FormDrawer
        open={formSalle}
        onClose={() => {
          setFormSalle(false);
          creerSalle.setError(null);
        }}
        title="Nouvelle salle"
        submitting={creerSalle.submitting}
        error={creerSalle.error}
        onSubmit={() => {
          if (!salleData.nom.trim()) return creerSalle.setError('Le nom de la salle est obligatoire.');
          creerSalle.run(
            () =>
            ecoleCreerSalle({
              nom: salleData.nom.trim(),
              capacite: salleData.capacite ? Number(salleData.capacite) : null,
              type: salleData.type,
              equipements: salleData.equipements ? salleData.equipements.split(',').map((e) => e.trim()).filter(Boolean) : []
            }),
            () => {
              setFormSalle(false);
              setSalleData({ nom: '', capacite: '', type: 'classe', equipements: '' });
              salles.reload();
            }
          );
        }}>
        
        <TextField label="Nom" required value={salleData.nom} onChange={(v) => setSalleData({ ...salleData, nom: v })} />
        <SelectField label="Type" value={salleData.type} onChange={(v) => setSalleData({ ...salleData, type: v })} options={TYPES_SALLE} />
        <TextField label="Capacité (places)" type="number" value={salleData.capacite} onChange={(v) => setSalleData({ ...salleData, capacite: v })} />
        <TextField label="Équipements" hint="Séparés par des virgules" value={salleData.equipements} onChange={(v) => setSalleData({ ...salleData, equipements: v })} />
      </FormDrawer>

      <FormDrawer
        open={formMateriel}
        onClose={() => {
          setFormMateriel(false);
          creerMateriel.setError(null);
        }}
        title="Nouveau matériel pédagogique"
        submitting={creerMateriel.submitting}
        error={creerMateriel.error}
        onSubmit={() => {
          if (!materielData.designation.trim()) return creerMateriel.setError('La désignation est obligatoire.');
          creerMateriel.run(
            () =>
            ecoleCreerMateriel({
              designation: materielData.designation.trim(),
              categorie: materielData.categorie,
              quantite_totale: Number(materielData.quantite_totale) || 1,
              salle_id: materielData.salle_id || null,
              etat: materielData.etat,
              valeur_fcfa: materielData.valeur_fcfa ? Number(materielData.valeur_fcfa) : null
            }),
            () => {
              setFormMateriel(false);
              setMaterielData(materielVide);
              materiel.reload();
            }
          );
        }}>
        
        <TextField label="Désignation" required value={materielData.designation} onChange={(v) => setMaterielData({ ...materielData, designation: v })} />
        <SelectField label="Catégorie" value={materielData.categorie} onChange={(v) => setMaterielData({ ...materielData, categorie: v })} options={CATEGORIES_MATERIEL} />
        <TextField label="Quantité totale" type="number" value={materielData.quantite_totale} onChange={(v) => setMaterielData({ ...materielData, quantite_totale: v })} />
        <ComboboxField
          label="Salle"
          allowEmpty
          placeholder="Non affecté"
          value={materielData.salle_id}
          onChange={(v) => setMaterielData({ ...materielData, salle_id: v })}
          loading={salles.loading}
          options={(salles.data ?? []).map((s) => ({
            value: String((s as Rec).id),
            label: str((s as Rec).nom as string),
            hint: labelDe(TYPES_SALLE, (s as Rec).type)
          }))} />
        
        <SelectField label="État" value={materielData.etat} onChange={(v) => setMaterielData({ ...materielData, etat: v })} options={ETATS} />
        <TextField label="Valeur (FCFA)" type="number" value={materielData.valeur_fcfa} onChange={(v) => setMaterielData({ ...materielData, valeur_fcfa: v })} />
      </FormDrawer>
    </>);

}