/**
 * Demon Tier Tracker — DemonRank presentational view (React).
 *
 * Pure data-in/markup-out: renders the ranked leaderboard on the left and the
 * selected player's profile on the right. The player's "In corso" (in-progress)
 * and "Completati" (completed) demons live in TWO SEPARATE cards. All data is
 * computed upstream by the pure `scoring.ts` helpers; this file only renders.
 */
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { DifficultyTier } from './ordering';
import {
  formatPoints,
  type LeaderboardEntry,
  type PlayerDemon,
  type PlayerStats,
} from './scoring';

/** Italian-friendly labels for difficulty tiers. */
const TIER_LABEL: Record<DifficultyTier, string> = {
  extreme: 'Extreme',
  insane: 'Insane',
  hard: 'Hard',
  medium: 'Medium',
  easy: 'Easy',
};

/** Bar fill color per tier, used by the progress report. */
const TIER_BAR: Record<DifficultyTier, string> = {
  extreme: 'bg-red-500',
  insane: 'bg-orange-500',
  hard: 'bg-amber-500',
  medium: 'bg-sky-500',
  easy: 'bg-emerald-500',
};

/** Deterministic avatar background from a username. */
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-red-500',
  'bg-emerald-500',
  'bg-fuchsia-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-rose-500',
];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** A single leaderboard row. */
const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  selected: boolean;
  onSelect: (username: string) => void;
}> = ({ entry, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(entry.username)}
    className={`flex w-full items-center gap-3 rounded-2xl border-[3px] px-4 py-3 text-left transition-all ${
      selected
        ? 'border-yellow-400 bg-surface-container-high shadow-[4px_4px_0px_0px_rgba(250,204,21,0.4)]'
        : 'border-black bg-surface-container hover:-translate-y-0.5 hover:bg-surface-container-high'
    }`}
  >
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-black font-headline-md text-[14px] text-black ${
        entry.position === 1
          ? 'bg-yellow-400'
          : entry.position === 2
            ? 'bg-slate-300'
            : entry.position === 3
              ? 'bg-amber-600'
              : 'bg-surface-container-high text-white'
      }`}
    >
      {entry.position}
    </span>
    <span className="flex min-w-0 flex-col gap-1">
      <span className="truncate font-headline-md text-[15px] uppercase tracking-tight text-white">
        {entry.username}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md border-[2px] border-black px-1.5 py-0.5 font-label-caps text-[9px] uppercase ${entry.rank.badgeClass}`}
        >
          {entry.rank.label}
        </span>
        <span className="rounded-md border-[2px] border-black bg-blue-500/20 px-1.5 py-0.5 font-label-caps text-[9px] uppercase text-blue-200">
          {Math.round(entry.totalPoints)} pts
        </span>
      </span>
    </span>
  </button>
);

