// components/patrimoine/CatalogueMaterielPanel.tsx
// Consultation du catalogue global de matériel scolaire (initialisé automatiquement).
import React, { useState } from 'react';
import { DataTable, type Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { Divider, ErrorState, LoadingState, SearchInput, Select, Toolbar } from '../ui/primitives';
import { useResource } from '../../hooks/useResource';
import { formatFcfa, humanize } from '../../utils/format';
import { ecoleCatalogueMateriel, ecoleCategoriesMateriel } from '../../lib/api_ecole_extended';
import type { MaterielScolaireCatalogue } from '../../lib/api_ecole_extended';

export function CatalogueMaterielPanel() {
  const [categorie, setCategorie] = useState('');
  const [recherche, setRecherche] = useState('');

  const categories = useResource(() => ecoleCategoriesMateriel(), []);
  const catalogue = useResource(
    () => ecoleCatalogueMateriel({ categorie: categorie || undefined, q: recherche.trim() || undefined }),
    [categorie, recherche]
  );

  const colonnes: Column<MaterielScolaireCatalogue>[] = [
  {
    key: 'libelle',
    header: 'Article',
    sortValue: (c) => c.libelle,
    render: (c) =>
    <span className="min-w-0">
          <span className="block font-medium text-win-text">{c.libelle}</span>
          <span className="block text-2xs text-win-faint">{c.code}</span>
        </span>

  },
  {
    key: 'categorie',
    header: 'Catégorie',
    sortValue: (c) => c.categorie,
    render: (c) =>
    <span>
          {humanize(c.categorie)}
          {c.sous_categorie && <span className="text-win-muted"> › {humanize(c.sous_categorie)}</span>}
        </span>

  },
  { key: 'unite', header: 'Unité', render: (c) => c.unite_mesure },
  {
    key: 'prix',
    header: 'Prix de référence',
    align: 'right',
    sortValue: (c) => c.prix_unitaire_reference_fcfa ?? 0,
    render: (c) => c.prix_unitaire_reference_fcfa == null ? '—' : formatFcfa(c.prix_unitaire_reference_fcfa)
  },
  {
    key: 'duree',
    header: 'Durée de vie',
    align: 'right',
    render: (c) => c.duree_vie_estimee_mois == null ? '—' : `${c.duree_vie_estimee_mois} mois`
  },
  { key: 'actif', header: 'Statut', render: (c) => <Badge tone={c.actif ? 'success' : 'neutral'}>{c.actif ? 'Disponible' : 'Retiré'}</Badge> }];


  return (
    <>
      <Toolbar>
        <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher un article…" className="w-64" />
        <Divider />
        <Select
          label="Catégorie"
          value={categorie}
          onChange={setCategorie}
          options={[{ value: '', label: 'Toutes' }, ...(categories.data ?? []).map((c) => ({ value: c, label: humanize(c) }))]} />
        
      </Toolbar>
      {catalogue.loading && <LoadingState />}
      {catalogue.error && <ErrorState message={catalogue.error} onRetry={catalogue.reload} />}
      <DataTable columns={colonnes} rows={catalogue.data ?? []} rowKey={(c) => c.id} emptyLabel="Aucun article dans le catalogue." />
    </>);

}