// components/calendrier/CalendrierMensuel.tsx
// Vue mensuelle des rendez-vous (événements, réunions, convocations, échéances de signature).
import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../ui/primitives';

export type TypeElementCalendrier = 'evenement' | 'reunion' | 'convocation' | 'signature';

export interface ElementCalendrier {
  cle: string;
  date: string; // AAAA-MM-JJ
  titre: string;
  type: TypeElementCalendrier;
}

export const COULEUR_TYPE: Record<TypeElementCalendrier, string> = {
  evenement: 'bg-win-accent',
  reunion: 'bg-state-successFg',
  convocation: 'bg-state-warnFg',
  signature: 'bg-state-dangerFg'
};

export const LIBELLE_TYPE: Record<TypeElementCalendrier, string> = {
  evenement: 'Événement',
  reunion: 'Réunion',
  convocation: 'Convocation',
  signature: 'Limite de signature'
};

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MAX_PAR_JOUR = 3;

function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendrierMensuel({
  elements,
  onSelect



}: {elements: ElementCalendrier[];onSelect: (el: ElementCalendrier) => void;}) {
  const [curseur, setCurseur] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const aujourdhui = cleJour(new Date());

  const jours = useMemo(() => {
    const debut = new Date(curseur);
    debut.setDate(debut.getDate() - (debut.getDay() + 6) % 7);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      return d;
    });
  }, [curseur]);

  const parJour = useMemo(() => {
    const m = new Map<string, ElementCalendrier[]>();
    for (const el of elements) {
      const k = el.date.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), el]);
    }
    return m;
  }, [elements]);

  const titre = curseur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const decaler = (n: number) => setCurseur((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <section aria-label="Calendrier mensuel" className="rounded-win border border-win-border bg-win-surface shadow-win">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-win-border px-3 py-2">
        <h2 className="text-sm font-semibold capitalize text-win-text">{titre}</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<ChevronLeftIcon size={13} />} onClick={() => decaler(-1)} aria-label="Mois précédent" />
          <Button
            size="sm"
            onClick={() => {
              const d = new Date();
              setCurseur(new Date(d.getFullYear(), d.getMonth(), 1));
            }}>
            
            Aujourd’hui
          </Button>
          <Button size="sm" variant="ghost" icon={<ChevronRightIcon size={13} />} onClick={() => decaler(1)} aria-label="Mois suivant" />
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-win-border bg-win-panel">
        {JOURS_COURTS.map((j) =>
        <span key={j} className="px-2 py-1 text-2xs font-medium text-win-muted">
            {j}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7">
        {jours.map((d, i) => {
          const k = cleJour(d);
          const items = parJour.get(k) ?? [];
          const horsMois = d.getMonth() !== curseur.getMonth();
          const estAujourdhui = k === aujourdhui;
          return (
            <div
              key={k}
              className={`min-h-[96px] border-win-border p-1 ${i % 7 !== 6 ? 'border-r' : ''} ${i < 35 ? 'border-b' : ''} ${horsMois ? 'bg-win-panel/60' : ''}`}>
              
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-win px-1 text-2xs font-semibold ${
                estAujourdhui ? 'bg-win-accent text-white' : horsMois ? 'text-win-faint' : 'text-win-text'}`
                }>
                
                {d.getDate()}
              </span>
              <ul className="mt-0.5 space-y-0.5">
                {items.slice(0, MAX_PAR_JOUR).map((el) =>
                <li key={el.cle}>
                    <button
                    type="button"
                    onClick={() => onSelect(el)}
                    title={`${LIBELLE_TYPE[el.type]} · ${el.titre}`}
                    className="flex w-full items-center gap-1 rounded-win px-1 py-0.5 text-left text-2xs text-win-text transition-colors duration-150 ease-out hover:bg-win-accentSoft">
                    
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COULEUR_TYPE[el.type]}`} aria-hidden="true" />
                      <span className="truncate">{el.titre}</span>
                    </button>
                  </li>
                )}
                {items.length > MAX_PAR_JOUR &&
                <li className="px-1 text-2xs text-win-muted">+ {items.length - MAX_PAR_JOUR} autre(s)</li>
                }
              </ul>
            </div>);

        })}
      </div>

      <footer className="flex flex-wrap gap-3 border-t border-win-border px-3 py-2">
        {(Object.keys(LIBELLE_TYPE) as TypeElementCalendrier[]).map((t) =>
        <span key={t} className="inline-flex items-center gap-1.5 text-2xs text-win-muted">
            <span className={`h-2 w-2 rounded-full ${COULEUR_TYPE[t]}`} aria-hidden="true" />
            {LIBELLE_TYPE[t]}
          </span>
        )}
      </footer>
    </section>);

}