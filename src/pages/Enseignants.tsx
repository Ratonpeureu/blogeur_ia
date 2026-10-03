// pages/Enseignants.tsx
import React, { useMemo, useState } from 'react';
import { FilterXIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/shell/AppShell';
import { DataTable, type Column } from '../components/ui/DataTable';
import {
  Avatar, Button, CheckboxField, Divider, ErrorState, LoadingState,
  SearchInput, Select, SelectField, StatTile, TextField, Toolbar,
} from '../components/ui/primitives';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { FormDrawer } from '../components/ui/FormDrawer';
import { EnseignantDrawer } from '../components/enseignants/EnseignantDrawer';
import { useResource, useSubmit } from '../hooks/useResource';
import { useReferentielEcole } from '../hooks/useReferentielEcole';
import { aujourdHui, initiales } from '../utils/format';
import { normaliser } from '../utils/labels';
import { ecoleCreerEnseignant, ecoleListerEnseignants } from '../lib/api_ecole';
import type { Enseignant } from '../lib/api_ecole';

const ENSEIGNANT_VIDE = {
  nom: '',
  prenom: '',
  email: '',
  email_interne: '',
  telephone: '',
  poste: 'Enseignant',
  specialite_principale: '',
  type_contrat: 'CDI',
  volume_horaire_contractuel: '20',
  date_embauche: aujourdHui(),
  adresse: '',
  creer_portail: true,
  mot_de_passe_portail: '',
};

export function Enseignants() {
  const { anneeId, anneeLibelle } = useReferentielEcole();

  const [recherche, setRecherche] = useState('');
  const [filtreSpecialite, setFiltreSpecialite] = useState('');
  const [filtreAffectation, setFiltreAffectation] = useState('tous');
  const [filtreActif, setFiltreActif] = useState('actifs');

  const [detail, setDetail] = useState<Enseignant | null>(null);
  const [creation, setCreation] = useState(false);
  const [nouveau, setNouveau] = useState(ENSEIGNANT_VIDE);
  const creerForm = useSubmit();

  const enseignants = useResource(
    () =>
      ecoleListerEnseignants({
        q: recherche.trim() || undefined,
        actif_seulement: filtreActif === 'actifs',
      }),
    [recherche, filtreActif]
  );

  const specialitesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (enseignants.data ?? []).forEach((e) => {
      if (e.specialite_principale) set.add(e.specialite_principale);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [enseignants.data]);

  const lignes = useMemo(
    () =>
      (enseignants.data ?? []).filter((e) => {
        if (filtreSpecialite && e.specialite_principale !== filtreSpecialite) return false;
        const n = e.nb_affectations_actives ?? 0;
        if (filtreAffectation === 'sans' && n > 0) return false;
        if (filtreAffectation === 'avec' && n === 0) return false;
        return true;
      }),
    [enseignants.data, filtreSpecialite, filtreAffectation]
  );

  const total = lignes.length;
  const avec = lignes.filter((e) => (e.nb_affectations_actives ?? 0) > 0).length;
  const sans = total - avec;
  const totalHeures = lignes.reduce(
    (acc, e) => acc + (e.volume_horaire_contractuel ?? 0),
    0
  );

  const colonnes: Column<Enseignant>[] = [
    {
      key: 'nom',
      header: 'Enseignant',
      width: '26%',
      sortValue: (e) => `${e.nom} ${e.prenom}`,
      render: (e) => (
        <span className="flex items-center gap-2">
          <Avatar initiales={initiales(e.nom, e.prenom)} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-win-text">
              {e.prenom} {e.nom}
            </span>
            <span className="block truncate text-2xs text-win-faint">
              {e.email || e.email_interne || '—'}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'specialite',
      header: 'Spécialité',
      sortValue: (e) => e.specialite_principale ?? '',
      render: (e) =>
        e.specialite_principale ? (
          <Badge tone="neutral">{e.specialite_principale}</Badge>
        ) : (
          <span className="text-win-faint">—</span>
        ),
    },
    {
      key: 'poste',
      header: 'Poste',
      sortValue: (e) => e.poste ?? '',
      render: (e) => e.poste || '—',
    },
    {
      key: 'contrat',
      header: 'Contrat',
      render: (e) => e.type_contrat || '—',
    },
    {
      key: 'charge',
      header: 'Charge',
      align: 'right',
      sortValue: (e) => e.volume_horaire_contractuel ?? 0,
      render: (e) =>
        e.volume_horaire_contractuel ? (
          <span className="tabular-nums">{e.volume_horaire_contractuel} h/sem</span>
        ) : (
          <span className="text-win-faint">—</span>
        ),
    },
    {
      key: 'affectations',
      header: 'Affectations',
      align: 'right',
      sortValue: (e) => e.nb_affectations_actives ?? 0,
      render: (e) =>
        (e.nb_affectations_actives ?? 0) > 0 ? (
          <Badge tone="success">{e.nb_affectations_actives}</Badge>
        ) : (
          <Badge tone="warning">Aucune</Badge>
        ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (e) => <StatusBadge value={e.actif === 1 ? 'actif' : 'suspendu'} />,
    },
  ];

  function soumettreCreation() {
    if (!nouveau.nom.trim()) return creerForm.setError('Le nom est obligatoire.');
    if (!nouveau.prenom.trim()) return creerForm.setError('Le prénom est obligatoire.');
    if (!nouveau.email.trim() && !nouveau.email_interne.trim()) {
      return creerForm.setError('Renseignez au moins un email ou un email interne.');
    }
    if (!anneeId) {
      return creerForm.setError("L'établissement n'est pas initialisé.");
    }

    creerForm.run(async () => {
      const r = await ecoleCreerEnseignant({
        nom: nouveau.nom.trim(),
        prenom: nouveau.prenom.trim(),
        email: nouveau.email.trim() || undefined,
        email_interne: nouveau.email_interne.trim() || undefined,
        telephone: nouveau.telephone.trim() || undefined,
        poste: nouveau.poste.trim() || 'Enseignant',
        specialite_principale: nouveau.specialite_principale.trim() || undefined,
        volume_horaire_contractuel: nouveau.volume_horaire_contractuel
          ? Number(nouveau.volume_horaire_contractuel)
          : undefined,
        type_contrat: nouveau.type_contrat,
        date_embauche: nouveau.date_embauche || undefined,
        adresse: nouveau.adresse.trim() || undefined,
        creer_portail: nouveau.creer_portail,
        mot_de_passe_portail: nouveau.mot_de_passe_portail.trim() || undefined,
      });

      setCreation(false);
      setNouveau(ENSEIGNANT_VIDE);
      enseignants.reload();

      if (r.mot_de_passe_portail_temporaire) {
        window.alert(
          `Enseignant créé.\n\n` +
            `Identifiant portail : ${r.identifiant_portail}\n` +
            `Mot de passe temporaire : ${r.mot_de_passe_portail_temporaire}\n\n` +
            `Notez-le : il ne sera plus affiché.`
        );
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Enseignants"
        description={`Corps enseignant · ${anneeLibelle}`}
        actions={
          <Button
            variant="primary"
            icon={<UserPlusIcon size={13} />}
            onClick={() => setCreation(true)}
          >
            Nouvel enseignant
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile
          label="Enseignants listés"
          value={total}
          hint={filtreActif === 'actifs' ? 'Actuellement en poste' : 'Tous statuts'}
          tone="accent"
        />
        <StatTile
          label="Avec affectation"
          value={avec}
          hint="Au moins une matière affectée"
          tone="success"
        />
        <StatTile
          label="Sans affectation"
          value={sans}
          hint={sans > 0 ? 'À affecter à une classe' : 'Tout le monde est affecté'}
          tone={sans > 0 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Heures contractuelles"
          value={`${totalHeures}h`}
          hint="Cumul hebdo déclaré"
          tone="neutral"
        />
      </div>

      <Toolbar>
        <SearchInput
          value={recherche}
          onChange={setRecherche}
          placeholder="Nom, email, spécialité…"
          className="w-64"
        />
        <Divider />
        <Select
          label="Spécialité"
          value={filtreSpecialite}
          onChange={setFiltreSpecialite}
          options={[
            { value: '', label: 'Toutes' },
            ...specialitesDisponibles.map((s) => ({ value: s, label: s })),
          ]}
        />
        <Select
          label="Affectation"
          value={filtreAffectation}
          onChange={setFiltreAffectation}
          options={[
            { value: 'tous', label: 'Toutes' },
            { value: 'avec', label: 'Avec affectation' },
            { value: 'sans', label: 'Sans affectation' },
          ]}
        />
        <Select
          label="Statut"
          value={filtreActif}
          onChange={setFiltreActif}
          options={[
            { value: 'actifs', label: 'Actifs' },
            { value: 'tous', label: 'Tous' },
          ]}
        />
        <Divider />
        <Button
          size="sm"
          variant="ghost"
          icon={<FilterXIcon size={12} />}
          onClick={() => {
            setRecherche('');
            setFiltreSpecialite('');
            setFiltreAffectation('tous');
            setFiltreActif('actifs');
          }}
        >
          Réinitialiser
        </Button>
      </Toolbar>

      <div className="mt-3">
        {enseignants.loading && <LoadingState />}
        {enseignants.error && (
          <ErrorState message={enseignants.error} onRetry={enseignants.reload} />
        )}
        <DataTable
          columns={colonnes}
          rows={lignes}
          rowKey={(e) => e.id}
          onRowClick={(e) => setDetail(e)}
          emptyLabel={
            anneeId
              ? 'Aucun enseignant pour ces critères. Créez-en un avec « Nouvel enseignant ».'
              : "Chargement du référentiel…"
          }
        />
      </div>

      <EnseignantDrawer enseignant={detail} onClose={() => setDetail(null)} />

      <FormDrawer
        open={creation}
        onClose={() => {
          setCreation(false);
          creerForm.setError(null);
        }}
        title="Nouvel enseignant"
        subtitle="Les identifiants portail seront affichés une seule fois."
        onSubmit={soumettreCreation}
        submitting={creerForm.submitting}
        error={creerForm.error}
        submitLabel="Créer l'enseignant"
      >
        <TextField
          label="Nom"
          required
          value={nouveau.nom}
          onChange={(v) => setNouveau({ ...nouveau, nom: v })}
        />
        <TextField
          label="Prénom"
          required
          value={nouveau.prenom}
          onChange={(v) => setNouveau({ ...nouveau, prenom: v })}
        />
        <TextField
          label="Email"
          type="email"
          value={nouveau.email}
          onChange={(v) => setNouveau({ ...nouveau, email: v })}
        />
        <TextField
          label="Email interne (optionnel)"
          value={nouveau.email_interne}
          onChange={(v) => setNouveau({ ...nouveau, email_interne: v })}
        />
        <TextField
          label="Téléphone"
          value={nouveau.telephone}
          onChange={(v) => setNouveau({ ...nouveau, telephone: v })}
        />
        <TextField
          label="Poste"
          value={nouveau.poste}
          onChange={(v) => setNouveau({ ...nouveau, poste: v })}
        />
        <TextField
          label="Spécialité principale"
          value={nouveau.specialite_principale}
          onChange={(v) => setNouveau({ ...nouveau, specialite_principale: v })}
        />
        <SelectField
          label="Type de contrat"
          value={nouveau.type_contrat}
          onChange={(v) => setNouveau({ ...nouveau, type_contrat: v })}
          options={[
            { value: 'CDI', label: 'CDI' },
            { value: 'CDD', label: 'CDD' },
            { value: 'Vacataire', label: 'Vacataire' },
            { value: 'Stage', label: 'Stage' },
          ]}
        />
        <TextField
          label="Volume horaire contractuel (h/semaine)"
          type="number"
          value={nouveau.volume_horaire_contractuel}
          onChange={(v) => setNouveau({ ...nouveau, volume_horaire_contractuel: v })}
        />
        <TextField
          label="Date d'embauche"
          type="date"
          value={nouveau.date_embauche}
          onChange={(v) => setNouveau({ ...nouveau, date_embauche: v })}
        />
        <TextField
          label="Adresse"
          value={nouveau.adresse}
          onChange={(v) => setNouveau({ ...nouveau, adresse: v })}
        />
        <CheckboxField
          label="Créer aussi le compte portail enseignant"
          checked={nouveau.creer_portail}
          onChange={(v) => setNouveau({ ...nouveau, creer_portail: v })}
        />
      </FormDrawer>
    </>
  );
}