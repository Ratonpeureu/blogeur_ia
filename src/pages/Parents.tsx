import React, { useMemo, useState } from 'react';
import { UserPlusIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Avatar, Divider, ErrorState, LoadingState, SearchInput, Select, StatTile, Toolbar, Button } from '../components/ui/primitives';
import { ParentDrawer } from '../components/parents/ParentDrawer';
import { CreerCompteParentDrawer } from '../components/CreerCompteParentDrawer';
import { useResource } from '../hooks/useResource';
import { formatDate, initiales } from '../utils/format';
import { ecoleListerParents } from '../lib/api_ecole';
import type { Parent } from '../lib/api_ecole';

export function Parents() {
  const [recherche, setRecherche] = useState('');
  const [acces, setAcces] = useState('tous');
  const [creer, setCreer] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const parents = useResource(() => ecoleListerParents(recherche.trim() || undefined), [recherche]);
  const tous = parents.data ?? [];

  const lignes = useMemo(
    () =>
    tous.filter((p) => {
      if (acces === 'actif') return p.peut_se_connecter_portail;
      if (acces === 'inactif') return !p.peut_se_connecter_portail;
      if (acces === 'provisoire') return p.doit_changer_mot_de_passe;
      return true;
    }),
    [tous, acces]
  );

  const colonnes: Column<Parent>[] = [
  {
    key: 'parent',
    header: 'Parent',
    width: '32%',
    sortValue: (p) => `${p.nom} ${p.prenom}`,
    render: (p) =>
    <span className="flex items-center gap-2">
          <Avatar initiales={initiales(p.nom, p.prenom)} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-win-text">
              {p.prenom} {p.nom}
            </span>
            <span className="block truncate text-2xs text-win-faint">{p.email ?? 'Pas d’e-mail'}</span>
          </span>
        </span>

  },
  { key: 'tel', header: 'Téléphone', render: (p) => p.telephone },
  {
    key: 'acces',
    header: 'Portail',
    render: (p) =>
    <Badge tone={p.peut_se_connecter_portail ? 'success' : 'neutral'}>
          {p.peut_se_connecter_portail ? 'Actif' : 'Inactif'}
        </Badge>

  },
  {
    key: 'mdp',
    header: 'Mot de passe',
    render: (p) =>
    p.doit_changer_mot_de_passe ? <Badge tone="warning">Provisoire</Badge> : <Badge tone="neutral">Personnalisé</Badge>
  },
  {
    key: 'cree',
    header: 'Créé le',
    sortValue: (p) => String(p.created_at ?? ''),
    render: (p) => p.created_at ? formatDate(p.created_at) : '—'
  }];


  return (
    <>
      <PageHeader
        title="Comptes parents"
        description="Accès au portail parent et rattachement des enfants"
        actions={
        <Button variant="primary" icon={<UserPlusIcon size={13} />} onClick={() => setCreer(true)}>
            Créer un compte parent
          </Button>
        } />
      

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatTile label="Comptes parents" value={tous.length} hint="Enregistrés" tone="accent" />
        <StatTile
          label="Accès portail actif"
          value={tous.filter((p) => p.peut_se_connecter_portail).length}
          hint="Peuvent se connecter"
          tone="success" />
        
        <StatTile
          label="Mot de passe provisoire"
          value={tous.filter((p) => p.doit_changer_mot_de_passe).length}
          hint="Première connexion à faire"
          tone="warning" />
        
      </div>

      <Toolbar>
        <SearchInput value={recherche} onChange={setRecherche} placeholder="Nom, téléphone, e-mail…" className="w-64" />
        <Divider />
        <Select
          label="Accès"
          value={acces}
          onChange={setAcces}
          options={[
          { value: 'tous', label: 'Tous' },
          { value: 'actif', label: 'Portail actif' },
          { value: 'inactif', label: 'Portail inactif' },
          { value: 'provisoire', label: 'Mot de passe provisoire' }]
          } />
        
      </Toolbar>

      <div className="mt-3">
        {parents.loading && <LoadingState />}
        {parents.error && <ErrorState message={parents.error} onRetry={parents.reload} />}
        <DataTable
          columns={colonnes}
          rows={lignes}
          rowKey={(p) => p.id}
          onRowClick={(p) => setOuvert(p.id)}
          emptyLabel="Aucun compte parent." />
        
      </div>

      <ParentDrawer parentId={ouvert} onClose={() => setOuvert(null)} onChanged={parents.reload} />
      <CreerCompteParentDrawer open={creer} onClose={() => setCreer(false)} onCreated={parents.reload} />
    </>);

}