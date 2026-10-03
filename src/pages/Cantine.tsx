import React, { useState } from 'react';
import { CheckCheckIcon, PlusIcon, ReceiptIcon, UtensilsCrossedIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { AllergeneBadge, Badge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import {
  Button,
  Divider,
  ErrorState,
  FieldRow,
  LoadingState,
  Panel,
  SearchInput,
  Select,
  SelectField,
  StatTile,
  TextField,
  Toolbar } from
'../components/ui/primitives';
import { useResource, useSubmit } from '../hooks/useResource';
import { useApp } from '../contexts/AppContext';
import { aujourdHui, formatDate, formatFcfa, str } from '../utils/format';
import {
  ecoleAbonnementsCantineEleve,
  ecoleCreerAbonnementCantine,
  ecoleCreerMenu,
  ecoleFacturationCantine,
  ecoleListClasses,
  ecoleListerMenus,
  ecoleMenuDuJour,
  ecolePointerRepas } from
'../lib/api_ecole';
import type { MenuCantine } from '../lib/api_ecole';

const TYPES_REPAS = [
{ value: 'petit_dejeuner', label: 'Petit-déjeuner' },
{ value: 'dejeuner', label: 'Déjeuner' },
{ value: 'gouter', label: 'Goûter' }];


export function Cantine() {
  const { anneeId } = useApp();
  const [tab, setTab] = useState('menus');
  const [dateService, setDateService] = useState(aujourdHui());
  const [classeId, setClasseId] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [mois, setMois] = useState(aujourdHui().slice(0, 7));
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [formMenu, setFormMenu] = useState(false);
  const [formAbonnement, setFormAbonnement] = useState(false);
  const [formPointage, setFormPointage] = useState(false);
  const [resultatPointage, setResultatPointage] = useState<string | null>(null);

  const classes = useResource(() => ecoleListClasses(anneeId), [anneeId], !!anneeId);
  const menus = useResource(() => ecoleListerMenus(dateService), [dateService]);
  const menuDuJour = useResource(
    () => ecoleMenuDuJour({ date_service: dateService, classe_id: classeId }),
    [dateService, classeId],
    !!classeId
  );
  const abonnements = useResource(() => ecoleAbonnementsCantineEleve(eleveId), [eleveId], !!eleveId);
  const facturation = useResource(() => ecoleFacturationCantine(eleveId, mois), [eleveId, mois], !!eleveId && !!mois);

  const creerMenu = useSubmit();
  const creerAbonnement = useSubmit();
  const pointer = useSubmit();

  const [menuData, setMenuData] = useState({
    date_service: aujourdHui(),
    type_repas: 'dejeuner',
    plat_principal: '',
    accompagnement: '',
    dessert: '',
    allergenes_presents: '',
    cout_unitaire_fcfa: ''
  });
  const [abonnementData, setAbonnementData] = useState({ eleve_id: '', formule: 'quotidien', date_debut: aujourdHui(), actif: true });
  const [pointageData, setPointageData] = useState({ eleve_id: '', date_service: aujourdHui(), type_repas: 'dejeuner' });

  const colonnesMenus: Column<MenuCantine>[] = [
  { key: 'date', header: 'Date de service', sortValue: (m) => m.date_service, render: (m) => formatDate(m.date_service) },
  { key: 'type', header: 'Repas', render: (m) => <Badge tone="accent">{str(m.type_repas)}</Badge> },
  { key: 'plat', header: 'Plat principal', render: (m) => <span className="font-medium text-win-text">{str(m.plat_principal as string)}</span> },
  {
    key: 'allergenes',
    header: 'Allergènes',
    render: (m) =>
    <span className="flex flex-wrap gap-1">
          {(m.allergenes_presents ?? []).map((a) => <AllergeneBadge key={a} code={a} />)}
          {(m.allergenes_presents ?? []).length === 0 && <span className="text-2xs text-win-faint">Aucun</span>}
        </span>

  }];


  return (
    <>
      <PageHeader
        title="Cantine"
        description="Menus, abonnements, pointage des repas et contrôle des allergènes"
        actions={
        <>
            <Button icon={<CheckCheckIcon size={13} />} onClick={() => setFormPointage(true)}>Pointer un repas</Button>
            <Button variant="primary" icon={<UtensilsCrossedIcon size={13} />} onClick={() => setFormMenu(true)}>
              Nouveau menu
            </Button>
          </>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Menus du jour" value={(menus.data ?? []).length} hint={formatDate(dateService)} tone="accent" />
        <StatTile
          label="Élèves à risque"
          value={(menuDuJour.data?.eleves_a_risque ?? []).length}
          hint={classeId ? 'Classe sélectionnée' : 'Sélectionnez une classe'}
          tone="danger" />
        
        <StatTile label="Abonnements de l’élève" value={(abonnements.data ?? []).length} hint={eleveId || 'Aucun élève'} tone="neutral" />
        <StatTile
          label="Facturation du mois"
          value={facturation.data ? formatFcfa(facturation.data.montant_fcfa) : '—'}
          hint={facturation.data?.mois ?? mois}
          tone="success" />
        
      </div>

      <Toolbar>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wide text-win-muted">Date de service</span>
          <input
            type="date"
            value={dateService}
            onChange={(e) => setDateService(e.target.value)}
            className="h-8 border border-win-borderStrong bg-white px-2 text-xs text-win-text rounded-win focus:border-win-accent focus:outline-none" />
          
        </label>
        <Divider />
        <Select
          label="Classe"
          value={classeId}
          onChange={setClasseId}
          options={[{ value: '', label: 'Sélectionner…' }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.libelle }))]} />
        
        <Divider />
        <SearchInput value={eleveId} onChange={setEleveId} placeholder="Identifiant élève…" className="w-56" />
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wide text-win-muted">Mois</span>
          <input
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="h-8 border border-win-borderStrong bg-white px-2 text-xs text-win-text rounded-win focus:border-win-accent focus:outline-none" />
          
        </label>
        <Divider />
        <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormAbonnement(true)}>Nouvel abonnement</Button>
      </Toolbar>

      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'menus', label: 'Menus', count: (menus.data ?? []).length },
          { id: 'alertes', label: 'Alertes allergènes', count: (menuDuJour.data?.eleves_a_risque ?? []).length },
          { id: 'eleve', label: 'Dossier élève', count: (abonnements.data ?? []).length }]
          } />
        
      </div>

      <div className="mt-3 space-y-3">
        {tab === 'menus' &&
        <>
            {menus.loading && <LoadingState />}
            {menus.error && <ErrorState message={menus.error} onRetry={menus.reload} />}
            <DataTable
            columns={colonnesMenus}
            rows={menus.data ?? []}
            rowKey={(m) => m.id}
            onRowClick={(m) => setDetail({ titre: `${str(m.type_repas)} · ${formatDate(m.date_service)}`, record: m })}
            emptyLabel="Aucun menu publié pour cette date." />
          
          </>
        }

        {tab === 'alertes' &&
        <Panel title="Élèves à risque" subtitle={classeId ? `Classe ${classeId} · ${formatDate(dateService)}` : 'Sélectionnez une classe'} bodyClassName="">
            {menuDuJour.loading && <LoadingState />}
            {menuDuJour.error && <ErrorState message={menuDuJour.error} onRetry={menuDuJour.reload} />}
            <ul className="divide-y divide-win-border">
              {(menuDuJour.data?.eleves_a_risque ?? []).map((e) =>
            <li key={`${e.eleve_id}-${e.type_repas}`}>
                  <button
                type="button"
                onClick={() => setDetail({ titre: e.nom, record: e as unknown as Record<string, unknown> })}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-win-text">{e.nom}</span>
                      <span className="block text-2xs text-win-muted">{e.type_repas}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap gap-1">
                      {e.allergenes_conflit.map((a) => <AllergeneBadge key={a} code={a} danger />)}
                    </span>
                  </button>
                </li>
            )}
              {!menuDuJour.loading && (menuDuJour.data?.eleves_a_risque ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucun conflit d’allergène détecté.</li>
            }
            </ul>
          </Panel>
        }

        {tab === 'eleve' &&
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Abonnements cantine" subtitle={eleveId || 'Aucun élève sélectionné'} bodyClassName="">
              {abonnements.loading && <LoadingState />}
              {abonnements.error && <ErrorState message={abonnements.error} onRetry={abonnements.reload} />}
              <ul className="divide-y divide-win-border">
                {(abonnements.data ?? []).map((a, i) =>
              <li key={String((a as Record<string, unknown>).id ?? i)}>
                    <button
                  type="button"
                  onClick={() => setDetail({ titre: 'Abonnement cantine', record: a as Record<string, unknown> })}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                  
                      <span className="text-xs font-medium text-win-text">{str((a as Record<string, unknown>).formule as string)}</span>
                      <Badge tone={(a as Record<string, unknown>).actif ? 'success' : 'neutral'}>
                        {(a as Record<string, unknown>).actif ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </button>
                  </li>
              )}
                {!abonnements.loading && (abonnements.data ?? []).length === 0 &&
              <li className="px-3 py-4 text-2xs text-win-muted">Aucun abonnement.</li>
              }
              </ul>
            </Panel>
            <Panel title="Facturation" subtitle={mois} action={<ReceiptIcon size={14} className="text-win-faint" />}>
              {facturation.loading && <LoadingState />}
              {facturation.error && <ErrorState message={facturation.error} onRetry={facturation.reload} />}
              {facturation.data &&
            <dl>
                  <FieldRow label="Mois">{facturation.data.mois}</FieldRow>
                  <FieldRow label="Montant facturé">{formatFcfa(facturation.data.montant_fcfa)}</FieldRow>
                </dl>
            }
              {!eleveId && <p className="text-xs text-win-muted">Saisissez un identifiant élève.</p>}
            </Panel>
          </div>
        }
      </div>

      {resultatPointage &&
      <p className="mt-3 border border-[#BFD0EA] bg-win-accentSoft px-3 py-2 text-2xs text-win-accent rounded-win">
          {resultatPointage}
        </p>
      }

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        subtitle="Détail renvoyé par le backend"
        record={detail?.record ?? null} />
      

      <FormDrawer
        open={formMenu}
        onClose={() => setFormMenu(false)}
        title="Nouveau menu"
        submitting={creerMenu.submitting}
        error={creerMenu.error}
        onSubmit={() =>
        creerMenu.run(
          () =>
          ecoleCreerMenu({
            date_service: menuData.date_service,
            type_repas: menuData.type_repas,
            plat_principal: menuData.plat_principal,
            accompagnement: menuData.accompagnement || null,
            dessert: menuData.dessert || null,
            allergenes_presents: menuData.allergenes_presents ?
            menuData.allergenes_presents.split(',').map((a) => a.trim()).filter(Boolean) :
            [],
            cout_unitaire_fcfa: menuData.cout_unitaire_fcfa ? Number(menuData.cout_unitaire_fcfa) : null
          }),
          () => {
            setFormMenu(false);
            menus.reload();
          }
        )
        }>
        
        <TextField label="Date de service" type="date" required value={menuData.date_service} onChange={(v) => setMenuData({ ...menuData, date_service: v })} />
        <SelectField label="Type de repas" required value={menuData.type_repas} onChange={(v) => setMenuData({ ...menuData, type_repas: v })} options={TYPES_REPAS} />
        <TextField label="Plat principal" required value={menuData.plat_principal} onChange={(v) => setMenuData({ ...menuData, plat_principal: v })} />
        <TextField label="Accompagnement" value={menuData.accompagnement} onChange={(v) => setMenuData({ ...menuData, accompagnement: v })} />
        <TextField label="Dessert" value={menuData.dessert} onChange={(v) => setMenuData({ ...menuData, dessert: v })} />
        <TextField
          label="Allergènes présents"
          hint="Séparés par des virgules (gluten, lactose, arachide…)"
          value={menuData.allergenes_presents}
          onChange={(v) => setMenuData({ ...menuData, allergenes_presents: v })} />
        
        <TextField label="Coût unitaire (FCFA)" type="number" value={menuData.cout_unitaire_fcfa} onChange={(v) => setMenuData({ ...menuData, cout_unitaire_fcfa: v })} />
      </FormDrawer>

      <FormDrawer
        open={formAbonnement}
        onClose={() => setFormAbonnement(false)}
        title="Nouvel abonnement cantine"
        submitting={creerAbonnement.submitting}
        error={creerAbonnement.error}
        onSubmit={() =>
        creerAbonnement.run(
          () =>
          ecoleCreerAbonnementCantine({
            eleve_id: abonnementData.eleve_id,
            formule: abonnementData.formule,
            date_debut: abonnementData.date_debut,
            actif: abonnementData.actif
          }),
          () => {
            setFormAbonnement(false);
            abonnements.reload();
          }
        )
        }>
        
        <TextField label="Identifiant élève" required value={abonnementData.eleve_id} onChange={(v) => setAbonnementData({ ...abonnementData, eleve_id: v })} />
        <SelectField
          label="Formule"
          required
          value={abonnementData.formule}
          onChange={(v) => setAbonnementData({ ...abonnementData, formule: v })}
          options={[
          { value: 'quotidien', label: 'Quotidien' },
          { value: 'jours_specifiques', label: 'Jours spécifiques' },
          { value: 'ponctuel', label: 'Ponctuel' }]
          } />
        
        <TextField label="Date de début" type="date" required value={abonnementData.date_debut} onChange={(v) => setAbonnementData({ ...abonnementData, date_debut: v })} />
      </FormDrawer>

      <FormDrawer
        open={formPointage}
        onClose={() => setFormPointage(false)}
        title="Pointer un repas"
        subtitle="Contrôle des allergènes effectué par le backend"
        submitting={pointer.submitting}
        error={pointer.error}
        submitLabel="Pointer"
        onSubmit={() =>
        pointer.run(
          async () => {
            const res = await ecolePointerRepas({
              eleve_id: pointageData.eleve_id,
              date_service: pointageData.date_service,
              type_repas: pointageData.type_repas
            });
            const alertes = res.alerte_allergene ?? [];
            setResultatPointage(
              'deja_pointe' in res ?
              `Repas déjà pointé${alertes.length ? ` · alerte allergène : ${alertes.join(', ')}` : ''}` :
              `Repas pointé${alertes.length ? ` · alerte allergène : ${alertes.join(', ')}` : ''}`
            );
          },
          () => setFormPointage(false)
        )
        }>
        
        <TextField label="Identifiant élève" required value={pointageData.eleve_id} onChange={(v) => setPointageData({ ...pointageData, eleve_id: v })} />
        <TextField label="Date de service" type="date" required value={pointageData.date_service} onChange={(v) => setPointageData({ ...pointageData, date_service: v })} />
        <SelectField label="Type de repas" value={pointageData.type_repas} onChange={(v) => setPointageData({ ...pointageData, type_repas: v })} options={TYPES_REPAS} />
      </FormDrawer>
    </>);

}