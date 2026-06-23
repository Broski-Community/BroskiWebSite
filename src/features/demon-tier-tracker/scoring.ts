/**
 * Demon Tier Tracker — points, ranks and per-player aggregation (pure logic).
 *
 * Pure, dependency-free functions (no React, no network, no Supabase) that turn
 * the flat `dtt_tier_list_view` rows into the ranked, per-player structure the
 * Stats_Viewer renders:
 *
 *  - a points score per player (partial credit weighted by difficulty tier),
 *  - a rank tier derived from that score (Rookie → Grandmaster),
 *  - a leaderboard ordered by points,
 *  - and per-player "in progress" / "completed" demon breakdowns.
 *
 * Keeping this logic pure mirrors `ordering.ts` and lets it be unit-tested
 * directly without rendering anything.
 */
import {
  DIFFICULTY_TIER_ORDER,
  toIntegerPercentage,
  type DifficultyTier,
  type TierListViewRow,
} from './ordering';

/** A demon as it appears inside a single player's breakdown. */
export interface PlayerDemon {
  /** GD numeric level id as a string. */
  level_id: string;
  /** Display name of the demon. */
  demon_name: string;
  /** The level creator's name, or null when unknown. */
  demon_creator: string | null;
  /** The demon's difficulty tier. */
  difficulty_tier: DifficultyTier;
  /** Best percentage for this player on this demon, integer 0..100. */
  percentage: number;
}

/**
 * Points awarded for a *full* (100%) completion of a demon, by difficulty tier.
 * Partial completions earn a proportional share (see {@link recordPoints}).
 */
export const TIER_WEIGHT: Record<DifficultyTier, number> = {
  extreme: 100,
  insane: 60,
  hard: 35,
  medium: 15,
  easy: 5,
};

/**
 * Points a single record contributes: a fraction of the tier weight equal to
 * the completion percentage. A 100% completion earns the full tier weight; a
 * 40% attempt on an extreme earns 40. Always >= 0.
 */
export function recordPoints(
  tier: DifficultyTier,
  percentage: number,
): number {
  const pct = toIntegerPercentage(percentage);
  return (pct / 100) * TIER_WEIGHT[tier];
}

/** A named rank tier with a display color, derived purely from total points. */
export interface RankTier {
  /** Machine id of the rank. */
  id: string;
  /** Display label (e.g. "Rookie"). */
  label: string;
  /** Minimum total points required to reach this rank (inclusive). */
  minPoints: number;
  /** Tailwind classes for the rank badge. */
  badgeClass: string;
}

/**
 * The rank ladder, ordered from lowest to highest. A player's rank is the
 * highest tier whose {@link RankTier.minPoints} they meet or exceed.
 */
