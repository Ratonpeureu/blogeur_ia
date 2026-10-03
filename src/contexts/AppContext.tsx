import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ecoleAnneeActive,
  ecoleInitialiserEtablissement,
  ecoleListerCycles,
  ecoleListerPeriodes,
} from '../lib/api_ecole';
import type { Periode } from '../lib/api_ecole';

const ANNEE_KEY = 'ecole_annee_scolaire_id';
const INIT_KEY = 'ecole_init_tentee';

interface AppContextValue {
  anneeId: string;
  setAnneeId: (id: string) => void;
  periodeId: string;
  setPeriodeId: (id: string) => void;
  periodes: Periode[];
  periodeLibelle: string;
  anneeLibelle: string;
  reloadPeriodes: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function periodeLabel(p: Periode): string {
  const libelle = (p as Record<string, unknown>).libelle;
  return typeof libelle === 'string' && libelle ? libelle : `Période ${p.ordre}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [anneeId, setAnneeIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(ANNEE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [periodeId, setPeriodeId] = useState('');
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [tick, setTick] = useState(0);

  function setAnneeId(id: string) {
    setAnneeIdState(id);
    try {
      localStorage.setItem(ANNEE_KEY, id);
    } catch {}
  }

  // ── Auto-initialisation (une seule fois par navigateur) ─────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Déjà tenté et réussi une fois → on ne refait pas
        if (localStorage.getItem(INIT_KEY) === 'ok') return;

        // Vérifie l'état actuel : s'il y a déjà des cycles et une année
        // active, inutile d'appeler la route.
        const [cycles, annee] = await Promise.all([
          ecoleListerCycles().catch(() => []),
          ecoleAnneeActive().catch(() => null),
        ]);
        if (cancelled) return;

        if ((cycles ?? []).length > 0 && annee) {
          localStorage.setItem(INIT_KEY, 'ok');
          if (!anneeId && annee) setAnneeId(annee.id);
          return;
        }

        // Rien ou partiel → on initialise
        await ecoleInitialiserEtablissement();
        localStorage.setItem(INIT_KEY, 'ok');

        if (cancelled) return;

        // Récupère l'année tout juste créée et la sélectionne
        const a = await ecoleAnneeActive();
        if (!cancelled && a) setAnneeId(a.id);
      } catch (e) {
        // Silencieux — l'utilisateur verra l'état vide et pourra re-tenter
        // via le bouton si on en garde un quelque part.
        console.warn('[ecole] auto-init échouée :', e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Volontairement au montage uniquement : [...]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Chargement des périodes dès qu'on a une année ───────────────────
  useEffect(() => {
    let cancelled = false;
    if (!anneeId) {
      setPeriodes([]);
      setPeriodeId('');
      return;
    }
    ecoleListerPeriodes(anneeId)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : [];
        setPeriodes(list);
        setPeriodeId((current) =>
          list.some((p) => p.id === current) ? current : list[0]?.id ?? ''
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPeriodes([]);
          setPeriodeId('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [anneeId, tick]);

  const value = useMemo<AppContextValue>(
    () => ({
      anneeId,
      setAnneeId,
      periodeId,
      setPeriodeId,
      periodes,
      periodeLibelle: (() => {
        const p = periodes.find((x) => x.id === periodeId);
        return p ? periodeLabel(p) : '';
      })(),
      anneeLibelle: anneeId,
      reloadPeriodes: () => setTick((t) => t + 1),
    }),
    [anneeId, periodeId, periodes]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans AppProvider');
  return ctx;
}