/** A stat tile in the player header row. */
const StatTile: React.FC<{
  value: React.ReactNode;
  label: string;
  sub?: string;
  icon: string;
  iconClass: string;
  valueClass?: string;
}> = ({ value, label, sub, icon, iconClass, valueClass }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-black bg-surface-container p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <div className="min-w-0">
      <p className={`font-headline-lg text-[22px] leading-none ${valueClass ?? 'text-white'}`}>
        {value}
      </p>
      <p className="mt-1 font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      {sub ? (
        <p className="mt-0.5 truncate font-body-sm text-[11px] text-on-surface-variant/80">
          {sub}
        </p>
      ) : null}
    </div>
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-black ${iconClass}`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </span>
  </div>
);

/** A single in-progress demon row with a percentage bar. */
const ProgressRow: React.FC<{ demon: PlayerDemon }> = ({ demon }) => (
  <li>
    <div className="mb-1 flex items-baseline justify-between gap-3">
      <span className="truncate font-headline-md text-[14px] text-white">
        {demon.demon_name}
      </span>
      <span className="shrink-0 font-headline-md text-[13px] text-red-400">
        {demon.percentage}%
      </span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full border-[2px] border-black bg-black/40">
      <div
        className={`h-full rounded-full ${TIER_BAR[demon.difficulty_tier]}`}
        style={{ width: `${demon.percentage}%` }}
      />
    </div>
  </li>
);

/** A single completed demon row. */
const CompletedRow: React.FC<{ demon: PlayerDemon }> = ({ demon }) => (
  <li className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-high px-3 py-2">
    <span className="truncate font-body-sm text-[14px] text-white">
      {demon.demon_name}
    </span>
    <span className="flex shrink-0 items-center gap-2">
      <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
        {TIER_LABEL[demon.difficulty_tier]}
      </span>
      <span className="inline-flex items-center gap-1 rounded-md border-[2px] border-black bg-tertiary px-2 py-0.5 font-label-caps text-[10px] text-black">
        <span className="material-symbols-outlined text-[13px]">verified</span>
        100%
      </span>
    </span>
  </li>
);

/** Card heading with an icon and a count chip. */
const CardHeading: React.FC<{
  icon: string;
  iconClass: string;
  title: string;
  count: number;
}> = ({ icon, iconClass, title, count }) => (
  <div className="mb-4 flex items-center gap-2">
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg border-[2px] border-black ${iconClass}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </span>
    <h3 className="font-headline-md text-[15px] uppercase tracking-tight text-white">
      {title}
    </h3>
    <span className="ml-auto rounded-md border-[2px] border-black bg-surface-container-high px-2 py-0.5 font-label-caps text-[10px] text-on-surface-variant">
      {count}
    </span>
  </div>
);

/** Props for {@link DemonRankView}. */
export interface DemonRankViewProps {
  /** Ranked leaderboard. */
  leaderboard: LeaderboardEntry[];
  /** Currently selected player's username (or null when none). */
  selectedUsername: string | null;
  /** Stats for the selected player (or null). */
  selected: PlayerStats | null;
  /** Called when a leaderboard row is clicked. */
  onSelect: (username: string) => void;
}

/** The player detail panel (right side). */
const PlayerDetail: React.FC<{
  stats: PlayerStats;
  position: number | null;
}> = ({ stats, position }) => {
  const { t } = useLanguage();
  return (
  <div className="flex flex-col gap-5">
    {/* Header */}
    <div className="flex items-center gap-4 rounded-2xl border-[3px] border-black bg-surface-container p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
      <span
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black font-headline-lg text-[28px] text-white ${avatarColor(
          stats.username,
        )}`}
      >
        {stats.username.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="font-label-caps text-[11px] uppercase tracking-wide text-on-surface-variant">
          {t('demonrank.detail.rank')} {position !== null ? `#${position}` : '—'} · {stats.rank.label}
        </p>
        <h2 className="truncate font-headline-lg text-[30px] leading-none text-white">
          {stats.username}
        </h2>
      </div>
    </div>

    {/* Stat tiles */}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile
        value={formatPoints(stats.totalPoints)}
        label={t('demonrank.detail.points')}
        icon="bolt"
        iconClass="bg-tertiary text-black"
        valueClass="text-tertiary"
      />
      <StatTile
        value={stats.completedCount}
        label={t('demonrank.detail.beaten')}
        icon="task_alt"
        iconClass="bg-red-500 text-white"
      />
      <StatTile
        value={
          stats.hardestDemon ? (
            <span className="block truncate text-[18px]">
              {stats.hardestDemon.demon_name}
            </span>
          ) : (
            '—'
          )
        }
        label={t('demonrank.detail.hardest')}
        sub={
          stats.hardestDemon
            ? `${TIER_LABEL[stats.hardestDemon.difficulty_tier]} · ${stats.hardestDemon.percentage}%`
            : undefined
        }
        icon="local_fire_department"
        iconClass="bg-fuchsia-500 text-white"
      />
    </div>

    {/* Two separate cards: In corso / Completati. Each card has a fixed max
        height with its own internal scroll so long lists never stretch the page. */}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* In progress card */}
      <div className="flex max-h-[460px] flex-col rounded-2xl border-[3px] border-black bg-surface-container p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <CardHeading
          icon="trending_up"
          iconClass="bg-red-500 text-white"
          title={t('demonrank.card.inprogress')}
          count={stats.inProgress.length}
        />
        {stats.inProgress.length === 0 ? (
          <p className="font-body-sm text-[13px] text-on-surface-variant/80">
            {t('demonrank.card.inprogress_empty')}
          </p>
        ) : (
          <ul
            data-lenis-prevent
            className="dtt-scroll -mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-2"
          >
            {stats.inProgress.map((d) => (
              <ProgressRow key={d.level_id} demon={d} />
            ))}
          </ul>
        )}
      </div>

      {/* Completed card */}
      <div className="flex max-h-[460px] flex-col rounded-2xl border-[3px] border-black bg-surface-container p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <CardHeading
          icon="military_tech"
          iconClass="bg-tertiary text-black"
          title={t('demonrank.card.completed')}
          count={stats.completed.length}
        />
        {stats.completed.length === 0 ? (
          <p className="font-body-sm text-[13px] text-on-surface-variant/80">
            {t('demonrank.card.completed_empty')}
          </p>
        ) : (
          <ul
            data-lenis-prevent
            className="dtt-scroll -mr-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-2"
          >
            {stats.completed.map((d) => (
              <CompletedRow key={d.level_id} demon={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
  );
};

/**
 * The DemonRank board: leaderboard + selected-player detail. Renders an empty
 * state when there are no players yet.
 */
const DemonRankView: React.FC<DemonRankViewProps> = ({
  leaderboard,
  selectedUsername,
  selected,
  onSelect,
}) => {
  const { t } = useLanguage();
  if (leaderboard.length === 0) {
    return (
      <div
        data-testid="demonrank-empty"
        className="flex flex-col items-center gap-4 rounded-2xl border-[3px] border-black bg-surface-container p-12 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
      >
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant/40">
          leaderboard
        </span>
        <p className="font-headline-md text-[18px] text-white">{t('demonrank.empty.title')}</p>
        <p className="font-body-sm text-on-surface-variant">
          {t('demonrank.empty.desc')}
        </p>
      </div>
    );
  }

  const selectedPosition =
    leaderboard.find((e) => e.username === selectedUsername)?.position ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Leaderboard */}
      <aside className="self-start rounded-2xl border-[3px] border-black bg-surface-container-high/40 p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] lg:sticky lg:top-24">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border-[2px] border-black bg-tertiary px-3 py-1 font-label-caps text-[10px] uppercase text-black">
          <span className="material-symbols-outlined text-[14px]">emoji_events</span>
          {t('demonrank.board.badge')}
        </span>
        <h2 className="mb-4 font-headline-lg text-[26px] uppercase tracking-tight text-white">
          {t('demonrank.board.title')}
        </h2>
        <div className="flex flex-col gap-2.5">
          {leaderboard.map((entry) => (
            <LeaderboardRow
              key={entry.username}
              entry={entry}
              selected={entry.username === selectedUsername}
              onSelect={onSelect}
            />
          ))}
        </div>
      </aside>

      {/* Detail */}
      {selected ? (
        <PlayerDetail stats={selected} position={selectedPosition} />
      ) : (
        <div className="flex items-center justify-center rounded-2xl border-[3px] border-black bg-surface-container p-12 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-body-sm text-on-surface-variant">
            {t('demonrank.detail.select')}
          </p>
        </div>
      )}
    </div>
  );
};

export default DemonRankView;
