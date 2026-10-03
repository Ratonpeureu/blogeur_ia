import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TitleBar } from './TitleBar';
import { Dock } from './Dock';
import { PreparationEtablissement } from './PreparationEtablissement';
import { useApp } from '../../contexts/AppContext';
import { useResource } from '../../hooks/useResource';
import { aujourdHui } from '../../utils/format';
import {
  ecoleAnomaliesTransport,
  ecoleDashboardDirection,
  ecoleInitialiserEtablissement,
  ecoleJournalNotifications,
  ecoleListerCandidatures,
  ecoleListerEmprunts,
  ecoleListerSignatures,
  ecoleVaccinationsARelancer } from
'../../lib/api_ecole';
import { ecoleSeedCataloguesGlobaux } from '../../lib/api_ecole_extended';
import { ecolePath } from './navigation';

// ── Initialisation automatique ──────────────────────────────────────────
// Appelée une seule fois par chargement de l'application. Les routes backend
// sont idempotentes : elles ne créent que ce qui manque.
let initialisation: Promise<void> | null = null;

function initialiserUneFois(): Promise<void> {
  if (!initialisation) {
    initialisation = (async () => {
      await ecoleInitialiserEtablissement();
      try {
        await ecoleSeedCataloguesGlobaux();
      } catch (e) {
        // Les catalogues globaux ne bloquent pas l'accès à l'établissement
        console.warn('Catalogues globaux non initialisés', e);
      }
    })().catch((e) => {
      initialisation = null;
      throw e;
    });
  }
  return initialisation;
}

export function AppShell() {
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = useCallback(() => {
    setErreur(null);
    initialiserUneFois().
    then(() => setPret(true)).
    catch((e: unknown) => setErreur(e instanceof Error ? e.message : 'Le serveur n’a pas pu préparer l’établissement.'));
  }, []);

  useEffect(() => {
    lancer();
  }, [lancer]);

  if (!pret) return <PreparationEtablissement erreur={erreur} onRetry={lancer} />;
  return <ShellContenu />;
}

function ShellContenu() {
  const { anneeId } = useApp();
  const today = aujourdHui();

  const dashboard = useResource(() => ecoleDashboardDirection(anneeId), [anneeId], !!anneeId);
  const anomalies = useResource(() => ecoleAnomaliesTransport(today), [today]);
  const vaccinations = useResource(() => ecoleVaccinationsARelancer(), []);
  const empruntsRetard = useResource(() => ecoleListerEmprunts({ statut: 'en_retard' }), []);
  const candidatures = useResource(() => ecoleListerCandidatures(), []);
  const notifications = useResource(() => ecoleJournalNotifications(), []);
  const signatures = useResource(() => ecoleListerSignatures({ signe: false }), []);

  const alertes: Record<string, number> = {
    [ecolePath('finances')]: dashboard.data?.finance.nb_familles_en_retard ?? 0,
    [ecolePath('transport')]: (anomalies.data ?? []).length,
    [ecolePath('infirmerie')]: (vaccinations.data ?? []).length,
    [ecolePath('bibliotheque')]: (empruntsRetard.data ?? []).length,
    [ecolePath('admissions')]: (candidatures.data ?? []).filter(
      (c) => c.statut === 'recue' || c.statut === 'test_effectue'
    ).length,
    [ecolePath('communication')]:
    (notifications.data ?? []).filter((n) => n.statut_envoi !== 'envoye').length + (signatures.data ?? []).length
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-win-canvas">
      <TitleBar />
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <Dock alertes={alertes} />
    </div>);

}

export function PageHeader({
  title,
  description,
  actions




}: {title: string;description?: string;actions?: React.ReactNode;}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold leading-tight text-win-text">{title}</h1>
        {description && <p className="text-xs text-win-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>);

}