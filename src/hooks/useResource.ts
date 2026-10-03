import { useCallback, useEffect, useState } from 'react';

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Charge une ressource depuis le backend (seule source de vérité).
 * `enabled = false` empêche l'appel tant que les paramètres requis manquent.
 */
export function useResource<T>(
fetcher: () => Promise<T>,
deps: unknown[],
enabled = true)
: ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetcher().
    then((res) => {
      if (!cancelled) setData(res);
    }).
    catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
    }).
    finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  return { data, loading, error, reload };
}

export function useSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<unknown>, onDone?: () => void) => {
    setSubmitting(true);
    setError(null);
    try {
      await fn();
      onDone?.();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Échec de l'opération");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, setError, run };
}