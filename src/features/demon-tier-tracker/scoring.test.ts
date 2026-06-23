/**
 * Unit tests for the Stats_Viewer scoring logic (pure).
 */
import { describe, it, expect } from 'vitest';
import {
  recordPoints,
  rankForPoints,
  hardestOf,
  computePlayerStats,
  buildLeaderboard,
  TIER_WEIGHT,
  type PlayerDemon,
} from './scoring';
import type { TierListViewRow } from './ordering';

function row(
  username: string,
  level_id: string,
  demon_name: string,
  difficulty_tier: TierListViewRow['difficulty_tier'],
  percentage: number,
): TierListViewRow {
  return {
    username,
    level_id,
    demon_name,
    difficulty_tier,
    percentage,
    updated_at: '2026-06-22T00:00:00Z',
  };
}

describe('recordPoints', () => {
  it('awards full tier weight for a 100% completion', () => {
    expect(recordPoints('extreme', 100)).toBe(TIER_WEIGHT.extreme);
    expect(recordPoints('easy', 100)).toBe(TIER_WEIGHT.easy);
  });

  it('awards proportional points for partial completions', () => {
    expect(recordPoints('extreme', 40)).toBeCloseTo(40);
    expect(recordPoints('hard', 20)).toBeCloseTo((20 / 100) * TIER_WEIGHT.hard);
  });

  it('awards zero for 0%', () => {
    expect(recordPoints('extreme', 0)).toBe(0);
  });
});

describe('rankForPoints', () => {
  it('maps low scores to Rookie', () => {
    expect(rankForPoints(0).id).toBe('rookie');
    expect(rankForPoints(999).id).toBe('rookie');
  });

  it('climbs the ladder at thresholds', () => {
    expect(rankForPoints(1000).id).toBe('bronze');
    expect(rankForPoints(2500).id).toBe('silver');
    expect(rankForPoints(80000).id).toBe('grandmaster');
  });
});

describe('hardestOf', () => {
  it('prefers the highest difficulty tier', () => {
    const demons: PlayerDemon[] = [
      { level_id: '1', demon_name: 'Easy One', demon_creator: 'A', difficulty_tier: 'easy', percentage: 100 },
      { level_id: '2', demon_name: 'Extreme One', demon_creator: 'B', difficulty_tier: 'extreme', percentage: 50 },
    ];
    expect(hardestOf(demons)?.level_id).toBe('2');
  });

  it('returns null for an empty list', () => {
    expect(hardestOf([])).toBeNull();
  });
});

describe('computePlayerStats', () => {
  it('aggregates points, completed and in-progress per player', () => {
    const rows: TierListViewRow[] = [
      row('zZalix', '10', 'Cataclysm', 'extreme', 40),
      row('zZalix', '11', 'Nine Circles', 'hard', 100),
      row('zZalix', '12', 'FlashBang', 'medium', 0),
      row('RobZeph', '11', 'Nine Circles', 'hard', 60),
    ];

    const stats = computePlayerStats(rows);
    const zz = stats.find((s) => s.username === 'zZalix')!;

    // 40% extreme (40) + 100% hard (35) + 0% medium (0) = 75
    expect(zz.totalPoints).toBeCloseTo(40 + TIER_WEIGHT.hard);
    expect(zz.completedCount).toBe(1);
    expect(zz.inProgress.map((d) => d.level_id)).toEqual(['10']); // 0% excluded
    expect(zz.completed.map((d) => d.level_id)).toEqual(['11']);
    expect(zz.hardestDemon?.level_id).toBe('11'); // hardest *completed*
  });
});

describe('buildLeaderboard', () => {
  it('orders by points desc, positions are 1-based', () => {
    const rows: TierListViewRow[] = [
      row('zZalix', '10', 'Cataclysm', 'extreme', 100), // 100 pts
      row('RobZeph', '11', 'Nine Circles', 'hard', 100), // 35 pts
    ];
    const board = buildLeaderboard(computePlayerStats(rows));
    expect(board.map((e) => e.username)).toEqual(['zZalix', 'RobZeph']);
    expect(board[0].position).toBe(1);
    expect(board[1].position).toBe(2);
  });
});
