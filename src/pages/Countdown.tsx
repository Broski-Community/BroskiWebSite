import { useState, useEffect, useRef, useCallback } from 'react';
import PageAnimator from '../components/PageAnimator';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabaseClient';

const DEFAULT_TARGET = '';

const playTick = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
    setTimeout(() => ctx.close(), 100);
  } catch {}
};

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const getTimeLeft = (target: string): TimeLeft => {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

const Countdown: React.FC = () => {
  const { t } = useLanguage();
  const [targetDate, setTargetDate] = useState(DEFAULT_TARGET);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(DEFAULT_TARGET));
  const [muted, setMuted] = useState(false);
  const prevSeconds = useRef(timeLeft.seconds);

  // Fetch target date from supabase
  useEffect(() => {
    const fetchTarget = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'countdown_target')
        .single();
      if (data?.value) {
        setTargetDate(data.value);
        setTimeLeft(getTimeLeft(data.value));
      }
    };
    fetchTarget();
  }, []);

  const tick = useCallback(() => {
    const newTime = getTimeLeft(targetDate);
    if (newTime.seconds !== prevSeconds.current && !muted) {
      playTick();
    }
    prevSeconds.current = newTime.seconds;
    setTimeLeft(newTime);
  }, [targetDate, muted]);

  useEffect(() => {
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [tick]);

  const isFinished = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  const blocks: { value: number; label: string }[] = [
    { value: timeLeft.days, label: t('countdown.days') },
    { value: timeLeft.hours, label: t('countdown.hours') },
    { value: timeLeft.minutes, label: t('countdown.minutes') },
    { value: timeLeft.seconds, label: t('countdown.seconds') },
  ];

  return (
    <PageAnimator className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 2px, transparent 2px)', backgroundSize: '28px 28px' }} />
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-secondary-container/20 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8">
        {/* Badge */}
        <div className="inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-blue-600 px-4 py-2 font-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="material-symbols-outlined text-[18px]">timer</span>
          Might SMP
        </div>

        {/* Title */}
        <h1 className="text-center font-headline-lg text-[48px] uppercase leading-none tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] sm:text-[72px] lg:text-[96px]">
          {isFinished ? t('countdown.launched') : t('countdown.title')}
        </h1>

        {/* Timer blocks */}
        {!isFinished && (
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
            {blocks.map((block) => (
              <div
                key={block.label}
                className="flex flex-col items-center gap-3 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="font-headline-lg text-[56px] leading-none text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] sm:text-[72px]">
                  {String(block.value).padStart(2, '0')}
                </span>
                <span className="font-label-caps text-[12px] text-on-surface-variant">
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {isFinished && (
          <p className="rounded-3xl border-[3px] border-black bg-primary-container px-8 py-4 font-headline-md text-[24px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {t('countdown.finished')}
          </p>
        )}

        {/* Mute button */}
        <button
          onClick={() => setMuted(!muted)}
          className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-surface-container-high px-5 py-3 font-label-caps text-[12px] text-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[20px]">
            {muted ? 'volume_off' : 'volume_up'}
          </span>
          {muted ? t('countdown.unmute') : t('countdown.mute')}
        </button>
      </div>
    </PageAnimator>
  );
};

export default Countdown;
