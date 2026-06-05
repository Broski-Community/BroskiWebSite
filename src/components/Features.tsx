import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface FeatureItem {
  id: number;
  number: string;
  title: string;
  description: string;
  image?: string;
  icon?: string;
  variant: 'primary' | 'blue' | 'secondary';
  colSpan: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  title_en: string | null;
  content_en: string | null;
  category: string;
  variant: 'default' | 'urgent' | 'event';
  icon: string;
  active: boolean;
  order_index: number;
}

const Features: React.FC = () => {
  const { t, language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const FEATURE_DATA: FeatureItem[] = [
    {
      id: 1,
      number: '01. ' + t('features.number.building'),
      title: t('features.building.title'),
      description: t('features.building.desc'),
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFOmAApsLyujWc5W7gMnMQpWikLdR_3wO01A&s',
      variant: 'primary',
      colSpan: 'md:col-span-7',
    },
    {
      id: 2,
      number: '02. ' + t('features.number.chaos'),
      title: t('features.chaos.title'),
      description: t('features.chaos.desc'),
      icon: 'theater_comedy',
      variant: 'blue',
      colSpan: 'md:col-span-5',
    },
    {
      id: 3,
      number: '03. COMMUNITY',
      title: t('features.friendship.title'),
      description: t('features.friendship.desc'),
      icon: 'group',
      variant: 'secondary',
      colSpan: 'md:col-span-12',
    },
    {
      id: 4,
      number: '04. PVP',
      title: t('features.pvp.title'),
      description: t('features.pvp.desc'),
      icon: 'swords',
      variant: 'blue',
      colSpan: 'md:col-span-4',
    },
    {
      id: 5,
      number: '05. ' + t('features.number.events'),
      title: t('features.events.title'),
      description: t('features.events.desc'),
      icon: 'emoji_events',
      variant: 'primary',
      colSpan: 'md:col-span-4',
    },
    {
      id: 6,
      number: '06. STREAMING',
      title: t('features.streaming.title'),
      description: t('features.streaming.desc'),
      icon: 'live_tv',
      variant: 'secondary',
      colSpan: 'md:col-span-4',
    },
    {
      id: 7,
      number: '07. MODDING',
      title: t('features.modding.title'),
      description: t('features.modding.desc'),
      icon: 'settings',
      variant: 'primary',
      colSpan: 'md:col-span-6',
    },
    {
      id: 8,
      number: '08. DISCORD',
      title: t('features.discord.title'),
      description: t('features.discord.desc'),
      icon: 'forum',
      variant: 'blue',
      colSpan: 'md:col-span-6',
    },
    {
      id: 9,
      number: '09. REDSTONE',
      title: t('features.redstone.title'),
      description: t('features.redstone.desc'),
      icon: 'memory',
      variant: 'secondary',
      colSpan: 'md:col-span-12',
    },
    {
      id: 10,
      number: '10. SURVIVAL',
      title: t('features.survival.title'),
      description: t('features.survival.desc'),
      icon: 'favorite',
      variant: 'primary',
      colSpan: 'md:col-span-4',
    },
    {
      id: 11,
      number: '11. CREATIVE',
      title: t('features.creative.title'),
      description: t('features.creative.desc'),
      icon: 'palette',
      variant: 'blue',
      colSpan: 'md:col-span-4',
    },
    {
      id: 12,
      number: '12. LORE',
      title: t('features.lore.title'),
      description: t('features.lore.desc'),
      icon: 'history_edu',
      variant: 'secondary',
      colSpan: 'md:col-span-4',
    },
    {
      id: 13,
      number: '13. ' + t('features.number.future'),
      title: t('features.future.title'),
      description: t('features.future.desc'),
      icon: 'rocket_launch',
      variant: 'primary',
      colSpan: 'md:col-span-12',
    },
  ];

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });
      
      if (!error && data) {
        setNews(data as NewsItem[]);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

  const displayData: FeatureItem[] = news.length > 0 
    ? news.map((item, index) => ({
        id: index + 1,
        number: String(index + 1).padStart(2, '0') + '. ' + item.category.toUpperCase(),
        title: (language === 'en' && item.title_en) ? item.title_en : item.title,
        description: (language === 'en' && item.content_en) ? item.content_en : item.content,
        icon: item.icon,
        variant: item.variant === 'urgent' ? 'blue' : item.variant === 'event' ? 'secondary' : 'primary',
        colSpan: 'md:col-span-6',
      }))
    : FEATURE_DATA;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? displayData.length - 1 : prev - 1));
  }, [displayData.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === displayData.length - 1 ? 0 : prev + 1));
  }, [displayData.length]);

  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();
    const duration = 15000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (elapsed >= duration) {
        handleNext();
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [currentIndex, handleNext]);

  const getOffset = (index: number) => {
    const total = displayData.length;
    let diff = index - currentIndex;
    if (diff > Math.floor(total / 2)) {
      diff -= total;
    } else if (diff < -Math.floor(total / 2)) {
      diff += total;
    }
    return diff;
  };

  return (
    <section className="relative flex w-full flex-col gap-stack-md overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-4 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-6">
      <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 2px, transparent 2px)', backgroundSize: '28px 28px', opacity: 0.45 }}></div>
      <div className="absolute -left-16 top-16 h-40 w-40 rotate-12 rounded-[2rem] border-4 border-black bg-primary-container opacity-70"></div>
      <div className="absolute -right-16 bottom-16 h-48 w-48 rounded-full border-4 border-black bg-secondary-container opacity-70"></div>
      <div className="relative z-20 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-blue-600 px-3 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">newsmode</span>
            BREAKING NEWS
          </div>
          <h2 className="font-headline-lg text-[44px] uppercase leading-none text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:text-[64px]">
            {t('features.section.title')}
          </h2>
        </div>
        <p className="max-w-xl rounded-3xl border-[3px] border-black bg-surface-container-high p-4 font-body-sm font-bold text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          {t('features.section.desc')}
        </p>
      </div>
      
      <div className="relative z-10 mt-2 flex h-[560px] w-full items-center justify-center sm:h-[660px]">
        <button 
          onClick={handlePrev}
          className="absolute left-2 z-30 flex items-center justify-center rounded-2xl border-[3px] border-black bg-surface text-on-surface p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none md:left-8"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>

        <div className="relative flex h-full w-full items-center justify-center">
          {displayData.map((item, index) => {
            const offset = getOffset(index);
            const isVisible = Math.abs(offset) <= 1;
            
            if (!isVisible && Math.abs(offset) !== 2) return null;

            let transformClass = 'translate-x-0 scale-0 opacity-0 z-0';
            let overlayClass = 'opacity-0';

            if (offset === 0) {
              transformClass = 'translate-x-0 scale-100 opacity-100 z-20';
              overlayClass = 'opacity-0';
            } else if (offset === -1) {
              transformClass = '-translate-x-[55%] sm:-translate-x-[65%] md:-translate-x-[75%] lg:-translate-x-[100%] scale-75 opacity-100 z-10 cursor-pointer';
              overlayClass = 'opacity-50';
            } else if (offset === 1) {
              transformClass = 'translate-x-[55%] sm:translate-x-[65%] md:translate-x-[75%] lg:translate-x-[100%] scale-75 opacity-100 z-10 cursor-pointer';
              overlayClass = 'opacity-50';
            } else if (offset === -2) {
              transformClass = '-translate-x-[110%] sm:-translate-x-[130%] md:-translate-x-[150%] lg:-translate-x-[170%] scale-50 opacity-0 z-0';
            } else if (offset === 2) {
              transformClass = 'translate-x-[110%] sm:translate-x-[130%] md:translate-x-[150%] lg:translate-x-[170%] scale-50 opacity-0 z-0';
            }

            return (
              <div 
                key={`${item.id}-${index}`}
                onClick={() => {
                  if (offset === -1) handlePrev();
                  if (offset === 1) handleNext();
                }}
                className={`absolute h-[500px] w-[310px] transition-all duration-500 ease-in-out sm:h-[590px] sm:w-[420px] ${transformClass}`}
              >
                {item.variant === 'primary' && item.image ? (
                  <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] border-[4px] border-black bg-surface-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 hover:scale-[1.03]">
                    <div className={`absolute inset-0 bg-black z-10 transition-opacity duration-500 pointer-events-none ${overlayClass}`} />
                    <div className="relative h-64 shrink-0 overflow-hidden border-b-[4px] border-black bg-primary-container">
                      <img className="w-full h-full object-cover opacity-60 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt={item.title} src={item.image} />
                      <div className="absolute left-4 top-4 rounded-2xl border-[2px] border-black bg-surface px-3 py-2 font-label-caps text-label-caps text-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {item.number}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-stack-sm overflow-y-auto p-6">
                      <h3 className="font-headline-md text-[28px] leading-tight text-primary">{item.title}</h3>
                      <p className="rounded-3xl border-2 border-black bg-surface-container-highest p-4 font-body-sm text-body-sm text-on-surface-variant">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ) : item.variant === 'blue' ? (
                  <div className="group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2.5rem] border-[4px] border-black bg-blue-600 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 hover:scale-[1.03]">
                    <div className={`absolute inset-0 bg-black z-10 transition-opacity duration-500 pointer-events-none ${overlayClass}`} />
                    <div className="flex h-full flex-col gap-stack-sm overflow-y-auto p-6">
                      <div className="flex shrink-0 items-start justify-between">
                        <span className="material-symbols-outlined rounded-3xl border-[3px] border-black bg-black/20 p-3 text-[48px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{item.icon}</span>
                        <div className="rounded-2xl border-[2px] border-black bg-surface px-3 py-2 font-label-caps text-label-caps text-blue-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          {item.number}
                        </div>
                      </div>
                      <div className="mt-auto shrink-0">
                        <h3 className="font-headline-md text-[30px] leading-tight text-white">{item.title}</h3>
                        <p className="mt-3 rounded-3xl border-2 border-black bg-blue-700/60 p-4 font-body-sm text-body-sm text-blue-100">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : item.variant === 'secondary' ? (
                  <div className="group relative flex h-full w-full flex-col justify-between overflow-y-auto rounded-[2.5rem] border-[4px] border-black bg-secondary-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 hover:scale-[1.03]">
                    <div className={`absolute inset-0 bg-black z-10 transition-opacity duration-500 pointer-events-none ${overlayClass}`} />
                    <div className="flex flex-col gap-stack-sm">
                      <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl border-[2px] border-black bg-surface px-3 py-2 font-label-caps text-label-caps text-secondary-container shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.icon}</span>
                        {item.number}
                      </div>
                      <h3 className="mt-4 shrink-0 font-headline-md text-[34px] uppercase leading-tight tracking-tight text-on-secondary-container">{item.title}</h3>
                      <p className="shrink-0 rounded-3xl border-2 border-black bg-secondary-container-highest p-4 font-body-sm text-body-sm text-on-secondary">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 flex-shrink-0">
                      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-surface px-4 py-3 font-headline-md text-[16px] text-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none">
                        {t('features.meet_members')}
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] border-[4px] border-black bg-surface-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 hover:scale-[1.03]">
                    <div className={`absolute inset-0 bg-black z-10 transition-opacity duration-500 pointer-events-none ${overlayClass}`} />
                    <div className="flex h-full flex-col gap-stack-sm overflow-y-auto p-6">
                      <div className="mb-4 flex shrink-0 items-start justify-between">
                        <span className="material-symbols-outlined rounded-3xl border-[3px] border-black bg-primary-container p-3 text-[48px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{item.icon}</span>
                        <div className="rounded-2xl border-[2px] border-black bg-surface px-3 py-2 font-label-caps text-label-caps text-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          {item.number}
                        </div>
                      </div>
                      <h3 className="shrink-0 font-headline-md text-[28px] leading-tight text-primary">{item.title}</h3>
                      <p className="shrink-0 rounded-3xl border-2 border-black bg-surface-container-highest p-4 font-body-sm text-body-sm text-on-surface-variant">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={handleNext}
          className="absolute right-2 z-30 flex items-center justify-center rounded-2xl border-[3px] border-black bg-surface p-3 text-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none md:right-8"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent"></div>
        </div>
      )}

      <div className="relative z-20 mx-auto mt-2 h-3 w-full max-w-[620px] overflow-hidden rounded-full border-2 border-black bg-surface-container-highest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div 
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
};

export default Features;
