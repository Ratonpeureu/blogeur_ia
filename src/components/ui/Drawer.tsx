import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-[520px]'
}: {open: boolean;onClose: () => void;title: string;subtitle?: string;children: React.ReactNode;footer?: React.ReactNode;width?: string;}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
          type="button"
          aria-label="Fermer le panneau"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 cursor-default bg-win-chrome/35" />
        
          <motion.aside
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className={`relative flex h-full max-w-[92vw] flex-col border-l border-win-borderStrong bg-win-canvas shadow-flyout ${width}`}>
          
            <header className="flex items-start justify-between gap-3 border-b border-win-border bg-win-surface px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-win-text">{title}</h2>
                {subtitle && <p className="truncate text-2xs text-win-muted">{subtitle}</p>}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 border border-transparent p-1 text-win-muted rounded-win transition-colors duration-150 ease-out hover:bg-state-dangerBg hover:text-state-dangerFg">
              
                <XIcon size={16} />
              </button>
            </header>
            <div className="flex-1 overflow-auto p-4">{children}</div>
            {footer && <footer className="border-t border-win-border bg-win-surface px-4 py-2.5">{footer}</footer>}
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}