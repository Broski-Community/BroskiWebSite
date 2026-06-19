import React from 'react';
import { Link } from 'react-router-dom';
import PageAnimator from '../components/PageAnimator';
import { LINKS_CONFIG } from '../config/linksConfig';
import { useLanguage } from '../context/LanguageContext';

const ProjectStat = ({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) => (
  <div className="rounded-3xl border-[3px] border-black bg-surface-container-high p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
    <div className="flex items-center justify-between gap-3">
      <span className="font-headline-md text-3xl text-white">{value}</span>
      <span className={`material-symbols-outlined rounded-2xl border-2 border-black p-2 text-2xl text-white ${accent}`}>{icon}</span>
    </div>
    <p className="mt-2 font-label-caps text-[11px] text-on-surface-variant">{label}</p>
  </div>
);

const ProjectTag = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`rounded-2xl border-2 border-black px-3 py-2 font-label-caps text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${className}`}>
    {children}
  </span>
);

const ProjectAction = ({ href, icon, children, className }: { href: string; icon: string; children: React.ReactNode; className: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-black px-5 py-3 text-center font-label-caps shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none ${className}`}
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    {children}
  </a>
);

const Projects: React.FC = () => {
  const { t } = useLanguage();
  return (
    <PageAnimator className="relative flex-grow overflow-hidden px-4 py-8 sm:px-margin select-none">
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-secondary-container/20 blur-3xl"></div>
      <div className="pointer-events-none absolute right-[-10rem] top-[36rem] h-80 w-80 rounded-full bg-primary-container/20 blur-3xl"></div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-margin">
      <div>
        <header className="relative overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 2px, transparent 2px)', backgroundSize: '26px 26px', opacity: 0.4 }}></div>
          <div className="absolute -left-16 top-12 h-44 w-44 rotate-12 rounded-[2rem] border-4 border-black bg-secondary-container opacity-90"></div>
          <div className="absolute -right-12 -top-14 h-56 w-56 rounded-full border-4 border-black bg-primary-container opacity-90"></div>
          <div className="absolute bottom-8 right-12 hidden h-28 w-28 rotate-45 rounded-3xl border-4 border-black bg-tertiary opacity-80 md:block"></div>

          <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
            <div className="flex flex-col items-start gap-5">
              <div className="inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-secondary-container px-3 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                {t('projects.hero.badge')}
              </div>

              <div>
                <h1 className="font-headline-lg text-[52px] leading-[0.9] tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] sm:text-[76px] lg:text-[96px]">
                  BROSKI
                  <span className="block text-secondary-container">{t('projects.title').toUpperCase()}</span>
                </h1>
                <p className="mt-4 max-w-2xl rounded-3xl border-[3px] border-black bg-surface-container-high p-4 font-body-lg font-bold text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  {t('projects.subtitle')}
                </p>
              </div>

              <div className="flex w-full flex-wrap gap-3">
                <a href="#projects-grid" className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-primary-container px-5 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none">
                  {t('tierlist.cta.leaderboard')}
                  <span className="material-symbols-outlined">arrow_downward</span>
                </a>
                <ProjectAction href={LINKS_CONFIG.discord} icon="forum" className="bg-surface-bright text-white">
                  {t('projects.visit')}
                </ProjectAction>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <ProjectStat icon="dns" label={'SMP in arrivo'} value="Nuova" accent="bg-primary-container" />
              <ProjectStat icon="menu_book" label={'attività dei membri ogni giorno'} value="99.99%" accent="bg-blue-600" />
              <ProjectStat icon="extension" label={'Suggeriscici idee e novità da aggiungere ai nostri progetti'} value="Lab e Idee" accent="bg-tertiary !text-black" />
            </div>
          </div>
        </header>
      </div>

      <div id="projects-grid" className="grid grid-cols-1 gap-margin lg:grid-cols-3">
        
        {/* nostre SMP (Col-span-2) */}
        <div className="lg:col-span-2">
          <div className="group relative flex h-full min-h-[460px] flex-col overflow-hidden rounded-[2rem] border-4 border-black bg-surface-container shadow-[9px_9px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            {/* Sfondo Astratto */}
            <div className="absolute inset-0 z-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(#ff525e 2px, transparent 2px)', backgroundSize: '32px 32px', opacity: 0.18 }}></div>
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-container/30 via-transparent to-secondary-container/30"></div>
            <div className="absolute -right-20 bottom-8 h-64 w-64 rounded-full border-4 border-black bg-secondary-container opacity-80 transition-transform duration-700 group-hover:scale-110"></div>
            <div className="absolute -left-14 top-16 h-40 w-40 rotate-12 rounded-[2rem] border-4 border-black bg-primary-container opacity-80 transition-transform duration-700 group-hover:rotate-[24deg]"></div>

            <div className="absolute right-4 top-4 z-10 rotate-3 rounded-2xl border-2 border-black bg-secondary-container px-3 py-2 font-label-caps text-xs text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {t('projects.controlsmp.featured')}
            </div>

            <div className="relative z-10 flex min-h-[460px] flex-col justify-end p-margin">
              <div className="mb-4 flex flex-wrap gap-2">
                <ProjectTag className="bg-black text-white">SEASON 0</ProjectTag>
                <ProjectTag className="bg-surface-bright text-white">PRIVATE!</ProjectTag>
                <ProjectTag className="bg-tertiary text-black">MINECRAFT 1.21</ProjectTag>
              </div>
              <h2 className="mb-2 font-headline-lg text-5xl text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:text-6xl">Might SMP</h2>
              
              <div className="mb-4 flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-black bg-red-500 shadow-[0_0_12px_rgba(255,0,0,1)]"></div>
                <span className="rounded-2xl border-2 border-black bg-surface-container-high px-3 py-1 font-label-caps text-xs font-bold text-on-surface-variant shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{t('projects.controlsmp.status')}</span>
              </div>
              
              <p className="mb-8 max-w-xl rounded-3xl border-[3px] border-black bg-surface-container/90 p-4 font-body-lg font-bold text-on-surface shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                {t('projects.controlsmp.desc')}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/countdown"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-primary-container px-5 py-3 text-center font-label-caps text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  {t('projects.controlsmp.countdown')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Broski Wiki (Col-span-1) */}
        <div className="lg:col-span-1">
          <div className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[2rem] border-4 border-black bg-surface-container p-margin shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-4 border-black bg-blue-600 opacity-80 transition-transform duration-700 group-hover:scale-125"></div>
            <div className="relative z-10 mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-3xl border-4 border-black bg-blue-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-symbols-outlined text-3xl">menu_book</span>
            </div>
            <h2 className="relative z-10 mb-2 font-headline-md text-3xl text-white">{t('projects.wiki.title')}</h2>
            <p className="relative z-10 mb-auto font-body-sm font-bold text-on-surface-variant">
              {t('projects.wiki.desc')}
            </p>

            <div className="relative z-10 mb-6 mt-8">
              <div className="flex h-4 w-full overflow-hidden rounded-2xl border-2 border-black bg-surface-dim shadow-[inset_2px_2px_0_rgba(0,0,0,0.5)]">
                <div className="relative h-full w-[100%] overflow-hidden border-r-2 border-black bg-blue-600">
                  {/* Effetto strisce neon */}
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #000 5px, #000 10px)' }}></div>
                </div>
              </div>
              <div className="mt-2 text-right font-label-caps text-[10px] font-bold text-on-surface-variant">{t('projects.wiki.progress')}</div>
            </div>

            <Link 
              to="/wiki"
              className="relative z-10 inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-surface-bright px-5 py-3 text-center font-label-caps text-blue-300 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              {t('projects.wiki.cta')}
            </Link>
          </div>
        </div>

        {/* Broski Projects (Col-span-1) */}
        <div className="lg:col-span-1">
          <div className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[2rem] border-4 border-black bg-surface-container p-margin shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -right-12 bottom-8 h-40 w-40 rotate-12 rounded-[2rem] border-4 border-black bg-error-container opacity-80 transition-transform duration-700 group-hover:rotate-[28deg]"></div>
            <div className="relative z-10 mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-3xl border-4 border-black bg-error-container text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-symbols-outlined text-3xl">build</span>
            </div>
            <h2 className="relative z-10 mb-2 font-headline-md text-3xl text-white">{t('projects.tools.title')}</h2>
            <p className="relative z-10 mb-4 font-body-sm font-bold text-on-surface-variant">
              {t('projects.tools.desc')}
            </p>

            <div className="relative z-10 mb-auto flex flex-wrap gap-2 pb-6">
              <ProjectTag className="bg-surface-bright text-white">MODS</ProjectTag>
              <ProjectTag className="bg-surface-bright text-white">TOOLS</ProjectTag>
              <ProjectTag className="bg-surface-bright text-white">WEB</ProjectTag>
            </div>

            <div className="relative z-10 flex flex-col gap-3">
              <ProjectAction href={LINKS_CONFIG.repoProgetti} icon="code" className="bg-surface-bright text-white">
                {t('projects.tools.repo')}
              </ProjectAction>
              <ProjectAction href="/mods" icon="download" className="bg-error-container text-white">
                {t('projects.tools.mods')}
              </ProjectAction>
            </div>
          </div>
        </div>

        {/* Hai un'idea folle? (Col-span-2) */}
        <div className="lg:col-span-2">
          <div className="group relative flex h-full min-h-[300px] flex-col items-start justify-between gap-margin overflow-hidden rounded-[2rem] border-4 border-black bg-zinc-800 p-margin shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_rgba(0,0,0,1)] md:flex-row md:items-center">
            {/* Elementi geometrici astratti */}
            <div className="absolute -right-12 -top-12 h-48 w-48 rotate-12 border-4 border-black bg-secondary-container opacity-80 transition-transform duration-700 group-hover:rotate-[25deg]"></div>
            <div className="absolute -bottom-20 right-32 h-64 w-64 -rotate-12 border-4 border-black bg-primary-container opacity-80 transition-transform duration-700 group-hover:-rotate-[25deg]"></div>
            <div className="absolute left-8 top-8 hidden rounded-2xl border-2 border-black bg-tertiary px-3 py-2 font-label-caps text-[10px] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:block">{t('projects.idea.badge')}</div>
            
            <div className="relative z-10 max-w-xl">
              <h2 className="mb-2 font-headline-lg text-4xl text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] sm:text-5xl">
                {t('projects.idea.title')}
              </h2>
              <p className="font-body-lg font-bold text-on-surface-variant">
                {t('projects.idea.desc')}
              </p>
            </div>
            <div className="relative z-10 w-full flex-shrink-0 md:w-auto">
              <Link to="/progetti/idea" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-white px-5 py-3 font-headline-md text-[16px] text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none md:w-auto">
                <span className="material-symbols-outlined">add_circle</span>
                {t('projects.idea.cta')}
              </Link>
            </div>
          </div>
        </div>

      </div>
      </div>
    </PageAnimator>
  );
};

export default Projects;