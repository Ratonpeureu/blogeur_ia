import React, { useState } from 'react';
import { BookPlusIcon, LibraryIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import {
  Button,
  Divider,
  ErrorState,
  LoadingState,
  ProgressBar,
  SearchInput,
  Select,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { formatDate, str } from '../utils/format';
import {
  ecoleCreerOuvrage,
  ecoleEmprunter,
  ecoleListerEmprunts,
  ecoleListerOuvrages,
  ecoleRetournerEmprunt,
  ecoleSupprimerOuvrage } from
'../lib/api_ecole';
import type { EmpruntOuvrage, Ouvrage } from '../lib/api_ecole';

export function Bibliotheque() {
  const [tab, setTab] = useState('ouvrages');
  const [recherche, setRecherche] = useState('');
  const [statutEmprunt, setStatutEmprunt] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formOuvrage, setFormOuvrage] = useState(false);
  const [formEmprunt, setFormEmprunt] = useState(false);

  const ouvrages = useResource(() => ecoleListerOuvrages(recherche || undefined), [recherche]);
  const emprunts = useResource(
    () => ecoleListerEmprunts({ eleve_id: eleveId || undefined, statut: statutEmprunt || undefined }),
    [eleveId, statutEmprunt]
  );

  const creerOuvrage = useSubmit();
  const emprunter = useSubmit();

  const [ouvrageData, setOuvrageData] = useState({ titre: '', auteur: '', isbn: '', categorie: 'manuel_scolaire', nb_exemplaires_total: '1' });
  const [empruntData, setEmpruntData] = useState({ ouvrage_id: '', eleve_id: '', employe_id: '' });

  const colonnesOuvrages: Column<Ouvrage>[] = [
  { key: 'titre', header: 'Titre', width: '34%', sortValue: (o) => o.titre, render: (o) => <span className="font-medium text-win-text">{o.titre}</span> },
  { key: 'auteur', header: 'Auteur', render: (o) => str(o.auteur as string) },
  { key: 'total', header: 'Exemplaires', align: 'right', sortValue: (o) => o.nb_exemplaires_total, render: (o) => o.nb_exemplaires_total },
  {
    key: 'dispo',
    header: 'Disponibilité',
    render: (o) =>
    <span className="block">
          <span className="mb-1 block text-2xs text-win-muted">
            {o.nb_exemplaires_disponibles} / {o.nb_exemplaires_total}
          </span>
          <ProgressBar
        value={o.nb_exemplaires_total ? o.nb_exemplaires_disponibles / o.nb_exemplaires_total * 100 : 0}
        tone={o.nb_exemplaires_disponibles === 0 ? 'danger' : 'success'} />
      
        </span>

  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (o) =>
    <Button
      size="sm"
      variant="danger"
      icon={<Trash2Icon size={12} />}
      onClick={() => {
        ecoleSupprimerOuvrage(o.id).then(() => ouvrages.reload());
      }}>
      
          Supprimer
        </Button>

  }];


  const colonnesEmprunts: Column<EmpruntOuvrage>[] = [
  { key: 'ouvrage', header: 'Ouvrage', render: (e) => <span className="font-medium text-win-text">{e.ouvrage_id}</span> },
  { key: 'emprunteur', header: 'Emprunteur', render: (e) => str(e.eleve_id ?? e.employe_id) },
  { key: 'emprunt', header: 'Emprunté le', sortValue: (e) => e.date_emprunt, render: (e) => formatDate(e.date_emprunt) },
  { key: 'retour', header: 'Retour prévu', sortValue: (e) => e.date_retour_prevue, render: (e) => formatDate(e.date_retour_prevue) },
  { key: 'statut', header: 'Statut', render: (e) => <StatusBadge value={e.statut} /> },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (e) =>
    <Button
      size="sm"
      icon={<RotateCcwIcon size={12} />}
      disabled={e.statut === 'rendu'}
      onClick={() => {
        ecoleRetournerEmprunt(e.id).then(() => emprunts.reload());
      }}>
      
          Retourner
        </Button>

  }];


  const enRetard = (emprunts.data ?? []).filter((e) => e.statut === 'en_retard').length;

  return (
    <>
      <PageHeader
        title="Bibliothèque"
        description="Catalogue, emprunts et retours"
        actions={
        <>
            <Button icon={<LibraryIcon size={13} />} onClick={() => setFormEmprunt(true)}>Nouvel emprunt</Button>
            <Button variant="primary" icon={<BookPlusIcon size={13} />} onClick={() => setFormOuvrage(true)}>Nouvel ouvrage</Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Ouvrages" value={(ouvrages.data ?? []).length} hint="Catalogue filtré" tone="accent" />
        <StatTile
          label="Exemplaires disponibles"
          value={(ouvrages.data ?? []).reduce((acc, o) => acc + o.nb_exemplaires_disponibles, 0)}
          hint={`${(ouvrages.data ?? []).reduce((acc, o) => acc + o.nb_exemplaires_total, 0)} au total`}
          tone="success" />
        
        <StatTile label="Emprunts affichés" value={(emprunts.data ?? []).length} hint={statutEmprunt || 'Tous statuts'} tone="neutral" />
        <StatTile label="Emprunts en retard" value={enRetard} hint="À relancer" tone="danger" />
      </div>

      <Toolbar>
        <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher un titre…" className="w-64" />
        <Divider />
        <SearchInput value={eleveId} onChange={setEleveId} placeholder="Identifiant élève…" className="w-56" />
        <Select
          label="Statut"
          value={statutEmprunt}
          onChange={setStatutEmprunt}
          options={[
          { value: '', label: 'Tous' },
          { value: 'en_cours', label: 'En cours' },
          { value: 'rendu', label: 'Rendu' },
          { value: 'en_retard', label: 'En retard' }]
          } />
        
      </Toolbar>

      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'ouvrages', label: 'Catalogue', count: (ouvrages.data ?? []).length },
          { id: 'emprunts', label: 'Emprunts', count: (emprunts.data ?? []).length }]
          } />
        
      </div>

      <div className="mt-3 space-y-3">
        {tab === 'ouvrages' &&
        <>
            {ouvrages.loading && <LoadingState />}
            {ouvrages.error && <ErrorState message={ouvrages.error} onRetry={ouvrages.reload} />}
            <DataTable
            columns={colonnesOuvrages}
            rows={ouvrages.data ?? []}
            rowKey={(o) => o.id}
            onRowClick={(o) => setDetail({ titre: o.titre, record: o })}
            rowTone={(o) => o.nb_exemplaires_disponibles === 0 ? 'warning' : null}
            emptyLabel="Aucun ouvrage au catalogue." />
          
          </>
        }

        {tab === 'emprunts' &&
        <>
            {emprunts.loading && <LoadingState />}
            {emprunts.error && <ErrorState message={emprunts.error} onRetry={emprunts.reload} />}
            <DataTable
            columns={colonnesEmprunts}
            rows={emprunts.data ?? []}
            rowKey={(e) => e.id}
            onRowClick={(e) => setDetail({ titre: `Emprunt ${e.id}`, record: e })}
            rowTone={(e) => e.statut === 'en_retard' ? 'danger' : null}
            emptyLabel="Aucun emprunt pour ce filtre." />
          
          </>
        }
      </div>

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        subtitle="Détail renvoyé par le backend"
        record={detail?.record ?? null} />
      

      <FormDrawer
        open={formOuvrage}
        onClose={() => setFormOuvrage(false)}
        title="Nouvel ouvrage"
        submitting={creerOuvrage.submitting}
        error={creerOuvrage.error}
        onSubmit={() =>
        creerOuvrage.run(
          () =>
          ecoleCreerOuvrage({
            titre: ouvrageData.titre,
            auteur: ouvrageData.auteur || null,
            isbn: ouvrageData.isbn || null,
            categorie: ouvrageData.categorie,
            nb_exemplaires_total: Number(ouvrageData.nb_exemplaires_total) || 1
          }),
          () => {
            setFormOuvrage(false);
            ouvrages.reload();
          }
        )
        }>
        
        <TextField label="Titre" required value={ouvrageData.titre} onChange={(v) => setOuvrageData({ ...ouvrageData, titre: v })} />
        <TextField label="Auteur" value={ouvrageData.auteur} onChange={(v) => setOuvrageData({ ...ouvrageData, auteur: v })} />
        <TextField label="ISBN" value={ouvrageData.isbn} onChange={(v) => setOuvrageData({ ...ouvrageData, isbn: v })} />
        <SelectField
          label="Catégorie"
          value={ouvrageData.categorie}
          onChange={(v) => setOuvrageData({ ...ouvrageData, categorie: v })}
          options={[
          { value: 'manuel_scolaire', label: 'Manuel scolaire' },
          { value: 'roman', label: 'Roman' },
          { value: 'bd', label: 'BD' },
          { value: 'documentaire', label: 'Documentaire' },
          { value: 'general', label: 'Général' }]
          } />
        
        <TextField
          label="Nombre d’exemplaires"
          type="number"
          value={ouvrageData.nb_exemplaires_total}
          onChange={(v) => setOuvrageData({ ...ouvrageData, nb_exemplaires_total: v })} />
        
      </FormDrawer>

      <FormDrawer
        open={formEmprunt}
        onClose={() => setFormEmprunt(false)}
        title="Nouvel emprunt"
        submitting={emprunter.submitting}
        error={emprunter.error}
        submitLabel="Enregistrer l’emprunt"
        onSubmit={() =>
        emprunter.run(
          () =>
          ecoleEmprunter({
            ouvrage_id: empruntData.ouvrage_id,
            eleve_id: empruntData.eleve_id || null,
            employe_id: empruntData.employe_id || null
          }),
          () => {
            setFormEmprunt(false);
            emprunts.reload();
            ouvrages.reload();
          }
        )
        }>
        
        <SelectField
          label="Ouvrage"
          required
          value={empruntData.ouvrage_id}
          onChange={(v) => setEmpruntData({ ...empruntData, ouvrage_id: v })}
          options={(ouvrages.data ?? []).map((o) => ({ value: o.id, label: o.titre }))} />
        
        <TextField label="Identifiant élève" value={empruntData.eleve_id} onChange={(v) => setEmpruntData({ ...empruntData, eleve_id: v })} />
        <TextField label="Identifiant employé" value={empruntData.employe_id} onChange={(v) => setEmpruntData({ ...empruntData, employe_id: v })} />
        <Badge tone="neutral">Renseignez soit un élève, soit un employé</Badge>
      </FormDrawer>
    </>);

}