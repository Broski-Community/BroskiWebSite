import React from 'react';
import PageAnimator from '../components/PageAnimator';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const WikiSection = ({ 
  icon, 
  title, 
  children
}: { 
  icon: string; 
  title: string; 
  children: React.ReactNode;
}) => (
  <div>
    <section className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:p-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="material-symbols-outlined rounded-2xl border-[3px] border-black bg-primary-container p-3 text-[32px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {icon}
        </span>
        <h2 className="font-headline-md text-[28px] uppercase text-white md:text-[36px]">
          {title}
        </h2>
      </div>
      <div className="font-body-lg text-body-lg text-on-surface-variant">
        {children}
      </div>
    </section>
  </div>
);

const InfoCard = ({ 
  title, 
  icon, 
  children,
  variant = 'default'
}: { 
  title: string; 
  icon: string; 
  children: React.ReactNode;
  variant?: 'default' | 'highlight' | 'warning';
}) => {
  const variantClasses = {
    default: 'bg-surface-container-high',
    highlight: 'bg-primary-container/20 border-primary-container',
    warning: 'bg-tertiary-container/20 border-tertiary-container'
  };

  return (
    <div className={`rounded-2xl border-[3px] border-black p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${variantClasses[variant]}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-primary-container">{icon}</span>
        <h3 className="font-headline-md text-[18px] text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
};

const Wiki: React.FC = () => {
  const { t } = useLanguage();
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <PageAnimator className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-margin">
      {/* Background decorations */}
      <div className="pointer-events-none absolute left-[-6rem] top-24 h-80 w-80 rounded-full bg-primary-container/15 blur-3xl"></div>
      <div className="pointer-events-none absolute right-[-8rem] top-[50rem] h-96 w-96 rounded-full bg-secondary-container/15 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-[20rem] left-[-4rem] h-72 w-72 rounded-full bg-tertiary-container/15 blur-3xl"></div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-margin">
        {/* Hero Header */}
        <div>
          <header className="relative overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 2px, transparent 2px)', backgroundSize: '26px 26px', opacity: 0.4 }}></div>
            
            <div className="relative z-10 p-8 md:p-12">
              <div className="mb-6 inline-flex -rotate-2 items-center gap-2 rounded-2xl border-[3px] border-black bg-tertiary px-4 py-2 font-label-caps text-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                {t('wiki.hero.badge')}
              </div>
              
              <h1 className="mb-4 font-headline-lg text-[48px] uppercase leading-none tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] md:text-[72px]">
                WIKI <span className="text-primary-container">BROSKI</span>
              </h1>
              
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                {t('wiki.hero.description')}
              </p>
            </div>
          </header>
        </div>

        {/* Quick Navigation */}
        <div>
          <nav className="flex flex-wrap gap-3">
            {[
              { icon: 'groups', label: t('wiki.nav.community'), href: '#community' },
              { icon: 'dns', label: t('wiki.nav.smp'), href: '#smp' },
              { icon: 'emoji_events', label: t('wiki.nav.tierlist'), href: '#tierlist' },
              { icon: 'smart_display', label: t('wiki.nav.creators'), href: '#creators' },
              { icon: 'help', label: t('wiki.nav.faq'), href: '#faq' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleSmoothScroll(e, item.href)}
                className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-label-caps text-[12px] text-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:bg-primary-container hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Community Section */}
        <div id="community">
          <WikiSection icon="groups" title={t('wiki.community.title')}>
            <div className="space-y-4">
              <p>
                <strong className="text-white">Broski Community</strong> {t('wiki.community.intro')}
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard title="Discord" icon="chat" variant="highlight">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.community.discord.desc')}
                  </p>
                </InfoCard>
                <InfoCard title="??? SMP" icon="dns">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.community.smp.desc')}
                  </p>
                </InfoCard>
                <InfoCard title="Tier List" icon="emoji_events">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.community.tierlist.desc')}
                  </p>
                </InfoCard>
              </div>

              <div className="rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-3 flex items-center gap-2 font-headline-md text-[20px] text-white">
                  <span className="material-symbols-outlined text-tertiary">rocket_launch</span>
                  {t('wiki.community.join.title')}
                </h3>
                <ol className="list-inside list-decimal space-y-2 text-on-surface-variant">
                  <li>{t('wiki.community.join.step1')} <a href="https://discord.gg/8CvbRWzyjA" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-container underline">Discord</a></li>
                  <li>{t('wiki.community.join.step2')}</li>
                  <li>{t('wiki.community.join.step3')}</li>
                  <li>{t('wiki.community.join.step4')}</li>
                </ol>
              </div>
            </div>
          </WikiSection>
        </div>

        {/* ??? SMP Section */}
        <div id="smp">
          <WikiSection icon="dns" title={t('wiki.smp.title')}>
            <div className="space-y-4">
              <p>
                <strong className="text-white">??? SMP</strong> {t('wiki.smp.intro')}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard title={t('wiki.smp.features.title')} icon="star">
                  <ul className="list-inside list-disc space-y-1 text-sm text-on-surface-variant">
                    <li>{t('wiki.smp.features.java')}</li>
                    <li>{t('wiki.smp.features.survival')}</li>
                    <li>Community-driven lore</li>
                    <li>{t('wiki.smp.features.events')}</li>
                    <li>{t('wiki.smp.features.youtube')}</li>
                  </ul>
                </InfoCard>
                <InfoCard title={t('wiki.smp.rules.title')} icon="gavel" variant="warning">
                  <ul className="list-inside list-disc space-y-1 text-sm text-on-surface-variant">
                    <li>{t('wiki.smp.rules.nohack')}</li>
                    <li>{t('wiki.smp.rules.lore')}</li>
                    <li>{t('wiki.smp.rules.collab')}</li>
                    <li>{t('wiki.smp.rules.creator')}</li>
                  </ul>
                </InfoCard>
              </div>

              <div className="rounded-2xl border-[3px] border-black bg-primary-container/10 p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-2 flex items-center gap-2 font-headline-md text-[20px] text-primary-container">
                  <span className="material-symbols-outlined">info</span>
                  {t('wiki.smp.status.title')}
                </h3>
                <p className="text-on-surface-variant">
                  {t('wiki.smp.status.desc')}
                </p>
              </div>
            </div>
          </WikiSection>
        </div>

        {/* Tier List Section */}
        <div id="tierlist">
          <WikiSection icon="emoji_events" title="Tier List System">
            <div className="space-y-4">
              <p>
                <strong className="text-white">Broski Tier List</strong> {t('wiki.tierlist.intro')}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border-[3px] border-black bg-blue-600/20 p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="mb-2 font-headline-md text-[18px] text-blue-300">High Tier (HT)</h4>
                  <p className="mb-3 text-sm text-on-surface-variant">{t('wiki.tierlist.ht.desc')}</p>
                  <div className="flex flex-wrap gap-2">
                    {['HT1', 'HT2', 'HT3', 'HT4', 'HT5'].map(tier => (
                      <span key={tier} className="rounded-lg border-2 border-black bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {tier}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border-[3px] border-black bg-red-600/20 p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="mb-2 font-headline-md text-[18px] text-red-300">Low Tier (LT)</h4>
                  <p className="mb-3 text-sm text-on-surface-variant">{t('wiki.tierlist.lt.desc')}</p>
                  <div className="flex flex-wrap gap-2">
                    {['LT1', 'LT2', 'LT3', 'LT4', 'LT5'].map(tier => (
                      <span key={tier} className="rounded-lg border-2 border-black bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {tier}
                      </span>
                    ))}
                  </div>
                </div>

                <InfoCard title="Combat Rank" icon="military_tech" variant="highlight">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.tierlist.combatrank.desc')}
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs text-on-surface-variant">
                    <li>400+ pts: Combat Grandmaster</li>
                    <li>250+ pts: Combat Master</li>
                    <li>100+ pts: Combat Ace</li>
                    <li>50+ pts: Combat Specialist</li>
                    <li>20+ pts: Combat Cadet</li>
                    <li>10+ pts: Combat Novice</li>
                    <li>&lt;10 pts: Rookie</li>
                  </ul>
                </InfoCard>
              </div>

              <div className="rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-3 font-headline-md text-[20px] text-white">{t('wiki.tierlist.categories.title')}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {[
                    { name: 'LTMS', icon: 'timer', desc: 'Last Man Standing' },
                    { name: 'VANILLA', icon: 'grass', desc: 'PvP Vanilla' },
                    { name: 'UHC', icon: 'heart_broken', desc: 'Ultra Hardcore' },
                    { name: 'POT', icon: 'local_drink', desc: 'Potions PvP' },
                    { name: 'NETHOP', icon: 'whatshot', desc: 'Nether PvP' },
                    { name: 'SMP', icon: 'groups', desc: 'SMP Survival' },
                    { name: 'SWORD', icon: 'swords', desc: 'Sword Only' },
                    { name: 'AXE', icon: 'hardware', desc: 'Axe PvP' },
                    { name: 'MACE', icon: 'auto_fix_high', desc: 'Mace PvP' },
                    { name: 'CRYSTAL', icon: 'diamond', desc: 'Crystal PvP' },
                  ].map(cat => (
                    <div key={cat.name} className="flex flex-col items-center gap-2 rounded-xl border-[2px] border-black bg-surface-container p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <img src={`/icons/categories/${cat.name.toLowerCase()}.svg`} alt="" className="h-8 w-8" />
                      <span className="font-label-caps text-[11px] text-white">{cat.name}</span>
                      <span className="text-center text-[10px] text-on-surface-variant">{cat.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <Link 
                  to="/tierlist"
                  className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-primary-container px-6 py-3 font-headline-md text-[18px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]"
                >
                  <span className="material-symbols-outlined text-[24px]">emoji_events</span>
                  {t('wiki.tierlist.cta')}
                </Link>
              </div>
            </div>
          </WikiSection>
        </div>

        {/* Creators Section */}
        <div id="creators">
          <WikiSection icon="smart_display" title={t('wiki.creators.title')}>
            <div className="space-y-4">
              <p>
                {t('wiki.creators.intro')}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard title="YouTube" icon="play_circle" variant="highlight">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.creators.youtube.desc')}
                  </p>
                </InfoCard>
                <InfoCard title="Twitch" icon="videocam">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.creators.twitch.desc')}
                  </p>
                </InfoCard>
                <InfoCard title={t('wiki.creators.collab.title')} icon="group_add" variant="highlight">
                  <p className="text-sm text-on-surface-variant">
                    {t('wiki.creators.collab.desc')}
                  </p>
                </InfoCard>
              </div>

              <div className="rounded-2xl border-[3px] border-black bg-tertiary-container/10 p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-3 flex items-center gap-2 font-headline-md text-[20px] text-tertiary">
                  <span className="material-symbols-outlined">person_add</span>
                  {t('wiki.creators.join.title')}
                </h3>
                <p className="text-on-surface-variant">
                  {t('wiki.creators.join.desc')}
                </p>
              </div>
            </div>
          </WikiSection>
        </div>

        {/* FAQ Section */}
        <div id="faq">
          <WikiSection icon="help" title={t('wiki.faq.title')}>
            <div className="space-y-4">
              {[
                { q: t('wiki.faq.q1'), a: t('wiki.faq.a1') },
                { q: t('wiki.faq.q2'), a: t('wiki.faq.a2') },
                { q: t('wiki.faq.q3'), a: t('wiki.faq.a3') },
                { q: t('wiki.faq.q4'), a: t('wiki.faq.a4') },
                { q: t('wiki.faq.q5'), a: t('wiki.faq.a5') },
                { q: t('wiki.faq.q6'), a: t('wiki.faq.a6') },
              ].map((faq, i) => (
                <div key={i} className="rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="mb-2 flex items-center gap-2 font-headline-md text-[18px] text-white">
                    <span className="material-symbols-outlined text-primary-container">help_outline</span>
                    {faq.q}
                  </h4>
                  <p className="text-on-surface-variant">{faq.a}</p>
                </div>
              ))}
            </div>
          </WikiSection>
        </div>

        {/* Footer CTA */}
        <div>
          <div className="rounded-[2rem] border-[4px] border-black bg-gradient-to-r from-primary-container to-tertiary-container p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] md:p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <span className="material-symbols-outlined text-[64px] text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">groups</span>
              <h2 className="font-headline-lg text-[36px] uppercase text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] md:text-[48px]">
                {t('wiki.cta.title')}
              </h2>
              <p className="max-w-xl font-body-lg text-body-lg text-white/90">
                {t('wiki.cta.desc')}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="https://discord.gg/8CvbRWzyjA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-white px-6 py-3 font-headline-md text-[18px] text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1"
                >
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                  {t('wiki.cta.discord')}
                </a>
                <Link 
                  to="/social"
                  className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-black px-6 py-3 font-headline-md text-[18px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1"
                >
                  <span className="material-symbols-outlined text-[24px]">people</span>
                  {t('wiki.cta.community')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageAnimator>
  );
};

export default Wiki;
