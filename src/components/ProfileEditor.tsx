import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import PageAnimator from './PageAnimator';
import type { ProfileCustomization } from '../pages/Profile';

const FONTS = [
  { value: 'default', label: 'Default' },
  { value: 'pixel', label: 'Pixel/Mono' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'bold', label: 'Extra Bold' },
  { value: 'retro', label: 'Retro Wide' },
];

const EFFECTS = [
  { value: 'none', label: 'Nessuno' },
  { value: 'glow', label: 'Glow' },
  { value: 'gradient', label: 'Gradient Text' },
  { value: 'pulse', label: 'Pulse' },
];

const SHAPES = [
  { value: 'rounded', label: 'Quadrato arrotondato' },
  { value: 'circle', label: 'Cerchio' },
  { value: 'hexagon', label: 'Esagono' },
  { value: 'diamond', label: 'Diamante' },
];

const THEMES = [
  { value: 'custom', label: 'Custom', accent: '' },
  { value: 'neon', label: 'Neon', accent: '#00ff88' },
  { value: 'hacker', label: 'Dark Hacker', accent: '#22c55e' },
  { value: 'retro', label: 'Retro Pixel', accent: '#f97316' },
  { value: 'ocean', label: 'Ocean', accent: '#06b6d4' },
  { value: 'royal', label: 'Royal Purple', accent: '#a855f7' },
  { value: 'fire', label: 'Fire', accent: '#ef4444' },
  { value: 'minimal', label: 'Minimal', accent: '#94a3b8' },
];

const INTEREST_OPTIONS = [
  'Crystal PvP', 'Sword', 'Axe', 'UHC', 'Pot PvP', 'SMP', 'Building',
  'Redstone', 'Speedrunning', 'Modding', 'Plugin Dev', 'Map Making',
  'Geometry Dash', 'Streaming', 'YouTube', 'Pixel Art', 'Lore',
];

const BADGE_OPTIONS = [
  'PvP Enjoyer', 'Builder', 'Redstone Nerd', 'Lore Master', 'Chaos Agent',
  'Content Creator', 'Speedrunner', 'Plugin Dev', 'Mod Dev', 'OG Member',
  'Event Winner', 'Helper', 'Memer', 'Music Lover', 'GD Player',
];

interface Props {
  profileData: ProfileCustomization;
  onSave: (updated: ProfileCustomization) => void;
  onCancel: () => void;
}

