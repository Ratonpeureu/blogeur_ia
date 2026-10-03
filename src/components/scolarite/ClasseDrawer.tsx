// components/scolarite/ClasseDrawer.tsx
// Fiche complète d'une classe : matières, photos, matériel, statistiques, cartes scolaires.
import React, { useMemo, useState } from 'react';
import { DownloadIcon, ImagePlusIcon, RefreshCcwIcon, Trash2Icon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Tabs } from '../ui/Tabs';
import { Badge, StatusBadge } from '../ui/Badge';
import { Button, CheckboxField, ErrorState, FieldRow, LoadingState, Panel, Select, TextField, TextAreaField } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useApp, periodeLabel } from '../../contexts/AppContext';
import { useEleves } from '../../hooks/useEleves';
import { useEnseignants } from '../../hooks/useEnseignants';
import { aujourdHui, formatDate, formatFcfa, humanize } from '../../utils/format';
import { ecoleListerMatieresClasse } from '../../lib/api_ecole';
import type { Classe, TauxRemplissageClasse } from '../../lib/api_ecole';
import {
  downloadBlob,
  ecoleAjouterPhotoClasse,
  ecoleCartesTemplates,
  ecoleClassementClasses,
  ecoleListerMaterielClasse,
  ecoleListerPhotosClasse,
  ecoleRecalculerStatClasse,
  ecoleSupprimerPhoto,
  ecoleTelechargerPlancheCartesPDF } from
'../../lib/api_ecole_extended';
import type { CarteTemplate } from '../../lib/api_ecole_extended';

const PHOTO_VIDE = {
  titre: '',
  url_photo: '',
  periode_id: '',
  date_prise: aujourdHui(),
  lieu_prise: '',
  photographe: '',
  description: '',
  est_publiee: true
};