export const RANK_LADDER: readonly RankTier[] = [
  { id: 'rookie', label: 'Rookie', minPoints: 0, badgeClass: 'bg-zinc-500/20 text-zinc-300' },
  { id: 'bronze', label: 'Bronze', minPoints: 1000, badgeClass: 'bg-amber-700/30 text-amber-300' },
  { id: 'silver', label: 'Silver', minPoints: 2500, badgeClass: 'bg-slate-300/20 text-slate-100' },
  { id: 'gold', label: 'Gold', minPoints: 5000, badgeClass: 'bg-yellow-500/20 text-yellow-300' },
  { id: 'platinum', label: 'Platinum', minPoints: 10000, badgeClass: 'bg-teal-400/20 text-teal-200' },
  { id: 'diamond', label: 'Diamond', minPoints: 20000, badgeClass: 'bg-sky-400/20 text-sky-200' },
  { id: 'master', label: 'Master', minPoints: 40000, badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300' },
  { id: 'grandmaster', label: 'Grandmaster', minPoints: 75000, badgeClass: 'bg-red-500/25 text-red-300' },
] as const;

/**
 * The rank tier for a given total-points value: the highest ladder entry whose
 * threshold is met. Negative/zero points map to the first tier.
 */
export function rankForPoints(totalPoints: number): RankTier {
  let current = RANK_LADDER[0];
  for (const tier of RANK_LADDER) {
    if (totalPoints >= tier.minPoints) {
      current = tier;
    } else {
      break;
    }
  }
  return current;
}

/** Index of a tier in the canonical highest→lowest order (0 = hardest). */
function tierRank(tier: DifficultyTier): number {
  return DIFFICULTY_TIER_ORDER.indexOf(tier);
}

/** Full per-player statistics, ready to render. */
export interface PlayerStats {
  /** Player username. */
  username: string;
  /** Total points (may be fractional); rounded only for display. */
  totalPoints: number;
  /** Number of demons completed at exactly 100%. */
  completedCount: number;
  /** Number of demons attempted (any record with percentage > 0). */
  attemptedCount: number;
  /** The hardest completed demon, or hardest attempted if none completed. */
  hardestDemon: PlayerDemon | null;
  /** Demons in progress (0 < percentage < 100), hardest/closest first. */
  inProgress: PlayerDemon[];
  /** Demons completed (percentage === 100), hardest first. */
  completed: PlayerDemon[];
  /** Rank tier derived from {@link totalPoints}. */
  rank: RankTier;
}

/**
 * Pick the "hardest" demon from a list: highest difficulty tier first, then
 * highest percentage, then demon name ascending. Returns null for an empty list.
 */
export function hardestOf(demons: readonly PlayerDemon[]): PlayerDemon | null {
  let best: PlayerDemon | null = null;
  for (const d of demons) {
    if (best === null) {
      best = d;
      continue;
    }
    const dr = tierRank(d.difficulty_tier);
    const br = tierRank(best.difficulty_tier);
    if (dr < br) {
      best = d;
    } else if (dr === br) {
      if (d.percentage > best.percentage) {
        best = d;
      } else if (
        d.percentage === best.percentage &&
        d.demon_name.toLowerCase() < best.demon_name.toLowerCase()
      ) {
        best = d;
      }
    }
  }
  return best;
}

/** Sort demons hardest-first (tier, then percentage desc, then name asc). */
function sortHardestFirst(demons: PlayerDemon[]): PlayerDemon[] {
  return [...demons].sort((a, b) => {
    const ar = tierRank(a.difficulty_tier);
    const br = tierRank(b.difficulty_tier);
    if (ar !== br) return ar - br;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return a.demon_name.toLowerCase() < b.demon_name.toLowerCase() ? -1 : 1;
  });
}

/**
 * Aggregate flat view rows into one {@link PlayerStats} per player.
 *
 * Each (player, demon) row contributes points proportional to its percentage
 * and tier. A demon counts as completed at exactly 100% and as "in progress"
 * while 0 < percentage < 100. Players are keyed case-sensitively by username as
 * stored; the returned array preserves no particular order (use
 * {@link buildLeaderboard} to rank).
 */
export function computePlayerStats(
  rows: readonly TierListViewRow[],
): PlayerStats[] {
  const byPlayer = new Map<string, PlayerDemon[]>();

  for (const row of rows) {
    const demon: PlayerDemon = {
      level_id: row.level_id,
      demon_name: row.demon_name,
      demon_creator: row.demon_creator ?? null,
      difficulty_tier: row.difficulty_tier,
      percentage: toIntegerPercentage(row.percentage),
    };
    const bucket = byPlayer.get(row.username);
    if (bucket) {
      bucket.push(demon);
    } else {
      byPlayer.set(row.username, [demon]);
    }
  }

  const out: PlayerStats[] = [];
  for (const [username, demons] of byPlayer) {
    let totalPoints = 0;
    const completed: PlayerDemon[] = [];
    const inProgress: PlayerDemon[] = [];
    const attempted: PlayerDemon[] = [];

    for (const d of demons) {
      totalPoints += recordPoints(d.difficulty_tier, d.percentage);
      if (d.percentage > 0) attempted.push(d);
      if (d.percentage >= 100) {
        completed.push(d);
      } else if (d.percentage > 0) {
        inProgress.push(d);
      }
    }

    const hardestDemon =
      hardestOf(completed) ?? hardestOf(inProgress) ?? null;

    out.push({
      username,
      totalPoints,
      completedCount: completed.length,
      attemptedCount: attempted.length,
      hardestDemon,
      inProgress: sortHardestFirst(inProgress),
      completed: sortHardestFirst(completed),
      rank: rankForPoints(totalPoints),
    });
  }

  return out;
}

/** A single leaderboard row: a ranked player summary. */
export interface LeaderboardEntry {
  /** 1-based leaderboard position. */
  position: number;
  /** Player username. */
  username: string;
  /** Total points. */
  totalPoints: number;
  /** Number of completed demons. */
  completedCount: number;
  /** Rank tier. */
  rank: RankTier;
}

/**
 * Order players into a leaderboard: points descending, then completed-count
 * descending, then username ascending (case-insensitive). Positions are 1-based
 * and strictly increasing (no shared positions on ties).
 */
export function buildLeaderboard(
  stats: readonly PlayerStats[],
): LeaderboardEntry[] {
  return [...stats]
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1;
    })
    .map((s, i) => ({
      position: i + 1,
      username: s.username,
      totalPoints: s.totalPoints,
      completedCount: s.completedCount,
      rank: s.rank,
    }));
}

/** Format a points value the way the Stats_Viewer shows it (2 decimals). */
export function formatPoints(points: number): string {
  return points.toFixed(2);
}