const ProfileEditor: React.FC<Props> = ({ profileData, onSave, onCancel }) => {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    minecraft_username: profileData.minecraft_username || '',
    display_name: profileData.display_name || '',
    gd_username: profileData.gd_username || '',
    bio: profileData.bio || '',
    motto: profileData.motto || '',
    accent_color: profileData.accent_color || '#2563eb',
    name_font: profileData.name_font || 'default',
    name_effect: profileData.name_effect || 'none',
    avatar_shape: profileData.avatar_shape || 'rounded',
    avatar_border_color: profileData.avatar_border_color || '',
    avatar_border_animated: profileData.avatar_border_animated || false,
    banner_gradient: profileData.banner_gradient || '',
    card_background: profileData.card_background || '',
    spotify_iframe: profileData.spotify_iframe || '',
    page_bg_color: profileData.page_bg_color || '',
    page_bg_gradient: profileData.page_bg_gradient || '',
    text_color: profileData.text_color || '#ffffff',
    border_style: profileData.border_style || 'solid',
    border_color: profileData.border_color || '#000000',
    border_radius: profileData.border_radius || '2rem',
    shadow_color: profileData.shadow_color || '#000000',
    custom_css: profileData.custom_css || '',
    social_youtube: (profileData.social_links as Record<string, string>)?.youtube || '',
    social_twitch: (profileData.social_links as Record<string, string>)?.twitch || '',
    social_discord: (profileData.social_links as Record<string, string>)?.discord || '',
    social_instagram: (profileData.social_links as Record<string, string>)?.instagram || '',
    social_tiktok: (profileData.social_links as Record<string, string>)?.tiktok || '',
    social_github: (profileData.social_links as Record<string, string>)?.github || '',
    interests: profileData.interests || [],
    active_badges: profileData.active_badges || [],
    theme: profileData.theme || 'custom',
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleThemeChange = (themeValue: string) => {
    const theme = THEMES.find(t => t.value === themeValue);
    if (theme && theme.accent) {
      setForm({ ...form, theme: themeValue, accent_color: theme.accent });
    } else {
      setForm({ ...form, theme: themeValue });
    }
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest) ? f.interests.filter(i => i !== interest) : [...f.interests, interest],
    }));
  };

  const toggleBadge = (badge: string) => {
    setForm(f => {
      if (f.active_badges.includes(badge)) {
        return { ...f, active_badges: f.active_badges.filter(b => b !== badge) };
      }
      if (f.active_badges.length >= 3) return f; // Max 3
      return { ...f, active_badges: [...f.active_badges, badge] };
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');

    try {
      let bannerUrl = profileData.banner_url;

      // Upload banner if changed
      if (bannerFile) {
        if (bannerFile.size > 2 * 1024 * 1024) {
          setError('Il banner deve essere max 2MB.');
          setSaving(false);
          return;
        }
        const path = `banners/${profile.id}/${Date.now()}_${bannerFile.name}`;
        const { error: uploadError } = await supabase.storage.from('mod-images').upload(path, bannerFile);
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from('mod-images').getPublicUrl(path);
        bannerUrl = urlData.publicUrl;
      }

      const isOwner = profile.admin_rank === 'owner';
      const mcChanged = form.minecraft_username !== (profileData.minecraft_username || '');

      const socialLinks: Record<string, string> = {};
      if (form.social_youtube) socialLinks.youtube = form.social_youtube;
      if (form.social_twitch) socialLinks.twitch = form.social_twitch;
      if (form.social_discord) socialLinks.discord = form.social_discord;
      if (form.social_instagram) socialLinks.instagram = form.social_instagram;
      if (form.social_tiktok) socialLinks.tiktok = form.social_tiktok;
      if (form.social_github) socialLinks.github = form.social_github;

      const updateData: Record<string, unknown> = {
        minecraft_username: form.minecraft_username || null,
        display_name: form.display_name || null,
        gd_username: form.gd_username || null,
        bio: form.bio || null,
        motto: form.motto || null,
        accent_color: form.accent_color,
        name_font: form.name_font,
        name_effect: form.name_effect,
        avatar_shape: form.avatar_shape,
        avatar_border_color: form.avatar_border_color || null,
        avatar_border_animated: form.avatar_border_animated,
        banner_url: bannerUrl,
        banner_gradient: form.banner_gradient || null,
        card_background: form.card_background || null,
        spotify_iframe: form.spotify_iframe || null,
        page_bg_color: form.page_bg_color || null,
        page_bg_gradient: form.page_bg_gradient || null,
        text_color: form.text_color,
        border_style: form.border_style,
        border_color: form.border_color,
        border_radius: form.border_radius,
        shadow_color: form.shadow_color,
        custom_css: form.custom_css || null,
        social_links: socialLinks,
        interests: form.interests,
        active_badges: form.active_badges,
        theme: form.theme,
      };

      if (mcChanged && !isOwner) {
        updateData.ign_verified = false;
      }

      await supabase.from('profiles').update(updateData).eq('id', profile.id);

      onSave({
        ...profileData,
        ...updateData,
        banner_url: bannerUrl,
        social_links: socialLinks,
        ign_verified: (mcChanged && !isOwner) ? false : profileData.ign_verified,
      } as ProfileCustomization);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
    setSaving(false);
  };

  return (
    <PageAnimator className="min-h-screen px-4 py-8 sm:px-margin">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline-md text-[28px] text-white">PERSONALIZZA PROFILO</h2>
            <button onClick={onCancel} className="rounded-xl border-[3px] border-black bg-surface-bright px-4 py-2 font-label-caps text-[11px] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              ← INDIETRO
            </button>
          </div>

          {error && <p className="mb-4 rounded-lg bg-error/20 p-3 text-sm text-error">{error}</p>}

          <div className="space-y-6">
            {/* Theme */}
            <Section title="TEMA">
              <div className="flex flex-wrap gap-2">
                {THEMES.map(t => (
                  <button key={t.value} onClick={() => handleThemeChange(t.value)}
                    className={`rounded-xl border-2 border-black px-3 py-2 font-label-caps text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${form.theme === t.value ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant hover:-translate-y-0.5'}`}
                    style={t.accent ? { borderColor: t.accent } : {}}
                  >{t.label}</button>
                ))}
              </div>
            </Section>

            {/* Identity */}
            <Section title="IDENTITÀ">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Minecraft Username" value={form.minecraft_username} onChange={v => setForm({ ...form, minecraft_username: v })} />
                <Field label="Display Name" value={form.display_name} onChange={v => setForm({ ...form, display_name: v })} />
                <Field label="GD Username" value={form.gd_username} onChange={v => setForm({ ...form, gd_username: v })} />
                <Field label="Motto / Frase" value={form.motto} onChange={v => setForm({ ...form, motto: v })} placeholder="Una frase che ti rappresenta" />
              </div>
              <div className="mt-3">
                <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Bio</label>
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Raccontati..." className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
              </div>
            </Section>

            {/* Visual */}
            <Section title="ASPETTO">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Colore Accent</label>
                  <input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <Select label="Font Nome" value={form.name_font} options={FONTS} onChange={v => setForm({ ...form, name_font: v })} />
                <Select label="Effetto Nome" value={form.name_effect} options={EFFECTS} onChange={v => setForm({ ...form, name_effect: v })} />
                <Select label="Forma Avatar" value={form.avatar_shape} options={SHAPES} onChange={v => setForm({ ...form, avatar_shape: v })} />
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Colore Bordo Avatar</label>
                  <input type="color" value={form.avatar_border_color || form.accent_color} onChange={e => setForm({ ...form, avatar_border_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={form.avatar_border_animated} onChange={e => setForm({ ...form, avatar_border_animated: e.target.checked })} className="h-5 w-5 rounded border-2 border-black" />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">Bordo Animato Rainbow</span>
                </div>
              </div>
            </Section>

            {/* Banner & Background */}
            <Section title="BANNER & SFONDO">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Banner (Upload max 2MB)</label>
                  <input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <Field label="Banner Gradient (hex,hex,hex)" value={form.banner_gradient} onChange={v => setForm({ ...form, banner_gradient: v })} placeholder="#1e3a5f,#2563eb" />
                <Field label="Sfondo Card (hex o hex,hex,hex)" value={form.card_background} onChange={v => setForm({ ...form, card_background: v })} placeholder="#1a1a2e,#0f3460" />
              </div>
            </Section>

            {/* Page & Borders */}
            <Section title="PAGINA & BORDI">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sfondo Pagina (hex)" value={form.page_bg_color} onChange={v => setForm({ ...form, page_bg_color: v })} placeholder="#0a0a0a" />
                <Field label="Sfondo Pagina Gradient" value={form.page_bg_gradient} onChange={v => setForm({ ...form, page_bg_gradient: v })} placeholder="#0a0a0a,#1a1a2e,#000" />
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Colore Testo</label>
                  <input type="color" value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Colore Bordi Card</label>
                  <input type="color" value={form.border_color} onChange={e => setForm({ ...form, border_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <div>
                  <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Colore Ombra</label>
                  <input type="color" value={form.shadow_color} onChange={e => setForm({ ...form, shadow_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                </div>
                <Field label="Border Radius" value={form.border_radius} onChange={v => setForm({ ...form, border_radius: v })} placeholder="2rem" />
                <Select label="Stile Bordo" value={form.border_style} options={[{value:'solid',label:'Solido'},{value:'dashed',label:'Tratteggiato'},{value:'dotted',label:'Puntini'},{value:'double',label:'Doppio'},{value:'none',label:'Nessuno'}]} onChange={v => setForm({ ...form, border_style: v })} />
              </div>
            </Section>

            {/* Custom CSS */}
            <Section title="CSS PERSONALIZZATO (AVANZATO)">
              <textarea value={form.custom_css} onChange={e => setForm({ ...form, custom_css: e.target.value })} rows={3} placeholder="background: red; border: 2px dashed gold; ..."
                className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-xs text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-mono" />
              <p className="mt-1 text-[9px] text-on-surface-variant/60">Proprietà CSS applicate direttamente alla card del profilo</p>
            </Section>

            {/* Social */}
            <Section title="SOCIAL LINKS">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="YouTube" value={form.social_youtube} onChange={v => setForm({ ...form, social_youtube: v })} placeholder="https://youtube.com/@..." />
                <Field label="Twitch" value={form.social_twitch} onChange={v => setForm({ ...form, social_twitch: v })} placeholder="https://twitch.tv/..." />
                <Field label="Discord (tag)" value={form.social_discord} onChange={v => setForm({ ...form, social_discord: v })} placeholder="username#0000" />
                <Field label="Instagram" value={form.social_instagram} onChange={v => setForm({ ...form, social_instagram: v })} placeholder="https://instagram.com/..." />
                <Field label="TikTok" value={form.social_tiktok} onChange={v => setForm({ ...form, social_tiktok: v })} placeholder="https://tiktok.com/@..." />
                <Field label="GitHub" value={form.social_github} onChange={v => setForm({ ...form, social_github: v })} placeholder="https://github.com/..." />
              </div>
            </Section>

            {/* Spotify */}
            <Section title="MUSICA (SPOTIFY EMBED)">
              <div>
                <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">Incolla il codice iframe di Spotify</label>
                <textarea value={form.spotify_iframe} onChange={e => setForm({ ...form, spotify_iframe: e.target.value })} rows={3} placeholder='<iframe src="https://open.spotify.com/embed/track/..." ...'
                  className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-xs text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-mono" />
                <p className="mt-1 text-[9px] text-on-surface-variant/60">Vai su Spotify → Condividi → Copia codice embed</p>
              </div>
            </Section>

            {/* Interests */}
            <Section title="INTERESSI">
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(i => (
                  <button key={i} onClick={() => toggleInterest(i)}
                    className={`rounded-lg border-2 border-black px-2.5 py-1 font-label-caps text-[9px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${form.interests.includes(i) ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant hover:-translate-y-0.5'}`}
                  >{i}</button>
                ))}
              </div>
            </Section>

            {/* Badges */}
            <Section title="BADGE (max 3)">
              <div className="flex flex-wrap gap-2">
                {[...BADGE_OPTIONS, ...(profileData.badges || [])].filter((b, i, arr) => arr.indexOf(b) === i).map(b => (
                  <button key={b} onClick={() => toggleBadge(b)}
                    className={`rounded-lg border-2 border-black px-2.5 py-1 font-label-caps text-[9px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${form.active_badges.includes(b) ? 'bg-tertiary text-black' : 'bg-surface-container-high text-on-surface-variant hover:-translate-y-0.5'}`}
                  >{b}</button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">{form.active_badges.length}/3 selezionati</p>
            </Section>
          </div>

          {/* Save */}
          <div className="mt-8 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl border-[3px] border-black bg-primary-container px-8 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? 'SALVATAGGIO...' : 'SALVA PROFILO'}
            </button>
            <button onClick={onCancel}
              className="rounded-xl border-[3px] border-black bg-surface-bright px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
            >
              ANNULLA
            </button>
          </div>
        </div>
      </div>
    </PageAnimator>
  );
};

// Helper components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="mb-3 font-label-caps text-[12px] text-on-surface-variant">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
  </div>
);

const Select = ({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) => (
  <div>
    <label className="mb-1 block font-label-caps text-[10px] text-on-surface-variant">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export default ProfileEditor;
