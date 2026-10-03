// components/finances/GrilleDetailDrawer.tsx
// Échéancier détaillé d'une grille de frais : liste, ajout, génération automatique, suppression.
import React, { useState } from 'react';
import { PlusIcon, Trash2Icon, WandSparklesIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import { Button, CheckboxField, ErrorState, FieldRow, LoadingState, Panel, SelectField, TextField } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { formatDate, formatFcfa, humanize } from '../../utils/format';
import {
  ecoleAjouterEcheanceGrille,
  ecoleAutoGenererEcheances,
  ecoleDetailGrille,
  ecoleOptionsGrille,
  ecoleSupprimerEcheanceGrille } from
'../../lib/api_ecole_extended';
import type { AutoGenererEcheancesBody, TypeFrais } from '../../lib/api_ecole_extended';
import type { GrilleFraisScolarite } from '../../lib/api_ecole';

const MODES_PAR_DEFAUT: {value: string;label: string;}[] = [
{ value: 'mensuelle', label: 'Mensuelle' },
{ value: 'trimestrielle', label: 'Trimestrielle' },
{ value: 'annuelle', label: 'Annuelle' }];


const ECHEANCE_VIDE = {
  libelle: '',
  type_frais: '',
  montant_fcfa: '',
  mois_declenchement: '',
  jour_du_mois: '',
  date_echeance_fixe: '',
  obligatoire: true
};

export function GrilleDetailDrawer({
  grille,
  titre,
  onClose




}: {grille: GrilleFraisScolarite | null;titre: string;onClose: () => void;}) {
  const open = !!grille;
  const gid = grille?.id ?? '';
  const detail = useResource(() => ecoleDetailGrille(gid), [gid], open);
  const options = useResource(() => ecoleOptionsGrille(grille?.niveau_id), [grille?.niveau_id], open);

  const ajout = useSubmit();
  const generation = useSubmit();
  const suppression = useSubmit();

  const [form, setForm] = useState(ECHEANCE_VIDE);
  const [auto, setAuto] = useState({ mode: 'mensuelle', nb_tranches: '', mois_debut: '', jour_du_mois: '5' });

  if (!grille) return null;

  const typesFrais = options.data?.types_frais ?? [];
  const mois = options.data?.mois ?? [];
  const modes = options.data?.modes_facturation?.length ? options.data.modes_facturation : MODES_PAR_DEFAUT;
  const typeLabel = (t: string) => typesFrais.find((x) => x.value === t)?.label ?? humanize(t);
  const moisLabel = (m: number) => mois.find((x) => x.value === m)?.label ?? String(m);

  const echeances = (detail.data ?? []).slice().sort((a, b) => a.ordre_affichage - b.ordre_affichage || a.ordre - b.ordre);
  const total = echeances.reduce((acc, e) => acc + e.montant_fcfa, 0);
  const attendu = grille.frais_inscription_fcfa + grille.frais_scolarite_annuel_fcfa;
  const ecart = total - attendu;

  function ajouter() {
    if (!form.libelle.trim()) return ajout.setError('Le libellé est obligatoire.');
    if (!form.type_frais) return ajout.setError('Choisissez un type de frais.');
    if (!Number(form.montant_fcfa)) return ajout.setError('Le montant est obligatoire.');
    ajout.run(
      () =>
      ecoleAjouterEcheanceGrille(gid, {
        ordre: echeances.length + 1,
        libelle: form.libelle.trim(),
        type_frais: form.type_frais as TypeFrais,
        montant_fcfa: Number(form.montant_fcfa),
        mois_declenchement: form.mois_declenchement ? Number(form.mois_declenchement) : null,
        jour_du_mois: form.jour_du_mois ? Number(form.jour_du_mois) : null,
        date_echeance_fixe: form.date_echeance_fixe || null,
        obligatoire: form.obligatoire,
        ordre_affichage: echeances.length + 1
      }),
      () => {
        setForm(ECHEANCE_VIDE);
        detail.reload();
      }
    );
  }

  function generer() {
    generation.run(
      () =>
      ecoleAutoGenererEcheances(gid, {
        mode: auto.mode as AutoGenererEcheancesBody['mode'],
        nb_tranches: Number(auto.nb_tranches || grille?.nb_tranches_paiement) || undefined,
        mois_debut: auto.mois_debut ? Number(auto.mois_debut) : undefined,
        jour_du_mois: auto.jour_du_mois ? Number(auto.jour_du_mois) : undefined
      }),
      () => detail.reload()
    );
  }

  return (
    <Drawer open={open} onClose={onClose} title={titre} subtitle="Grille de frais et échéancier" width="w-[640px]">
      <div className="space-y-3">
        <Panel title="Montants de la grille">
          <dl>
            <FieldRow label="Frais d’inscription">{formatFcfa(grille.frais_inscription_fcfa)}</FieldRow>
            <FieldRow label="Scolarité annuelle">{formatFcfa(grille.frais_scolarite_annuel_fcfa)}</FieldRow>
            <FieldRow label="Nombre de tranches">{grille.nb_tranches_paiement}</FieldRow>
            <FieldRow label="Cantine mensuelle">
              {grille.frais_cantine_mensuel_fcfa === null ? 'Non proposée' : formatFcfa(grille.frais_cantine_mensuel_fcfa)}
            </FieldRow>
            <FieldRow label="Total de l’échéancier">
              <span className="font-semibold">{formatFcfa(total)}</span>
              {echeances.length > 0 && ecart !== 0 &&
              <Badge tone="warning">
                  {ecart > 0 ? '+' : ''}
                  {formatFcfa(ecart)} vs inscription + scolarité
                </Badge>
              }
            </FieldRow>
          </dl>
        </Panel>

        <Panel title="Échéancier" subtitle={`${echeances.length} échéance(s)`} bodyClassName="">
          {detail.loading && <LoadingState />}
          {detail.error && <ErrorState message={detail.error} onRetry={detail.reload} />}
          <ul className="divide-y divide-win-border">
            {echeances.map((e) =>
            <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-win-text">{e.libelle}</span>
                  <span className="block text-2xs text-win-muted">
                    {typeLabel(e.type_frais)} ·{' '}
                    {e.date_echeance_fixe ?
                  `le ${formatDate(e.date_echeance_fixe)}` :
                  e.mois_declenchement ?
                  `${moisLabel(e.mois_declenchement)}${e.jour_du_mois ? `, le ${e.jour_du_mois}` : ''}` :
                  'Sans date'}
                  </span>
                </span>
                {!e.obligatoire && <Badge tone="neutral">Optionnel</Badge>}
                <span className="shrink-0 text-xs font-semibold tabular-nums text-win-text">{formatFcfa(e.montant_fcfa)}</span>
                <Button
                size="sm"
                variant="ghost"
                icon={<Trash2Icon size={12} />}
                aria-label={`Supprimer ${e.libelle}`}
                disabled={suppression.submitting}
                onClick={() => {
                  if (window.confirm(`Supprimer l’échéance « ${e.libelle} » ?`))
                  suppression.run(() => ecoleSupprimerEcheanceGrille(e.id), () => detail.reload());
                }} />
              
              </li>
            )}
            {!detail.loading && echeances.length === 0 &&
            <li className="px-3 py-4 text-2xs text-win-muted">Aucune échéance — générez-les automatiquement ou ajoutez-les une par une.</li>
            }
          </ul>
          {suppression.error && <p className="px-3 pb-2 text-2xs text-state-dangerFg">{suppression.error}</p>}
        </Panel>

        <Panel title="Générer automatiquement" subtitle="Répartit la scolarité selon le mode choisi">
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Mode" value={auto.mode} onChange={(v) => setAuto({ ...auto, mode: v })} options={modes} />
            <TextField
              label="Nombre de tranches"
              type="number"
              value={auto.nb_tranches}
              onChange={(v) => setAuto({ ...auto, nb_tranches: v })}
              hint={`Par défaut : ${grille.nb_tranches_paiement}`} />
            
            <SelectField
              label="Mois de départ"
              value={auto.mois_debut}
              onChange={(v) => setAuto({ ...auto, mois_debut: v })}
              options={[{ value: '', label: 'Défini par le serveur' }, ...mois.map((m) => ({ value: String(m.value), label: m.label }))]} />
            
            <TextField label="Jour du mois" type="number" value={auto.jour_du_mois} onChange={(v) => setAuto({ ...auto, jour_du_mois: v })} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {generation.error ? <p className="text-2xs text-state-dangerFg">{generation.error}</p> : <span />}
            <Button size="sm" icon={<WandSparklesIcon size={12} />} onClick={generer} disabled={generation.submitting}>
              {generation.submitting ? 'Génération…' : 'Générer l’échéancier'}
            </Button>
          </div>
        </Panel>

        <Panel title="Ajouter une échéance">
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Libellé" required value={form.libelle} onChange={(v) => setForm({ ...form, libelle: v })} />
            <SelectField
              label="Type de frais"
              required
              value={form.type_frais}
              onChange={(v) => setForm({ ...form, type_frais: v, libelle: form.libelle || typeLabel(v) })}
              options={[
              { value: '', label: options.loading ? 'Chargement…' : 'Sélectionner…' },
              ...typesFrais.map((t) => ({ value: t.value, label: t.label }))]
              } />
            
            <TextField label="Montant (FCFA)" type="number" required value={form.montant_fcfa} onChange={(v) => setForm({ ...form, montant_fcfa: v })} />
            <SelectField
              label="Mois de déclenchement"
              value={form.mois_declenchement}
              onChange={(v) => setForm({ ...form, mois_declenchement: v })}
              options={[{ value: '', label: 'Aucun' }, ...mois.map((m) => ({ value: String(m.value), label: m.label }))]} />
            
            <TextField label="Jour du mois" type="number" value={form.jour_du_mois} onChange={(v) => setForm({ ...form, jour_du_mois: v })} />
            <TextField label="Ou date fixe" type="date" value={form.date_echeance_fixe} onChange={(v) => setForm({ ...form, date_echeance_fixe: v })} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <CheckboxField label="Obligatoire" checked={form.obligatoire} onChange={(v) => setForm({ ...form, obligatoire: v })} />
            <Button size="sm" variant="primary" icon={<PlusIcon size={12} />} onClick={ajouter} disabled={ajout.submitting}>
              Ajouter
            </Button>
          </div>
          {ajout.error && <p className="mt-2 text-2xs text-state-dangerFg">{ajout.error}</p>}
        </Panel>
      </div>
    </Drawer>);

}