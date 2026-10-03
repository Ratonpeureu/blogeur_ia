import { useState } from 'react';
import { SparklesIcon, CheckCircle2Icon } from 'lucide-react';
import { Button } from './ui/primitives';
import { useSubmit } from '../hooks/useResource';
import { ecoleInitialiserEtablissement } from '../lib/api_ecole';

export function BoutonInitialisation({ onDone }: { onDone?: () => void }) {
  const submit = useSubmit();
  const [resultat, setResultat] = useState<string | null>(null);

  function lancer() {
    submit.run(
      async () => {
        const res = await ecoleInitialiserEtablissement();
        const s = res.stats;
        const rien =
          !s.cycles && !s.niveaux && !s.series && !s.annee_creee && !s.periodes_creees;

        setResultat(
          rien
            ? 'Établissement déjà initialisé — rien à créer.'
            : `Référentiel — ${s.cycles ?? 0} cycles, ${s.niveaux ?? 0} niveaux, ` +
              `${s.series ?? 0} séries` +
              (s.annee_creee ? ', année créée' : '') +
              (s.periodes_creees ? `, ${s.periodes_creees} trimestres créés` : '') +
              '.'
        );
      },
      () => onDone?.()
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        icon={<SparklesIcon size={13} />}
        variant="primary"
        onClick={lancer}
        disabled={submit.submitting}
      >
        {submit.submitting ? 'Initialisation…' : 'Initialiser l’établissement'}
      </Button>
      {resultat && (
        <span className="flex items-center gap-1 text-2xs text-state-successFg">
          <CheckCircle2Icon size={11} /> {resultat}
        </span>
      )}
      {submit.error && (
        <span className="text-2xs text-state-dangerFg">{submit.error}</span>
      )}
    </div>
  );
}