import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, ChevronDownIcon, SchoolIcon, ShieldCheckIcon } from 'lucide-react';
import { useApp, periodeLabel } from '../../contexts/AppContext';
import { Select } from '../ui/primitives';
import { StatusBadge } from '../ui/Badge';
import { formatDate, formatDateLongue, aujourdHui, initiales } from '../../utils/format';
import { getEntreprise } from '@/lib/api';
import { useResource } from '../../hooks/useResource';
import { ecoleJournalNotifications, ecoleListerAnnees, ecoleAnneeActive } from '../../lib/api_ecole';

export function TitleBar() {
  const { anneeId, setAnneeId, periodeId, setPeriodeId, periodes } = useApp();
  const [flyout, setFlyout] = useState(false);
  const entreprise = getEntreprise();

  const journal = useResource(() => ecoleJournalNotifications(), []);
  const annees = useResource(() => ecoleListerAnnees(), []);
  const anneeActive = useResource(() => ecoleAnneeActive(), []);

  // Le back désigne l'année active, le front se contente de la présélectionner
  useEffect(() => {
    if (!anneeId && anneeActive.data?.id) setAnneeId(anneeActive.data.id);
  }, [anneeActive.data, anneeId, setAnneeId]);

  const aTraiter = (journal.data ?? []).filter((n) => n.statut_envoi !== 'envoye');

  return (
    <header className="sticky top-0 z-30 border-b border-win-borderStrong bg-win-chrome text-white">
      <div className="flex h-12 items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-win bg-win-accent" aria-hidden="true">
            <SchoolIcon size={16} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold">{entreprise?.nom ?? '—'}</p>
            <p className="truncate text-2xs text-white/60">{entreprise?.email ?? '—'}</p>
          </div>
        </div>

        <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />

        <span className="inline-flex items-center gap-1.5 rounded-win border border-white/20 bg-white/10 px-2 py-1 text-2xs font-medium">
          <ShieldCheckIcon size={12} />
          Console administrateur · rhmanager.site
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-2xs text-white/60 lg:inline">{formatDateLongue(aujourdHui())}</span>

          <div className="[&_select]:h-7 [&_select]:border-white/25 [&_select]:bg-white/10 [&_select]:text-white [&_span]:text-white/60">
            <Select
              label="Année"
              value={anneeId}
              onChange={setAnneeId}
              options={[
                {
                  value: '',
                  label: annees.loading ? 'Chargement…' : (annees.data ?? []).length ? 'Choisir…' : 'Aucune année',
                },
                ...(annees.data ?? []).map((a) => ({
                  value: a.id,
                  label: a.est_active ? `${a.libelle} (active)` : a.libelle,
                })),
              ]}
            />
          </div>

          <div className="[&_select]:h-7 [&_select]:border-white/25 [&_select]:bg-white/10 [&_select]:text-white [&_span]:text-white/60">
            <Select
              label="Période"
              value={periodeId}
              onChange={setPeriodeId}
              options={[
                { value: '', label: periodes.length ? 'Choisir…' : 'Aucune période' },
                ...periodes.map((p) => ({ value: p.id, label: periodeLabel(p) })),
              ]}
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFlyout((v) => !v)}
              aria-expanded={flyout}
              aria-label="Notifications à traiter"
              className="relative flex h-7 w-7 items-center justify-center rounded-win border border-white/20 bg-white/10 transition-colors duration-150 ease-out hover:bg-white/20"
            >
              <BellIcon size={14} />
              {aTraiter.length > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[15px] rounded-win bg-state-dangerFg px-0.5 text-center text-[10px] font-semibold leading-[15px]">
                  {aTraiter.length}
                </span>
              )}
            </button>

            {flyout && (
              <div className="absolute right-0 top-9 w-80 rounded-win border border-win-border bg-win-surface text-win-text shadow-flyout">
                <p className="border-b border-win-border bg-win-panel px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-win-muted">
                  Notifications à traiter
                </p>
                <ul className="max-h-72 overflow-auto">
                  {aTraiter.map((n) => (
                    <li key={n.id} className="border-b border-win-border px-3 py-2 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge value={n.statut_envoi} />
                        <span className="text-2xs text-win-faint">{formatDate(n.created_at)}</span>
                      </div>
                      <p className="mt-1 text-2xs text-win-muted">{n.contenu}</p>
                    </li>
                  ))}
                  {aTraiter.length === 0 && (
                    <li className="px-3 py-3 text-2xs text-win-muted">Aucune notification à traiter.</li>
                  )}
                </ul>
                <Link
                  to="/app/ecole/communication"
                  onClick={() => setFlyout(false)}
                  className="block w-full border-t border-win-border px-3 py-2 text-center text-2xs font-medium text-win-accent transition-colors duration-150 ease-out hover:bg-win-panel"
                >
                  Ouvrir le centre de communication
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-win border border-white/20 bg-white/10 px-2 py-1 text-2xs transition-colors duration-150 ease-out hover:bg-white/20"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-win bg-white/20 text-[10px] font-semibold">
              {initiales(entreprise?.nom, entreprise?.email)}
            </span>
            <span className="hidden sm:inline">{entreprise?.nom ?? '—'}</span>
            <ChevronDownIcon size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}