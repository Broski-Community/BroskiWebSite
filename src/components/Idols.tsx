import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface YoutubeVideo {
  title: string;
  link: string;
  thumbnail: string;
}

interface IdolData {
  name: string;
  channelId: string;
  channelLink: string;
  colorClass: string;
  textColorClass: string;
  btnTextColorClass: string;
  description: string;
  defaultImage: string;
  fallbackVideoUrl?: string;
}

const idolsData: IdolData[] = [
  {
    name: 'un1verso',
    channelId: 'UCU7QmMl0-MvJZBBq8MhkAiQ',
    channelLink: 'https://youtube.com/@un1versoMC',
    colorClass: 'bg-primary',
    textColorClass: 'text-primary',
    btnTextColorClass: 'text-on-primary',
    description: "Un player (non) normale di Minecraft. Sempre pronto a creare nuove dinamiche e storie sul server. (è l'universo, btw)",
    defaultImage: 'https://placehold.co/600x350/2E5BFF/FFFFFF?text=un1verso'
  },
  {
    name: 'BlimMC',
    channelId: 'UCHFhHTPQKk8uffihq4TbY9Q',
    channelLink: 'https://youtube.com/@BlimMC',
    colorClass: 'bg-secondary',
    textColorClass: 'text-secondary',
    btnTextColorClass: 'text-on-secondary',
    description: "E' molto vivace e ha sempre voglia di registrare nuovi video e proporre idee perfette.",
    defaultImage: 'https://placehold.co/600x350/FF1F44/FFFFFF?text=Blim'
  },
  {
    name: 'Muffin',
    channelId: 'UCDDsl6EiHfLtJFLQwfpdgvA',
    channelLink: 'https://youtube.com/@il_Muffin',
    colorClass: 'bg-error',
    textColorClass: 'text-error',
    btnTextColorClass: 'text-on-error',
    description: "E' uno dei più skillati del gruppo. E' determinato, saggio e in grado di fare qualunque cosa se vuole.",
    defaultImage: 'https://placehold.co/600x350/FF1F44/FFFFFF?text=Muffin',
    fallbackVideoUrl: 'https://www.youtube.com/watch?v=BBUWO2U8jrA'
  }
];

const IdolCard: React.FC<{ data: IdolData }> = ({ data }) => {
  const { t } = useLanguage();
  const [video, setVideo] = useState<YoutubeVideo | null>(null);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        // Primo tentativo: RSS feed
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=${data.channelId}`);
        const result = await response.json();
        
        if (result.status === 'ok' && result.items && result.items.length > 0) {
          const longVideos = result.items.filter((item: any) => {
            const isShort = item.link.includes('/shorts/');
            return !isShort;
          });
          
          if (longVideos.length > 0) {
            const latestVideo = longVideos[0];
            const maxRes = latestVideo.thumbnail?.replace('hqdefault.jpg', 'maxresdefault.jpg') || latestVideo.thumbnail;
            setVideo({
              title: latestVideo.title,
              link: latestVideo.link,
              thumbnail: maxRes
            });
            return; // Trovato, finito
          }
        }

        // Fallback: YouTube Data API v3 con filtro videoDuration
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (!apiKey) return;

        // Cerca video con durata "medium" (4-20 min) o "long" (20+ min)
        for (const duration of ['medium', 'long'] as const) {
          const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${data.channelId}&order=date&type=video&videoDuration=${duration}&maxResults=1&key=${apiKey}`
          );
          const searchData = await searchRes.json();

          if (searchData.items && searchData.items.length > 0) {
            const item = searchData.items[0];
            const videoId = item.id.videoId;
            const thumbnail = item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url;
            setVideo({
              title: item.snippet.title,
              link: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: thumbnail
            });
            return;
          }
        }
      } catch (error) {
        console.error(`Error loading video for ${data.name}:`, error);
      }
    };

    fetchLatestVideo();
  }, [data.channelId, data.name]);

  return (
    <div className={`group relative flex min-h-[420px] flex-col overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-2 hover:shadow-[11px_11px_0px_0px_rgba(0,0,0,1)]`}>
      <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full border-4 border-black opacity-80 transition-transform duration-700 group-hover:scale-125 ${data.colorClass}`}></div>
      <div className="relative mb-5 h-35 overflow-hidden rounded-3xl border-[3px] border-black bg-surface-container-lowest shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <img 
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" 
          alt={video?.title || data.name} 
          src={video?.thumbnail || data.defaultImage} 
          onError={(e) => {
            // Fallback: prova hqdefault se maxresdefault fallisce, poi defaultImage
            const src = e.currentTarget.src;
            if (src.includes('maxresdefault')) {
              e.currentTarget.src = src.replace('maxresdefault.jpg', 'hqdefault.jpg');
            } else {
              e.currentTarget.src = data.defaultImage;
            }
          }}
        />
        {video && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <a href={video.link} target="_blank" rel="noopener noreferrer">
              <span className="material-symbols-outlined rounded-full border-2 border-black bg-white p-3 text-5xl text-black shadow-[4px_4px_0_rgba(0,0,0,1)]">play_circle</span>
            </a>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-2xl border-2 border-black bg-black px-3 py-2 font-label-caps text-[10px] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {t('idols.creator')}
        </div>
      </div>
      <h3 className={`relative z-10 font-headline-md text-[32px] uppercase leading-none ${data.textColorClass}`}>{data.name}</h3>
      {video ? (
        <p className="relative z-10 mb-4 mt-3 line-clamp-4 flex-grow rounded-3xl border-2 border-black bg-surface-container-highest p-4 font-body-sm text-body-sm text-on-surface-variant" title={video.title}>
          <span className="mb-1 block font-bold text-white">{t('idols.latest_video')}</span>
          {video.title}
        </p>
      ) : (
        <p className="relative z-10 mb-4 mt-3 flex-grow rounded-3xl border-2 border-black bg-surface-container-highest p-4 font-body-sm text-body-sm text-on-surface-variant">
          {data.description}
        </p>
      )}
      <a 
        href={video?.link || data.fallbackVideoUrl || data.channelLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative z-10 mt-auto block w-full rounded-2xl border-[3px] border-black px-4 py-3 text-center font-label-caps text-label-caps shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none ${data.colorClass} ${data.btnTextColorClass}`}
      >
        {t('idols.watch_video')}
      </a>
    </div>
  );
};

const Idols: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="relative flex w-full flex-col gap-stack-md overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-4 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-6">
      <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 2px, transparent 2px)', backgroundSize: '26px 26px', opacity: 0.35 }}></div>
      <div className="absolute -right-16 top-8 h-48 w-48 rotate-12 rounded-[2rem] border-4 border-black bg-primary-container opacity-70"></div>
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-secondary-container px-3 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">smart_display</span>
            {t('idols.badge')}
          </div>
          <h2 className="font-headline-lg text-[44px] uppercase leading-none text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:text-[64px]">
            {t('idols.title')}
          </h2>
        </div>
        <p className="max-w-xl rounded-3xl border-[3px] border-black bg-surface-container-high p-4 font-body-sm font-bold text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          {t('idols.description')}
        </p>
      </div>
      <div className={`relative z-10 grid grid-cols-1 gap-margin ${
        idolsData.length === 1 ? 'md:grid-cols-1' :
        idolsData.length === 2 ? 'md:grid-cols-2' :
        idolsData.length === 3 ? 'md:grid-cols-3' :
        'md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {idolsData.map((idol) => (
          <IdolCard key={idol.name} data={idol} />
        ))}
      </div>
    </section>
  );
};

export default Idols;
