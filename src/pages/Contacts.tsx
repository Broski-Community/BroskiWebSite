import React, { useState, useEffect } from 'react';
import PageAnimator from '../components/PageAnimator';
import TransitionLink from '../components/TransitionLink';
import { supabase } from '../config/supabaseClient';

interface ContactInfo {
  email: string;
  discord: string;
  instagram: string;
  youtube: string;
  description: string;
}

const Contacts: React.FC = () => {
  const [info, setInfo] = useState<ContactInfo>({
    email: '',
    discord: '',
    instagram: '',
    youtube: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'contact_email',
          'contact_discord',
          'contact_instagram',
          'contact_youtube',
          'contact_description',
        ]);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: { key: string; value: string }) => {
          map[row.key] = row.value;
        });
        setInfo({
          email: map['contact_email'] || '',
          discord: map['contact_discord'] || '',
          instagram: map['contact_instagram'] || '',
          youtube: map['contact_youtube'] || '',
          description: map['contact_description'] || '',
        });
      }
      setLoading(false);
    };
    fetchContacts();
  }, []);

  if (loading) {
    return (
      <PageAnimator className="flex min-h-[calc(100vh-76px)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
      </PageAnimator>
    );
  }

  return (
    <PageAnimator className="relative w-full overflow-hidden px-4 pb-14 pt-8 sm:px-margin">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)', backgroundSize: '28px 28px' }} />
      <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-secondary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-72 w-72 rounded-full bg-tertiary/15 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-[900px]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="inline-flex -rotate-2 items-center gap-2 self-start rounded-2xl border-[3px] border-black bg-secondary-container px-4 py-2 font-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            REACH OUT
          </div>
          <h1 className="font-headline-lg text-[48px] uppercase leading-none tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] sm:text-[64px]">
            CONTATTI
          </h1>
          {info.description && (
            <p className="max-w-lg rounded-3xl border-[3px] border-black bg-surface-container-high p-4 font-body-lg font-bold text-on-surface-variant shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              {info.description}
            </p>
          )}
        </div>

        {/* Contact cards grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Email */}
          {info.email && (
            <a
              href={`mailto:${info.email}`}
              className="group flex items-center gap-4 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black bg-primary-container shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-rotate-3">
                <span className="material-symbols-outlined text-[32px] text-white">email</span>
              </div>
              <div>
                <p className="font-label-caps text-[11px] text-on-surface-variant">EMAIL</p>
                <p className="font-headline-md text-[16px] text-white break-all">{info.email}</p>
              </div>
            </a>
          )}

          {/* Discord */}
          {info.discord && (
            <a
              href={info.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black bg-blue-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-rotate-3">
                <span className="material-symbols-outlined text-[32px] text-white">forum</span>
              </div>
              <div>
                <p className="font-label-caps text-[11px] text-on-surface-variant">TIKTOK</p>
                <p className="font-headline-md text-[16px] text-white">@broskicom</p>
              </div>
            </a>
          )}

          {/* Instagram */}
          {info.instagram && (
            <a
              href={info.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black bg-secondary-container shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-rotate-3">
                <span className="material-symbols-outlined text-[32px] text-white">photo_camera</span>
              </div>
              <div>
                <p className="font-label-caps text-[11px] text-on-surface-variant">INSTAGRAM</p>
                <p className="font-headline-md text-[16px] text-white">@broskicommunity</p>
              </div>
            </a>
          )}

          {/* YouTube */}
          {info.youtube && (
            <a
              href={info.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black bg-red-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-rotate-3">
                <span className="material-symbols-outlined text-[32px] text-white">smart_display</span>
              </div>
              <div>
                <p className="font-label-caps text-[11px] text-on-surface-variant">YOUTUBE</p>
                <p className="font-headline-md text-[16px] text-white">Broski Community</p>
              </div>
            </a>
          )}
        </div>

        {/* Info box */}
        <div className="mt-8 rounded-[2rem] border-[4px] border-black bg-surface-container-highest p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined shrink-0 rounded-2xl border-[3px] border-black bg-tertiary p-3 text-[28px] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">info</span>
            <div>
              <h3 className="font-headline-md text-[18px] text-white">Tempi di Risposta</h3>
              <p className="mt-2 font-body-sm text-on-surface-variant">
                Rispondiamo generalmente entro 24-48 ore. Per questioni urgenti, il modo più veloce per raggiungerci è tramite Discord. Per collaborazioni o proposte, includi una breve descrizione del progetto.
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-10">
          <TransitionLink
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-black bg-surface-container-high px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            TORNA ALLA HOME
          </TransitionLink>
        </div>
      </div>
    </PageAnimator>
  );
};

export default Contacts;
