// components/ui/ComboboxField.tsx
// Liste de sélection avec recherche — pour les longues listes (élèves, parents, enseignants…).
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { normaliser } from '../../utils/labels';

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  /** Ajoute une entrée « aucune sélection » en tête de liste */
  allowEmpty?: boolean;
  className?: string;
}

export function ComboboxField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Sélectionner…',
  required,
  disabled,
  loading,
  emptyLabel = 'Aucune donnée disponible',
  allowEmpty,
  className = ''
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const id = useId();

  const toutes = useMemo(
    () => allowEmpty ? [{ value: '', label: placeholder }, ...options] : options,
    [allowEmpty, options, placeholder]
  );
  const selection = options.find((o) => o.value === value);

  const filtrees = useMemo(() => {
    const q = normaliser(recherche);
    return q ? toutes.filter((o) => normaliser(`${o.label} ${o.hint ?? ''}`).includes(q)) : toutes;
  }, [recherche, toutes]);

  useEffect(() => {
    if (!open) return;
    const fermer = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecherche('');
      setActif(Math.max(0, toutes.findIndex((o) => o.value === value)));
      requestAnimationFrame(() => champ.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choisir(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActif((i) => Math.min(i + 1, filtrees.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtrees[actif];
      if (o) choisir(o.value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={racine} className={`relative flex flex-col gap-1 ${className}`}>
      <span id={`${id}-label`} className="text-2xs font-medium text-win-muted">
        {label}
        {required && <span className="text-state-dangerFg"> *</span>}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-win border border-win-borderStrong bg-white px-2 text-left text-xs text-win-text transition-colors duration-150 ease-out focus:border-win-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
        
        <span className={`truncate ${selection ? '' : 'text-win-faint'}`}>
          {selection ? selection.label : loading ? 'Chargement…' : placeholder}
        </span>
        <ChevronsUpDownIcon size={12} className="shrink-0 text-win-faint" />
      </button>

      {open &&
      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-win border border-win-border bg-win-surface shadow-flyout">
          <div className="flex items-center gap-1.5 border-b border-win-border px-2">
            <SearchIcon size={12} className="text-win-faint" />
            <input
            ref={champ}
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setActif(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Rechercher…"
            aria-label={`Rechercher dans ${label}`}
            className="h-8 w-full bg-transparent text-xs text-win-text placeholder:text-win-faint focus:outline-none" />
          
          </div>
          <ul role="listbox" aria-labelledby={`${id}-label`} className="max-h-60 overflow-auto py-1">
            {filtrees.map((o, i) =>
          <li
            key={o.value || '__vide'}
            role="option"
            aria-selected={o.value === value}
            onMouseEnter={() => setActif(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              choisir(o.value);
            }}
            className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs ${i === actif ? 'bg-win-accentSoft' : ''}`}>
            
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${o.value ? 'text-win-text' : 'text-win-faint'}`}>{o.label}</span>
                  {o.hint && <span className="block truncate text-2xs text-win-muted">{o.hint}</span>}
                </span>
                {o.value === value && o.value !== '' && <CheckIcon size={12} className="shrink-0 text-win-accent" />}
              </li>
          )}
            {filtrees.length === 0 &&
          <li className="px-2 py-3 text-2xs text-win-muted">
                {loading ? 'Chargement…' : options.length ? 'Aucun résultat' : emptyLabel}
              </li>
          }
          </ul>
        </div>
      }
    </div>);

}