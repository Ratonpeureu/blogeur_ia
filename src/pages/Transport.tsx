import React, { useState } from 'react';
import { BusIcon, MapPinPlusIcon, PlusIcon, ScanLineIcon } from 'lucide-react';
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
  LoadingState,
  Panel,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { aujourdHui, formatDate, str } from '../utils/format';
import {
  ecoleAnomaliesTransport,
  ecoleCreerAbonnementTransport,
  ecoleCreerCircuit,
  ecoleCreerVehicule,
  ecoleListerCircuits,
  ecoleListerVehicules,
  ecolePointerTransport } from
'../lib/api_ecole';
import type { CircuitTransport, Vehicule } from '../lib/api_ecole';

export function Transport() {
  const [tab, setTab] = useState('circuits');
  const [dateTrajet, setDateTrajet] = useState(aujourdHui());
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formVehicule, setFormVehicule] = useState(false);
  const [formCircuit, setFormCircuit] = useState(false);
  const [formAbonnement, setFormAbonnement] = useState(false);
  const [formPointage, setFormPointage] = useState(false);

  const vehicules = useResource(() => ecoleListerVehicules(), []);
  const circuits = useResource(() => ecoleListerCircuits(), []);
  const anomalies = useResource(() => ecoleAnomaliesTransport(dateTrajet), [dateTrajet]);

  const creerVehicule = useSubmit();
  const creerCircuit = useSubmit();
  const creerAbonnement = useSubmit();
  const pointer = useSubmit();

  const [vehiculeData, setVehiculeData] = useState({ immatriculation: '', modele: '', capacite: '', chauffeur: '', actif: true });
  const [circuitData, setCircuitData] = useState({ libelle: '', vehicule_id: '', sens: 'aller', heure_depart: '' });
  const [abonnementData, setAbonnementData] = useState({ eleve_id: '', circuit_aller_id: '', circuit_retour_id: '', actif: true });
  const [pointageData, setPointageData] = useState({ eleve_id: '', circuit_id: '', date_trajet: aujourdHui(), evenement: 'montee' });

  const colonnesVehicules: Column<Vehicule>[] = [
  { key: 'immat', header: 'Immatriculation', render: (v) => <span className="font-medium text-win-text">{str((v as Record<string, unknown>).immatriculation as string)}</span> },
  { key: 'modele', header: 'Modèle', render: (v) => str((v as Record<string, unknown>).modele as string) },
  { key: 'capacite', header: 'Capacité', align: 'right', render: (v) => str((v as Record<string, unknown>).capacite as string) },
  { key: 'chauffeur', header: 'Chauffeur', render: (v) => str((v as Record<string, unknown>).chauffeur as string) },
  {
    key: 'actif',
    header: 'Statut',
    render: (v) =>
    <Badge tone={(v as Record<string, unknown>).actif ? 'success' : 'neutral'}>
          {(v as Record<string, unknown>).actif ? 'Actif' : 'Immobilisé'}
        </Badge>

  }];


  const colonnesCircuits: Column<CircuitTransport>[] = [
  { key: 'libelle', header: 'Circuit', render: (c) => <span className="font-medium text-win-text">{str((c as Record<string, unknown>).libelle as string)}</span> },
  { key: 'vehicule', header: 'Véhicule', render: (c) => str((c as Record<string, unknown>).vehicule_id as string) },
  {
    key: 'sens',
    header: 'Sens',
    render: (c) => <StatusBadge value={String((c as Record<string, unknown>).sens ?? 'aller')} />
  },
  { key: 'depart', header: 'Heure de départ', render: (c) => str((c as Record<string, unknown>).heure_depart as string) }];


  return (
    <>
      <PageHeader
        title="Transport"
        description="Véhicules, circuits, abonnements et pointage des montées / descentes"
        actions={
        <>
            <Button icon={<ScanLineIcon size={13} />} onClick={() => setFormPointage(true)}>Pointer un trajet</Button>
            <Button variant="primary" icon={<BusIcon size={13} />} onClick={() => setFormVehicule(true)}>Nouveau véhicule</Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Véhicules" value={(vehicules.data ?? []).length} hint="Parc déclaré" tone="accent" />
        <StatTile label="Circuits" value={(circuits.data ?? []).length} hint="Aller et retour" tone="neutral" />
        <StatTile label="Anomalies du jour" value={(anomalies.data ?? []).length} hint={formatDate(dateTrajet)} tone="danger" />
        <StatTile
          label="Descentes manquantes"
          value={(anomalies.data ?? []).filter((a) => a.type === 'descente_manquante').length}
          hint="À traiter en priorité"
          tone="warning" />
        
      </div>

      <Toolbar>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wide text-win-muted">Date du trajet</span>
          <input
            type="date"
            value={dateTrajet}
            onChange={(e) => setDateTrajet(e.target.value)}
            className="h-8 border border-win-borderStrong bg-white px-2 text-xs text-win-text rounded-win focus:border-win-accent focus:outline-none" />
          
        </label>
        <Divider />
        <Button size="sm" icon={<MapPinPlusIcon size={12} />} onClick={() => setFormCircuit(true)}>Nouveau circuit</Button>
        <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormAbonnement(true)}>Nouvel abonnement</Button>
      </Toolbar>

      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'circuits', label: 'Circuits', count: (circuits.data ?? []).length },
          { id: 'vehicules', label: 'Véhicules', count: (vehicules.data ?? []).length },
          { id: 'anomalies', label: 'Anomalies', count: (anomalies.data ?? []).length }]
          } />
        
      </div>

      <div className="mt-3 space-y-3">
        {tab === 'circuits' &&
        <>
            {circuits.loading && <LoadingState />}
            {circuits.error && <ErrorState message={circuits.error} onRetry={circuits.reload} />}
            <DataTable
            columns={colonnesCircuits}
            rows={circuits.data ?? []}
            rowKey={(c) => String((c as Record<string, unknown>).id)}
            onRowClick={(c) => setDetail({ titre: str((c as Record<string, unknown>).libelle as string), record: c as Record<string, unknown> })}
            emptyLabel="Aucun circuit enregistré." />
          
          </>
        }

        {tab === 'vehicules' &&
        <>
            {vehicules.loading && <LoadingState />}
            {vehicules.error && <ErrorState message={vehicules.error} onRetry={vehicules.reload} />}
            <DataTable
            columns={colonnesVehicules}
            rows={vehicules.data ?? []}
            rowKey={(v) => String((v as Record<string, unknown>).id)}
            onRowClick={(v) => setDetail({ titre: str((v as Record<string, unknown>).immatriculation as string), record: v as Record<string, unknown> })}
            emptyLabel="Aucun véhicule enregistré." />
          
          </>
        }

        {tab === 'anomalies' &&
        <Panel title="Anomalies de pointage" subtitle={formatDate(dateTrajet)} bodyClassName="">
            {anomalies.loading && <LoadingState />}
            {anomalies.error && <ErrorState message={anomalies.error} onRetry={anomalies.reload} />}
            <ul className="divide-y divide-win-border">
              {(anomalies.data ?? []).map((a, i) =>
            <li key={`${a.eleve_id}-${i}`}>
                  <button
                type="button"
                onClick={() => setDetail({ titre: a.eleve_id, record: a as unknown as Record<string, unknown> })}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-win-text">{a.eleve_id}</span>
                      <span className="block text-2xs text-win-muted">{a.message}</span>
                    </span>
                    <StatusBadge value={a.type} />
                  </button>
                </li>
            )}
              {!anomalies.loading && (anomalies.data ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucune anomalie détectée pour cette date.</li>
            }
            </ul>
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
        open={formVehicule}
        onClose={() => setFormVehicule(false)}
        title="Nouveau véhicule"
        submitting={creerVehicule.submitting}
        error={creerVehicule.error}
        onSubmit={() =>
        creerVehicule.run(
          () =>
          ecoleCreerVehicule({
            immatriculation: vehiculeData.immatriculation,
            modele: vehiculeData.modele || null,
            capacite: vehiculeData.capacite ? Number(vehiculeData.capacite) : null,
            chauffeur: vehiculeData.chauffeur || null,
            actif: vehiculeData.actif
          }),
          () => {
            setFormVehicule(false);
            vehicules.reload();
          }
        )
        }>
        
        <TextField label="Immatriculation" required value={vehiculeData.immatriculation} onChange={(v) => setVehiculeData({ ...vehiculeData, immatriculation: v })} />
        <TextField label="Modèle" value={vehiculeData.modele} onChange={(v) => setVehiculeData({ ...vehiculeData, modele: v })} />
        <TextField label="Capacité" type="number" value={vehiculeData.capacite} onChange={(v) => setVehiculeData({ ...vehiculeData, capacite: v })} />
        <TextField label="Chauffeur" value={vehiculeData.chauffeur} onChange={(v) => setVehiculeData({ ...vehiculeData, chauffeur: v })} />
        <CheckboxField label="Véhicule actif" checked={vehiculeData.actif} onChange={(v) => setVehiculeData({ ...vehiculeData, actif: v })} />
      </FormDrawer>

      <FormDrawer
        open={formCircuit}
        onClose={() => setFormCircuit(false)}
        title="Nouveau circuit"
        submitting={creerCircuit.submitting}
        error={creerCircuit.error}
        onSubmit={() =>
        creerCircuit.run(
          () =>
          ecoleCreerCircuit({
            libelle: circuitData.libelle,
            vehicule_id: circuitData.vehicule_id || null,
            sens: circuitData.sens,
            heure_depart: circuitData.heure_depart || null
          }),
          () => {
            setFormCircuit(false);
            circuits.reload();
          }
        )
        }>
        
        <TextField label="Libellé" required value={circuitData.libelle} onChange={(v) => setCircuitData({ ...circuitData, libelle: v })} />
        <SelectField
          label="Véhicule"
          value={circuitData.vehicule_id}
          onChange={(v) => setCircuitData({ ...circuitData, vehicule_id: v })}
          options={(vehicules.data ?? []).map((v) => ({
            value: String((v as Record<string, unknown>).id),
            label: str((v as Record<string, unknown>).immatriculation as string)
          }))} />
        
        <SelectField
          label="Sens"
          required
          value={circuitData.sens}
          onChange={(v) => setCircuitData({ ...circuitData, sens: v })}
          options={[{ value: 'aller', label: 'Aller' }, { value: 'retour', label: 'Retour' }]} />
        
        <TextField label="Heure de départ" type="time" value={circuitData.heure_depart} onChange={(v) => setCircuitData({ ...circuitData, heure_depart: v })} />
      </FormDrawer>

      <FormDrawer
        open={formAbonnement}
        onClose={() => setFormAbonnement(false)}
        title="Nouvel abonnement transport"
        submitting={creerAbonnement.submitting}
        error={creerAbonnement.error}
        onSubmit={() =>
        creerAbonnement.run(
          () =>
          ecoleCreerAbonnementTransport({
            eleve_id: abonnementData.eleve_id,
            circuit_aller_id: abonnementData.circuit_aller_id || null,
            circuit_retour_id: abonnementData.circuit_retour_id || null,
            actif: abonnementData.actif
          }),
          () => setFormAbonnement(false)
        )
        }>
        
        <TextField label="Identifiant élève" required value={abonnementData.eleve_id} onChange={(v) => setAbonnementData({ ...abonnementData, eleve_id: v })} />
        <SelectField
          label="Circuit aller"
          value={abonnementData.circuit_aller_id}
          onChange={(v) => setAbonnementData({ ...abonnementData, circuit_aller_id: v })}
          options={(circuits.data ?? []).map((c) => ({
            value: String((c as Record<string, unknown>).id),
            label: str((c as Record<string, unknown>).libelle as string)
          }))} />
        
        <SelectField
          label="Circuit retour"
          value={abonnementData.circuit_retour_id}
          onChange={(v) => setAbonnementData({ ...abonnementData, circuit_retour_id: v })}
          options={(circuits.data ?? []).map((c) => ({
            value: String((c as Record<string, unknown>).id),
            label: str((c as Record<string, unknown>).libelle as string)
          }))} />
        
        <CheckboxField label="Abonnement actif" checked={abonnementData.actif} onChange={(v) => setAbonnementData({ ...abonnementData, actif: v })} />
      </FormDrawer>

      <FormDrawer
        open={formPointage}
        onClose={() => setFormPointage(false)}
        title="Pointer un trajet"
        submitting={pointer.submitting}
        error={pointer.error}
        submitLabel="Pointer"
        onSubmit={() =>
        pointer.run(
          () =>
          ecolePointerTransport({
            eleve_id: pointageData.eleve_id,
            circuit_id: pointageData.circuit_id,
            date_trajet: pointageData.date_trajet,
            evenement: pointageData.evenement
          }),
          () => {
            setFormPointage(false);
            anomalies.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={pointageData.eleve_id} onChange={(v) => setPointageData({ ...pointageData, eleve_id: v })} />
        <SelectField
          label="Circuit"
          required
          value={pointageData.circuit_id}
          onChange={(v) => setPointageData({ ...pointageData, circuit_id: v })}
          options={(circuits.data ?? []).map((c) => ({
            value: String((c as Record<string, unknown>).id),
            label: str((c as Record<string, unknown>).libelle as string)
          }))} />
        
        <TextField label="Date du trajet" type="date" required value={pointageData.date_trajet} onChange={(v) => setPointageData({ ...pointageData, date_trajet: v })} />
        <SelectField
          label="Événement"
          required
          value={pointageData.evenement}
          onChange={(v) => setPointageData({ ...pointageData, evenement: v })}
          options={[{ value: 'montee', label: 'Montée' }, { value: 'descente', label: 'Descente' }]} />
        
      </FormDrawer>
    </>);

}