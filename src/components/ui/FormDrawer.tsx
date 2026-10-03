import React from 'react';
import { Drawer } from './Drawer';
import { Button } from './primitives';

/**
 * Panneau de création/édition : même chrome que le Drawer de détail.
 * Aucune logique métier — l'envoi est intégralement délégué au backend.
 */
export function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  submitting,
  error,
  submitLabel = 'Enregistrer',
  children,
  width











}: {open: boolean;onClose: () => void;title: string;subtitle?: string;onSubmit: () => void;submitting?: boolean;error?: string | null;submitLabel?: string;children: React.ReactNode;width?: string;}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width={width}
      footer={
      <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Envoi…' : submitLabel}
          </Button>
        </div>
      }>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-3">
        
        {error &&
        <p className="border border-[#EFC2C2] bg-state-dangerBg px-2 py-1.5 text-2xs text-state-dangerFg rounded-win">
            {error}
          </p>
        }
        {children}
      </form>
    </Drawer>);

}