export function ClasseDrawer({
  classe,
  niveau,
  serie,
  remplissage,
  onClose






}: {classe: Classe | null;niveau: string;serie: string | null;remplissage?: TauxRemplissageClasse;onClose: () => void;}) {
  const { anneeId, periodes } = useApp();
  const enseignants = useEnseignants();
  const { nom: nomEleveDe } = useEleves(!!classe);
  const [tab, setTab] = useState('matieres');
  const open = !!classe;
  const cid = classe?.id ?? '';

  const matieres = useResource(() => ecoleListerMatieresClasse(cid), [cid], open);
  const photos = useResource(() => ecoleListerPhotosClasse(cid, { annee_scolaire_id: anneeId || undefined }), [cid, anneeId], open && tab === 'photos');
  const materiel = useResource(() => ecoleListerMaterielClasse(cid), [cid], open && tab === 'materiel');
  const stats = useResource(() => ecoleClassementClasses(anneeId), [anneeId], open && tab === 'stats' && !!anneeId);
  const templates = useResource(() => ecoleCartesTemplates(), [], open);

  const recalcul = useSubmit();
  const ajoutPhoto = useSubmit();
  const suppressionPhoto = useSubmit();
  const planche = useSubmit();

  const [photo, setPhoto] = useState(PHOTO_VIDE);
  const [formPhoto, setFormPhoto] = useState(false);
  const [template, setTemplate] = useState('');

  const stat = useMemo(() => (stats.data ?? []).find((s) => s.classe_id === cid) ?? null, [stats.data, cid]);
  const totalCoefficients = (matieres.data ?? []).reduce((acc, m) => acc + m.coefficient, 0);

  if (!classe) return null;

  function telechargerPlanche() {
    planche.run(async () => {
      const blob = await ecoleTelechargerPlancheCartesPDF(cid, (template || undefined) as CarteTemplate | undefined);
      downloadBlob(blob, `cartes-${classe?.libelle ?? 'classe'}.pdf`);
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={classe.libelle}
      subtitle={`${niveau}${serie ? ` · Série ${serie}` : ''}`}
      width="w-[640px]"
      footer={
      <div className="flex flex-wrap items-end justify-end gap-2">
          <Select
          label="Modèle de carte"
          value={template}
          onChange={setTemplate}
          options={[
          { value: '', label: 'Par défaut' },
          ...(templates.data?.templates ?? []).map((t) => ({ value: t.id, label: t.id }))]
          } />
        
          <Button size="sm" variant="primary" icon={<DownloadIcon size={12} />} onClick={telechargerPlanche} disabled={planche.submitting}>
            {planche.submitting ? 'Génération…' : 'Cartes scolaires de la classe'}
          </Button>
          {planche.error && <p className="w-full text-right text-2xs text-state-dangerFg">{planche.error}</p>}
        </div>
      }>
      
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-win border border-win-border bg-win-surface p-3 text-2xs shadow-win">
        <span>
          <span className="block text-win-muted">Effectif</span>
          <span className="text-sm font-semibold tabular-nums text-win-text">
            {remplissage ? `${remplissage.effectif_actuel} / ${remplissage.effectif_max}` : `max ${classe.effectif_max}`}
          </span>
        </span>
        <span>
          <span className="block text-win-muted">Places restantes</span>
          <span className="text-sm font-semibold tabular-nums text-win-text">{remplissage ? remplissage.places_restantes : '—'}</span>
        </span>
        <span>
          <span className="block text-win-muted">Emploi du temps</span>
          <span className="text-sm font-semibold text-win-text">
            {classe.type_organisation_edt_effectif === 'fixe' ? 'Journée fixe' : 'Par matière'}
          </span>
        </span>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
        { id: 'matieres', label: 'Matières', count: (matieres.data ?? []).length },
        { id: 'photos', label: 'Photos' },
        { id: 'materiel', label: 'Matériel' },
        { id: 'stats', label: 'Statistiques' }]
        } />
      

      <div className="mt-3 space-y-3">
        {tab === 'matieres' &&
        <Panel title="Matières enseignées" subtitle={`Total des coefficients : ${totalCoefficients}`} bodyClassName="">
            {matieres.loading && <LoadingState />}
            {matieres.error && <ErrorState message={matieres.error} onRetry={matieres.reload} />}
            <ul className="divide-y divide-win-border">
              {(matieres.data ?? []).map((m) =>
            <li key={m.matiere_classe_id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-win-text">{m.matiere}</span>
                    <span className={`block text-2xs ${m.enseignant_id ? 'text-win-muted' : 'text-state-warnFg'}`}>
                      {enseignants.nom(m.enseignant_id)}
                    </span>
                  </span>
                  <Badge tone="neutral">Coef. {m.coefficient}</Badge>
                </li>
            )}
              {!matieres.loading && (matieres.data ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucune matière affectée.</li>
            }
            </ul>
          </Panel>
        }

        {tab === 'photos' &&
        <Panel
          title="Photos de classe"
          action={
          <Button size="sm" icon={<ImagePlusIcon size={12} />} onClick={() => setFormPhoto((v) => !v)}>
                {formPhoto ? 'Annuler' : 'Ajouter'}
              </Button>
          }>
          
            {formPhoto &&
          <div className="mb-3 space-y-2 rounded-win border border-win-border bg-win-panel p-3">
                <TextField label="Titre" required value={photo.titre} onChange={(v) => setPhoto({ ...photo, titre: v })} />
                <TextField label="Adresse de la photo (URL)" required value={photo.url_photo} onChange={(v) => setPhoto({ ...photo, url_photo: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                label="Période"
                value={photo.periode_id}
                onChange={(v) => setPhoto({ ...photo, periode_id: v })}
                options={[{ value: '', label: 'Toute l’année' }, ...periodes.map((p) => ({ value: p.id, label: periodeLabel(p) }))]} />
              
                  <TextField label="Date de prise" type="date" value={photo.date_prise} onChange={(v) => setPhoto({ ...photo, date_prise: v })} />
                  <TextField label="Lieu" value={photo.lieu_prise} onChange={(v) => setPhoto({ ...photo, lieu_prise: v })} />
                  <TextField label="Photographe" value={photo.photographe} onChange={(v) => setPhoto({ ...photo, photographe: v })} />
                </div>
                <TextAreaField label="Description" value={photo.description} onChange={(v) => setPhoto({ ...photo, description: v })} />
                <div className="flex items-center justify-between gap-2">
                  <CheckboxField label="Visible par les parents" checked={photo.est_publiee} onChange={(v) => setPhoto({ ...photo, est_publiee: v })} />
                  <Button
                size="sm"
                variant="primary"
                disabled={ajoutPhoto.submitting}
                onClick={() => {
                  if (!photo.titre.trim() || !photo.url_photo.trim()) return ajoutPhoto.setError('Titre et adresse de la photo sont obligatoires.');
                  if (!anneeId) return ajoutPhoto.setError('Aucune année scolaire sélectionnée.');
                  ajoutPhoto.run(
                    () =>
                    ecoleAjouterPhotoClasse(cid, {
                      annee_scolaire_id: anneeId,
                      periode_id: photo.periode_id || null,
                      titre: photo.titre.trim(),
                      url_photo: photo.url_photo.trim(),
                      date_prise: photo.date_prise || null,
                      lieu_prise: photo.lieu_prise.trim() || null,
                      photographe: photo.photographe.trim() || null,
                      description: photo.description.trim() || null,
                      est_publiee: photo.est_publiee
                    }),
                    () => {
                      setPhoto(PHOTO_VIDE);
                      setFormPhoto(false);
                      photos.reload();
                    }
                  );
                }}>
                
                    Enregistrer
                  </Button>
                </div>
                {ajoutPhoto.error && <p className="text-2xs text-state-dangerFg">{ajoutPhoto.error}</p>}
              </div>
          }
            {photos.loading && <LoadingState />}
            {photos.error && <ErrorState message={photos.error} onRetry={photos.reload} />}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(photos.data ?? []).map((p) =>
            <figure key={p.id} className="overflow-hidden rounded-win border border-win-border bg-win-panel">
                  <a href={p.url_originale ?? p.url_photo} target="_blank" rel="noreferrer">
                    <img src={p.url_thumbnail ?? p.url_photo} alt={p.titre} className="aspect-[4/3] w-full object-cover" />
                  </a>
                  <figcaption className="flex items-start justify-between gap-1 px-2 py-1.5">
                    <span className="min-w-0">
                      <span className="block truncate text-2xs font-medium text-win-text">{p.titre}</span>
                      <span className="block truncate text-2xs text-win-muted">
                        {p.date_prise ? formatDate(p.date_prise) : 'Date inconnue'}
                        {!p.est_publiee && ' · non publiée'}
                      </span>
                    </span>
                    <button
                  type="button"
                  aria-label={`Supprimer la photo ${p.titre}`}
                  disabled={suppressionPhoto.submitting}
                  onClick={() => {
                    if (window.confirm(`Supprimer la photo « ${p.titre} » ?`))
                    suppressionPhoto.run(() => ecoleSupprimerPhoto(p.id), () => photos.reload());
                  }}
                  className="shrink-0 rounded-win p-1 text-win-faint transition-colors duration-150 ease-out hover:bg-win-sunken hover:text-state-dangerFg">
                  
                      <Trash2Icon size={12} />
                    </button>
                  </figcaption>
                </figure>
            )}
            </div>
            {!photos.loading && (photos.data ?? []).length === 0 && <p className="text-2xs text-win-muted">Aucune photo pour cette année.</p>}
          </Panel>
        }

        {tab === 'materiel' &&
        <Panel title="Matériel de la classe" subtitle="Gestion complète dans Patrimoine › Matériel par classe" bodyClassName="">
            {materiel.loading && <LoadingState />}
            {materiel.error && <ErrorState message={materiel.error} onRetry={materiel.reload} />}
            <ul className="divide-y divide-win-border">
              {(materiel.data ?? []).map((m) =>
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-win-text">{m.designation}</span>
                    <span className="block text-2xs text-win-muted">
                      Quantité {m.quantite}
                      {m.valeur_acquisition_fcfa != null ? ` · ${formatFcfa(m.valeur_acquisition_fcfa)}` : ''}
                    </span>
                  </span>
                  <StatusBadge value={m.etat} label={humanize(m.etat)} />
                </li>
            )}
              {!materiel.loading && (materiel.data ?? []).length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucun matériel affecté.</li>
            }
            </ul>
          </Panel>
        }

        {tab === 'stats' &&
        <Panel
          title="Statistiques de l’année"
          subtitle={stat ? `Calculées le ${formatDate(stat.recalcule_le)}` : 'Pas encore calculées'}
          action={
          <Button
            size="sm"
            icon={<RefreshCcwIcon size={12} />}
            disabled={recalcul.submitting || !anneeId}
            onClick={() => recalcul.run(() => ecoleRecalculerStatClasse(cid, anneeId), () => stats.reload())}>
            
                {recalcul.submitting ? 'Calcul…' : 'Recalculer'}
              </Button>
          }>
          
            {stats.loading && <LoadingState />}
            {recalcul.error && <p className="mb-2 text-2xs text-state-dangerFg">{recalcul.error}</p>}
            {stat ?
          <>
                <div className="grid grid-cols-2 gap-2 text-2xs sm:grid-cols-4">
                  {[
              { l: 'Moyenne de classe', v: stat.moyenne_generale_classe ?? '—' },
              { l: 'Taux de réussite', v: `${stat.taux_reussite_pct} %` },
              { l: 'Absentéisme', v: stat.taux_absenteisme_pct == null ? '—' : `${stat.taux_absenteisme_pct} %` },
              {
                l: 'Évolution vs N-1',
                v: stat.evolution_moyenne_vs_n1 == null ? '—' : `${stat.evolution_moyenne_vs_n1 > 0 ? '+' : ''}${stat.evolution_moyenne_vs_n1}`
              }].
              map((k) =>
              <span key={k.l}>
                      <span className="block text-win-muted">{k.l}</span>
                      <span className="text-sm font-semibold tabular-nums text-win-text">{k.v}</span>
                    </span>
              )}
                </div>
                <dl className="mt-3">
                  <FieldRow label="Effectif début → fin">
                    {stat.effectif_debut} → {stat.effectif_fin}
                  </FieldRow>
                  <FieldRow label="Arrivées / départs">
                    {stat.nb_arrivees} / {stat.nb_departs}
                  </FieldRow>
                  <FieldRow label="Redoublants">{stat.nb_redoublants}</FieldRow>
                  <FieldRow label="Moyenne max / min">
                    {stat.moyenne_max_classe ?? '—'} / {stat.moyenne_min_classe ?? '—'}
                  </FieldRow>
                  <FieldRow label="Médiane · écart-type">
                    {stat.mediane_moyennes ?? '—'} · {stat.ecart_type_moyennes ?? '—'}
                  </FieldRow>
                </dl>
                {stat.top_eleves.length > 0 &&
            <>
                    <p className="mb-1 mt-3 text-2xs font-semibold text-win-text">Meilleurs élèves</p>
                    <ol className="divide-y divide-win-border rounded-win border border-win-border">
                      {stat.top_eleves.map((t) =>
                <li key={t.eleve_id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                          <span className="text-win-text">
                            {t.rang ? `${t.rang}. ` : ''}
                            {nomEleveDe(t.eleve_id)}
                          </span>
                          <span className="tabular-nums text-win-muted">{t.moyenne ?? '—'}</span>
                        </li>
                )}
                    </ol>
                  </>
            }
                {Object.keys(stat.moyennes_par_matiere).length > 0 &&
            <>
                    <p className="mb-1 mt-3 text-2xs font-semibold text-win-text">Moyennes par matière</p>
                    <ul className="divide-y divide-win-border rounded-win border border-win-border">
                      {Object.entries(stat.moyennes_par_matiere).map(([matiere, m]) =>
                <li key={matiere} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                          <span className="text-win-text">{matiere}</span>
                          <span className="tabular-nums text-win-muted">
                            {m.moyenne_classe} <span className="text-win-faint">(min {m.min} · max {m.max})</span>
                          </span>
                        </li>
                )}
                    </ul>
                  </>
            }
              </> :

          !stats.loading && <p className="text-2xs text-win-muted">Lancez le calcul pour obtenir les statistiques de la classe.</p>
          }
          </Panel>
        }
      </div>
    </Drawer>);

}