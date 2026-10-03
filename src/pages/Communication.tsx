import React, { useState } from 'react';
import { BellRingIcon, GavelIcon, KeyRoundIcon, SendIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
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
  SearchInput,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { aujourdHui, formatDate, str } from '../utils/format';
import {
  ecoleCreerSanction,
  ecoleGenererCodeAcces,
  ecoleGetCodeAcces,
  ecoleJournalNotifications,
  ecoleListerConvocations,
  ecoleListerSignatures,
  ecoleNotifierAbsence,
  ecoleNotifierUrgenceSante,
  ecoleSanctionsEleve } from
'../lib/api_ecole';
import type { Convocation, NotificationParent, SanctionDisciplinaire, SignatureRequise } from '../lib/api_ecole';

export function Communication() {
  const [tab, setTab] = useState('journal');
  const [eleveId, setEleveId] = useState('');
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formAbsence, setFormAbsence] = useState(false);
  const [formUrgence, setFormUrgence] = useState(false);
  const [formSanction, setFormSanction] = useState(false);
  const [codeGenere, setCodeGenere] = useState<string | null>(null);

  const journal = useResource(() => ecoleJournalNotifications(eleveId || undefined), [eleveId]);
  const signatures = useResource(() => ecoleListerSignatures(eleveId ? { eleve_id: eleveId } : undefined), [eleveId]);
  const convocations = useResource(() => ecoleListerConvocations(), []);
  const sanctions = useResource(() => ecoleSanctionsEleve(eleveId), [eleveId], !!eleveId);
  const codeAcces = useResource(() => ecoleGetCodeAcces(eleveId), [eleveId], !!eleveId);

  const notifierAbsence = useSubmit();
  const notifierUrgence = useSubmit();
  const creerSanction = useSubmit();

  const [absenceData, setAbsenceData] = useState({ eleve_id: '', eleve_nom: '', date_absence: aujourdHui(), justifiee: false });
  const [urgenceData, setUrgenceData] = useState({ eleve_id: '', eleve_nom: '', motif: '' });
  const [sanctionData, setSanctionData] = useState({
    eleve_id: '',
    type_sanction: 'avertissement',
    motif: '',
    date_sanction: aujourdHui(),
    duree: ''
  });

  const colonnesJournal: Column<NotificationParent>[] = [
  { key: 'date', header: 'Date', sortValue: (n) => String(n.created_at), render: (n) => formatDate(n.created_at) },
  { key: 'eleve', header: 'Élève', render: (n) => str(n.eleve_id) },
  { key: 'type', header: 'Type', render: (n) => <Badge tone="accent">{str(n.type_notification)}</Badge> },
  { key: 'canal', header: 'Canal', render: (n) => str(n.canal) },
  { key: 'contenu', header: 'Contenu', width: '32%', render: (n) => <span className="block truncate text-win-muted">{n.contenu}</span> },
  { key: 'statut', header: 'Statut', render: (n) => <StatusBadge value={n.statut_envoi} /> }];


  const colonnesSignatures: Column<SignatureRequise>[] = [
  { key: 'titre', header: 'Document', render: (s) => <span className="font-medium text-win-text">{str(s.titre as string)}</span> },
  { key: 'eleve', header: 'Élève', render: (s) => str(s.eleve_id) },
  { key: 'limite', header: 'Date limite', render: (s) => formatDate(s.date_limite as string) },
  { key: 'signe', header: 'Signature', render: (s) => <Badge tone={s.signe ? 'success' : 'warning'}>{s.signe ? 'Signé' : 'En attente'}</Badge> }];


  const colonnesConvocations: Column<Convocation>[] = [
  { key: 'eleve', header: 'Élève', render: (c) => str(c.eleve_id as string) },
  { key: 'motif', header: 'Motif', render: (c) => <span className="font-medium text-win-text">{str(c.motif as string)}</span> },
  { key: 'date', header: 'Date', sortValue: (c) => String(c.date_convocation), render: (c) => formatDate(c.date_convocation) },
  { key: 'statut', header: 'Statut', render: (c) => <StatusBadge value={c.statut} /> }];


  const colonnesSanctions: Column<SanctionDisciplinaire>[] = [
  { key: 'date', header: 'Date', sortValue: (s) => s.date_sanction, render: (s) => formatDate(s.date_sanction) },
  { key: 'type', header: 'Type', render: (s) => <StatusBadge value={s.type_sanction} /> },
  { key: 'motif', header: 'Motif', width: '40%', render: (s) => <span className="font-medium text-win-text">{s.motif}</span> }];


  const aTraiter = (journal.data ?? []).filter((n) => n.statut_envoi !== 'envoye').length;

  return (
    <>
      <PageHeader
        title="Communication"
        description="Journal des notifications, documents à signer, convocations et discipline"
        actions={
        <>
            <Button icon={<GavelIcon size={13} />} onClick={() => setFormSanction(true)}>Nouvelle sanction</Button>
            <Button variant="primary" icon={<SendIcon size={13} />} onClick={() => setFormAbsence(true)}>
              Notifier une absence
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Notifications" value={(journal.data ?? []).length} hint="200 dernières" tone="accent" />
        <StatTile label="À traiter" value={aTraiter} hint="Non envoyées" tone="warning" />
        <StatTile
          label="Signatures en attente"
          value={(signatures.data ?? []).filter((s) => !s.signe).length}
          hint={`${(signatures.data ?? []).length} documents`}
          tone="danger" />
        
        <StatTile label="Convocations" value={(convocations.data ?? []).length} hint="Toutes" tone="neutral" />
      </div>

      <Toolbar>
        <SearchInput value={eleveId} onChange={setEleveId} placeholder="Identifiant élève…" className="w-64" />
        <Divider />
        <Button size="sm" icon={<BellRingIcon size={12} />} variant="danger" onClick={() => setFormUrgence(true)}>
          Urgence santé
        </Button>
        <Button
          size="sm"
          icon={<KeyRoundIcon size={12} />}
          disabled={!eleveId}
          onClick={() =>
          ecoleGenererCodeAcces(eleveId).then((r) => {
            setCodeGenere(r.code);
            codeAcces.reload();
          })
          }>
          
          Générer un code parent
        </Button>
        {codeGenere && <Badge tone="success">Code : {codeGenere}</Badge>}
      </Toolbar>

      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'journal', label: 'Journal', count: (journal.data ?? []).length },
          { id: 'signatures', label: 'Signatures', count: (signatures.data ?? []).length },
          { id: 'convocations', label: 'Convocations', count: (convocations.data ?? []).length },
          { id: 'discipline', label: 'Discipline', count: (sanctions.data ?? []).length }]
          } />
        
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {tab === 'journal' &&
          <>
              {journal.loading && <LoadingState />}
              {journal.error && <ErrorState message={journal.error} onRetry={journal.reload} />}
              <DataTable
              columns={colonnesJournal}
              rows={journal.data ?? []}
              rowKey={(n) => n.id}
              onRowClick={(n) => setDetail({ titre: str(n.type_notification), record: n })}
              rowTone={(n) => n.statut_envoi === 'echec' ? 'danger' : n.statut_envoi === 'en_attente' ? 'warning' : null}
              maxHeight="calc(100vh - 430px)"
              emptyLabel="Aucune notification." />
            
            </>
          }

          {tab === 'signatures' &&
          <>
              {signatures.loading && <LoadingState />}
              {signatures.error && <ErrorState message={signatures.error} onRetry={signatures.reload} />}
              <DataTable
              columns={colonnesSignatures}
              rows={signatures.data ?? []}
              rowKey={(s) => s.id}
              onRowClick={(s) => setDetail({ titre: str(s.titre as string), record: s })}
              emptyLabel="Aucun document à signer." />
            
            </>
          }

          {tab === 'convocations' &&
          <>
              {convocations.loading && <LoadingState />}
              {convocations.error && <ErrorState message={convocations.error} onRetry={convocations.reload} />}
              <DataTable
              columns={colonnesConvocations}
              rows={convocations.data ?? []}
              rowKey={(c) => c.id}
              onRowClick={(c) => setDetail({ titre: str(c.motif as string), record: c })}
              emptyLabel="Aucune convocation." />
            
            </>
          }

          {tab === 'discipline' &&
          <>
              {!eleveId && <Panel title="Discipline"><p className="text-xs text-win-muted">Saisissez un identifiant élève pour afficher son dossier disciplinaire.</p></Panel>}
              {sanctions.loading && <LoadingState />}
              {sanctions.error && <ErrorState message={sanctions.error} onRetry={sanctions.reload} />}
              {eleveId &&
            <DataTable
              columns={colonnesSanctions}
              rows={sanctions.data ?? []}
              rowKey={(s) => s.id}
              onRowClick={(s) => setDetail({ titre: s.motif, record: s })}
              emptyLabel="Dossier disciplinaire vierge." />

            }
            </>
          }
        </div>

        <Panel title="Accès portail parent" subtitle={eleveId || 'Aucun élève sélectionné'}>
          {codeAcces.loading && <LoadingState />}
          {codeAcces.data ?
          <dl>
              <FieldRow label="Code">{str(codeAcces.data.code)}</FieldRow>
              <FieldRow label="Actif">
                <Badge tone={codeAcces.data.actif ? 'success' : 'neutral'}>{codeAcces.data.actif ? 'Actif' : 'Inactif'}</Badge>
              </FieldRow>
              <FieldRow label="Utilisations">{str(codeAcces.data.nb_utilisations)}</FieldRow>
            </dl> :

          <p className="text-xs text-win-muted">Aucun code d’accès généré.</p>
          }
        </Panel>
      </div>

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        subtitle="Détail renvoyé par le backend"
        record={detail?.record ?? null} />
      

      <FormDrawer
        open={formAbsence}
        onClose={() => setFormAbsence(false)}
        title="Notifier une absence"
        subtitle="Envoi géré par le backend"
        submitting={notifierAbsence.submitting}
        error={notifierAbsence.error}
        submitLabel="Notifier"
        onSubmit={() =>
        notifierAbsence.run(
          () =>
          ecoleNotifierAbsence({
            eleve_id: absenceData.eleve_id,
            eleve_nom: absenceData.eleve_nom,
            date_absence: absenceData.date_absence,
            justifiee: absenceData.justifiee
          }),
          () => {
            setFormAbsence(false);
            journal.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={absenceData.eleve_id} onChange={(v) => setAbsenceData({ ...absenceData, eleve_id: v })} />
        <TextField label="Nom de l’élève" required value={absenceData.eleve_nom} onChange={(v) => setAbsenceData({ ...absenceData, eleve_nom: v })} />
        <TextField label="Date d’absence" type="date" required value={absenceData.date_absence} onChange={(v) => setAbsenceData({ ...absenceData, date_absence: v })} />
        <CheckboxField label="Absence justifiée" checked={absenceData.justifiee} onChange={(v) => setAbsenceData({ ...absenceData, justifiee: v })} />
      </FormDrawer>

      <FormDrawer
        open={formUrgence}
        onClose={() => setFormUrgence(false)}
        title="Notifier une urgence santé"
        submitting={notifierUrgence.submitting}
        error={notifierUrgence.error}
        submitLabel="Notifier"
        onSubmit={() =>
        notifierUrgence.run(
          () =>
          ecoleNotifierUrgenceSante({
            eleve_id: urgenceData.eleve_id,
            eleve_nom: urgenceData.eleve_nom,
            motif: urgenceData.motif
          }),
          () => {
            setFormUrgence(false);
            journal.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={urgenceData.eleve_id} onChange={(v) => setUrgenceData({ ...urgenceData, eleve_id: v })} />
        <TextField label="Nom de l’élève" required value={urgenceData.eleve_nom} onChange={(v) => setUrgenceData({ ...urgenceData, eleve_nom: v })} />
        <TextField label="Motif" required value={urgenceData.motif} onChange={(v) => setUrgenceData({ ...urgenceData, motif: v })} />
      </FormDrawer>

      <FormDrawer
        open={formSanction}
        onClose={() => setFormSanction(false)}
        title="Nouvelle sanction disciplinaire"
        submitting={creerSanction.submitting}
        error={creerSanction.error}
        onSubmit={() =>
        creerSanction.run(
          () =>
          ecoleCreerSanction({
            eleve_id: sanctionData.eleve_id,
            type_sanction: sanctionData.type_sanction,
            motif: sanctionData.motif,
            date_sanction: sanctionData.date_sanction,
            duree: sanctionData.duree || null
          }),
          () => {
            setFormSanction(false);
            sanctions.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={sanctionData.eleve_id} onChange={(v) => setSanctionData({ ...sanctionData, eleve_id: v })} />
        <SelectField
          label="Type de sanction"
          required
          value={sanctionData.type_sanction}
          onChange={(v) => setSanctionData({ ...sanctionData, type_sanction: v })}
          options={[
          { value: 'avertissement', label: 'Avertissement' },
          { value: 'retenue', label: 'Retenue' },
          { value: 'blame', label: 'Blâme' },
          { value: 'exclusion_temporaire', label: 'Exclusion temporaire' }]
          } />
        
        <TextField label="Motif" required value={sanctionData.motif} onChange={(v) => setSanctionData({ ...sanctionData, motif: v })} />
        <TextField label="Date" type="date" required value={sanctionData.date_sanction} onChange={(v) => setSanctionData({ ...sanctionData, date_sanction: v })} />
        <TextField label="Durée" value={sanctionData.duree} onChange={(v) => setSanctionData({ ...sanctionData, duree: v })} />
      </FormDrawer>
    </>);

}