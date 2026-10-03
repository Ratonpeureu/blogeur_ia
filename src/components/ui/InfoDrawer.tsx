// components/ui/InfoDrawer.tsx
// Panneau de détail lisible : liste de champs libellés (aucun identifiant technique).
import React from 'react';
import { Drawer } from './Drawer';
import { FieldRow } from './primitives';

export interface InfoField {
  label: string;
  value: React.ReactNode;
}

export function InfoDrawer({
  open,
  onClose,
  title,
  subtitle,
  fields,
  children,
  footer,
  width = 'w-[480px]'









}: {open: boolean;onClose: () => void;title: string;subtitle?: string;fields?: InfoField[];children?: React.ReactNode;footer?: React.ReactNode;width?: string;}) {
  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle} width={width} footer={footer}>
      {fields && fields.length > 0 &&
      <dl className="mb-3">
          {fields.map((f) =>
        <FieldRow key={f.label} label={f.label}>
              {f.value === null || f.value === undefined || f.value === '' ? '—' : f.value}
            </FieldRow>
        )}
        </dl>
      }
      {children}
    </Drawer>);

}