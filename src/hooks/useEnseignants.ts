// hooks/useEnseignants.ts
// Source unique : GET /api/ecole/enseignants (CRUD admin).
import { useMemo } from 'react';
import { useResource } from './useResource';
import { ecoleListerEnseignants } from '../lib/api_ecole';
import type { Enseignant } from '../lib/api_ecole';

export interface EnseignantConnu {
  id: string;
  nom: string;
  poste: string;
  email: string;
  specialite: string | null;
  type_contrat: string;
  volume_horaire_contractuel: number | null;
  nb_affectations_actives: number;
  actif: number;
  raw: Enseignant;
}

export function useEnseignants() {
  const stats = useResource(() => ecoleListerEnseignants(), []);

  const liste: EnseignantConnu[] = useMemo(
    () =>
      (stats.data ?? []).map((e) => ({
        id: e.id,
        nom: `${e.prenom} ${e.nom}`.trim(),
        poste: e.poste || '',
        email: e.email || e.email_interne || '',
        specialite: e.specialite_principale,
        type_contrat: e.type_contrat,
        volume_horaire_contractuel: e.volume_horaire_contractuel,
        nb_affectations_actives: e.nb_affectations_actives ?? 0,
        actif: e.actif,
        raw: e,
      })),
    [stats.data]
  );

  const parId = useMemo(() => new Map(liste.map((e) => [e.id, e])), [liste]);

  const options = useMemo(
    () =>
      liste
        .filter((e) => e.actif === 1)
        .map((e) => ({
          value: e.id,
          label: e.nom,
          hint: e.specialite || e.poste || undefined,
        })),
    [liste]
  );

  const nom = (id?: string | null) => {
    if (!id) return 'Non affecté';
    return parId.get(id)?.nom ?? 'Enseignant non référencé';
  };

  return { stats, liste, parId, options, nom };
}