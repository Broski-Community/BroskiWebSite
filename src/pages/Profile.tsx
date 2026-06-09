import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabaseClient';
import PageAnimator from '../components/PageAnimator';

interface ProfileData {
  id: string;
  minecraft_username: string | null;
  gd_username: string | null;
  display_name: string | null;
  email: string;
  role: 'user' | 'admin';
  ign_verified: boolean;
  bio: string | null;
  created_at: string;
}

const Profile: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: '', bio: '', gd_username: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      if (!error && data) {
        const p = data as ProfileData;
        setProfileData(p);
        setForm({
          display_name: p.display_name || '',
          bio: (p as unknown as Record<string, string>).bio || '',
          gd_username: p.gd_username || '',
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        display_name: form.display_name || null,
        bio: form.bio || null,
        gd_username: form.gd_username || null,
      })
      .eq('id', profile.id);
    setProfileData((prev) => prev ? { ...prev, ...form } : prev);
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <PageAnimator className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
      </PageAnimator>
    );
  }

  if (!profileData || !profile) {
    return (
      <PageAnimator className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="font-body-lg text-on-surface-variant">{t('common.error')}</p>
      </PageAnimator>
    );
  }

  const isAdmin = profile.role === 'admin';
  const canEdit = isAdmin || profile.id === profileData.id;
  const joinDate = new Date(profileData.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PageAnimator className="min-h-screen px-4 py-8 sm:px-margin">
      <div className="mx-auto max-w-3xl">
        {/* Profile Card */}
        <div className="overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          {/* Banner */}
          <div className="relative h-32 sm:h-40" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)' }}>
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </div>

          {/* Avatar + Info */}
          <div className="relative px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col items-center sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
              <img
                src={profileData.ign_verified ? `https://mc-heads.net/avatar/${profileData.minecraft_username}/128` : '/profilepng/profile.png'}
                alt={profileData.minecraft_username || ''}
                className="h-24 w-24 rounded-2xl border-[4px] border-black bg-surface-container shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:h-28 sm:w-28"
              />
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h1 className="font-headline-lg text-[32px] uppercase leading-none text-white sm:text-[40px]">
                  {profileData.display_name || profileData.minecraft_username}
                </h1>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className={`rounded-lg border-2 border-black px-2 py-0.5 font-label-caps text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    profileData.role === 'admin' ? 'bg-tertiary text-black' : 'bg-primary-container text-white'
                  }`}>
                    {profileData.role.toUpperCase()}
                  </span>
                  {!profileData.ign_verified && (
                    <span className="rounded-lg border border-yellow-500 bg-yellow-500/20 px-2 py-0.5 font-label-caps text-[10px] text-yellow-400">
                      IGN NON VERIFICATO
                    </span>
                  )}
                  <span className="font-body-sm text-[12px] text-on-surface-variant">
                    Membro dal {joinDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="mt-6 space-y-4">
              {!editing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Minecraft Username" value={profileData.minecraft_username || '—'} icon="sports_esports" />
                    <InfoField label="Geometry Dash" value={profileData.gd_username || '—'} icon="videogame_asset" />
                    <InfoField label="Email" value={profileData.email} icon="email" />
                    <InfoField label="Display Name" value={profileData.display_name || '—'} icon="badge" />
                  </div>
                  {(profileData as unknown as Record<string, string>).bio && (
                    <div className="rounded-2xl border-[3px] border-black bg-surface-container-high p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">description</span>
                        <span className="font-label-caps text-[11px] text-on-surface-variant">Bio</span>
                      </div>
                      <p className="font-body-sm text-on-surface">{(profileData as unknown as Record<string, string>).bio}</p>
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-primary-container px-5 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      {t('common.edit')}
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Display Name</label>
                      <input
                        type="text"
                        value={form.display_name}
                        onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                        placeholder={profileData.minecraft_username || ''}
                        className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Geometry Dash Username</label>
                      <input
                        type="text"
                        value={form.gd_username}
                        onChange={(e) => setForm({ ...form, gd_username: e.target.value })}
                        className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={3}
                      placeholder="Scrivi qualcosa su di te..."
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-primary-container px-5 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {saving ? 'Salvataggio...' : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-surface-bright px-5 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageAnimator>
  );
};

const InfoField = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="rounded-xl border-[3px] border-black bg-surface-container-high p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <div className="mb-1 flex items-center gap-2">
      <span className="material-symbols-outlined text-[16px] text-primary-container">{icon}</span>
      <span className="font-label-caps text-[10px] text-on-surface-variant">{label}</span>
    </div>
    <p className="truncate font-headline-md text-[14px] text-white">{value}</p>
  </div>
);

export default Profile;
