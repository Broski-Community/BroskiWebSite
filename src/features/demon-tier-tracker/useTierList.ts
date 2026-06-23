/**
 * Demon Tier Tracker — read-only tier list data access hook (React).
 *
 * Reads rows from the public `dtt_tier_list_view` view using the existing anon
 * Supabase client. This is a strictly READ-ONLY path: it issues only `SELECT`
 * queries and performs no insert/update/delete, so the public site physically
 * cannot mutate data (Req 10.5). The hook fetches once on mount, reflecting the
 * committed database state as of the time the page load begins (Req 9.8); the
 * design specifies that data refreshes on the next page load, so no realtime
 * subscription is used.
 *
 * The view returns one row per (demon, player-record) pair with the columns
 * `level_id`, `demon_name`, `difficulty_tier`, `username`, `percentage`,
 * `updated_at`. Rows are typed as {@link TierListViewRow} and can be passed
 * directly to {@link groupByTier} for rendering.
 *
 * _Requirements: 9.8, 10.5_
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import type { TierListViewRow } from './ordering';

/** Name of the public read-only view exposing the tier list. */
export const TIER_LIST_VIEW = 'dtt_tier_list_view';

/** Columns selected from the view, matching {@link TierListViewRow}. */
export const TIER_LIST_COLUMNS =
  'level_id, demon_name, difficulty_tier, username, percentage, updated_at, demon_creator';

/**
 * The result of a single read against `dtt_tier_list_view`.
 */
export interface FetchTierListResult {
  /** Rows returned by the view; empty array on error. */
  rows: TierListViewRow[];
  /** Error message if the read failed, otherwise null. */
  error: string | null;
}

/**
 * Perform a single fresh, read-only `SELECT` against `dtt_tier_list_view`.
 *
 * This is the one place the tier list data is read. It issues only a `SELECT`
 * (never a write, Req 10.5) and returns whatever the database holds at the
 * moment it runs, so each invocation reflects the committed state as of that
 * call (Req 9.8). Both the {@link useTierList} hook and freshness tests call
 * this so they exercise the exact same query (same view + columns).
 */
export async function fetchTierListRows(): Promise<FetchTierListResult> {
  // Read-only: SELECT against the public view, never a writable table.
  const { data, error: queryError } = await supabase
    .from(TIER_LIST_VIEW)
    .select(TIER_LIST_COLUMNS);

  if (queryError) {
    return { rows: [], error: queryError.message };
  }
  return { rows: (data ?? []) as TierListViewRow[], error: null };
}

/**
 * The state returned by {@link useTierList}.
 */
export interface UseTierListResult {
  /** Rows from `dtt_tier_list_view`; empty until the first load resolves. */
  rows: TierListViewRow[];
  /** True while the initial (or a refetch) request is in flight. */
  loading: boolean;
  /** Error message if the read failed, otherwise null. */
  error: string | null;
  /** Re-run the read against the current committed database state. */
  refetch: () => void;
}

/**
 * React hook that reads the demon tier list from `dtt_tier_list_view` via the
 * anon Supabase client (read-only).
 *
 * Manages `loading` and `error` state and exposes the fetched `rows`. Fetches
 * on mount and reflects the committed state at load time (Req 9.8). A manual
 * {@link UseTierListResult.refetch} is provided for explicit reloads; it never
 * writes to the database (Req 10.5).
 */
export function useTierList(): UseTierListResult {
  const [rows, setRows] = useState<TierListViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);

    // Single fresh read-only SELECT; reflects committed state at call time.
    const { rows: fetchedRows, error: fetchError } = await fetchTierListRows();

    if (signal?.cancelled) return;

    if (fetchError) {
      setError(fetchError);
      setRows([]);
    } else {
      setRows(fetchedRows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  return { rows, loading, error, refetch };
}
