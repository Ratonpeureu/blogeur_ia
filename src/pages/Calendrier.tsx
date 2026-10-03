import React, { useMemo, useState } from 'react';
import { CalendarPlusIcon, FileSignatureIcon, MailPlusIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { InfoDrawer, type InfoField } from '../components/ui/InfoDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import {
  Button,
  CheckboxField,
  Divider,
  ErrorState,
  LoadingState,
  Panel,
  SearchInput,
  Select,
  SelectField,
  StatTile,
  TextAreaField,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import {
  CalendrierMensuel,
  COULEUR_TYPE,
  LIBELLE_TYPE,
  type ElementCalendrier,
  type TypeElementCalendrier } from
'../components/calendrier/CalendrierMensuel';
import { useResource, useSubmit } from '../hooks/useResource';
import { useEleves } from '../hooks/useEleves';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { aujourdHui, formatDate, humanize, str } from '../utils/format';
import { normaliser } from '../utils/labels';
import {
  ecoleCreerConvocation,
  ecoleCreerEvenement,
  ecoleCreerReunion,
  ecoleCreerSignatureRequise,
  ecoleListerConvocations,
  ecoleListerEvenements,
  ecoleListerReunions,
  ecoleListerSignatures } from
'../lib/api_ecole';
import type { Convocation, EvenementEcole, ReunionParentsEnseignants, SignatureRequise } from '../lib/api_ecole';

const CATEGORIES = [
{ value: 'sortie', label: 'Sortie' },
{ value: 'examen', label: 'Examen' },
{ value: 'reunion', label: 'Réunion' },
{ value: 'ceremonie', label: 'Cérémonie' },
{ value: 'vacances', label: 'Vacances' },
{ value: 'conseil', label: 'Conseil' }];


const TYPES_DOCUMENT = [
{ value: 'reglement_interieur', label: 'Règlement intérieur' },
{ value: 'decharge_sortie', label: 'Décharge de sortie' },
{ value: 'accuse_bulletin', label: 'Accusé de bulletin' },
{ value: 'autre', label: 'Autre' }];


const labelDe = (liste: {value: string;label: string;}[], v: unknown) =>
liste.find((x) => x.value === v)?.label ?? (v ? humanize(String(v)) : '—');

type Selection = {type: TypeElementCalendrier;id: string;} | null;

export function Calendrier() {
  const ref = useReferentielEcole();
  const { options: optionsEleves, nom: nomEleveDe, eleves: listeEleves } = useEleves();

  const [tab, setTab] = useState('evenements');
  const [recherche, setRecherche] = useState('');
  const [statutConvocation, setStatutConvocation] = useState('');
  const [selection, setSelection] = useState<Selection>(null);

  const [formEvenement, setFormEvenement] = useState(false);
  const [formReunion, setFormReunion] = useState(false);
  const [formConvocation, setFormConvocation] = useState(false);
  const [formSignature, setFormSignature] = useState(false);

  const evenements = useResource(() => ecoleListerEvenements(), []);
  const reunions = useResource(() => ecoleListerReunions(), []);
  const convocations = useResource(() => ecoleListerConvocations(), []);
  const signatures = useResource(() => ecoleListerSignatures(), []);

  const creerEvenement = useSubmit();
  const creerReunion = useSubmit();
  const creerConvocation = useSubmit();
  const creerSignature = useSubmit();

  const evenementVide = {
    titre: '',
    description: '',
    lieu: '',
    date_debut: aujourdHui(),
    date_fin: '',
    categorie: 'sortie',
    autorisation_requise: false
  };
  const [evenementData, setEvenementData] = useState(evenementVide);
  const [reunionData, setReunionData] = useState({ titre: '', date_reunion: aujourdHui(), lieu: '', classe_id: '' });
  const [convocationData, setConvocationData] = useState({ eleve_id: '', motif: '', date_convocation: aujourdHui(), heure: '' });
  const [signatureData, setSignatureData] = useState({ eleve_id: '', titre: '', type_document: 'reglement_interieur', date_limite: '' });

  const today = aujourdHui();
  const filtre = (v: string) => !recherche.trim() || normaliser(v).includes(normaliser(recherche));
  const txt = (r: Record<string, unknown>, k: string) => str(r[k] as string);

  // ── Éléments du calendrier, construits à partir des 4 listes backend ──
  const elements: ElementCalendrier[] = useMemo(() => {
    const out: ElementCalendrier[] = [];
    for (const e of evenements.data ?? [])
    if (e.date_debut) out.push({ cle: `evenement-${e.id}`, date: String(e.date_debut), titre: txt(e, 'titre'), type: 'evenement' });
    for (const r of reunions.data ?? [])
    if (r.date_reunion) out.push({ cle: `reunion-${r.id}`, date: String(r.date_reunion), titre: txt(r, 'titre'), type: 'reunion' });
    for (const c of convocations.data ?? [])
    if (c.date_convocation)
    out.push({
      cle: `convocation-${c.id}`,
      date: String(c.date_convocation),
      titre: `${nomEleveDe(c.eleve_id as string)} · ${txt(c, 'motif')}`,
      type: 'convocation'
    });
    for (const s of signatures.data ?? [])
    if (s.date_limite && !s.signe)
    out.push({ cle: `signature-${s.id}`, date: String(s.date_limite), titre: txt(s, 'titre'), type: 'signature' });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evenements.data, reunions.data, convocations.data, signatures.data, listeEleves.data]);

  const prochains = elements.
  filter((e) => e.date.slice(0, 10) >= today).
  sort((a, b) => a.date.localeCompare(b.date)).
  slice(0, 8);

  const statutsConvocation = Array.from(new Set((convocations.data ?? []).map((c) => c.statut).filter(Boolean)));

  function ouvrirElement(el: ElementCalendrier) {
    const [type, ...reste] = el.cle.split('-');
    setSelection({ type: type as TypeElementCalendrier, id: reste.join('-') });
  }

  // ── Détail lisible de l'élément sélectionné ──
  const detail = useMemo((): {titre: string;sousTitre: string;champs: InfoField[];} | null => {
    if (!selection) return null;
    if (selection.type === 'evenement') {
      const e = (evenements.data ?? []).find((x) => x.id === selection.id);
      if (!e) return null;
      return {
        titre: txt(e, 'titre'),
        sousTitre: 'Événement',
        champs: [
        { label: 'Catégorie', value: labelDe(CATEGORIES, e.categorie) },
        { label: 'Début', value: formatDate(e.date_debut) },
        { label: 'Fin', value: e.date_fin ? formatDate(String(e.date_fin)) : '—' },
        { label: 'Lieu', value: txt(e, 'lieu') },
        { label: 'Autorisation parentale', value: e.autorisation_requise ? 'Requise' : 'Non requise' },
        { label: 'Description', value: txt(e, 'description') }]

      };
    }
    if (selection.type === 'reunion') {
      const r = (reunions.data ?? []).find((x) => x.id === selection.id);
      if (!r) return null;
      return {
        titre: txt(r, 'titre'),
        sousTitre: 'Réunion parents-enseignants',
        champs: [
        { label: 'Date', value: formatDate(r.date_reunion) },
        { label: 'Lieu', value: txt(r, 'lieu') },
        { label: 'Classe concernée', value: r.classe_id ? ref.classeLabel(r.classe_id as string) : 'Tout l’établissement' }]

      };
    }
    if (selection.type === 'convocation') {
      const c = (convocations.data ?? []).find((x) => x.id === selection.id);
      if (!c) return null;
      return {
        titre: txt(c, 'motif'),
        sousTitre: 'Convocation',
        champs: [
        { label: 'Élève', value: nomEleveDe(c.eleve_id as string) },
        { label: 'Date', value: formatDate(c.date_convocation) },
        { label: 'Heure', value: txt(c, 'heure') },
        { label: 'Statut', value: <StatusBadge value={c.statut} label={humanize(c.statut)} /> }]

      };
    }
    const s = (signatures.data ?? []).find((x) => x.id === selection.id);
    if (!s) return null;
    return {
      titre: txt(s, 'titre'),
      sousTitre: 'Document à signer',
      champs: [
      { label: 'Élève', value: nomEleveDe(s.eleve_id) },
      { label: 'Type de document', value: labelDe(TYPES_DOCUMENT, s.type_document) },
      { label: 'Date limite', value: s.date_limite ? formatDate(String(s.date_limite)) : 'Aucune' },
      { label: 'Signature', value: <Badge tone={s.signe ? 'success' : 'warning'}>{s.signe ? 'Signé' : 'En attente'}</Badge> }]

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, evenements.data, reunions.data, convocations.data, signatures.data, listeEleves.data, ref.classes.data]);

  const colonnesEvenements: Column<EvenementEcole>[] = [
  { key: 'titre', header: 'Événement', sortValue: (e) => txt(e, 'titre'), render: (e) => <span className="font-medium text-win-text">{txt(e, 'titre')}</span> },
  { key: 'categorie', header: 'Catégorie', render: (e) => e.categorie ? <Badge tone="accent">{labelDe(CATEGORIES, e.categorie)}</Badge> : '—' },
  { key: 'debut', header: 'Début', sortValue: (e) => String(e.date_debut), render: (e) => formatDate(e.date_debut) },
  { key: 'fin', header: 'Fin', render: (e) => e.date_fin ? formatDate(String(e.date_fin)) : '—' },
  { key: 'lieu', header: 'Lieu', render: (e) => txt(e, 'lieu') },
  { key: 'autorisation', header: 'Autorisation', render: (e) => e.autorisation_requise ? <Badge tone="warning">Requise</Badge> : '—' }];


  const colonnesReunions: Column<ReunionParentsEnseignants>[] = [
  { key: 'titre', header: 'Réunion', render: (r) => <span className="font-medium text-win-text">{txt(r, 'titre')}</span> },
  { key: 'date', header: 'Date', sortValue: (r) => String(r.date_reunion), render: (r) => formatDate(r.date_reunion) },
  { key: 'lieu', header: 'Lieu', render: (r) => txt(r, 'lieu') },
  { key: 'classe', header: 'Classe', render: (r) => r.classe_id ? ref.classeLabel(r.classe_id as string) : 'Tout l’établissement' }];


  const colonnesConvocations: Column<Convocation>[] = [
  { key: 'eleve', header: 'Élève', sortValue: (c) => nomEleveDe(c.eleve_id as string), render: (c) => <span className="font-medium text-win-text">{nomEleveDe(c.eleve_id as string)}</span> },
  { key: 'motif', header: 'Motif', render: (c) => txt(c, 'motif') },
  { key: 'date', header: 'Date', sortValue: (c) => String(c.date_convocation), render: (c) => `${formatDate(c.date_convocation)}${c.heure ? ` · ${String(c.heure).slice(0, 5)}` : ''}` },
  { key: 'statut', header: 'Statut', render: (c) => <StatusBadge value={c.statut} label={humanize(c.statut)} /> }];


  const colonnesSignatures: Column<SignatureRequise>[] = [
  { key: 'titre', header: 'Document', render: (s) => <span className="font-medium text-win-text">{txt(s, 'titre')}</span> },
  { key: 'type', header: 'Type', render: (s) => labelDe(TYPES_DOCUMENT, s.type_document) },
  { key: 'eleve', header: 'Élève', sortValue: (s) => nomEleveDe(s.eleve_id), render: (s) => nomEleveDe(s.eleve_id) },
  { key: 'limite', header: 'Date limite', sortValue: (s) => String(s.date_limite ?? ''), render: (s) => s.date_limite ? formatDate(String(s.date_limite)) : '—' },
  { key: 'signe', header: 'Signature', render: (s) => <Badge tone={s.signe ? 'success' : 'warning'}>{s.signe ? 'Signé' : 'En attente'}</Badge> }];


  const convocationsFiltrees = (convocations.data ?? []).filter(
    (c) => (!statutConvocation || c.statut === statutConvocation) && filtre(`${txt(c, 'motif')} ${nomEleveDe(c.eleve_id as string)}`)
  );

  return (
    <>
      <PageHeader
        title="Calendrier & événements"
        description="Vie de l’établissement : événements, réunions, convocations et documents à faire signer"
        actions={
        <>
            <Button icon={<UsersIcon size={13} />} onClick={() => setFormReunion(true)}>
              Nouvelle réunion
            </Button>
            <Button variant="primary" icon={<CalendarPlusIcon size={13} />} onClick={() => setFormEvenement(true)}>
              Nouvel événement
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Événements à venir"
          value={(evenements.data ?? []).filter((e) => String(e.date_debut).slice(0, 10) >= today).length}
          hint={`${(evenements.data ?? []).length} au total`}
          tone="accent" />
        
        <StatTile
          label="Réunions à venir"
          value={(reunions.data ?? []).filter((r) => String(r.date_reunion).slice(0, 10) >= today).length}
          hint="Parents-enseignants"
          tone="neutral" />
        
        <StatTile label="Convocations" value={(convocations.data ?? []).length} hint={`${statutsConvocation.length} statut(s)`} tone="warning" />
        <StatTile
          label="Signatures en attente"
          value={(signatures.data ?? []).filter((s) => !s.signe).length}
          hint={`${(signatures.data ?? []).length} document(s)`}
          tone="danger" />
        
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <CalendrierMensuel elements={elements} onSelect={ouvrirElement} />

        <Panel title="Prochains rendez-vous" bodyClassName="">
          <ul className="divide-y divide-win-border">
            {prochains.map((el) =>
            <li key={el.cle}>
                <button
                type="button"
                onClick={() => ouvrirElement(el)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-win bg-win-sunken text-win-text">
                    <span className="text-[13px] font-semibold leading-none">{el.date.slice(8, 10)}</span>
                    <span className="text-[9px] uppercase text-win-muted">
                      {new Date(el.date.slice(0, 10)).toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-win-text">{el.titre}</span>
                    <span className="flex items-center gap-1 text-2xs text-win-muted">
                      <span className={`h-1.5 w-1.5 rounded-full ${COULEUR_TYPE[el.type]}`} aria-hidden="true" />
                      {LIBELLE_TYPE[el.type]}
                    </span>
                  </span>
                </button>
              </li>
            )}
            {prochains.length === 0 && <li className="px-3 py-4 text-2xs text-win-muted">Aucun rendez-vous à venir.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-3 space-y-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'evenements', label: 'Événements', count: (evenements.data ?? []).length },
          { id: 'reunions', label: 'Réunions', count: (reunions.data ?? []).length },
          { id: 'convocations', label: 'Convocations', count: (convocations.data ?? []).length },
          { id: 'signatures', label: 'Signatures', count: (signatures.data ?? []).length }]
          } />
        
        <Toolbar>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher…" className="w-64" />
          {tab === 'convocations' && statutsConvocation.length > 0 &&
          <>
              <Divider />
              <Select
              label="Statut"
              value={statutConvocation}
              onChange={setStatutConvocation}
              options={[{ value: '', label: 'Tous' }, ...statutsConvocation.map((s) => ({ value: s, label: humanize(s) }))]} />
            
            </>
          }
          <Divider />
          <Button size="sm" icon={<MailPlusIcon size={12} />} onClick={() => setFormConvocation(true)}>
            Convoquer
          </Button>
          <Button size="sm" icon={<FileSignatureIcon size={12} />} onClick={() => setFormSignature(true)}>
            Demander une signature
          </Button>
        </Toolbar>

        {tab === 'evenements' &&
        <>
            {evenements.loading && <LoadingState />}
            {evenements.error && <ErrorState message={evenements.error} onRetry={evenements.reload} />}
            <DataTable
            columns={colonnesEvenements}
            rows={(evenements.data ?? []).filter((e) => filtre(`${txt(e, 'titre')} ${txt(e, 'lieu')}`))}
            rowKey={(e) => e.id}
            onRowClick={(e) => setSelection({ type: 'evenement', id: e.id })}
            emptyLabel="Aucun événement enregistré." />
          
          </>
        }
        {tab === 'reunions' &&
        <>
            {reunions.loading && <LoadingState />}
            {reunions.error && <ErrorState message={reunions.error} onRetry={reunions.reload} />}
            <DataTable
            columns={colonnesReunions}
            rows={(reunions.data ?? []).filter((r) => filtre(txt(r, 'titre')))}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelection({ type: 'reunion', id: r.id })}
            emptyLabel="Aucune réunion planifiée." />
          
          </>
        }
        {tab === 'convocations' &&
        <>
            {convocations.loading && <LoadingState />}
            {convocations.error && <ErrorState message={convocations.error} onRetry={convocations.reload} />}
            <DataTable
            columns={colonnesConvocations}
            rows={convocationsFiltrees}
            rowKey={(c) => c.id}
            onRowClick={(c) => setSelection({ type: 'convocation', id: c.id })}
            emptyLabel="Aucune convocation." />
          
          </>
        }
        {tab === 'signatures' &&
        <>
            {signatures.loading && <LoadingState />}
            {signatures.error && <ErrorState message={signatures.error} onRetry={signatures.reload} />}
            <DataTable
            columns={colonnesSignatures}
            rows={(signatures.data ?? []).filter((s) => filtre(`${txt(s, 'titre')} ${nomEleveDe(s.eleve_id)}`))}
            rowKey={(s) => s.id}
            onRowClick={(s) => setSelection({ type: 'signature', id: s.id })}
            emptyLabel="Aucun document à signer." />
          
          </>
        }
      </div>

      <InfoDrawer
        open={!!detail}
        onClose={() => setSelection(null)}
        title={detail?.titre ?? ''}
        subtitle={detail?.sousTitre}
        fields={detail?.champs} />
      

      <FormDrawer
        open={formEvenement}
        onClose={() => {
          setFormEvenement(false);
          creerEvenement.setError(null);
        }}
        title="Nouvel événement"
        submitting={creerEvenement.submitting}
        error={creerEvenement.error}
        onSubmit={() => {
          if (!evenementData.titre.trim()) return creerEvenement.setError('Le titre est obligatoire.');
          if (evenementData.date_fin && evenementData.date_fin < evenementData.date_debut)
          return creerEvenement.setError('La date de fin précède la date de début.');
          creerEvenement.run(
            () =>
            ecoleCreerEvenement({
              titre: evenementData.titre.trim(),
              description: evenementData.description.trim() || null,
              lieu: evenementData.lieu.trim() || null,
              date_debut: evenementData.date_debut,
              date_fin: evenementData.date_fin || null,
              categorie: evenementData.categorie,
              autorisation_requise: evenementData.autorisation_requise
            }),
            () => {
              setFormEvenement(false);
              setEvenementData(evenementVide);
              evenements.reload();
            }
          );
        }}>
        
        <TextField label="Titre" required value={evenementData.titre} onChange={(v) => setEvenementData({ ...evenementData, titre: v })} />
        <SelectField label="Catégorie" value={evenementData.categorie} onChange={(v) => setEvenementData({ ...evenementData, categorie: v })} options={CATEGORIES} />
        <TextField label="Date de début" type="date" required value={evenementData.date_debut} onChange={(v) => setEvenementData({ ...evenementData, date_debut: v })} />
        <TextField label="Date de fin" type="date" value={evenementData.date_fin} onChange={(v) => setEvenementData({ ...evenementData, date_fin: v })} />
        <TextField label="Lieu" value={evenementData.lieu} onChange={(v) => setEvenementData({ ...evenementData, lieu: v })} />
        <TextAreaField label="Description" value={evenementData.description} onChange={(v) => setEvenementData({ ...evenementData, description: v })} />
        <CheckboxField
          label="Autorisation parentale requise"
          checked={evenementData.autorisation_requise}
          onChange={(v) => setEvenementData({ ...evenementData, autorisation_requise: v })} />
        
      </FormDrawer>

      <FormDrawer
        open={formReunion}
        onClose={() => {
          setFormReunion(false);
          creerReunion.setError(null);
        }}
        title="Nouvelle réunion parents-enseignants"
        submitting={creerReunion.submitting}
        error={creerReunion.error}
        onSubmit={() => {
          if (!reunionData.titre.trim()) return creerReunion.setError('Le titre est obligatoire.');
          creerReunion.run(
            () =>
            ecoleCreerReunion({
              titre: reunionData.titre.trim(),
              date_reunion: reunionData.date_reunion,
              lieu: reunionData.lieu.trim() || null,
              classe_id: reunionData.classe_id || null
            }),
            () => {
              setFormReunion(false);
              setReunionData({ titre: '', date_reunion: aujourdHui(), lieu: '', classe_id: '' });
              reunions.reload();
            }
          );
        }}>
        
        <TextField label="Titre" required value={reunionData.titre} onChange={(v) => setReunionData({ ...reunionData, titre: v })} />
        <TextField label="Date" type="date" required value={reunionData.date_reunion} onChange={(v) => setReunionData({ ...reunionData, date_reunion: v })} />
        <TextField label="Lieu" value={reunionData.lieu} onChange={(v) => setReunionData({ ...reunionData, lieu: v })} />
        <ComboboxField
          label="Classe concernée"
          allowEmpty
          placeholder="Tout l’établissement"
          value={reunionData.classe_id}
          onChange={(v) => setReunionData({ ...reunionData, classe_id: v })}
          loading={ref.classes.loading}
          options={ref.classeOptions} />
        
      </FormDrawer>

      <FormDrawer
        open={formConvocation}
        onClose={() => {
          setFormConvocation(false);
          creerConvocation.setError(null);
        }}
        title="Nouvelle convocation"
        submitting={creerConvocation.submitting}
        error={creerConvocation.error}
        onSubmit={() => {
          if (!convocationData.eleve_id) return creerConvocation.setError('Choisissez un élève.');
          if (!convocationData.motif.trim()) return creerConvocation.setError('Le motif est obligatoire.');
          creerConvocation.run(
            () =>
            ecoleCreerConvocation({
              eleve_id: convocationData.eleve_id,
              motif: convocationData.motif.trim(),
              date_convocation: convocationData.date_convocation,
              heure: convocationData.heure || null,
              statut: 'envoyee'
            }),
            () => {
              setFormConvocation(false);
              setConvocationData({ eleve_id: '', motif: '', date_convocation: aujourdHui(), heure: '' });
              convocations.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Élève"
          required
          value={convocationData.eleve_id}
          onChange={(v) => setConvocationData({ ...convocationData, eleve_id: v })}
          loading={listeEleves.loading}
          options={optionsEleves} />
        
        <TextField label="Motif" required value={convocationData.motif} onChange={(v) => setConvocationData({ ...convocationData, motif: v })} />
        <TextField label="Date" type="date" required value={convocationData.date_convocation} onChange={(v) => setConvocationData({ ...convocationData, date_convocation: v })} />
        <TextField label="Heure" type="time" value={convocationData.heure} onChange={(v) => setConvocationData({ ...convocationData, heure: v })} />
      </FormDrawer>

      <FormDrawer
        open={formSignature}
        onClose={() => {
          setFormSignature(false);
          creerSignature.setError(null);
        }}
        title="Demander une signature"
        submitting={creerSignature.submitting}
        error={creerSignature.error}
        onSubmit={() => {
          if (!signatureData.eleve_id) return creerSignature.setError('Choisissez un élève.');
          if (!signatureData.titre.trim()) return creerSignature.setError('Le titre du document est obligatoire.');
          creerSignature.run(
            () =>
            ecoleCreerSignatureRequise({
              eleve_id: signatureData.eleve_id,
              titre: signatureData.titre.trim(),
              type_document: signatureData.type_document,
              date_limite: signatureData.date_limite || null,
              signe: false
            }),
            () => {
              setFormSignature(false);
              setSignatureData({ eleve_id: '', titre: '', type_document: 'reglement_interieur', date_limite: '' });
              signatures.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Élève"
          required
          value={signatureData.eleve_id}
          onChange={(v) => setSignatureData({ ...signatureData, eleve_id: v })}
          loading={listeEleves.loading}
          options={optionsEleves} />
        
        <SelectField
          label="Type de document"
          value={signatureData.type_document}
          onChange={(v) =>
          setSignatureData({
            ...signatureData,
            type_document: v,
            titre: signatureData.titre || labelDe(TYPES_DOCUMENT, v)
          })
          }
          options={TYPES_DOCUMENT} />
        
        <TextField label="Titre du document" required value={signatureData.titre} onChange={(v) => setSignatureData({ ...signatureData, titre: v })} />
        <TextField label="Date limite" type="date" value={signatureData.date_limite} onChange={(v) => setSignatureData({ ...signatureData, date_limite: v })} />
      </FormDrawer>
    </>);

}