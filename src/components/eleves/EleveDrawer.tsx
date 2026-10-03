import React, { useMemo, useState } from 'react';
import {
  CopyIcon,
  DownloadIcon,
  KeyRoundIcon,
  LinkIcon,
  PhoneIcon,
  RefreshCcwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  MinusIcon,
  UsersIcon } from
'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Tabs } from '../ui/Tabs';
import { Badge, StatusBadge } from '../ui/Badge';
import { FormDrawer } from '../ui/FormDrawer';
import { ComboboxField } from '../ui/ComboboxField';
import { Button, FieldRow, Panel, ProgressBar, LoadingState, ErrorState, Select } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useApp } from '../../contexts/AppContext';
import { formatDate, formatFcfa, humanize, initiales, str } from '../../utils/format';
import { champsLisibles, nomEleve } from '../../utils/labels';
import {
  ecoleAbonnementsCantineEleve,
  ecoleContactUrgence,
  ecoleGenererCodeAcces,
  ecoleGetCodeAcces,
  ecoleGetEleve,
  ecoleGetProtocole,
  ecoleJournalNotifications,
  ecoleLierEnfantAuParent,
  ecoleListerEmprunts,
  ecoleListerOuvrages,
  ecoleListerParents,
  ecoleListerSignatures,
  ecoleListerVisites,
  ecoleLivretAnnuel,
  ecoleMouvementsCredit,
  ecoleSanctionsEleve,
  ecoleSituationComplete } from
'../../lib/api_ecole';
import type { Eleve } from '../../lib/api_ecole';
import {
  downloadBlob,
  ecoleCartesTemplates,
  ecoleParcoursCompletV2,
  ecolePhotosEleve,
  ecoleRecalculerParcoursEleve,
  ecoleTelechargerCartePDF } from
'../../lib/api_ecole_extended';
import type { CarteTemplate } from '../../lib/api_ecole_extended';
import { CreerCompteParentDrawer } from '../CreerCompteParentDrawer';

const TENDANCE_ICONE = {
  hausse: <TrendingUpIcon size={12} className="text-state-successFg" />,
  baisse: <TrendingDownIcon size={12} className="text-state-dangerFg" />,
  stable: <MinusIcon size={12} className="text-win-faint" />
};

