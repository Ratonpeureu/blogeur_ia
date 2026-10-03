import React, { useState } from 'react';
import { HeartPulseIcon, ShieldPlusIcon, SyringeIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
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
  SearchInput,
  StatTile,
  TextAreaField,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { aujourdHui, formatDate, str } from '../utils/format';
import {
  ecoleContactUrgence,
  ecoleCreerProtocole,
  ecoleCreerVaccination,
  ecoleEnregistrerVisite,
  ecoleGetProtocole,
  ecoleListerVisites,
  ecoleNotifierUrgenceSante,
  ecoleVaccinationsARelancer } from
'../lib/api_ecole';
import type { VaccinationARelancer, VisiteInfirmerie } from '../lib/api_ecole';

export function Infirmerie() {
  const [tab, setTab] = useState('visites');
  const [eleveId, setEleveId] = useState('');
  const [joursAvant, setJoursAvant] = useState('30');
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formVisite, setFormVisite] = useState(false);
  const [formProtocole, setFormProtocole] = useState(false);
  const [formVaccination, setFormVaccination] = useState(false);
  const [formUrgence, setFormUrgence] = useState(false);

  const visites = useResource(() => ecoleListerVisites(eleveId || undefined), [eleveId]);
  const relances = useResource(() => ecoleVaccinationsARelancer(Number(joursAvant) || undefined), [joursAvant]);
  const protocole = useResource(() => ecoleGetProtocole(eleveId), [eleveId], !!eleveId);
  const contact = useResource(() => ecoleContactUrgence(eleveId), [eleveId], !!eleveId);

  const creerVisite = useSubmit();
  const creerProtocole = useSubmit();
  const creerVaccination = useSubmit();
  const notifier = useSubmit();

  const [visiteData, setVisiteData] = useState({
    eleve_id: '',
    motif: '',
    symptomes: '',
    soin_administre: '',
    medicament_donne: '',
    temperature_c: '',
    renvoi_domicile: false,
    parent_contacte: false,
    suite_donnee: ''
  });
  const [protocoleData, setProtocoleData] = useState({
    eleve_id: '',
    condition: '',
    protocole_texte: '',
    medicament_urgence: '',
    localisation_medicament: ''
  });
  const [vaccinationData, setVaccinationData] = useState({
    eleve_id: '',
    vaccin: '',
    date_vaccination: '',
    date_rappel: '',
    statut: 'a_faire'
  });
  const [urgenceData, setUrgenceData] = useState({ eleve_id: '', eleve_nom: '', motif: '' });

  const colonnesVisites: Column<VisiteInfirmerie>[] = [
  { key: 'date', header: 'Date', sortValue: (v) => String(v.date_visite), render: (v) => formatDate(v.date_visite) },
  { key: 'eleve', header: 'Élève', render: (v) => str(v.eleve_id) },
  { key: 'motif', header: 'Motif', render: (v) => <span className="font-medium text-win-text">{v.motif}</span> },
  { key: 'soin', header: 'Soin administré', render: (v) => str(v.soin_administre as string) },
  {
    key: 'protocole',
    header: 'Protocole',
    render: (v) => v.protocole_urgence_existant ? <Badge tone="danger">Protocole</Badge> : <span className="text-2xs text-win-faint">—</span>
  }];


  const colonnesRelances: Column<VaccinationARelancer>[] = [
  { key: 'eleve', header: 'Élève', render: (v) => <span className="font-medium text-win-text">{v.eleve}</span> },
  { key: 'vaccin', header: 'Vaccin', render: (v) => v.vaccin },
  { key: 'rappel', header: 'Rappel prévu', sortValue: (v) => v.date_rappel, render: (v) => formatDate(v.date_rappel) }];


  return (
    <>
      <PageHeader
        title="Infirmerie"
        description="Visites, protocoles d’urgence, vaccinations et contacts d’urgence"
        actions={
        <>
            <Button icon={<ShieldPlusIcon size={13} />} onClick={() => setFormProtocole(true)}>Nouveau protocole</Button>
            <Button variant="primary" icon={<HeartPulseIcon size={13} />} onClick={() => setFormVisite(true)}>
              Enregistrer une visite
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Visites affichées" value={(visites.data ?? []).length} hint={eleveId || 'Tous les élèves'} tone="accent" />
        <StatTile label="Rappels vaccinaux" value={(relances.data ?? []).length} hint={`Dans les ${joursAvant} jours`} tone="warning" />
        <StatTile
          label="Protocole de l’élève"
          value={protocole.data ? 'Oui' : eleveId ? 'Non' : '—'}
          hint={protocole.data ? String(protocole.data.condition) : 'Aucun élève sélectionné'}
          tone={protocole.data ? 'danger' : 'neutral'} />
        
        <StatTile
          label="Contacts d’urgence"
          value={(contact.data?.contacts_urgence ?? []).length}
          hint={eleveId || 'Aucun élève sélectionné'}
          tone="success" />
        
      </div>

      <Toolbar>
        <SearchInput value={eleveId} onChange={setEleveId} placeholder="Identifiant élève…" className="w-64" />
        <Divider />
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wide text-win-muted">Rappels sous (jours)</span>
          <input
            type="number"
            value={joursAvant}
            onChange={(e) => setJoursAvant(e.target.value)}
            className="h-8 w-20 border border-win-borderStrong bg-white px-2 text-xs text-win-text rounded-win focus:border-win-accent focus:outline-none" />
          
        </label>
        <Divider />
        <Button size="sm" icon={<SyringeIcon size={12} />} onClick={() => setFormVaccination(true)}>Nouvelle vaccination</Button>
        <Button size="sm" variant="danger" onClick={() => setFormUrgence(true)}>Notifier une urgence santé</Button>
      </Toolbar>

      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'visites', label: 'Visites', count: (visites.data ?? []).length },
          { id: 'vaccinations', label: 'Rappels vaccinaux', count: (relances.data ?? []).length },
          { id: 'dossier', label: 'Dossier médical' }]
          } />
        
      </div>

      <div className="mt-3 space-y-3">
        {tab === 'visites' &&
        <>
            {visites.loading && <LoadingState />}
            {visites.error && <ErrorState message={visites.error} onRetry={visites.reload} />}
            <DataTable
            columns={colonnesVisites}
            rows={visites.data ?? []}
            rowKey={(v) => v.id}
            onRowClick={(v) => setDetail({ titre: v.motif, record: v })}
            rowTone={(v) => v.protocole_urgence_existant ? 'warning' : null}
            emptyLabel="Aucune visite enregistrée." />
          
          </>
        }

        {tab === 'vaccinations' &&
        <>
            {relances.loading && <LoadingState />}
            {relances.error && <ErrorState message={relances.error} onRetry={relances.reload} />}
            <DataTable
            columns={colonnesRelances}
            rows={relances.data ?? []}
            rowKey={(v) => `${v.eleve}-${v.vaccin}-${v.date_rappel}`}
            onRowClick={(v) => setDetail({ titre: `${v.eleve} · ${v.vaccin}`, record: v as unknown as Record<string, unknown> })}
            emptyLabel="Aucun rappel à relancer." />
          
          </>
        }

        {tab === 'dossier' &&
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Protocole d’urgence" subtitle={eleveId || 'Aucun élève sélectionné'} className={protocole.data ? 'border-[#E0A7A7]' : ''}>
              {protocole.loading && <LoadingState />}
              {protocole.error && <ErrorState message={protocole.error} onRetry={protocole.reload} />}
              {protocole.data ?
            <>
                  <p className="text-xs text-win-text">{String(protocole.data.protocole_texte)}</p>
                  <dl className="mt-2">
                    <FieldRow label="Condition">{String(protocole.data.condition)}</FieldRow>
                    <FieldRow label="Médicament">{str(protocole.data.medicament_urgence)}</FieldRow>
                    <FieldRow label="Localisation">{str(protocole.data.localisation_medicament)}</FieldRow>
                  </dl>
                </> :

            <p className="text-xs text-win-muted">Aucun protocole enregistré pour cet élève.</p>
            }
            </Panel>
            <Panel title="Contacts d’urgence" bodyClassName="">
              {contact.loading && <LoadingState />}
              {contact.error && <ErrorState message={contact.error} onRetry={contact.reload} />}
              <ul className="divide-y divide-win-border">
                {(contact.data?.contacts_urgence ?? []).map((c, i) =>
              <li key={`${c.nom}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-win-text">{c.nom}</span>
                      <span className="block text-2xs text-win-muted">{c.lien}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-2xs text-win-muted">{str(c.telephone)}</span>
                      {c.principal && <Badge tone="accent">Principal</Badge>}
                    </span>
                  </li>
              )}
                {(contact.data?.contacts_urgence ?? []).length === 0 &&
              <li className="px-3 py-4 text-2xs text-win-muted">Aucun contact d’urgence.</li>
              }
              </ul>
            </Panel>
          </div>
        }
      </div>

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        subtitle="Détail renvoyé par le backend"
        record={detail?.record ?? null} />
      

      <FormDrawer
        open={formVisite}
        onClose={() => setFormVisite(false)}
        title="Enregistrer une visite"
        submitting={creerVisite.submitting}
        error={creerVisite.error}
        onSubmit={() =>
        creerVisite.run(
          () =>
          ecoleEnregistrerVisite({
            eleve_id: visiteData.eleve_id,
            motif: visiteData.motif,
            symptomes: visiteData.symptomes || null,
            soin_administre: visiteData.soin_administre || null,
            medicament_donne: visiteData.medicament_donne || null,
            temperature_c: visiteData.temperature_c ? Number(visiteData.temperature_c) : null,
            renvoi_domicile: visiteData.renvoi_domicile,
            parent_contacte: visiteData.parent_contacte,
            suite_donnee: visiteData.suite_donnee || null
          }),
          () => {
            setFormVisite(false);
            visites.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={visiteData.eleve_id} onChange={(v) => setVisiteData({ ...visiteData, eleve_id: v })} />
        <TextField label="Motif" required value={visiteData.motif} onChange={(v) => setVisiteData({ ...visiteData, motif: v })} />
        <TextAreaField label="Symptômes" value={visiteData.symptomes} onChange={(v) => setVisiteData({ ...visiteData, symptomes: v })} />
        <TextField label="Soin administré" value={visiteData.soin_administre} onChange={(v) => setVisiteData({ ...visiteData, soin_administre: v })} />
        <TextField label="Médicament donné" value={visiteData.medicament_donne} onChange={(v) => setVisiteData({ ...visiteData, medicament_donne: v })} />
        <TextField label="Température (°C)" type="number" value={visiteData.temperature_c} onChange={(v) => setVisiteData({ ...visiteData, temperature_c: v })} />
        <CheckboxField label="Renvoi au domicile" checked={visiteData.renvoi_domicile} onChange={(v) => setVisiteData({ ...visiteData, renvoi_domicile: v })} />
        <CheckboxField label="Parent contacté" checked={visiteData.parent_contacte} onChange={(v) => setVisiteData({ ...visiteData, parent_contacte: v })} />
        <TextField label="Suite donnée" value={visiteData.suite_donnee} onChange={(v) => setVisiteData({ ...visiteData, suite_donnee: v })} />
      </FormDrawer>

      <FormDrawer
        open={formProtocole}
        onClose={() => setFormProtocole(false)}
        title="Nouveau protocole d’urgence"
        submitting={creerProtocole.submitting}
        error={creerProtocole.error}
        onSubmit={() =>
        creerProtocole.run(
          () =>
          ecoleCreerProtocole({
            eleve_id: protocoleData.eleve_id,
            condition: protocoleData.condition,
            protocole_texte: protocoleData.protocole_texte,
            medicament_urgence: protocoleData.medicament_urgence || null,
            localisation_medicament: protocoleData.localisation_medicament || null
          }),
          () => {
            setFormProtocole(false);
            protocole.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={protocoleData.eleve_id} onChange={(v) => setProtocoleData({ ...protocoleData, eleve_id: v })} />
        <TextField label="Condition" required value={protocoleData.condition} onChange={(v) => setProtocoleData({ ...protocoleData, condition: v })} />
        <TextAreaField label="Protocole" rows={4} value={protocoleData.protocole_texte} onChange={(v) => setProtocoleData({ ...protocoleData, protocole_texte: v })} />
        <TextField label="Médicament d’urgence" value={protocoleData.medicament_urgence} onChange={(v) => setProtocoleData({ ...protocoleData, medicament_urgence: v })} />
        <TextField
          label="Localisation du médicament"
          value={protocoleData.localisation_medicament}
          onChange={(v) => setProtocoleData({ ...protocoleData, localisation_medicament: v })} />
        
      </FormDrawer>

      <FormDrawer
        open={formVaccination}
        onClose={() => setFormVaccination(false)}
        title="Nouvelle vaccination"
        submitting={creerVaccination.submitting}
        error={creerVaccination.error}
        onSubmit={() =>
        creerVaccination.run(
          () =>
          ecoleCreerVaccination({
            eleve_id: vaccinationData.eleve_id,
            vaccin: vaccinationData.vaccin,
            date_vaccination: vaccinationData.date_vaccination || null,
            date_rappel: vaccinationData.date_rappel || null,
            statut: vaccinationData.statut
          }),
          () => {
            setFormVaccination(false);
            relances.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={vaccinationData.eleve_id} onChange={(v) => setVaccinationData({ ...vaccinationData, eleve_id: v })} />
        <TextField label="Vaccin" required value={vaccinationData.vaccin} onChange={(v) => setVaccinationData({ ...vaccinationData, vaccin: v })} />
        <TextField label="Date de vaccination" type="date" value={vaccinationData.date_vaccination} onChange={(v) => setVaccinationData({ ...vaccinationData, date_vaccination: v })} />
        <TextField label="Date de rappel" type="date" value={vaccinationData.date_rappel} onChange={(v) => setVaccinationData({ ...vaccinationData, date_rappel: v })} />
      </FormDrawer>

      <FormDrawer
        open={formUrgence}
        onClose={() => setFormUrgence(false)}
        title="Notifier une urgence santé"
        subtitle="Notification envoyée aux parents par le backend"
        submitting={notifier.submitting}
        error={notifier.error}
        submitLabel="Notifier"
        onSubmit={() =>
        notifier.run(
          () =>
          ecoleNotifierUrgenceSante({
            eleve_id: urgenceData.eleve_id,
            eleve_nom: urgenceData.eleve_nom,
            motif: urgenceData.motif
          }),
          () => setFormUrgence(false)
        )
        }>
        
        <TextField label="Identifiant élève" required value={urgenceData.eleve_id} onChange={(v) => setUrgenceData({ ...urgenceData, eleve_id: v })} />
        <TextField label="Nom de l’élève" required value={urgenceData.eleve_nom} onChange={(v) => setUrgenceData({ ...urgenceData, eleve_nom: v })} />
        <TextField label="Motif" required value={urgenceData.motif} onChange={(v) => setUrgenceData({ ...urgenceData, motif: v })} />
        <p className="text-2xs text-win-faint">Date : {formatDate(aujourdHui())}</p>
      </FormDrawer>
    </>);

}