// components/shell/PreparationEtablissement.tsx
// Écran affiché pendant l'initialisation automatique de l'établissement.
import React from 'react';
import { Loader2Icon, SchoolIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../ui/primitives';

export function PreparationEtablissement({
  erreur,
  onRetry



}: {erreur: string | null;onRetry: () => void;}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-win-canvas px-4">
      <div className="w-full max-w-sm rounded-win border border-win-border bg-win-surface p-6 text-center shadow-win">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-win bg-win-accent text-white" aria-hidden="true">
          <SchoolIcon size={20} />
        </span>
        {erreur ?
        <>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-win-text">
              <TriangleAlertIcon size={14} className="text-state-dangerFg" />
              Préparation interrompue
            </p>
            <p className="mt-1 text-xs text-win-muted">{erreur}</p>
            <div className="mt-4">
              <Button variant="primary" onClick={onRetry}>
                Réessayer
              </Button>
            </div>
          </> :

        <>
            <p className="mt-4 text-sm font-semibold text-win-text">Préparation de l’établissement…</p>
            <p className="mt-1 text-xs text-win-muted">Référentiel, année scolaire, périodes et catalogues.</p>
            <Loader2Icon size={18} className="mx-auto mt-4 animate-spin text-win-accent" aria-label="Chargement" />
          </>
        }
      </div>
    </div>);

}