export function EleveDrawer({
  eleve,
  eleveId,
  onClose




}: {eleve?: Eleve | null;eleveId: string | null;onClose: () => void;}) {
  const [tab, setTab] = useState('identite');
  const { anneeId } = useApp();
  const id = eleveId ?? '';
  const open = !!eleveId;

  const fiche = useResource(() => ecoleGetEleve(id), [id], open && !eleve);
  const e: Eleve | null = eleve ?? fiche.data ?? null;

  const situation = useResource(() => ecoleSituationComplete(id), [id], open);
  const codeAcces = useResource(() => ecoleGetCodeAcces(id), [id], open);
  const notifications = useResource(() => ecoleJournalNotifications(id), [id], open && tab === 'identite');
  const templates = useResource(() => ecoleCartesTemplates(), [], open && tab === 'identite');
  const parcours = useResource(() => ecoleParcoursCompletV2(id), [id], open && tab === 'scolarite');
  const livret = useResource(() => ecoleLivretAnnuel(id, anneeId), [id, anneeId], open && tab === 'scolarite' && !!anneeId);
  const credits = useResource(() => ecoleMouvementsCredit(id), [id], open && tab === 'finances');
  const protocole = useResource(() => ecoleGetProtocole(id), [id], open && tab === 'sante');
  const visites = useResource(() => ecoleListerVisites(id), [id], open && tab === 'sante');
  const contact = useResource(() => ecoleContactUrgence(id), [id], open && tab === 'sante');
  const cantine = useResource(() => ecoleAbonnementsCantineEleve(id), [id], open && tab === 'services');
  const emprunts = useResource(() => ecoleListerEmprunts({ eleve_id: id }), [id], open && tab === 'services');
  const ouvrages = useResource(() => ecoleListerOuvrages(), [], open && tab === 'services');
  const sanctions = useResource(() => ecoleSanctionsEleve(id), [id], open && tab === 'vie');
  const signatures = useResource(() => ecoleListerSignatures({ eleve_id: id }), [id], open && tab === 'vie');
  const photos = useResource(() => ecolePhotosEleve(id), [id], open && tab === 'photos');

  const [creerParent, setCreerParent] = useState(false);
  const [lierParent, setLierParent] = useState(false);
  const [parentId, setParentId] = useState('');
  const parents = useResource(() => ecoleListerParents(), [], lierParent);
  const liaison = useSubmit();
  const carte = useSubmit();
  const recalcul = useSubmit();
  const generation = useSubmit();
  const [template, setTemplate] = useState<string>('');
  const [copie, setCopie] = useState(false);

  const titresOuvrages = useMemo(
    () => new Map((ouvrages.data ?? []).map((o) => [o.id, o.titre])),
    [ouvrages.data]
  );

  if (!eleveId) return null;

  const solde = situation.data?.solde_restant_fcfa ?? 0;
  const code = codeAcces.data?.code ? String(codeAcces.data.code) : '';

  function genererCode() {
    generation.run(() => ecoleGenererCodeAcces(id), () => codeAcces.reload());
  }

  function copierCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1500);
    });
  }

  function telechargerCarte() {
    carte.run(async () => {
      const blob = await ecoleTelechargerCartePDF(id, (template || undefined) as CarteTemplate | undefined);
      downloadBlob(blob, `carte-scolaire-${e?.matricule ?? 'eleve'}.pdf`);
    });
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={e ? nomEleve(e) : 'Dossier élève'}
        subtitle={e?.matricule ? `Matricule ${e.matricule}` : undefined}
        width="w-[660px]"
        footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xs text-win-muted">
              Code parent : <span className="font-mono font-semibold text-win-text">{code || 'non généré'}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<CopyIcon size={12} />} disabled={!code} onClick={copierCode}>
                {copie ? 'Copié' : 'Copier'}
              </Button>
              <Button size="sm" icon={<KeyRoundIcon size={12} />} onClick={genererCode} disabled={generation.submitting}>
                {code ? 'Nouveau code' : 'Générer un code'}
              </Button>
              <Button size="sm" icon={<LinkIcon size={12} />} onClick={() => setLierParent(true)}>
                Lier à un parent
              </Button>
              <Button size="sm" variant="primary" icon={<UsersIcon size={12} />} onClick={() => setCreerParent(true)}>
                Créer un compte parent
              </Button>
            </div>
          </div>
        }>
        
        <div className="mb-3 flex items-start gap-3 rounded-win border border-win-border bg-win-surface p-3 shadow-win">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-win bg-win-accentSoft text-base font-semibold text-win-accent">
            {initiales(e?.nom, e?.prenom)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {e?.statut && <StatusBadge value={String(e.statut)} />}
              {e?.allergies && <Badge tone="warning">Allergies : {String(e.allergies)}</Badge>}
              {solde > 0 && <Badge tone="danger">{formatFcfa(solde)} restant dû</Badge>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-2xs">
              <div>
                <span className="block text-win-muted">Total dû</span>
                <span className="text-sm font-semibold text-win-text">{formatFcfa(situation.data?.total_du_fcfa ?? 0)}</span>
              </div>
              <div>
                <span className="block text-win-muted">Total encaissé</span>
                <span className="text-sm font-semibold text-win-text">{formatFcfa(situation.data?.total_paye_fcfa ?? 0)}</span>
              </div>
              <div>
                <span className="block text-win-muted">Solde à régler</span>
                <span className={`text-sm font-semibold ${solde > 0 ? 'text-state-dangerFg' : 'text-state-successFg'}`}>
                  {formatFcfa(solde)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={tab}
          onChange={setTab}
          items={[
          { id: 'identite', label: 'Identité' },
          { id: 'scolarite', label: 'Parcours' },
          { id: 'finances', label: 'Finances', count: situation.data?.echeances.length },
          { id: 'sante', label: 'Santé' },
          { id: 'services', label: 'Services' },
          { id: 'vie', label: 'Vie scolaire' },
          { id: 'photos', label: 'Photos' }]
          } />
        

        <div className="mt-3 space-y-3">
          {tab === 'identite' &&
          <>
              <Panel title="État civil">
                {fiche.loading && <LoadingState />}
                <dl>
                  <FieldRow label="Matricule">{str(e?.matricule)}</FieldRow>
                  <FieldRow label="Date de naissance">{formatDate(e?.date_naissance as string)}</FieldRow>
                  <FieldRow label="Sexe">{e?.sexe === 'M' ? 'Masculin' : e?.sexe === 'F' ? 'Féminin' : str(e?.sexe)}</FieldRow>
                  <FieldRow label="Entrée dans l’établissement">{formatDate(e?.date_entree_etablissement as string)}</FieldRow>
                  <FieldRow label="Établissement de provenance">{str(e?.etablissement_provenance)}</FieldRow>
                  <FieldRow label="Allergies déclarées">{str(e?.allergies)}</FieldRow>
                </dl>
              </Panel>

              <Panel title="Accès portail parent">
                <dl>
                  <FieldRow label="Code d’appairage">
                    <span className="font-mono">{code || 'Aucun code généré'}</span>
                  </FieldRow>
                  <FieldRow label="État">
                    {codeAcces.data ?
                  <Badge tone={codeAcces.data.actif ? 'success' : 'neutral'}>{codeAcces.data.actif ? 'Actif' : 'Inactif'}</Badge> :

                  '—'
                  }
                  </FieldRow>
                  <FieldRow label="Utilisations">{codeAcces.data ? codeAcces.data.nb_utilisations : '—'}</FieldRow>
                </dl>
              </Panel>

              <Panel title="Carte scolaire" subtitle="PDF recto-verso généré par le serveur">
                <div className="flex flex-wrap items-end gap-2">
                  <Select
                  label="Modèle"
                  value={template}
                  onChange={setTemplate}
                  options={[
                  { value: '', label: templates.loading ? 'Chargement…' : 'Modèle par défaut' },
                  ...(templates.data?.templates ?? []).map((t) => ({ value: t.id, label: `${t.id} — ${t.desc}` }))]
                  } />
                
                  <Button size="sm" variant="primary" icon={<DownloadIcon size={12} />} onClick={telechargerCarte} disabled={carte.submitting}>
                    {carte.submitting ? 'Génération…' : 'Télécharger la carte'}
                  </Button>
                </div>
                {carte.error && <p className="mt-2 text-2xs text-state-dangerFg">{carte.error}</p>}
              </Panel>

              <Panel title="Notifications envoyées à la famille" bodyClassName="">
                {notifications.loading && <LoadingState />}
                {notifications.error && <ErrorState message={notifications.error} onRetry={notifications.reload} />}
                <ul className="divide-y divide-win-border">
                  {(notifications.data ?? []).map((n) =>
                <li key={n.id} className="flex items-start gap-2 px-3 py-2">
                      <StatusBadge value={n.statut_envoi} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-2xs font-medium text-win-text">
                          {humanize(n.type_notification)} · {humanize(n.canal)}
                        </span>
                        <span className="block text-2xs text-win-muted">{n.contenu}</span>
                      </span>
                      <span className="shrink-0 text-2xs text-win-faint">{formatDate(n.created_at)}</span>
                    </li>
                )}
                  {!notifications.loading && (notifications.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucune notification envoyée.</li>
                }
                </ul>
              </Panel>
            </>
          }

          {tab === 'scolarite' &&
          <>
              <Panel
              title="Parcours scolaire"
              subtitle={parcours.data ? `${parcours.data.nb_annees} année(s) dans l’établissement` : undefined}
              action={
              <Button
                size="sm"
                icon={<RefreshCcwIcon size={12} />}
                disabled={recalcul.submitting}
                onClick={() => recalcul.run(() => ecoleRecalculerParcoursEleve(id), () => parcours.reload())}>
                
                    Recalculer
                  </Button>
              }
              bodyClassName="">
              
                {parcours.loading && <LoadingState />}
                {parcours.error && <ErrorState message={parcours.error} onRetry={parcours.reload} />}
                <ul className="divide-y divide-win-border">
                  {(parcours.data?.annees ?? []).map((a) =>
                <li key={a.annee_scolaire_id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-win-text">
                          {a.classe_libelle}
                          <span className="ml-1.5 font-normal text-win-muted">
                            {a.cycle} · {a.niveau}
                            {a.serie ? ` · Série ${a.serie}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          {a.mention && <Badge tone="accent">{a.mention}</Badge>}
                          {a.decision_conseil && <StatusBadge value={a.decision_conseil} label={humanize(a.decision_conseil)} />}
                        </span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-2 text-2xs sm:grid-cols-4">
                        <span>
                          <span className="block text-win-muted">Moyenne annuelle</span>
                          <span className="text-sm font-semibold tabular-nums text-win-text">
                            {a.moyenne_annuelle ?? '—'}
                          </span>
                        </span>
                        <span>
                          <span className="block text-win-muted">Rang</span>
                          <span className="text-sm font-semibold tabular-nums text-win-text">
                            {a.rang_annuel ? `${a.rang_annuel} / ${a.effectif_classe}` : '—'}
                          </span>
                        </span>
                        <span>
                          <span className="block text-win-muted">Camarades</span>
                          <span className="text-sm font-semibold tabular-nums text-win-text">{a.nb_camarades}</span>
                        </span>
                        <span>
                          <span className="block text-win-muted">Solde de l’année</span>
                          <span className={`text-sm font-semibold tabular-nums ${a.finance.solde_fcfa > 0 ? 'text-state-dangerFg' : 'text-state-successFg'}`}>
                            {formatFcfa(a.finance.solde_fcfa)}
                          </span>
                        </span>
                      </div>
                      {a.bulletins.length > 0 &&
                  <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.bulletins.map((b) =>
                    <span key={b.periode_id} className="rounded-win border border-win-border bg-win-panel px-2 py-0.5 text-2xs text-win-muted">
                              {b.periode} : <span className="font-semibold text-win-text">{b.moyenne ?? '—'}</span>
                              {b.rang ? ` · ${b.rang}/${b.effectif ?? '—'}` : ''}
                            </span>
                    )}
                        </div>
                  }
                    </li>
                )}
                  {!parcours.loading && (parcours.data?.annees ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucune année de scolarité enregistrée.</li>
                }
                </ul>
              </Panel>

              {parcours.data && Object.keys(parcours.data.progression_par_matiere).length > 0 &&
            <Panel title="Progression par matière" bodyClassName="">
                  <ul className="divide-y divide-win-border">
                    {Object.entries(parcours.data.progression_par_matiere).map(([matiere, p]) =>
                <li key={matiere} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-xs text-win-text">{matiere}</span>
                        <span className="flex items-center gap-2 text-2xs tabular-nums text-win-muted">
                          {p.moyennes_par_annee.map((m) => m === null ? '—' : m).join(' → ')}
                          {TENDANCE_ICONE[p.tendance]}
                        </span>
                      </li>
                )}
                  </ul>
                </Panel>
            }

              {parcours.data && parcours.data.enseignants_historique.length > 0 &&
            <Panel title="Enseignants rencontrés" bodyClassName="">
                  <ul className="divide-y divide-win-border">
                    {parcours.data.enseignants_historique.map((en) =>
                <li key={en.employe_id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-win-text">{en.nom_complet}</span>
                          <span className="block truncate text-2xs text-win-muted">{en.matieres_enseignees.join(', ')}</span>
                        </span>
                        <span className="shrink-0 text-2xs text-win-muted">{en.nb_annees_contact} an(s)</span>
                      </li>
                )}
                  </ul>
                </Panel>
            }

              <Panel title="Livret de l’année en cours" bodyClassName="">
                {!anneeId && <p className="px-3 py-4 text-2xs text-win-muted">Aucune année scolaire sélectionnée.</p>}
                {livret.loading && <LoadingState />}
                {livret.error && <ErrorState message={livret.error} onRetry={livret.reload} />}
                {livret.data &&
              <dl className="px-3 py-1">
                    {champsLisibles(livret.data).map((c) =>
                <FieldRow key={c.cle} label={c.label}>
                        {c.valeur}
                      </FieldRow>
                )}
                  </dl>
              }
              </Panel>
            </>
          }

          {tab === 'finances' &&
          <>
              <Panel title="Situation financière">
                {situation.loading && <LoadingState />}
                {situation.error && <ErrorState message={situation.error} onRetry={situation.reload} />}
                {situation.data &&
              <>
                    <dl>
                      <FieldRow label="Total dû">{formatFcfa(situation.data.total_du_fcfa)}</FieldRow>
                      <FieldRow label="Total encaissé">{formatFcfa(situation.data.total_paye_fcfa)}</FieldRow>
                      <FieldRow label="Pénalités de retard">{formatFcfa(situation.data.total_penalites_fcfa)}</FieldRow>
                      <FieldRow label="Avance disponible">{formatFcfa(situation.data.solde_credit_fcfa)}</FieldRow>
                      <FieldRow label="Reste à payer">
                        <span className={solde > 0 ? 'text-state-dangerFg' : 'text-state-successFg'}>{formatFcfa(solde)}</span>
                      </FieldRow>
                    </dl>
                    <p className="mb-1 mt-3 text-2xs text-win-muted">Part du dû déjà réglée</p>
                    <ProgressBar
                  value={situation.data.total_du_fcfa ? situation.data.total_paye_fcfa / situation.data.total_du_fcfa * 100 : 0}
                  tone={solde > 0 ? 'warning' : 'success'} />
                
                  </>
              }
              </Panel>

              <Panel title="Échéancier" bodyClassName="">
                <ul className="divide-y divide-win-border">
                  {(situation.data?.echeances ?? []).map((l, i) =>
                <li key={`${l.libelle}-${i}`} className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-win-text">{l.libelle}</span>
                        <span className="block text-2xs text-win-muted">Échéance {formatDate(l.date_echeance)}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-win-text">
                        {formatFcfa(l.montant_paye_fcfa)} / {formatFcfa(l.montant_du_fcfa)}
                      </span>
                      <StatusBadge value={l.statut} />
                    </li>
                )}
                  {(situation.data?.echeances ?? []).length === 0 &&
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
            </>
          }

          {tab === 'sante' &&
          <>
              {protocole.data &&
            <Panel title="Protocole d’urgence" subtitle={String(protocole.data.condition)} className="border-state-dangerFg/40">
                  <p className="text-xs text-win-text">{String(protocole.data.protocole_texte)}</p>
                  <dl className="mt-2">
                    <FieldRow label="Médicament">{str(protocole.data.medicament_urgence)}</FieldRow>
                    <FieldRow label="Localisation">{str(protocole.data.localisation_medicament)}</FieldRow>
                  </dl>
                </Panel>
            }

              <Panel title="Contacts d’urgence" bodyClassName="">
                {contact.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(contact.data?.contacts_urgence ?? []).map((c, i) =>
                <li key={`${c.nom}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-win-text">{c.nom}</span>
                        <span className="block text-2xs text-win-muted">{humanize(c.lien)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {c.telephone ?
                    <a href={`tel:${c.telephone}`} className="inline-flex items-center gap-1 text-2xs text-win-accent">
                            <PhoneIcon size={11} />
                            {c.telephone}
                          </a> :

                    <span className="text-2xs text-win-faint">Pas de téléphone</span>
                    }
                        {c.principal && <Badge tone="accent">Principal</Badge>}
                      </span>
                    </li>
                )}
                  {!contact.loading && (contact.data?.contacts_urgence ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucun contact d’urgence enregistré.</li>
                }
                </ul>
              </Panel>

              <Panel title="Passages à l’infirmerie" bodyClassName="">
                {visites.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(visites.data ?? []).map((v) =>
                <li key={v.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-win-text">{v.motif}</span>
                        <span className="text-2xs text-win-faint">{formatDate(v.date_visite)}</span>
                      </div>
                      {v.soin_administre ? <p className="text-2xs text-win-muted">{String(v.soin_administre)}</p> : null}
                    </li>
                )}
                  {!visites.loading && (visites.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucun passage enregistré.</li>
                }
                </ul>
              </Panel>
            </>
          }

          {tab === 'services' &&
          <>
              <Panel title="Cantine" bodyClassName="">
                {cantine.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(cantine.data ?? []).map((a, i) =>
                <li key={String((a as Record<string, unknown>).id ?? i)} className="px-3 py-2">
                      <dl>
                        {champsLisibles(a as Record<string, unknown>).map((c) =>
                    <FieldRow key={c.cle} label={c.label}>
                            {c.valeur}
                          </FieldRow>
                    )}
                      </dl>
                    </li>
                )}
                  {!cantine.loading && (cantine.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucun abonnement cantine.</li>
                }
                </ul>
              </Panel>

              <Panel title="Emprunts bibliothèque" bodyClassName="">
                {emprunts.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(emprunts.data ?? []).map((em) =>
                <li key={em.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-win-text">
                          {titresOuvrages.get(em.ouvrage_id) ?? 'Ouvrage retiré du catalogue'}
                        </span>
                        <span className="block text-2xs text-win-muted">
                          Emprunté le {formatDate(em.date_emprunt)} · retour prévu le {formatDate(em.date_retour_prevue)}
                        </span>
                      </span>
                      <StatusBadge value={em.statut} />
                    </li>
                )}
                  {!emprunts.loading && (emprunts.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucun emprunt.</li>
                }
                </ul>
              </Panel>
            </>
          }

          {tab === 'vie' &&
          <>
              <Panel title="Sanctions disciplinaires" bodyClassName="">
                {sanctions.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(sanctions.data ?? []).map((s) =>
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-win-text">{s.motif}</span>
                        <span className="block text-2xs text-win-muted">{formatDate(s.date_sanction)}</span>
                      </span>
                      <StatusBadge value={s.type_sanction} label={humanize(s.type_sanction)} />
                    </li>
                )}
                  {!sanctions.loading && (sanctions.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Dossier disciplinaire vierge.</li>
                }
                </ul>
              </Panel>

              <Panel title="Documents à signer" bodyClassName="">
                {signatures.loading && <LoadingState />}
                <ul className="divide-y divide-win-border">
                  {(signatures.data ?? []).map((s) =>
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-win-text">{str((s as Record<string, unknown>).titre as string)}</span>
                        {(s as Record<string, unknown>).date_limite ?
                    <span className="block text-2xs text-win-muted">
                            Avant le {formatDate(String((s as Record<string, unknown>).date_limite))}
                          </span> :
                    null}
                      </span>
                      <Badge tone={s.signe ? 'success' : 'warning'}>{s.signe ? 'Signé' : 'En attente'}</Badge>
                    </li>
                )}
                  {!signatures.loading && (signatures.data ?? []).length === 0 &&
                <li className="px-3 py-4 text-2xs text-win-muted">Aucun document.</li>
                }
                </ul>
              </Panel>
            </>
          }

          {tab === 'photos' &&
          <Panel title="Photos de classe" subtitle="Photos où l’élève apparaît">
              {photos.loading && <LoadingState />}
              {photos.error && <ErrorState message={photos.error} onRetry={photos.reload} />}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(photos.data ?? []).map((p) =>
              <a
                key={p.id}
                href={p.url_originale ?? p.url_photo}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-win border border-win-border bg-win-panel">
                
                    <img
                  src={p.url_thumbnail ?? p.url_photo}
                  alt={p.titre}
                  className="aspect-[4/3] w-full object-cover transition-opacity duration-150 ease-out group-hover:opacity-90" />
                
                    <span className="block truncate px-2 py-1 text-2xs font-medium text-win-text">{p.titre}</span>
                    <span className="block truncate px-2 pb-1.5 text-2xs text-win-muted">
                      {p.date_prise ? formatDate(p.date_prise) : 'Date inconnue'}
                    </span>
                  </a>
              )}
              </div>
              {!photos.loading && (photos.data ?? []).length === 0 &&
            <p className="text-2xs text-win-muted">Aucune photo pour cet élève.</p>
            }
            </Panel>
          }
        </div>
      </Drawer>

      <FormDrawer
        open={lierParent}
        onClose={() => {
          setLierParent(false);
          liaison.setError(null);
        }}
        title="Lier à un parent"
        subtitle={e ? `Rattacher ${nomEleve(e)} à un compte parent existant` : undefined}
        submitting={liaison.submitting}
        error={liaison.error}
        submitLabel="Lier"
        onSubmit={() => {
          if (!parentId) return liaison.setError('Choisissez un parent.');
          liaison.run(
            async () => {
              // Le code d'appairage est généré automatiquement s'il n'existe pas encore
              const codeLiaison = code || (await ecoleGenererCodeAcces(id)).code;
              await ecoleLierEnfantAuParent(parentId, { code: codeLiaison });
            },
            () => {
              setLierParent(false);
              setParentId('');
              codeAcces.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Parent"
          required
          value={parentId}
          onChange={setParentId}
          loading={parents.loading}
          emptyLabel="Aucun compte parent — créez-en un d’abord."
          options={(parents.data ?? []).map((p) => ({
            value: p.id,
            label: `${p.nom} ${p.prenom}`,
            hint: [p.telephone, p.email].filter(Boolean).join(' · ')
          }))} />
        
      </FormDrawer>

      <CreerCompteParentDrawer open={creerParent} onClose={() => setCreerParent(false)} />
    </>);

}