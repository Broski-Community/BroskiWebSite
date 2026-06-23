/**
 * Demon Tier Tracker — tier list grouping and ordering (pure logic).
 *
 * Pure, dependency-free functions (no React, no network, no Supabase) that
 * transform flat `tier_list_view` (`dtt_tier_list_view`) rows into the grouped,
 * ordered structure the Tier_List_Site renders. Keeping this logic pure lets
 * tasks 6.4/6.5 property-test it directly.
 *
 * Behavior (per design "Tier List Display"):
 * - Demons are grouped by difficulty tier, with tiers ordered from highest
 *   difficulty to lowest (Req 9.1).
 * - Within a demon, player records are ordered by percentage descending, with
 *   ties broken alphabetically (ascending) by player username (Req 9.5).
 * - Each record exposes its percentage as an integer in 0..100 (Req 9.3).
 *
 * _Requirements: 9.1, 9.3, 9.5_
 */

/**
 * The predefined difficulty tiers (matches the Postgres `difficulty_tier`
 * enum). Values are the lowercase enum labels stored in the database.
 */
export type DifficultyTier =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'insane'
  | 'extreme';

/**
 * Canonical difficulty ordering, from HIGHEST difficulty to LOWEST.
 *
 * The Tier_List_Site renders tier groups in this exact order (Req 9.1). This is
 * the single source of truth for tier ordering; do not reorder ad hoc.
 */
export const DIFFICULTY_TIER_ORDER: readonly DifficultyTier[] = [
  'extreme',
  'insane',
  'hard',
  'medium',
  'easy',
] as const;

/**
 * A single row from the `tier_list_view` (`dtt_tier_list_view`).
 *
 * The view joins demons with their player records, so a demon with N player
 * records yields N rows sharing the same `level_id`/`demon_name`/`difficulty_tier`.
 *
 * Columns returned by the view: `level_id`, `demon_name`, `difficulty_tier`,
 * `username`, `percentage`, `updated_at`.
 */
export interface TierListViewRow {
  /** GD numeric level id as a string. */
  level_id: string;
  /** Display name of the demon. */
  demon_name: string;
  /** The level creator's name, or null/undefined when unknown. */
  demon_creator?: string | null;
  /** The demon's difficulty tier. */
  difficulty_tier: DifficultyTier;
  /** The player who holds this record. */
  username: string;
  /**
   * Stored best percentage. The view column is `numeric(5,2)`, so this may be a
   * fractional value (and Supabase may surface numerics as strings); it is
   * normalized to an integer 0..100 in the grouped output.
   */
  percentage: number | string;
  /** Last-updated timestamp (UTC ISO string). */
  updated_at: string;
}

/**
 * A single player's record on a demon, as rendered in the grouped output.
 */
export interface PlayerRecord {
  /** The player who holds this record. */
  username: string;
  /** Best percentage, normalized to an integer in 0..100 (Req 9.3). */
  percentage: number;
  /** Last-updated timestamp (UTC ISO string). */
  updated_at: string;
}

/**
 * A demon together with its ordered player records.
 */
export interface DemonGroup {
  /** GD numeric level id as a string. */
  level_id: string;
  /** Display name of the demon. */
  demon_name: string;
  /** The level creator's name, or null when unknown. */
  demon_creator: string | null;
  /** The demon's difficulty tier. */
  difficulty_tier: DifficultyTier;
  /**
   * Player records ordered by percentage descending, ties broken by username
   * ascending (case-insensitive) (Req 9.5).
   */
  records: PlayerRecord[];
}

/**
 * A difficulty tier together with the demons that belong to it.
 */
export interface TierGroup {
  /** The difficulty tier of every demon in this group. */
  difficulty_tier: DifficultyTier;
  /** Demons in this tier, each with its ordered records. */
  demons: DemonGroup[];
}

/**
 * The grouped, ordered tier list: a list of tier groups ordered from highest
 * difficulty to lowest (Req 9.1).
 */
export type GroupedTierList = TierGroup[];

/**
 * Normalize a stored percentage to an integer in the range 0..100 (Req 9.3).
 *
 * The view percentage is `numeric(5,2)` and may arrive as a number or a string;
 * it is rounded to the nearest integer and clamped to [0, 100]. Non-finite or
 * unparseable values are treated as 0.
 */
export function toIntegerPercentage(value: number | string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

/**
 * Whether a record should show the 100% visual indicator (Req 9.6).
 *
 * The indicator is present if and only if the record's (already normalized)
 * integer percentage equals exactly 100. This is the single source of truth for
 * the badge decision so the Tier_List_Site and its tests agree on the rule.
 *
 * Callers should pass a percentage that has already been normalized via
 * {@link toIntegerPercentage}; passing a raw value works too, but the predicate
 * only returns true for an exact `=== 100`.
 */
export function hasHundredPercentIndicator(percentage: number): boolean {
  return percentage === 100;
}

/**
 * Order player records by percentage descending; ties are broken by username
 * ascending, compared case-insensitively (Req 9.5).
 *
 * Returns a new array; the input is not mutated. Comparison is
 * case-insensitive: usernames are compared after lowercasing, so e.g. "alice"
 * and "Alice" sort as equal on the tie-break, with their relative order then
 * left stable.
 */
export function orderRecords(records: readonly PlayerRecord[]): PlayerRecord[] {
  return [...records].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    const an = a.username.toLowerCase();
    const bn = b.username.toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
}

/**
 * Group flat `tier_list_view` rows into demons-by-tier, with tiers ordered
 * highest difficulty → lowest and records ordered within each demon.
 *
 * - Tier groups appear in {@link DIFFICULTY_TIER_ORDER} order; tiers with no
 *   demons are omitted (Req 9.1).
 * - Demons within a tier preserve first-encounter order from the input rows.
 * - Records within a demon are ordered by {@link orderRecords} (Req 9.5).
 * - Percentages are exposed as integers in 0..100 (Req 9.3).
 *
 * The input is not mutated.
 */
export function groupByTier(rows: readonly TierListViewRow[]): GroupedTierList {
  // Collect demons in first-encounter order, keyed by level_id.
  const demonsByLevelId = new Map<string, DemonGroup>();
  const demonOrder: string[] = [];

  for (const row of rows) {
    let demon = demonsByLevelId.get(row.level_id);
    if (!demon) {
      demon = {
        level_id: row.level_id,
        demon_name: row.demon_name,
        demon_creator: row.demon_creator ?? null,
        difficulty_tier: row.difficulty_tier,
        records: [],
      };
      demonsByLevelId.set(row.level_id, demon);
      demonOrder.push(row.level_id);
    }
    demon.records.push({
      username: row.username,
      percentage: toIntegerPercentage(row.percentage),
      updated_at: row.updated_at,
    });
  }

  // Bucket demons by tier, preserving first-encounter order within each tier.
  const demonsByTier = new Map<DifficultyTier, DemonGroup[]>();
  for (const levelId of demonOrder) {
    const demon = demonsByLevelId.get(levelId)!;
    demon.records = orderRecords(demon.records);
    const bucket = demonsByTier.get(demon.difficulty_tier);
    if (bucket) {
      bucket.push(demon);
    } else {
      demonsByTier.set(demon.difficulty_tier, [demon]);
    }
  }

  // Emit tier groups in canonical highest→lowest order, omitting empty tiers.
  const groups: GroupedTierList = [];
  for (const tier of DIFFICULTY_TIER_ORDER) {
    const demons = demonsByTier.get(tier);
    if (demons && demons.length > 0) {
      groups.push({ difficulty_tier: tier, demons });
    }
  }
  return groups;
}
