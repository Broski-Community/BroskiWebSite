import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import ProfileEditor from '../components/ProfileEditor';

export interface ProfileCustomization {
  id: string;
  minecraft_username: string | null;
  gd_username: string | null;
  display_name: string | null;
  email: string;
  role: 'user' | 'admin';
  admin_rank: 'owner' | 'admin' | 'mod' | 'tier_tester' | null;
  ign_verified: boolean;
  bio: string | null;
  created_at: string;
  banner_url: string | null;
  banner_gradient: string | null;
  accent_color: string;
  name_font: string;
  name_effect: string;
  avatar_shape: string;
  avatar_border_color: string | null;
  avatar_border_animated: boolean;
  card_background: string | null;
  motto: string | null;
  spotify_iframe: string | null;
  spotify_url: string | null;
  social_links: Record<string, string>;
  interests: string[];
  badges: string[];
  active_badges: string[];
  theme: string;
  page_bg_color: string | null;
  page_bg_gradient: string | null;
  text_color: string;
  border_style: string;
  border_color: string;
  border_radius: string;
  shadow_color: string;
  custom_css: string | null;
  layout: string;
  sections_order: string[];
}

const FONT_CLASSES: Record<string, string> = {
  default: 'font-headline-lg',
  pixel: 'font-mono',
  handwriting: 'italic font-serif',
  bold: 'font-black tracking-tight',
  retro: 'font-headline-md tracking-widest',
};

const SHAPE_CLASSES: Record<string, string> = {
  rounded: 'rounded-2xl',
  circle: 'rounded-full',
  hexagon: 'clip-path-hexagon rounded-none',
  diamond: 'rotate-45 rounded-lg',
};

