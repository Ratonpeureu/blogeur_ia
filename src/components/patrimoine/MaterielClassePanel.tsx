// components/patrimoine/MaterielClassePanel.tsx
// Inventaire du matériel affecté à une classe, alimenté depuis le catalogue national.
import React, { useEffect, useState } from 'react';
import { PackagePlusIcon, Trash2Icon } from 'lucide-react';
import { DataTable, type Column } from '../ui/DataTable';
import { StatusBadge } from '../ui/Badge';
import { FormDrawer } from '../ui/FormDrawer';
import { ComboboxField } from '../ui/ComboboxField';
import { Button, Divider, ErrorState, LoadingState, StatTile, TextAreaField, TextField, Toolbar } from '../ui/primitives';
import { useResource, useSubmit } from '../../hooks/useResource';
import { useReferentielEcole } from '../../hooks/useReferentielEcole';
import { aujourdHui, formatDate, formatFcfa, humanize } from '../../utils/format';
import {
  ecoleAjouterMaterielClasse,
  ecoleCatalogueMateriel,
  ecoleListerMaterielClasse,
  ecoleSupprimerMateriel } from
'../../lib/api_ecole_extended';
import type { MaterielClasse } from '../../lib/api_ecole_extended';

const FORM_VIDE = {
  materiel_catalogue_id: '',
  designation: '',
  quantite: '1',
  valeur_acquisition_fcfa: '',
  date_acquisition: aujourdHui(),
  numero_serie: '',
  localisation_detail: '',
  remarques: ''
};

