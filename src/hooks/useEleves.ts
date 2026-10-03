// hooks/useEleves.ts
// Liste complète des élèves (backend) pour alimenter les listes de sélection
// et traduire un identifiant élève en nom lisible.
import { useMemo } from 'react';
import { useResource } from './useResource';
import { nomEleve } from '../utils/labels';
import { ecoleListerEleves } from '../lib/api_ecole';
import type { Eleve } from '../lib/api_ecole';

export function useEleves(enabled = true) {
  const eleves = useResource(() => ecoleListerEleves(), [], enabled);

  const parId = useMemo(() => new Map<string, Eleve>((eleves.data ?? []).map((e) => [e.id, e])), [eleves.data]);

  const options = useMemo(
    () =>
    (eleves.data ?? []).
    slice().
    sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')).
    map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}`, hint: `Matricule ${e.matricule}` })),
    [eleves.data]
  );

  const nom = (id?: string | null) => {
    if (!id) return '—';
    const e = parId.get(id);
    return e ? nomEleve(e) : 'Élève introuvable';
  };

  return { eleves, parId, options, nom };
}