const Profile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { profile: myProfile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [playerStats, setPlayerStats] = useState<{ points: number; combat_rank: string } | null>(null);

  const isOwnProfile = !username || (myProfile?.minecraft_username === username);
  const canEdit = isOwnProfile || myProfile?.admin_rank === 'owner';

  useEffect(() => {
    const fetchProfile = async () => {
      let query = supabase.from('profiles').select('*');
      if (username) {
        query = query.eq('minecraft_username', username);
      } else if (myProfile) {
        query = query.eq('id', myProfile.id);
      } else {
        setLoading(false);
        return;
      }
      const { data } = await query.single();
      if (data) {
        setProfileData(data as unknown as ProfileCustomization);
        if (data.minecraft_username) {
          const { data: p } = await supabase.from('players').select('points, combat_rank').eq('ign', data.minecraft_username).single();
          if (p) setPlayerStats(p);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username, myProfile]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-black"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" /></div>;
  }
  if (!profileData) {
    return <div className="flex min-h-screen items-center justify-center bg-black"><p className="text-white text-lg">Profilo non trovato.</p></div>;
  }
  if (editing && canEdit) {
    return <ProfileEditor profileData={profileData} onSave={(updated) => { setProfileData(updated); setEditing(false); }} onCancel={() => setEditing(false)} />;
  }

  const accent = profileData.accent_color || '#2563eb';
  const textColor = profileData.text_color || '#ffffff';
  const borderColor = profileData.border_color || '#000000';
  const borderRadius = profileData.border_radius || '2rem';
  const shadowColor = profileData.shadow_color || '#000000';
  const fontClass = FONT_CLASSES[profileData.name_font] || FONT_CLASSES.default;
  const shapeClass = SHAPE_CLASSES[profileData.avatar_shape] || SHAPE_CLASSES.rounded;

  const avatarSrc = profileData.ign_verified
    ? `https://mc-heads.net/avatar/${profileData.minecraft_username}/128`
    : '/profilepng/profile.png';

  const joinDate = new Date(profileData.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });

  // Page background - completely custom
  const pageBgStyle: React.CSSProperties = profileData.page_bg_gradient
    ? { background: profileData.page_bg_gradient.includes(',') ? `linear-gradient(135deg, ${profileData.page_bg_gradient})` : profileData.page_bg_gradient }
    : profileData.page_bg_color
      ? { background: profileData.page_bg_color }
      : { background: '#0a0a0a' };

  // Card style
  const cardStyle: React.CSSProperties = {
    borderRadius,
    border: `4px ${profileData.border_style || 'solid'} ${borderColor}`,
    boxShadow: `10px 10px 0px 0px ${shadowColor}`,
    color: textColor,
    ...(profileData.card_background
      ? profileData.card_background.includes(',')
        ? { background: `linear-gradient(160deg, ${profileData.card_background})` }
        : { background: profileData.card_background }
      : { background: '#1a1a2e' }),
  };

  // Banner
  const bannerStyle: React.CSSProperties = profileData.banner_url
    ? { backgroundImage: `url(${profileData.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : profileData.banner_gradient
      ? { background: profileData.banner_gradient.includes(',') ? `linear-gradient(135deg, ${profileData.banner_gradient})` : profileData.banner_gradient }
      : { background: `linear-gradient(135deg, ${accent}66 0%, ${accent} 50%, ${accent}cc 100%)` };

  // Name effect
  const nameStyle: React.CSSProperties = profileData.name_effect === 'glow'
    ? { textShadow: `0 0 20px ${accent}, 0 0 40px ${accent}66`, color: textColor }
    : profileData.name_effect === 'gradient'
      ? { background: `linear-gradient(90deg, ${accent}, ${textColor}, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
      : { color: textColor };

  const avatarBorderStyle: React.CSSProperties = {
    borderColor: profileData.avatar_border_color || accent,
    borderWidth: '4px',
    borderStyle: 'solid',
  };

  // Extract spotify src from iframe string
  const spotifySrc = (() => {
    if (!profileData.spotify_iframe) return null;
    const match = profileData.spotify_iframe.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  })();

  // Render section by key
  const renderSection = (key: string) => {
    switch (key) {
      case 'banner':
        return (
          <div key={key} className="relative h-36 overflow-hidden sm:h-44" style={{ ...bannerStyle, borderRadius: `calc(${borderRadius} - 4px) calc(${borderRadius} - 4px) 0 0` }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          </div>
        );
      case 'info':
        return (
          <div key={key} className="px-6 pt-0 sm:px-8" style={{ marginTop: '-3.5rem' }}>
            <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
              <div className={`relative ${profileData.avatar_border_animated ? 'animate-border-rainbow' : ''}`}>
                <img src={avatarSrc} alt="" className={`h-28 w-28 bg-black/50 shadow-[5px_5px_0px_0px_${shadowColor}] ${shapeClass} ${profileData.avatar_shape === 'diamond' ? 'h-20 w-20' : ''}`} style={avatarBorderStyle} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h1 className={`${fontClass} text-[32px] uppercase leading-none sm:text-[42px] ${profileData.name_effect === 'pulse' ? 'animate-pulse' : ''}`} style={nameStyle}>
                  {profileData.display_name || profileData.minecraft_username}
                </h1>
                {profileData.motto && <p className="mt-1 text-[13px] italic opacity-70">"{profileData.motto}"</p>}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${accent}44`, color: accent, border: `1px solid ${accent}` }}>
                    {(profileData.admin_rank || profileData.role).toUpperCase()}
                  </span>
                  {!profileData.ign_verified && <span className="rounded-lg border border-yellow-500 bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">NON VERIFICATO</span>}
                  {profileData.active_badges?.slice(0, 3).map(badge => (
                    <span key={badge} className="rounded-lg px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: accent, color: '#000' }}>{badge}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'social':
        if (!profileData.social_links || Object.values(profileData.social_links).every(v => !v)) return null;
        return (
          <div key={key} className="px-6 pt-4 sm:px-8">
            <div className="flex flex-wrap gap-2">
              {Object.entries(profileData.social_links).map(([platform, url]) => url && (
                <a key={platform} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase transition-all hover:scale-105"
                  style={{ backgroundColor: `${accent}33`, color: accent, border: `2px solid ${accent}55` }}>
                  {platform}
                </a>
              ))}
            </div>
          </div>
        );
      case 'bio':
        if (!profileData.bio) return null;
        return (
          <div key={key} className="px-6 pt-4 sm:px-8">
            <div className="rounded-xl p-4" style={{ backgroundColor: `${accent}11`, border: `2px solid ${accent}33` }}>
              <p className="whitespace-pre-wrap text-sm" style={{ color: `${textColor}cc` }}>{profileData.bio}</p>
            </div>
          </div>
        );
      case 'interests':
        if (!profileData.interests?.length) return null;
        return (
          <div key={key} className="px-6 pt-4 sm:px-8">
            <p className="mb-2 text-[10px] font-bold uppercase opacity-50">Interessi</p>
            <div className="flex flex-wrap gap-1.5">
              {profileData.interests.map(i => (
                <span key={i} className="rounded-lg px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${accent}33`, color: textColor, border: `1px solid ${accent}55` }}>{i}</span>
              ))}
            </div>
          </div>
        );
      case 'stats':
        return (
          <div key={key} className="px-6 pt-4 sm:px-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBox accent={accent} textColor={textColor} icon="calendar_month" label="MEMBRO DAL" value={joinDate} />
              {playerStats && <>
                <StatBox accent={accent} textColor={textColor} icon="emoji_events" label="COMBAT RANK" value={playerStats.combat_rank} />
                <StatBox accent={accent} textColor={textColor} icon="star" label="PUNTI" value={String(playerStats.points)} />
              </>}
            </div>
          </div>
        );
      case 'spotify':
        if (!spotifySrc) return null;
        return (
          <div key={key} className="px-6 pt-4 pb-2 sm:px-8">
            <iframe src={spotifySrc} width="100%" height="152" allow="encrypted-media; autoplay; clipboard-write; fullscreen; picture-in-picture" loading="lazy"
              className="rounded-xl" style={{ border: `2px solid ${accent}44` }} />
          </div>
        );
      default:
        return null;
    }
  };

  const sections = profileData.sections_order?.length ? profileData.sections_order : ['banner', 'info', 'social', 'bio', 'interests', 'stats', 'spotify'];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8" style={pageBgStyle}>
      {/* Custom CSS injection (sanitized - only color/bg/border/shadow/font properties) */}
      {profileData.custom_css && (
        <style>{`.profile-card { ${profileData.custom_css} }`}</style>
      )}

      <div className="mx-auto max-w-3xl">
        {/* Edit button floating */}
        {canEdit && (
          <button onClick={() => setEditing(true)}
            className="mb-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:scale-105"
            style={{ backgroundColor: accent, color: '#000', boxShadow: `4px 4px 0px ${shadowColor}` }}>
            <span className="material-symbols-outlined text-[18px]">palette</span>
            PERSONALIZZA
          </button>
        )}

        {/* Profile Card */}
        <div className="profile-card overflow-hidden" style={cardStyle}>
          {sections.map(renderSection)}
          {/* Bottom padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ accent, textColor, icon, label, value }: { accent: string; textColor: string; icon: string; label: string; value: string }) => (
  <div className="rounded-xl p-3" style={{ backgroundColor: `${accent}15`, border: `2px solid ${accent}33` }}>
    <span className="material-symbols-outlined text-[20px]" style={{ color: accent }}>{icon}</span>
    <p className="mt-1 text-[9px] font-bold uppercase opacity-50" style={{ color: textColor }}>{label}</p>
    <p className="text-[13px] font-bold" style={{ color: textColor }}>{value}</p>
  </div>
);

export default Profile;
