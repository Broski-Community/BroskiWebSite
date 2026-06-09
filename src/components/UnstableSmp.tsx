import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const UnstableSmp: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="group relative my-stack-lg w-full overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container-highest p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[13px_13px_0px_0px_rgba(0,0,0,1)] md:p-10">
      <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-64 w-64 rotate-45 rounded-[2rem] border-4 border-black bg-secondary-container opacity-80 transition-transform duration-700 group-hover:rotate-[58deg]"></div>
      <div className="pointer-events-none absolute bottom-[-3rem] left-[-2rem] h-44 w-44 rotate-12 rounded-full border-4 border-black bg-primary-container opacity-80 transition-transform duration-700 group-hover:scale-110"></div>

      <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 2px, transparent 2px)', backgroundSize: '24px 24px', opacity: 0.35 }}></div>

      <div className="relative z-10 grid gap-margin md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="flex flex-col items-start gap-stack-sm">
          <div className="inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-blue-600 px-3 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">dns</span>
            {t('smp.badge')}
          </div>
          <h2 className="font-headline-lg text-[52px] uppercase leading-none tracking-tighter text-blue-500 drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] md:text-[82px]">
            ???
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border-[2px] border-black bg-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="h-4 w-4 animate-pulse rounded-full border-[2px] border-black bg-red-500"></div>
              <span className="font-label-caps text-label-caps text-white">0 - OFFLINE</span>
            </div>
            
          </div>
          <p className="mt-4 max-w-xl rounded-3xl border-[3px] border-black bg-surface-container p-4 font-body-lg text-body-lg font-bold text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            {t('smp.description')}
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 md:items-end">
          <div className="w-full rounded-[2rem] border-[4px] border-black bg-surface-container-low p-4 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] md:max-w-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-headline-md text-3xl text-white">COMING SOON</span>
              <span className="material-symbols-outlined rounded-2xl border-2 border-black bg-secondary-container p-2 text-2xl text-white">swords</span>
            </div>
            <p className="font-label-caps text-[11px] text-on-surface-variant">{t('smp.countdown_info')}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-md">
            <Link to="/countdown" className="flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl border-[4px] border-black bg-blue-600 px-8 py-5 font-headline-md text-[22px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none">
              <span>{t('smp.goto_countdown')}</span>
              <span className="font-label-caps text-[12px] opacity-80">{t('smp.of_control')}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 right-12 h-4 w-32 -skew-x-12 bg-secondary-container"></div>
      <div className="absolute left-8 top-8 h-4 w-16 skew-x-12 bg-error"></div>
      <div className="pointer-events-none absolute right-1/3 top-0 flex h-full w-48 flex-col justify-between opacity-10">
        <div className="ml-8 h-full w-1/6 bg-blue-600"></div>
      </div>
    </section>
  );
};

export default UnstableSmp;
