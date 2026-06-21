import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TransitionLink from './TransitionLink';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabaseClient';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the profile dropdown when clicking anywhere outside of it
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Check for notifications
  useEffect(() => {
    const checkNotifications = async () => {
      if (!user || !profile) return;
      // Get last seen timestamp
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_ideas_seen_at')
        .eq('id', user.id)
        .single();
      const lastSeen = profileData?.last_ideas_seen_at || '1970-01-01';

      if (profile.role === 'admin') {
        // Admin: check for ideas created after last seen
        const { count } = await supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gt('created_at', lastSeen);
        setHasNotification((count || 0) > 0);
      } else {
        // User: check if any of their ideas were updated after last seen
        const { count } = await supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', user.id)
          .neq('status', 'pending')
          .gt('created_at', lastSeen);
        setHasNotification((count || 0) > 0);
      }
    };
    checkNotifications();
  }, [user, profile]);

  return (
    <>
      {/* Placeholder invisibile per mantenere lo spazio quando la nav è fixed */}
      <div className="h-[76px] w-full invisible"></div>
      
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <nav 
          className={`bg-blue-600 dark:bg-blue-900 flex justify-between items-center px-6 py-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${
            isScrolled 
              ? 'translate-y-4 w-[95%] max-w-6xl rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' 
              : 'translate-y-0 w-full max-w-full rounded-none border-4 border-transparent border-b-black shadow-none'
          }`}
        >
      <TransitionLink to="/" className="border-4 border-black px-4 py-1 bg-red-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 hover:translate-y-1 hover:translate-x-1 transition-all active:translate-y-2 active:translate-x-2 cursor-pointer flex items-center justify-center rounded-2xl">
        <img src="/logo/3d36j5v.svg" alt="Broski Logo" className="h-8 w-auto drop-shadow-md" />
      </TransitionLink>
      <div className="hidden md:flex gap-8 items-center font-headline-md uppercase tracking-tighter absolute left-1/2 -translate-x-1/2">
        <TransitionLink 
          to="/" 
          className={`${location.pathname === '/' ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          {t('nav.home')}
        </TransitionLink>
        <TransitionLink 
          to="/tierlist" 
          className={`${location.pathname === '/tierlist' ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          {t('nav.tierlist')}
        </TransitionLink>
        <TransitionLink 
          to="/social" 
          className={`${location.pathname === '/social' ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          {t('nav.social')}
        </TransitionLink>
        <TransitionLink 
          to="/progetti" 
          className={`${location.pathname === '/progetti' ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          {t('nav.projects')}
        </TransitionLink>
        <TransitionLink 
          to="/wiki" 
          className={`${location.pathname === '/wiki' ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          {t('nav.wiki')}
        </TransitionLink>
        <TransitionLink 
          to="/mods" 
          className={`${location.pathname.startsWith('/mods') ? 'text-yellow-400 underline decoration-4 underline-offset-4' : 'text-white'} hover:bg-red-500 hover:translate-y-1 hover:translate-x-1 transition-all rounded-xl px-2`}
        >
          Mods
        </TransitionLink>
      </div>
      {user && profile?.minecraft_username ? (
        <div className="flex items-center gap-2">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center rounded-xl border-[3px] border-black bg-surface-container p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[22px] text-white">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>

          {/* Language Toggle - visible to all */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border-2 border-black bg-black p-1">
            <button
              onClick={() => setLanguage('it')}
              className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${language === 'it' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
            >
              IT
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${language === 'en' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
            >
              EN
            </button>
          </div>

          {/* Profile button */}
          <div className="relative" ref={menuRef}>
            <div className="relative flex items-center gap-2 rounded-2xl border-[3px] border-black bg-surface-container px-2 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {/* Minecraft IGN that slides out to the left when opening; links to /profilo */}
              <TransitionLink
                to="/profilo"
                onClick={() => setMenuOpen(false)}
                tabIndex={menuOpen ? 0 : -1}
                className={`overflow-hidden whitespace-nowrap rounded-lg font-label-caps text-[12px] text-white transition-all duration-300 ease-out hover:text-tertiary ${
                  menuOpen ? 'max-w-[140px] px-1 opacity-100 ml-1 delay-0' : 'pointer-events-none max-w-0 px-0 opacity-0 ml-0 delay-300'
                }`}
              >
                {profile.minecraft_username}
              </TransitionLink>
              {/* Avatar + chevron toggles the dropdown */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <img
                  src={profile.ign_verified ? `https://mc-heads.net/avatar/${profile.minecraft_username}/64` : '/profilepng/profile.png'}
                  alt="Profilo"
                  className="h-8 w-8 rounded-xl border-2 border-black"
                />
                <span className={`material-symbols-outlined text-white hidden sm:block transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {hasNotification && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black bg-red-500" />
              )}
            </div>
            <div
              className={`absolute right-0 top-full mt-2 flex w-44 flex-col gap-2 overflow-hidden rounded-2xl border-[3px] border-black bg-surface-container p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] origin-top transition-all duration-300 ease-out ${
                menuOpen ? 'max-h-[400px] opacity-100 delay-300' : 'pointer-events-none max-h-0 border-transparent py-0 opacity-0 delay-0'
              }`}
            >
              {profile.role === 'admin' && (
                <TransitionLink
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="relative flex w-full items-center gap-2 rounded-xl border-[3px] border-black bg-tertiary px-3 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  {t('nav.admin')}
                  {hasNotification && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black bg-red-500" />
                  )}
                </TransitionLink>
              )}
              {profile.role !== 'admin' && (
                <TransitionLink
                  to="/mie-idee"
                  onClick={() => setMenuOpen(false)}
                  className="relative flex w-full items-center gap-2 rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  {t('nav.my_ideas')}
                  {hasNotification && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black bg-red-500" />
                  )}
                </TransitionLink>
              )}
              <TransitionLink
                to="/bomb-party"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl border-[3px] border-black bg-orange-600 px-3 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">bomb</span>
                Bomb Party
              </TransitionLink>
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded-xl border-[3px] border-black bg-error-container px-3 py-2 font-label-caps text-[12px] text-on-error-container shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Mobile hamburger for non-logged users */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center rounded-xl border-[3px] border-black bg-surface-container p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[22px] text-white">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          {/* Language Toggle - visible to all */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border-2 border-black bg-black p-1">
            <button
              onClick={() => setLanguage('it')}
              className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${language === 'it' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
            >
              IT
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${language === 'en' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
            >
              EN
            </button>
          </div>
          <TransitionLink
            to="/signin"
            className="bg-red-500 text-white font-headline-md uppercase tracking-tighter px-4 py-2 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 hover:translate-y-1 hover:translate-x-1 transition-all active:translate-y-2 active:translate-x-2 flex items-center gap-2 rounded-2xl"
          >
            {t('nav.login')}
          </TransitionLink>
        </div>
      )}
        </nav>

        {/* Mobile navigation dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 rounded-2xl border-[4px] border-black bg-blue-900 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] pointer-events-auto">
            <div className="flex flex-col gap-2">
              <TransitionLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname === '/' ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">home</span>
                {t('nav.home')}
              </TransitionLink>
              <TransitionLink
                to="/tierlist"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname === '/tierlist' ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                {t('nav.tierlist')}
              </TransitionLink>
              <TransitionLink
                to="/social"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname === '/social' ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">group</span>
                {t('nav.social')}
              </TransitionLink>
              <TransitionLink
                to="/progetti"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname === '/progetti' ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">science</span>
                {t('nav.projects')}
              </TransitionLink>
              <TransitionLink
                to="/wiki"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname === '/wiki' ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                {t('nav.wiki')}
              </TransitionLink>
              <TransitionLink
                to="/mods"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline-md text-[16px] uppercase tracking-tighter transition-all ${
                  location.pathname.startsWith('/mods') ? 'bg-red-500 text-yellow-400' : 'text-white hover:bg-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">extension</span>
                Mods
              </TransitionLink>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;
