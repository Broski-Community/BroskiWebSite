import React, { useState } from 'react';
import PageAnimator from '../components/PageAnimator';
import { useLanguage } from '../context/LanguageContext';

// Icone SVG personalizzate per mantenere indipendenza dalle librerie
const DiscordIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TwitchIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

interface Member {
  name: string;
  rank: Rank;
  discord: string;
  youtube: string;
  twitch: string;
  description: string;
  bgColor: string;
}

type Rank = 'Founder' | 'Co-Founder' | 'Admin' | 'Mod';

type RankFilter = Rank | 'Tutti';

const membersData: Member[] = [
  { 
    name: "zZalix", 
    rank: "Founder", 
    discord: "zzalix._.", 
    youtube: "https://youtube.com/@zZalixMC", 
    twitch: "https://twitch.tv/zZalix", 
    description: "Il visionario fondatore della Broski Community. Con la sua creatività instabile ha dato vita a un ecosistema unico dove caos e innovazione si fondono perfettamente. Le sue idee folli mantengono sempre alta l'adrenalina e spingono i membri a superare i limiti. Content creator versatile che spazia dal PvP competitivo alle serie narrative. È il motore che tiene in movimento l'intera community, sempre alla ricerca di nuovi format e esperienze da condividere.", 
    bgColor: "#fc55f4" 
  },
  { 
    name: "un1verso", 
    rank: "Founder", 
    discord: "un1verso_", 
    youtube: "https://youtube.com/@un1versoMC", 
    twitch: "https://twitch.tv/un1versomc", 
    description: "Il pilastro portante della community e braccio destro di zZalix. Gestisce le dinamiche interne con saggezza e coordinazione, trasformando ogni caos in opportunità. Esperto di gestione community e moderazione, è sempre pronto a risolvere conflitti e creare nuove attività coinvolgenti. Il suo approccio calmo e strategico bilancia perfettamente l'energia instabile del founder, assicurando stabilità e crescita costante.", 
    bgColor: "#4e4e4e" 
  },
  { 
    name: "Pirata91", 
    rank: "Founder", 
    discord: "piratamc", 
    youtube: "-", 
    twitch: "https://twitch.tv/PirataMC_", 
    description: "Il capitano indiscusso dei mari di Minecraft e maestro delle avventure oceaniche. La sua passione per l'esplorazione e la scoperta lo porta costantemente alla ricerca di nuovi tesori, dungeon nascosti e battaglie epiche contro mostri marini. Streamer carismatico che trasforma ogni sessione di gioco in un'esperienza narrativa coinvolgente. La sua energia contagiosa e il spirito avventuroso ispirano la community a esplorare oltre i confini conosciuti.", 
    bgColor: "#212222" 
  },
  { 
    name: "a'", 
    rank: "Co-Founder", 
    discord: "aeveloy", 
    youtube: "https://youtube.com/@klockish.official", 
    twitch: "-", 
    description: "La mente misteriosa e tattica della leadership. Specialista in strategia PvP e analisi competitiva, porta un approccio metodico e preciso alla gestione della community. La sua presenza è fondamentale per bilanciare l'impulsività creativa con logica e pianificazione. Un vero genio nell'ombra che anticipa le mosse future della community, studiando trend e preparando il terreno per nuove sfide e opportunità.", 
    bgColor: "#a2def0" 
  },
  { 
    name: "il_Muffin", 
    rank: "Co-Founder", 
    discord: "for_muffin", 
    youtube: "https://youtube.com/@il_Muffin", 
    twitch: "-", 
    description: "L'amministratore che incarna l'autorità giusta e necessaria. Mantiene l'ordine con mano ferma dove regna il caos assoluto, intervenendo sempre con fairness e ragionevolezza. La sua presenza è garanzia di regole rispettate e ambiente sano per tutti. Content creator rispettato che porta valore attraverso tutorial, guide e gameplay di qualità. La sua esperienza lo rende un mentore naturale per i nuovi membri della community.", 
    bgColor: "#440c0c" 
  },
  { 
    name: "gabryX2", 
    rank: "Admin", 
    discord: "270984", 
    youtube: "https://youtube.com/@gabryX2-mc", 
    twitch: "-", 
    description: "Architetto visionario e stratega militare. Trasforma semplici blocchi in opere d'arte monumentali e basi fortificate inespugnabili. La sua competenza in redstone e meccaniche di gioco è leggendaria nella community. Crea strutture che non sono solo belle da vedere ma funzionali e strategicamente perfectte. Il suo approccio ingegneristico al gioco offre nuove prospettive su come Minecraft possa essere usato come strumento creativo e tattico.", 
    bgColor: "#36a336" 
  },
  { 
    name: "Zeph", 
    rank: "Admin", 
    discord: "z3phmc", 
    youtube: "https://youtube.com/@ZephSMP", 
    twitch: "-", 
    description: "Admin definito dalla velocità di esecuzione e precisione chirurgica. Non perdona gli errori ma è sempre pronto ad aiutare chi mostra volontà di migliorare. La sua efficienza nella gestione di situazioni complesse è ammirata da tutti. Content creator tecnico che analizza meccaniche di gioco e fornisce insights dettagliati. La sua dedizione alla community si manifesta attraverso un supporto costante e consigli pratici per chiunque ne abbia bisogno.", 
    bgColor: "#615235" 
  },
  { 
    name: "Zlem", 
    rank: "Mod", 
    discord: "zlem_08273", 
    youtube: "-", 
    twitch: "-", 
    description: "L'occhio vigile della chat che non lascia sfuggire nulla. Ogni messaggio, ogni interazione, ogni potenziale problema viene monitorato e gestito con professionalità. La sua attenzione ai dettagli e la costante presenza fanno di lui un moderatore indispensabile. Cura particolarmente l'atmosfera della community, intervenendo tempestivamente per mantenere conversazioni costruttive e rispettose. Disponibile e cortese, rappresenta il perfetto equilibrio tra autorità e amichevolezza.", 
    bgColor: "#dddcdc" 
  }
];

