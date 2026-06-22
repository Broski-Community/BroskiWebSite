/**
 * Demon Tier Tracker — DemonRank page (React container).
 *
 * Container for the ranked DemonRank route (`/demonrank`). Reads the read-only
 * tier-list view via {@link usePlayerStats} (anon Supabase, SELECT only),
 * derives the leaderboard + per-player stats with the pure `scoring.ts` logic,
 * owns the selected-player state, and delegates rendering to {@link DemonRankView}.
 *
 * The page leads with a dedicated hero section and a "how it works" panel that
 * explains the points formula and the rank ladder, then shows the leaderboard +
 * player detail. Loading/error UI lives here; data/empty branches live in the view.
 */
import React, { useEffect, useState } from 'react';
import PageAnimator from '../../components/PageAnimator';
import { usePlayerStats } from './usePlayerStats';
import DemonRankView from './DemonRankView';
import {
  RANK_LADDER,
  TIER_WEIGHT,
  type RankTier,
} from './scoring';
import type { DifficultyTier } from './ordering';

const LoadingState: React.FC = () => (
  <div className="flex justify-center py-16">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border-[3px] border-black bg-surface-container p-12 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
    <span className="material-symbols-outlined text-[64px] text-red-400/60">error</span>
    <p className="font-headline-md text-[18px] text-white">Impossibile caricare la classifica</p>
    <p className="max-w-md font-body-sm text-on-surface-variant">{message}</p>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-primary-container px-6 py-3 font-headline-md text-[15px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
    >
      <span className="material-symbols-outlined text-[20px]">refresh</span>
      Riprova
    </button>
  </div>
);

/** Difficulty tiers ordered hardest → easiest, for the points legend. */
const TIER_ORDER: { tier: DifficultyTier; label: string; chip: string }[] = [
  { tier: 'extreme', label: 'Extreme', chip: 'bg-red-500/20 text-red-300' },
  { tier: 'insane', label: 'Insane', chip: 'bg-orange-500/20 text-orange-300' },
  { tier: 'hard', label: 'Hard', chip: 'bg-amber-500/20 text-amber-300' },
  { tier: 'medium', label: 'Medium', chip: 'bg-sky-500/20 text-sky-300' },
  { tier: 'easy', label: 'Easy', chip: 'bg-emerald-500/20 text-emerald-300' },
];

/** Dedicated hero section, styled like the other pages. */
const Hero: React.FC = () => (
  <header className="relative overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
    <div
      className="absolute inset-0 bg-surface-container-lowest"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.18) 2px, transparent 2px)',
        backgroundSize: '26px 26px',
        opacity: 0.4,
      }}
    />
    <div className="pointer-events-none absolute right-[-6rem] top-[-4rem] h-64 w-64 rounded-full bg-tertiary/20 blur-3xl" />
    <div className="relative z-10 p-8 md:p-12">
      <div className="mb-6 inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-tertiary px-4 py-2 font-label-caps text-label-caps text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <span className="material-symbols-outlined text-[20px]">stadia_controller</span>
        Geometry Dash · Community
      </div>
      <h1 className="mb-4 font-headline-lg text-[48px] uppercase leading-none tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] md:text-[72px]">
        DEMON <span className="text-primary-container">RANK</span>
      </h1>
      <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
        Scala la classifica della community guadagnando punti per ogni demon che
        affronti. Più i demon sono difficili, più punti valgono. Completa al 100%
        per il massimo e scala i ranghi.
      </p>
    </div>
  </header>
);

/** Compact "how it works" panel: points formula + tier weights + rank ladder. */
const HowItWorks: React.FC = () => (
  <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
    {/* Points */}
    <div className="rounded-2xl border-[3px] border-black bg-surface-container p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[2px] border-black bg-tertiary text-black">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
        </span>
        <h3 className="font-headline-md text-[16px] uppercase tracking-tight text-white">
          Come funzionano i punti
        </h3>
      </div>
      <p className="mb-4 font-body-sm text-[13px] text-on-surface-variant">
        Ogni demon assegna punti in base alla difficoltà. Un tentativo parziale
        dà una quota proporzionale; il 100% dà il punteggio pieno.
      </p>
      <div className="mb-4 rounded-xl border-[2px] border-black bg-surface-container-high px-4 py-3 text-center font-headline-md text-[14px] text-white">
        punti = (percentuale / 100) × valore del tier
      </div>
      <div className="flex flex-wrap gap-2">
        {TIER_ORDER.map(({ tier, label, chip }) => (
          <span
            key={tier}
            className={`inline-flex items-center gap-1.5 rounded-lg border-[2px] border-black px-2.5 py-1 font-label-caps text-[11px] uppercase ${chip}`}
          >
            {label}
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-white">
              {TIER_WEIGHT[tier]}
            </span>
          </span>
        ))}
      </div>
    </div>

    {/* Ranks */}
    <div className="rounded-2xl border-[3px] border-black bg-surface-container p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[2px] border-black bg-fuchsia-500 text-white">
          <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
        </span>
        <h3 className="font-headline-md text-[16px] uppercase tracking-tight text-white">
          I ranghi
        </h3>
      </div>
      <p className="mb-4 font-body-sm text-[13px] text-on-surface-variant">
        Il tuo rango dipende dai punti totali. Accumula punti per salire di
        livello e superare gli altri giocatori in classifica.
      </p>
      <ul className="flex flex-col gap-2">
        {RANK_LADDER.map((rank: RankTier) => (
          <li
            key={rank.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-high px-3 py-1.5"
          >
            <span
              className={`rounded-md border-[2px] border-black px-2 py-0.5 font-label-caps text-[10px] uppercase ${rank.badgeClass}`}
            >
              {rank.label}
            </span>
            <span className="font-body-sm text-[12px] text-on-surface-variant">
              {rank.minPoints === 0
                ? 'da 0 pts'
                : `da ${rank.minPoints.toLocaleString('it-IT')} pts`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const DemonRankPage: React.FC = () => {
  const { leaderboard, statsByPlayer, loading, error, refetch } = usePlayerStats();
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  // Default the selection to the leader once data loads, and keep the selection
  // valid if it disappears on a refetch.
  useEffect(() => {
    if (leaderboard.length === 0) {
      setSelectedUsername(null);
      return;
    }
    setSelectedUsername((current) => {
      if (current && leaderboard.some((e) => e.username === current)) {
        return current;
      }
      return leaderboard[0].username;
    });
  }, [leaderboard]);

  const selected = selectedUsername
    ? statsByPlayer.get(selectedUsername) ?? null
    : null;

  return (
    <PageAnimator className="relative w-full overflow-hidden px-4 pb-16 pt-8 sm:px-margin">
      <div className="pointer-events-none absolute left-[-8rem] top-28 h-72 w-72 rounded-full bg-primary-container/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-[40rem] h-80 w-80 rounded-full bg-secondary-container/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10">
        <Hero />
        <HowItWorks />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <DemonRankView
            leaderboard={leaderboard}
            selectedUsername={selectedUsername}
            selected={selected}
            onSelect={setSelectedUsername}
          />
        )}
      </div>
    </PageAnimator>
  );
};

export default DemonRankPage;
