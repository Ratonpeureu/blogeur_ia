import React, { useMemo, useState } from 'react';
import { BanknoteIcon, CheckIcon, FileStackIcon, FolderPlusIcon, PlusIcon, ReceiptIcon, ShoppingCartIcon, WalletIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { InfoDrawer } from '../components/ui/InfoDrawer';
import { ComboboxField } from '../components/ui/ComboboxField';
import { Button, Divider, ErrorState, FieldRow, LoadingState, Panel, SelectField, StatTile, TextAreaField, TextField, Toolbar } from '../components/ui/primitives';
import { GrilleDetailDrawer } from '../components/finances/GrilleDetailDrawer';
import { ConfigFinancePanel } from '../components/finances/ConfigFinancePanel';
import { useResource, useSubmit } from '../hooks/useResource';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { useEleves } from '../hooks/useEleves';
import { aujourdHui, formatDate, formatFcfa, humanize, str } from '../utils/format';
import { champsLisibles } from '../utils/labels';
import {
  ecoleApprouverDemandeAchat,
  ecoleCreerDemandeAchat,
  ecoleCreerDepense,
  ecoleCreerGrilleFrais,
  ecoleEnregistrerPaiement,
  ecoleGetPolitiquePenalite,
  ecoleListerDemandesAchat,
  ecoleListerDepenses,
  ecoleListerGrillesFrais,
  ecoleMouvementsCredit,
  ecolePaiementAvecCredit,
  ecoleSituationComplete } from
'../lib/api_ecole';
import type { DemandeAchat, DepenseEtablissement, GrilleFraisScolarite, PaiementAvecCreditResult } from '../lib/api_ecole';
import { ecoleCategoriesDepenses, ecoleCreerCategorieDepense } from '../lib/api_ecole_extended';
import type { CategorieDepenseEtablissement } from '../lib/api_ecole_extended';

const MODES = [
{ value: 'especes', label: 'Espèces' },
{ value: 'wave', label: 'Wave' },
{ value: 'orange_money', label: 'Orange Money' },
{ value: 'virement', label: 'Virement' },
{ value: 'cheque', label: 'Chèque' }];


interface CategorieAplatie {
  id: string;
  label: string;
  hint?: string;
  libelle: string;
}

function aplatir(cats: CategorieDepenseEtablissement[], parent?: string): CategorieAplatie[] {
  return cats.flatMap((c) => [
  { id: c.id, libelle: c.libelle, label: parent ? `${parent} › ${c.libelle}` : c.libelle, hint: c.compte_comptable_ohada ? `Compte ${c.compte_comptable_ohada}` : undefined },
  ...aplatir(c.enfants ?? [], c.libelle)]
  );
}

export function Finances() {
  const ref = useReferentielEcole();
  const { anneeId } = ref;
  const { options: optionsEleves, nom: nomEleveDe, eleves } = useEleves();

  const [tab, setTab] = useState('paiements');
  const [eleveId, setEleveId] = useState('');
  const [grilleOuverte, setGrilleOuverte] = useState<GrilleFraisScolarite | null>(null);
  const [detail, setDetail] = useState<{titre: string;record: Record<string, unknown>;} | null>(null);
  const [recu, setRecu] = useState<(PaiementAvecCreditResult & {eleve: string;}) | null>(null);

  const [formPaiement, setFormPaiement] = useState<'simple' | 'credit' | null>(null);
  const [formGrille, setFormGrille] = useState(false);
  const [formDepense, setFormDepense] = useState(false);
  const [formCategorie, setFormCategorie] = useState(false);
  const [formAchat, setFormAchat] = useState(false);

  const politique = useResource(() => ecoleGetPolitiquePenalite(), []);
  const grilles = useResource(() => ecoleListerGrillesFrais(anneeId), [anneeId], !!anneeId);
  const depenses = useResource(() => ecoleListerDepenses(), []);
  const achats = useResource(() => ecoleListerDemandesAchat(), []);
  const categories = useResource(() => ecoleCategoriesDepenses(), []);
  const situation = useResource(() => ecoleSituationComplete(eleveId), [eleveId], !!eleveId);
  const credits = useResource(() => ecoleMouvementsCredit(eleveId), [eleveId], !!eleveId);

  const paiement = useSubmit();
  const grille = useSubmit();
  const depense = useSubmit();
  const categorie = useSubmit();
  const achat = useSubmit();
  const approbation = useSubmit();

  const paiementVide = { eleve_id: '', montant_fcfa: '', mode_paiement: 'especes', date_paiement: aujourdHui() };
  const [paiementData, setPaiementData] = useState(paiementVide);
  const [grilleData, setGrilleData] = useState({
    niveau_id: '',
    frais_inscription_fcfa: '',
    frais_scolarite_annuel_fcfa: '',
    nb_tranches_paiement: '3',
    frais_cantine_mensuel_fcfa: ''
  });
  const [depenseData, setDepenseData] = useState({ libelle: '', montant_fcfa: '', categorie_id: '', date_depense: aujourdHui() });
  const [categorieData, setCategorieData] = useState({ code: '', libelle: '', parent_id: '', compte_comptable_ohada: '' });
  const [achatData, setAchatData] = useState({ libelle: '', montant_estime_fcfa: '', justification: '' });

  const categoriesAplaties = useMemo(() => aplatir(categories.data ?? []), [categories.data]);
  const niveauxAvecGrille = new Set((grilles.data ?? []).map((g) => g.niveau_id));
  const totalDepenses = (depenses.data ?? []).reduce((acc, d) => acc + Number(d.montant_fcfa ?? 0), 0);
  const achatsATraiter = (achats.data ?? []).filter((a) => a.statut !== 'approuvee');

  function ouvrirPaiement(type: 'simple' | 'credit') {
    setPaiementData({ ...paiementVide, eleve_id: eleveId });
    paiement.setError(null);
    setFormPaiement(type);
  }

  const colonnesGrilles: Column<GrilleFraisScolarite>[] = [
  {
    key: 'niveau',
    header: 'Niveau',
    sortValue: (g) => ref.niveauLabel(g.niveau_id),
    render: (g) =>
    <span className="min-w-0">
          <span className="block font-medium text-win-text">{ref.niveauLabel(g.niveau_id)}</span>
          <span className="block text-2xs text-win-faint">{ref.cycleLabel(ref.niveauxParId.get(g.niveau_id)?.cycle_id)}</span>
        </span>

  },
  { key: 'inscription', header: 'Inscription', align: 'right', sortValue: (g) => g.frais_inscription_fcfa, render: (g) => formatFcfa(g.frais_inscription_fcfa) },
  { key: 'scolarite', header: 'Scolarité annuelle', align: 'right', sortValue: (g) => g.frais_scolarite_annuel_fcfa, render: (g) => formatFcfa(g.frais_scolarite_annuel_fcfa) },
  { key: 'tranches', header: 'Tranches', align: 'right', render: (g) => g.nb_tranches_paiement },
  { key: 'cantine', header: 'Cantine / mois', align: 'right', render: (g) => g.frais_cantine_mensuel_fcfa === null ? '—' : formatFcfa(g.frais_cantine_mensuel_fcfa) }];


  const colonnesDepenses: Column<DepenseEtablissement>[] = [
  { key: 'date', header: 'Date', sortValue: (d) => String(d.date_depense), render: (d) => formatDate(d.date_depense) },
  { key: 'libelle', header: 'Libellé', render: (d) => <span className="font-medium text-win-text">{str(d.libelle as string)}</span> },
  { key: 'categorie', header: 'Catégorie', render: (d) => str(d.categorie as string) },
  { key: 'montant', header: 'Montant', align: 'right', sortValue: (d) => Number(d.montant_fcfa ?? 0), render: (d) => formatFcfa(Number(d.montant_fcfa ?? 0)) }];


  const colonnesAchats: Column<DemandeAchat>[] = [
  { key: 'libelle', header: 'Demande', render: (a) => <span className="font-medium text-win-text">{str(a.libelle as string)}</span> },
  { key: 'justification', header: 'Justification', render: (a) => <span className="line-clamp-1 text-win-muted">{str(a.justification as string)}</span> },
  { key: 'montant', header: 'Montant estimé', align: 'right', sortValue: (a) => Number(a.montant_estime_fcfa ?? 0), render: (a) => formatFcfa(Number(a.montant_estime_fcfa ?? 0)) },
  { key: 'statut', header: 'Statut', render: (a) => <StatusBadge value={a.statut} label={humanize(a.statut)} /> },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (a) =>
    a.statut !== 'approuvee' ?
    <span onClick={(ev) => ev.stopPropagation()}>
            <Button
        size="sm"
        icon={<CheckIcon size={12} />}
        disabled={approbation.submitting}
        onClick={() => approbation.run(() => ecoleApprouverDemandeAchat(a.id), () => achats.reload())}>
        
              Approuver
            </Button>
          </span> :
    null
  }];


  const soldeFormulaire =
  paiementData.eleve_id && paiementData.eleve_id === eleveId && situation.data ? situation.data.solde_restant_fcfa : null;

  return (
    <>
      <PageHeader
        title="Finances"
        description={`Encaissements, grilles de frais, dépenses et achats · ${ref.anneeLibelle}`}
        actions={
        <Button variant="primary" icon={<BanknoteIcon size={13} />} onClick={() => ouvrirPaiement('simple')}>
            Encaisser un paiement
          </Button>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Pénalités de retard"
          value={politique.data ? politique.data.active ? 'Actives' : 'Inactives' : 'Non définies'}
          hint={politique.data ? `${politique.data.taux_penalite_pct} % · plafond ${politique.data.plafond_penalite_pct} %` : 'Voir Configuration'}
          tone={politique.data?.active ? 'danger' : 'neutral'}
          onClick={() => setTab('configuration')} />
        
        <StatTile label="Grilles de frais" value={(grilles.data ?? []).length} hint={`sur ${(ref.niveaux.data ?? []).length} niveau(x)`} tone="accent" />
        <StatTile label="Dépenses" value={formatFcfa(totalDepenses)} hint={`${(depenses.data ?? []).length} opération(s)`} tone="neutral" />
        <StatTile label="Achats à approuver" value={achatsATraiter.length} hint={`${(achats.data ?? []).length} demande(s)`} tone="warning" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'paiements', label: 'Encaissements' },
        { id: 'grilles', label: 'Grilles de frais', count: (grilles.data ?? []).length },
        { id: 'depenses', label: 'Dépenses', count: (depenses.data ?? []).length },
        { id: 'achats', label: 'Demandes d’achat', count: achatsATraiter.length },
        { id: 'configuration', label: 'Configuration' }]
        } />
      

      <div className="mt-3 space-y-3">
        {tab === 'paiements' &&
        <>
            <Toolbar>
              <ComboboxField
              className="w-72"
              label="Élève"
              value={eleveId}
              onChange={setEleveId}
              loading={eleves.loading}
              placeholder="Rechercher un élève…"
              options={optionsEleves} />
            
              <Divider />
              <Button size="sm" icon={<ReceiptIcon size={12} />} onClick={() => ouvrirPaiement('simple')}>
                Paiement
              </Button>
              <Button size="sm" icon={<WalletIcon size={12} />} onClick={() => ouvrirPaiement('credit')}>
                Paiement avec avance
              </Button>
            </Toolbar>

            {recu &&
          <div className="flex flex-wrap items-center gap-3 rounded-win border border-state-successFg/30 bg-win-surface px-3 py-2 shadow-win" role="status">
                <ReceiptIcon size={14} className="text-state-successFg" />
                <span className="text-xs text-win-text">
                  Reçu <span className="font-mono font-semibold">{recu.recu_numero}</span> · {recu.eleve}
                </span>
                <span className="text-2xs text-win-muted">
                  Affecté {formatFcfa(recu.montant_affecte)}
                  {recu.excedent_credite ? ` · ${formatFcfa(recu.excedent_credite)} placé en avance` : ''}
                  {recu.excedent_non_affecte ? ` · ${formatFcfa(recu.excedent_non_affecte)} non affecté` : ''}
                </span>
                <span className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={() => setRecu(null)}>
                    Fermer
                  </Button>
                </span>
              </div>
          }

            {!eleveId ?
          <Panel title="Situation d’un élève">
                <p className="text-xs text-win-muted">Choisissez un élève pour afficher sa situation, son échéancier et ses avances.</p>
              </Panel> :

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Panel title="Situation financière" subtitle={nomEleveDe(eleveId)}>
                  {situation.loading && <LoadingState />}
                  {situation.error && <ErrorState message={situation.error} onRetry={situation.reload} />}
                  {situation.data &&
              <>
                      <p className="text-2xs text-win-muted">Reste à payer</p>
                      <p className={`text-2xl font-semibold tabular-nums ${situation.data.solde_restant_fcfa > 0 ? 'text-state-dangerFg' : 'text-state-successFg'}`}>
                        {formatFcfa(situation.data.solde_restant_fcfa)}
                      </p>
                      <dl className="mt-2">
                        <FieldRow label="Total dû">{formatFcfa(situation.data.total_du_fcfa)}</FieldRow>
                        <FieldRow label="Total payé">{formatFcfa(situation.data.total_paye_fcfa)}</FieldRow>
                        <FieldRow label="Pénalités">{formatFcfa(situation.data.total_penalites_fcfa)}</FieldRow>
                        <FieldRow label="Avance disponible">{formatFcfa(situation.data.solde_credit_fcfa)}</FieldRow>
                      </dl>
                    </>
              }
                </Panel>

                <div className="space-y-3">
                  <Panel title="Échéancier" bodyClassName="">
                    <ul className="divide-y divide-win-border">
                      {(situation.data?.echeances ?? []).map((e, i) =>
                  <li key={`${e.libelle}-${i}`} className="flex items-center gap-2 px-3 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-win-text">{e.libelle}</span>
                            <span className="block text-2xs text-win-muted">Échéance {formatDate(e.date_echeance)}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-win-text">
                            {formatFcfa(e.montant_paye_fcfa)} / {formatFcfa(e.montant_du_fcfa)}
                          </span>
                          <StatusBadge value={e.statut} />
                        </li>
                  )}
                      {!situation.loading && (situation.data?.echeances ?? []).length === 0 &&
                  <li className="px-3 py-4 text-2xs text-win-muted">Aucune échéance.</li>
                  }
                    </ul>
                  </Panel>
                  <Panel title="Mouvements d’avance" bodyClassName="">
                    {credits.loading && <LoadingState />}
                    <ul className="divide-y divide-win-border">
                      {(credits.data ?? []).map((m) =>
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="min-w-0">
                            <StatusBadge value={m.type_mouvement} label={humanize(m.type_mouvement)} />
                            {m.note && <span className="ml-2 text-2xs text-win-muted">{m.note}</span>}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-win-text">
                            {formatFcfa(m.montant_fcfa)} · solde {formatFcfa(m.solde_apres_fcfa)}
                          </span>
                        </li>
                  )}
                      {!credits.loading && (credits.data ?? []).length === 0 &&
                  <li className="px-3 py-4 text-2xs text-win-muted">Aucun mouvement d’avance.</li>
                  }
                    </ul>
                  </Panel>
                </div>
              </div>
          }
          </>
        }

        {tab === 'grilles' &&
        <>
            <Toolbar>
              <Badge tone="neutral">{ref.anneeLibelle}</Badge>
              <Divider />
              <Button size="sm" icon={<FileStackIcon size={12} />} onClick={() => setFormGrille(true)} disabled={!anneeId}>
                Nouvelle grille
              </Button>
            </Toolbar>
            {grilles.loading && <LoadingState />}
            {grilles.error && <ErrorState message={grilles.error} onRetry={grilles.reload} />}
            <DataTable
            columns={colonnesGrilles}
            rows={grilles.data ?? []}
            rowKey={(g) => g.id}
            onRowClick={(g) => setGrilleOuverte(g)}
            emptyLabel="Aucune grille de frais pour cette année." />
          
          </>
        }

        {tab === 'depenses' &&
        <>
            <Toolbar>
              <Button size="sm" icon={<PlusIcon size={12} />} onClick={() => setFormDepense(true)}>
                Nouvelle dépense
              </Button>
              <Button size="sm" variant="ghost" icon={<FolderPlusIcon size={12} />} onClick={() => setFormCategorie(true)}>
                Nouvelle catégorie
              </Button>
            </Toolbar>
            {depenses.loading && <LoadingState />}
            {depenses.error && <ErrorState message={depenses.error} onRetry={depenses.reload} />}
            <DataTable
            columns={colonnesDepenses}
            rows={depenses.data ?? []}
            rowKey={(d) => d.id}
            onRowClick={(d) => setDetail({ titre: str(d.libelle as string), record: d })}
            emptyLabel="Aucune dépense enregistrée." />
          
          </>
        }

        {tab === 'achats' &&
        <>
            <Toolbar>
              <Button size="sm" icon={<ShoppingCartIcon size={12} />} onClick={() => setFormAchat(true)}>
                Nouvelle demande
              </Button>
            </Toolbar>
            {achats.loading && <LoadingState />}
            {achats.error && <ErrorState message={achats.error} onRetry={achats.reload} />}
            {approbation.error && <p className="text-2xs text-state-dangerFg">{approbation.error}</p>}
            <DataTable
            columns={colonnesAchats}
            rows={achats.data ?? []}
            rowKey={(a) => a.id}
            onRowClick={(a) => setDetail({ titre: str(a.libelle as string), record: a })}
            emptyLabel="Aucune demande d’achat." />
          
          </>
        }

        {tab === 'configuration' && <ConfigFinancePanel />}
      </div>

      <GrilleDetailDrawer
        grille={grilleOuverte}
        titre={grilleOuverte ? ref.niveauAvecCycle(grilleOuverte.niveau_id) : ''}
        onClose={() => setGrilleOuverte(null)} />
      

      <InfoDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.titre ?? ''}
        fields={champsLisibles(detail?.record).map((c) => ({
          label: c.label,
          value: /fcfa/i.test(c.cle) ? formatFcfa(Number(detail?.record[c.cle] ?? 0)) : c.valeur
        }))} />
      

      <FormDrawer
        open={!!formPaiement}
        onClose={() => setFormPaiement(null)}
        title={formPaiement === 'credit' ? 'Paiement avec avance' : 'Encaisser un paiement'}
        subtitle={
        formPaiement === 'credit' ?
        'L’excédent éventuel est placé en avance sur le compte de l’élève' :
        'Le montant est affecté aux échéances les plus anciennes'
        }
        submitting={paiement.submitting}
        error={paiement.error}
        submitLabel="Encaisser"
        onSubmit={() => {
          if (!paiementData.eleve_id) return paiement.setError('Choisissez un élève.');
          const montant = Number(paiementData.montant_fcfa);
          if (!montant || montant <= 0) return paiement.setError('Le montant doit être positif.');
          const body = {
            eleve_id: paiementData.eleve_id,
            montant_fcfa: montant,
            mode_paiement: paiementData.mode_paiement,
            date_paiement: paiementData.date_paiement
          };
          paiement.run(
            async () => {
              const r = formPaiement === 'credit' ? await ecolePaiementAvecCredit(body) : await ecoleEnregistrerPaiement(body);
              setRecu({ ...r, eleve: nomEleveDe(body.eleve_id) });
            },
            () => {
              setFormPaiement(null);
              setEleveId(body.eleve_id);
              situation.reload();
              credits.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Élève"
          required
          value={paiementData.eleve_id}
          onChange={(v) => setPaiementData({ ...paiementData, eleve_id: v })}
          loading={eleves.loading}
          options={optionsEleves} />
        
        {soldeFormulaire !== null &&
        <p className="text-2xs text-win-muted">
            Reste à payer : <span className="font-semibold text-win-text">{formatFcfa(soldeFormulaire)}</span>
          </p>
        }
        <TextField label="Montant (FCFA)" type="number" required value={paiementData.montant_fcfa} onChange={(v) => setPaiementData({ ...paiementData, montant_fcfa: v })} />
        <SelectField label="Mode de paiement" required value={paiementData.mode_paiement} onChange={(v) => setPaiementData({ ...paiementData, mode_paiement: v })} options={MODES} />
        <TextField label="Date du paiement" type="date" required value={paiementData.date_paiement} onChange={(v) => setPaiementData({ ...paiementData, date_paiement: v })} />
      </FormDrawer>

      <FormDrawer
        open={formGrille}
        onClose={() => {
          setFormGrille(false);
          grille.setError(null);
        }}
        title="Nouvelle grille de frais"
        subtitle={ref.anneeLibelle}
        submitting={grille.submitting}
        error={grille.error}
        onSubmit={() => {
          if (!grilleData.niveau_id) return grille.setError('Choisissez un niveau.');
          grille.run(
            () =>
            ecoleCreerGrilleFrais({
              annee_scolaire_id: anneeId,
              niveau_id: grilleData.niveau_id,
              frais_inscription_fcfa: Number(grilleData.frais_inscription_fcfa) || 0,
              frais_scolarite_annuel_fcfa: Number(grilleData.frais_scolarite_annuel_fcfa) || 0,
              nb_tranches_paiement: Number(grilleData.nb_tranches_paiement) || 1,
              frais_cantine_mensuel_fcfa: grilleData.frais_cantine_mensuel_fcfa ? Number(grilleData.frais_cantine_mensuel_fcfa) : null
            }),
            () => {
              setFormGrille(false);
              setGrilleData({ niveau_id: '', frais_inscription_fcfa: '', frais_scolarite_annuel_fcfa: '', nb_tranches_paiement: '3', frais_cantine_mensuel_fcfa: '' });
              grilles.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Niveau"
          required
          value={grilleData.niveau_id}
          onChange={(v) => setGrilleData({ ...grilleData, niveau_id: v })}
          loading={ref.niveaux.loading}
          emptyLabel="Tous les niveaux ont déjà une grille."
          options={ref.niveauOptions.filter((o) => !niveauxAvecGrille.has(o.value))} />
        
        <TextField label="Frais d’inscription (FCFA)" type="number" required value={grilleData.frais_inscription_fcfa} onChange={(v) => setGrilleData({ ...grilleData, frais_inscription_fcfa: v })} />
        <TextField label="Scolarité annuelle (FCFA)" type="number" required value={grilleData.frais_scolarite_annuel_fcfa} onChange={(v) => setGrilleData({ ...grilleData, frais_scolarite_annuel_fcfa: v })} />
        <TextField label="Nombre de tranches" type="number" required value={grilleData.nb_tranches_paiement} onChange={(v) => setGrilleData({ ...grilleData, nb_tranches_paiement: v })} />
        <TextField label="Cantine mensuelle (FCFA)" type="number" value={grilleData.frais_cantine_mensuel_fcfa} onChange={(v) => setGrilleData({ ...grilleData, frais_cantine_mensuel_fcfa: v })} hint="Laisser vide si pas de cantine" />
      </FormDrawer>

      <FormDrawer
        open={formDepense}
        onClose={() => {
          setFormDepense(false);
          depense.setError(null);
        }}
        title="Nouvelle dépense"
        submitting={depense.submitting}
        error={depense.error}
        onSubmit={() => {
          if (!depenseData.libelle.trim()) return depense.setError('Le libellé est obligatoire.');
          if (!Number(depenseData.montant_fcfa)) return depense.setError('Le montant est obligatoire.');
          const cat = categoriesAplaties.find((c) => c.id === depenseData.categorie_id);
          depense.run(
            () =>
            ecoleCreerDepense({
              libelle: depenseData.libelle.trim(),
              montant_fcfa: Number(depenseData.montant_fcfa),
              categorie: cat ? cat.libelle : null,
              date_depense: depenseData.date_depense
            }),
            () => {
              setFormDepense(false);
              setDepenseData({ libelle: '', montant_fcfa: '', categorie_id: '', date_depense: aujourdHui() });
              depenses.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={depenseData.libelle} onChange={(v) => setDepenseData({ ...depenseData, libelle: v })} />
        <TextField label="Montant (FCFA)" type="number" required value={depenseData.montant_fcfa} onChange={(v) => setDepenseData({ ...depenseData, montant_fcfa: v })} />
        <ComboboxField
          label="Catégorie"
          allowEmpty
          placeholder="Sans catégorie"
          value={depenseData.categorie_id}
          onChange={(v) => setDepenseData({ ...depenseData, categorie_id: v })}
          loading={categories.loading}
          options={categoriesAplaties.map((c) => ({ value: c.id, label: c.label, hint: c.hint }))} />
        
        <TextField label="Date" type="date" required value={depenseData.date_depense} onChange={(v) => setDepenseData({ ...depenseData, date_depense: v })} />
      </FormDrawer>

      <FormDrawer
        open={formCategorie}
        onClose={() => {
          setFormCategorie(false);
          categorie.setError(null);
        }}
        title="Nouvelle catégorie de dépense"
        submitting={categorie.submitting}
        error={categorie.error}
        onSubmit={() => {
          if (!categorieData.code.trim() || !categorieData.libelle.trim()) return categorie.setError('Code et libellé sont obligatoires.');
          categorie.run(
            () =>
            ecoleCreerCategorieDepense({
              code: categorieData.code.trim(),
              libelle: categorieData.libelle.trim(),
              parent_id: categorieData.parent_id || null,
              compte_comptable_ohada: categorieData.compte_comptable_ohada.trim() || null
            }),
            () => {
              setFormCategorie(false);
              setCategorieData({ code: '', libelle: '', parent_id: '', compte_comptable_ohada: '' });
              categories.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={categorieData.libelle} onChange={(v) => setCategorieData({ ...categorieData, libelle: v })} />
        <TextField label="Code" required value={categorieData.code} onChange={(v) => setCategorieData({ ...categorieData, code: v })} />
        <ComboboxField
          label="Catégorie parente"
          allowEmpty
          placeholder="Aucune (catégorie principale)"
          value={categorieData.parent_id}
          onChange={(v) => setCategorieData({ ...categorieData, parent_id: v })}
          options={categoriesAplaties.map((c) => ({ value: c.id, label: c.label, hint: c.hint }))} />
        
        <TextField label="Compte comptable OHADA" value={categorieData.compte_comptable_ohada} onChange={(v) => setCategorieData({ ...categorieData, compte_comptable_ohada: v })} />
      </FormDrawer>

      <FormDrawer
        open={formAchat}
        onClose={() => {
          setFormAchat(false);
          achat.setError(null);
        }}
        title="Nouvelle demande d’achat"
        submitting={achat.submitting}
        error={achat.error}
        onSubmit={() => {
          if (!achatData.libelle.trim()) return achat.setError('Le libellé est obligatoire.');
          achat.run(
            () =>
            ecoleCreerDemandeAchat({
              libelle: achatData.libelle.trim(),
              montant_estime_fcfa: Number(achatData.montant_estime_fcfa) || 0,
              justification: achatData.justification.trim() || null
            }),
            () => {
              setFormAchat(false);
              setAchatData({ libelle: '', montant_estime_fcfa: '', justification: '' });
              achats.reload();
            }
          );
        }}>
        
        <TextField label="Libellé" required value={achatData.libelle} onChange={(v) => setAchatData({ ...achatData, libelle: v })} />
        <TextField label="Montant estimé (FCFA)" type="number" required value={achatData.montant_estime_fcfa} onChange={(v) => setAchatData({ ...achatData, montant_estime_fcfa: v })} />
        <TextAreaField label="Justification" value={achatData.justification} onChange={(v) => setAchatData({ ...achatData, justification: v })} />
      </FormDrawer>
    </>);

}