const RankBadge = ({ rank }: { rank: Rank }) => {
  let colorClass = "bg-surface-variant text-on-surface";
  if (rank === "Founder") colorClass = "bg-error-container text-white";
  if (rank === "Co-Founder") colorClass = "bg-blue-600 text-white";
  if (rank === "Admin") colorClass = "bg-secondary-container text-white";
  if (rank === "Mod") colorClass = "bg-[#00F0FF] text-black"; // Neon Cyan per contrasto

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] sm:text-xs font-label-caps border-2 border-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${colorClass}`}>
      <span className="material-symbols-outlined text-[14px]">verified</span>
      {rank}
    </span>
  );
};

const getMemberImage = (member: Member) => `/skins/${member.name}.png`;

const getMemberStats = (t: (key: string) => string) => [
  {
    label: t('social.crew.active'),
    value: membersData.length,
    icon: 'groups'
  },
  {
    label: t('social.channels'),
    value: membersData.filter((member) => member.youtube !== '-').length,
    icon: 'smart_display'
  },
  {
    label: t('social.streamers'),
    value: membersData.filter((member) => member.twitch !== '-').length,
    icon: 'stadia_controller'
  }
];

const rankFilters: RankFilter[] = ['Tutti', 'Founder', 'Co-Founder', 'Admin', 'Mod'];

const SocialHero = ({ activeFilter, onFilterChange, visibleCount, t }: { activeFilter: RankFilter; onFilterChange: (filter: RankFilter) => void; visibleCount: number; t: (key: string) => string }) => (
  <div className="w-full">
    <section className="relative mb-10 overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
      <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 2px, transparent 2px)', backgroundSize: '26px 26px', opacity: 0.4 }} />
      <div className="absolute -left-16 top-10 h-44 w-44 rounded-[2rem] border-4 border-black bg-primary-container rotate-12 opacity-90" />
      <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full border-4 border-black bg-secondary-container opacity-90" />
      <div className="absolute bottom-6 right-10 hidden h-28 w-28 rounded-3xl border-4 border-black bg-tertiary rotate-45 opacity-80 md:block" />

      <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div className="flex flex-col items-start gap-5">
          <div className="inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-secondary-container px-3 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            {t('social.title')}
          </div>

          <div>
            <h1 className="font-headline-lg text-[52px] leading-[0.9] tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] sm:text-[76px] lg:text-[96px]">
              BROSKI
              <span className="block text-secondary-container">SOCIAL</span>
            </h1>
            <p className="mt-4 max-w-2xl rounded-3xl border-[3px] border-black bg-surface-container-high p-4 font-body-lg text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              {t('social.subtitle')}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-3">
            <a 
              href="#crew-grid" 
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#crew-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-primary-container px-5 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              {t('tierlist.cta.leaderboard')}
              <span className="material-symbols-outlined">arrow_downward</span>
            </a>
            <div className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-surface-bright px-4 py-3 font-label-caps text-xs text-on-surface shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-symbols-outlined text-[18px] text-tertiary">visibility</span>
              {visibleCount} {t('social.crew.active')}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {getMemberStats(t).map((stat) => (
              <div key={stat.label} className="rounded-3xl border-[3px] border-black bg-surface-container-high p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-headline-md text-3xl text-white">{stat.value}</span>
                  <span className="material-symbols-outlined rounded-2xl border-2 border-black bg-tertiary p-2 text-2xl text-black">{stat.icon}</span>
                </div>
                <p className="mt-2 font-label-caps text-[11px] text-on-surface-variant">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border-[3px] border-black bg-surface-container-low p-3 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <p className="mb-3 px-1 font-label-caps text-[11px] text-on-surface-variant">{t('social.filter.all')}</p>
            <div className="flex flex-wrap gap-2">
              {rankFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => onFilterChange(filter)}
                  className={`rounded-2xl border-2 border-black px-3 py-2 font-label-caps text-[11px] transition-all ${
                    activeFilter === filter
                      ? 'bg-secondary-container text-white shadow-none translate-x-[2px] translate-y-[2px]'
                      : 'bg-surface-bright text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const MemberCard = ({ member, index, t }: { member: Member; index: number; t: (key: string) => string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Hardcoded avatar URLs per member
  const avatarUrlMap: Record<string, string> = {
    // member avatars format?
    // 'memberName': 'https://example.com/avatar.jpg',
    'zZalix': '/social/zZalix.jpg',
    'un1verso': '/social/un1pfp.png',
    'a\'': '/social/a\'.webp',
    'il_Muffin': '/social/muffin.webp',
    'Pirata91': '/social/pirata91.webp',
    'gabryX2': '/social/gabryX2.webp',
    'Zeph': '/social/zeph.webp',
    'Zlem': '/social/zlem.webp'
  };

  const [avatarUrl] = useState(
    avatarUrlMap[member.name] || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${member.discord}&backgroundColor=2E5BFF,FF1F44&textColor=ffffff`
  );

  const socialCount = [member.discord, member.youtube, member.twitch].filter((item) => item !== '-').length;

  return (
    <div 
      className={`group relative mb-8 overflow-hidden rounded-[2rem] border-[5px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ${isExpanded ? '-translate-y-2 shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]' : 'hover:-translate-y-3 hover:shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]'}`}
    >
        {/* Intestazione Card - Design Brutalist */}
        <div 
          className="cursor-pointer relative overflow-hidden"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={`member-panel-${member.name}`}
        >
          {/* Elementi geometrici di sfondo */}
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border-[4px] border-black opacity-40" style={{ backgroundColor: member.bgColor }}></div>
          <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full border-[3px] border-black opacity-30" style={{ backgroundColor: member.bgColor }}></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>

          <div className="relative z-10 grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            
            {/* Avatar - Anello colorato spesso con ombra */}
            <div className="relative shrink-0">
              <div className="absolute -inset-3 rounded-full border-[4px] border-black" style={{ backgroundColor: member.bgColor }}></div>
              <img 
                src={avatarUrl} 
                alt={member.discord} 
                className="relative h-24 w-24 rounded-full border-[5px] border-black bg-surface-container object-cover shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:h-28 sm:w-28"
              />
              {/* Status online con icona */}
              <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-green-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-[20px] text-black">wifi</span>
              </div>
            </div>
            
            {/* Info - Gerarchia con ombre */}
            <div className="flex min-w-0 flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <RankBadge rank={member.rank} />
                <span className="rounded-xl border-[3px] border-black bg-tertiary px-3 py-1.5 font-label-caps text-[12px] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  #{String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="break-words font-headline-lg text-[32px] uppercase leading-none text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:text-[44px]">
                {member.name}
              </h3>
              <div className="flex items-center gap-2 rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-2 text-on-surface-variant shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <DiscordIcon />
                <span className="truncate font-body-md text-base font-bold">{member.discord}</span>
              </div>
            </div>

            {/* Social - Bottoni con ombre spesse */}
            <div className="flex flex-col items-end gap-4 lg:min-w-[200px]">
              <div className="grid min-w-0 grid-cols-3 gap-3 w-full">
                {member.discord !== '-' && (
                  <a
                    href={`https://discord.com/users/${member.discord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1 rounded-xl border-[3px] border-black bg-[#5865F2] px-3 py-3 font-label-caps text-[11px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                  >
                    <DiscordIcon />
                    <span className="hidden sm:inline">DC</span>
                  </a>
                )}
                {member.youtube !== '-' && (
                  <a
                    href={member.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1 rounded-xl border-[3px] border-black bg-[#FF0000] px-3 py-3 font-label-caps text-[11px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                  >
                    <YoutubeIcon />
                    <span className="hidden sm:inline">YT</span>
                  </a>
                )}
                {member.twitch !== '-' && (
                  <a
                    href={member.twitch}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1 rounded-xl border-[3px] border-black bg-[#9146FF] px-3 py-3 font-label-caps text-[11px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                  >
                    <TwitchIcon />
                    <span className="hidden sm:inline">TW</span>
                  </a>
                )}
              </div>
              
              {/* Pulsante espandi con ombra */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-surface-container-highest px-4 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:bg-primary-container active:translate-y-0 active:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                {isExpanded ? t('social.close') : t('social.info')}
              </button>
            </div>
          </div>
        </div>

        {/* Corpo Espanso - Design Brutalist */}
        <div 
          id={`member-panel-${member.name}`}
          className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <div 
              className="relative border-t-[5px] border-black p-6 sm:p-8"
              style={{ backgroundColor: member.bgColor }}
            >
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.8) 2px, transparent 2px)', backgroundSize: '18px 18px' }}></div>
              
              <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                {/* Info Panel */}
                <div className="flex flex-col gap-5 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0_rgba(0,0,0,1)]">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black/20 pb-4">
                    <div>
                      <p className="mb-1 font-label-caps text-[12px] text-tertiary">{t('social.card.member')}</p>
                      <h4 className="font-headline-md text-3xl uppercase text-white drop-shadow-[3px_3px_0_rgba(0,0,0,1)] sm:text-4xl">{t('social.card.whois').replace('{name}', member.name)}</h4>
                    </div>
                    <span className="rounded-xl border-[3px] border-black bg-secondary-container px-4 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {socialCount} {t('social.card.links')}
                    </span>
                  </div>
                  
                  <p className="font-body-lg text-lg leading-relaxed text-on-surface-variant">
                    {member.description}
                  </p>
                  
                  {/* Badge Social Colorati */}
                  <div className="flex flex-wrap gap-3">
                    {/* Status Online */}
                    <div className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                      <span className="font-label-caps text-[11px] text-on-surface-variant">{t('social.status.online')}</span>
                    </div>
                    
                    {/* Rank Badge */}
                    <div className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <span className="material-symbols-outlined text-[14px] text-primary-container">verified</span>
                      <span className="font-label-caps text-[11px] text-on-surface-variant">{member.rank}</span>
                    </div>
                    
                    {/* Discord Badge */}
                    {member.discord !== '-' && (
                      <div className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#5865F2] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <DiscordIcon />
                        <span className="font-label-caps text-[11px] text-white">@{member.discord}</span>
                      </div>
                    )}
                    
                    {/* YouTube Badge */}
                    {member.youtube !== '-' && (
                      <div className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FF0000] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <YoutubeIcon />
                        <span className="font-label-caps text-[11px] text-white">YT</span>
                      </div>
                    )}
                    
                    {/* Twitch Badge */}
                    {member.twitch !== '-' && (
                      <div className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#9146FF] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <TwitchIcon />
                        <span className="font-label-caps text-[11px] text-white">TW</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Stats Mini Panel */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border-[3px] border-black bg-primary-container/20 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="font-label-caps text-[10px] text-white/60">{t('social.card.social')}</p>
                      <p className="font-headline-md text-xl text-white">{socialCount}</p>
                    </div>
                    <div className="rounded-xl border-[3px] border-black bg-secondary-container/20 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="font-label-caps text-[10px] text-white/60">{t('social.member')}</p>
                      <p className="font-headline-md text-xl text-white">#{String(index + 1).padStart(2, '0')}</p>
                    </div>
                    <div className="rounded-xl border-[3px] border-black bg-tertiary-container/20 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="font-label-caps text-[10px] text-white/60">{t('social.card.status')}</p>
                      <p className="font-headline-md text-xl text-green-400">Act</p>
                    </div>
                  </div>
                </div>

                {/* Render 3D Showcase */}
                <div className="relative flex h-80 w-full items-end justify-center overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container-low shadow-[8px_8px_0_rgba(0,0,0,1)] sm:h-96 lg:h-full min-h-[320px]">
                  {/* Glow effect */}
                  <div className="absolute inset-x-10 bottom-10 h-28 rounded-full opacity-60 blur-2xl" style={{ backgroundColor: member.bgColor }}></div>
                  
                  {/* Badge top-left */}
                  <div className="absolute left-5 top-5 rounded-xl border-[3px] border-black bg-black px-4 py-2 font-label-caps text-[11px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="material-symbols-outlined mr-1 inline text-[16px]">view_in_ar</span>
                    {t('social.render.3d')}
                  </div>
                  
                  {/* Badge top-right */}
                  <div className="absolute right-5 top-5 rounded-full border-[3px] border-black bg-tertiary px-4 py-2 font-label-caps text-[11px] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="material-symbols-outlined mr-1 inline text-[16px]">sensors</span>
                    {t('social.render.live')}
                  </div>
                  
                  {/* Render image - spostato in basso per tagliare le gambe */}
                  <img 
                    src={getMemberImage(member)} 
                    alt={`Render di ${member.name}`}
                    className="relative z-0 h-[75%] w-[75%] origin-bottom translate-y-28 object-contain drop-shadow-[10px_10px_0_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 sm:h-[90%] sm:w-[90%] lg:translate-y-36"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
  );
};

const Social: React.FC = () => {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<RankFilter>('Tutti');

  const filteredMembers = activeFilter === 'Tutti'
    ? membersData
    : membersData.filter((member) => member.rank === activeFilter);

  return (
    <PageAnimator className="relative min-h-screen overflow-hidden px-4 pb-14 pt-8 sm:px-margin">
      <div className="pointer-events-none absolute left-[-8rem] top-28 h-64 w-64 rounded-full bg-primary-container/20 blur-3xl"></div>
      <div className="pointer-events-none absolute right-[-8rem] top-[34rem] h-72 w-72 rounded-full bg-secondary-container/20 blur-3xl"></div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col">
        
        <SocialHero activeFilter={activeFilter} onFilterChange={setActiveFilter} visibleCount={filteredMembers.length} t={t} />

        <div id="crew-grid" className="mb-5 flex flex-col gap-3 rounded-[2rem] border-[3px] border-black bg-surface-container-low p-4 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-label-caps text-[11px] text-tertiary">{t('social.roster.selected')}</p>
            <h2 className="font-headline-md text-2xl uppercase text-white sm:text-3xl">
              {activeFilter === 'Tutti' ? t('social.roster.all') : activeFilter}
            </h2>
          </div>
          <p className="max-w-xl font-body-sm text-sm font-bold text-on-surface-variant">
            {t('social.roster.hint')}
          </p>
        </div>

        <div className="w-full">
          {filteredMembers.map((member, index) => (
            <MemberCard key={member.name} member={member} index={index} t={t} />
          ))}
        </div>

      </div>
    </PageAnimator>
  );
};

export default Social;