export function MaterielClassePanel() {
  const ref = useReferentielEcole();
  const [classeId, setClasseId] = useState('');
  const [form, setForm] = useState(FORM_VIDE);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!classeId && ref.classeOptions.length) setClasseId(ref.classeOptions[0].value);
  }, [classeId, ref.classeOptions]);

  const materiel = useResource(() => ecoleListerMaterielClasse(classeId), [classeId], !!classeId);
  const catalogue = useResource(() => ecoleCatalogueMateriel(), [], ouvert);

  const ajout = useSubmit();
  const suppression = useSubmit();

  const lignes = materiel.data ?? [];
  const valeurTotale = lignes.reduce((acc, m) => acc + (m.valeur_acquisition_fcfa ?? 0), 0);
  const quantiteTotale = lignes.reduce((acc, m) => acc + m.quantite, 0);

  const colonnes: Column<MaterielClasse>[] = [
  {
    key: 'designation',
    header: 'Matériel',
    sortValue: (m) => m.designation,
    render: (m) =>
    <span className="min-w-0">
          <span className="block font-medium text-win-text">{m.designation}</span>
          {m.numero_serie && <span className="block text-2xs text-win-faint">N° de série {m.numero_serie}</span>}
        </span>

  },
  { key: 'quantite', header: 'Quantité', align: 'right', sortValue: (m) => m.quantite, render: (m) => m.quantite },
  { key: 'etat', header: 'État', render: (m) => <StatusBadge value={m.etat} label={humanize(m.etat)} /> },
  { key: 'localisation', header: 'Emplacement', render: (m) => m.localisation_detail ?? '—' },
  { key: 'acquisition', header: 'Acquis le', render: (m) => m.date_acquisition ? formatDate(m.date_acquisition) : '—' },
  { key: 'verification', header: 'Dernière vérification', render: (m) => m.date_derniere_verification ? formatDate(m.date_derniere_verification) : 'Jamais' },
  {
    key: 'valeur',
    header: 'Valeur',
    align: 'right',
    sortValue: (m) => m.valeur_acquisition_fcfa ?? 0,
    render: (m) => m.valeur_acquisition_fcfa === null ? '—' : formatFcfa(m.valeur_acquisition_fcfa)
  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (m) =>
    <Button
      size="sm"
      variant="ghost"
      icon={<Trash2Icon size={12} />}
      disabled={suppression.submitting}
      onClick={() => {
        if (window.confirm(`Retirer « ${m.designation} » de l’inventaire de la classe ?`))
        suppression.run(() => ecoleSupprimerMateriel(m.id), () => materiel.reload());
      }}>
      
          Retirer
        </Button>

  }];


  function choisirCatalogue(id: string) {
    const item = (catalogue.data ?? []).find((c) => c.id === id);
    const quantite = Number(form.quantite) || 1;
    setForm({
      ...form,
      materiel_catalogue_id: id,
      designation: item ? item.libelle : form.designation,
      valeur_acquisition_fcfa:
      item?.prix_unitaire_reference_fcfa != null ? String(item.prix_unitaire_reference_fcfa * quantite) : form.valeur_acquisition_fcfa
    });
  }

  return (
    <>
      <Toolbar>
        <ComboboxField
          className="w-60"
          label="Classe"
          value={classeId}
          onChange={setClasseId}
          loading={ref.classes.loading}
          emptyLabel="Aucune classe pour cette année."
          options={ref.classeOptions} />
        
        <Divider />
        <Button size="sm" variant="primary" icon={<PackagePlusIcon size={12} />} disabled={!classeId} onClick={() => setOuvert(true)}>
          Ajouter du matériel
        </Button>
      </Toolbar>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Références" value={lignes.length} hint={ref.classeLabel(classeId)} tone="accent" />
        <StatTile label="Unités" value={quantiteTotale} hint="Toutes références" tone="neutral" />
        <StatTile label="Valeur d’acquisition" value={formatFcfa(valeurTotale)} hint="Somme déclarée" tone="success" />
      </div>

      {materiel.loading && <LoadingState />}
      {materiel.error && <ErrorState message={materiel.error} onRetry={materiel.reload} />}
      {suppression.error && <p className="text-2xs text-state-dangerFg">{suppression.error}</p>}
      <DataTable columns={colonnes} rows={lignes} rowKey={(m) => m.id} emptyLabel="Aucun matériel affecté à cette classe." />

      <FormDrawer
        open={ouvert}
        onClose={() => {
          setOuvert(false);
          ajout.setError(null);
        }}
        title="Ajouter du matériel"
        subtitle={ref.classeLabel(classeId)}
        submitting={ajout.submitting}
        error={ajout.error}
        onSubmit={() => {
          if (!form.designation.trim()) return ajout.setError('Choisissez un article du catalogue ou saisissez une désignation.');
          ajout.run(
            () =>
            ecoleAjouterMaterielClasse(classeId, {
              materiel_catalogue_id: form.materiel_catalogue_id || null,
              designation: form.designation.trim(),
              quantite: Number(form.quantite) || 1,
              valeur_acquisition_fcfa: form.valeur_acquisition_fcfa ? Number(form.valeur_acquisition_fcfa) : null,
              date_acquisition: form.date_acquisition || null,
              numero_serie: form.numero_serie.trim() || null,
              localisation_detail: form.localisation_detail.trim() || null,
              remarques: form.remarques.trim() || null
            }),
            () => {
              setOuvert(false);
              setForm(FORM_VIDE);
              materiel.reload();
            }
          );
        }}>
        
        <ComboboxField
          label="Article du catalogue"
          allowEmpty
          placeholder="Hors catalogue"
          value={form.materiel_catalogue_id}
          onChange={choisirCatalogue}
          loading={catalogue.loading}
          options={(catalogue.data ?? []).
          filter((c) => c.actif).
          map((c) => ({
            value: c.id,
            label: c.libelle,
            hint: [humanize(c.categorie), c.prix_unitaire_reference_fcfa != null ? `${formatFcfa(c.prix_unitaire_reference_fcfa)} / ${c.unite_mesure}` : null].
            filter(Boolean).
            join(' · ')
          }))} />
        
        <TextField label="Désignation" required value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
        <TextField label="Quantité" type="number" value={form.quantite} onChange={(v) => setForm({ ...form, quantite: v })} />
        <TextField
          label="Valeur d’acquisition (FCFA)"
          type="number"
          value={form.valeur_acquisition_fcfa}
          onChange={(v) => setForm({ ...form, valeur_acquisition_fcfa: v })}
          hint="Pré-remplie depuis le prix de référence du catalogue" />
        
        <TextField label="Date d’acquisition" type="date" value={form.date_acquisition} onChange={(v) => setForm({ ...form, date_acquisition: v })} />
        <TextField label="Numéro de série" value={form.numero_serie} onChange={(v) => setForm({ ...form, numero_serie: v })} />
        <TextField label="Emplacement dans la classe" value={form.localisation_detail} onChange={(v) => setForm({ ...form, localisation_detail: v })} />
        <TextAreaField label="Remarques" value={form.remarques} onChange={(v) => setForm({ ...form, remarques: v })} />
      </FormDrawer>
    </>);

}