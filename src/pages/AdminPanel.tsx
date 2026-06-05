import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import PageAnimator from '../components/PageAnimator';
import TransitionLink from '../components/TransitionLink';
import { useLanguage } from '../context/LanguageContext';

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
  created_at: string;
}

interface Player {
  id: string;
  ign: string;
  discord_id: string | null;
  region: string;
  points: number;
  combat_rank: string;
}

interface PlayerRank {
  id: string;
  player_id: string;
  category: string;
  tier: string;
}

const CATEGORIES = ['OVERALL', 'LTMS', 'VANILLA', 'UHC', 'POT', 'NETHOP', 'SMP', 'SWORD', 'AXE', 'MACE', 'CRYSTAL'];

const CATEGORY_ICONS: Record<string, string> = {
  OVERALL: 'military_tech',
  LTMS: 'timer',
  VANILLA: 'grass',
  UHC: 'heart_broken',
  POT: 'local_drink',
  NETHOP: 'whatshot',
  SMP: 'groups',
  SWORD: 'swords',
  AXE: 'hardware',
  MACE: 'auto_fix_high',
  CRYSTAL: 'diamond',
};

const EDITABLE_CATEGORIES = CATEGORIES.filter(c => c !== 'OVERALL');

const DEFAULT_RANKS: Record<string, string> = {
  LTMS: 'HT3',
  VANILLA: 'HT3',
  UHC: 'HT3',
  POT: 'HT3',
  NETHOP: 'HT3',
  SMP: 'HT3',
  SWORD: 'HT3',
  AXE: 'HT3',
  MACE: 'HT3',
  CRYSTAL: 'HT3',
};

// Tier order for calculating average (lower = better)
const TIER_ORDER: Record<string, number> = {
  'HT1': 1, 'LT1': 2,
  'HT2': 3, 'LT2': 4,
  'HT3': 5, 'LT3': 6,
  'HT4': 7, 'LT4': 8,
  'HT5': 9, 'LT5': 10,
  'UNRANKED': 99,
};

const TIER_BY_ORDER: Record<number, string> = {
  1: 'HT1', 2: 'LT1',
  3: 'HT2', 4: 'LT2',
  5: 'HT3', 6: 'LT3',
  7: 'HT4', 8: 'LT4',
  9: 'HT5', 10: 'LT5',
};

// Tier point values - HT = High Tier (valore alto), LT = Low Tier (valore basso)
const TIER_POINTS: Record<string, number> = {
  'HT1': 60, 'LT1': 45,
  'HT2': 30, 'LT2': 20,
  'HT3': 10, 'LT3': 6,
  'HT4': 4,  'LT4': 3,
  'HT5': 2,  'LT5': 1,
  'UNRANKED': 0,
};

// Calculate overall tier as average of other categories
const calculateOverallTier = (ranks: Record<string, string>): string => {
  const categories = CATEGORIES.filter(c => c !== 'OVERALL');
  const validRanks = categories
    .map(cat => ranks[cat])
    .filter(tier => tier && tier !== 'UNRANKED');
  
  if (validRanks.length === 0) return 'UNRANKED';
  
  const totalOrder = validRanks.reduce((sum, tier) => sum + (TIER_ORDER[tier] || 99), 0);
  const averageOrder = Math.round(totalOrder / validRanks.length);
  
  return TIER_BY_ORDER[averageOrder] || 'HT3';
};

// Combat Rank based on total points
const getCombatRank = (points: number): { title: string; icon: string; desc: string } => {
  if (points >= 400) return { title: 'Combat Grandmaster', icon: 'workspace_premium', desc: 'Obtained 400+ total points.' };
  if (points >= 250) return { title: 'Combat Master', icon: 'military_tech', desc: 'Obtained 250+ total points.' };
  if (points >= 100) return { title: 'Combat Ace', icon: 'local_fire_department', desc: 'Obtained 100+ total points.' };
  if (points >= 50) return { title: 'Combat Specialist', icon: 'verified', desc: 'Obtained 50+ total points.' };
  if (points >= 20) return { title: 'Combat Cadet', icon: 'school', desc: 'Obtained 20+ total points.' };
  if (points >= 10) return { title: 'Combat Novice', icon: 'emoji_events', desc: 'Obtained 10+ total points.' };
  return { title: 'Rookie', icon: 'person', desc: 'Starting rank for players with less than 10 points.' };
};

// Calculate points from ranks
const calculatePoints = (ranks: Record<string, string>): number => {
  let total = 0;
  Object.values(ranks).forEach(tier => {
    total += TIER_POINTS[tier] || 0;
  });
  return total;
};

type AdminTab = 'news' | 'tierlist' | 'countdown' | 'contacts' | 'mods' | 'ideas';

interface Idea {
  id: string;
  author_name: string;
  title: string;
  content: string;
  rating: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('news');
  
  // Countdown state
  const [countdownTarget, setCountdownTarget] = useState('2026-07-01T00:00');
  const [countdownSaving, setCountdownSaving] = useState(false);

  // Contacts state
  const [contactEmail, setContactEmail] = useState('');
  const [contactDiscord, setContactDiscord] = useState('');
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactYoutube, setContactYoutube] = useState('');
  const [contactDescription, setContactDescription] = useState('');
  const [contactsSaving, setContactsSaving] = useState(false);

  // Mods review state
  const [pendingMods, setPendingMods] = useState<{id: string; title: string; author_name: string; category: string; status: string; created_at: string}[]>([]);
  const [modsLoading, setModsLoading] = useState(false);

  // Ideas state
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideaDropdownOpen, setIdeaDropdownOpen] = useState<string | null>(null);
  
  // News state
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsLang, setNewsLang] = useState<'it' | 'en'>('it');
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    title_en: '',
    content_en: '',
    category: 'GENERALE',
    variant: 'default' as 'default' | 'urgent' | 'event',
    icon: 'newspaper',
    active: true,
    order_index: 0,
  });

  // TierList state
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerRanks, setPlayerRanks] = useState<PlayerRank[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerForm, setPlayerForm] = useState({
    ign: '',
    region: 'EU',
    ranks: { ...DEFAULT_RANKS },
  });

  // Calculate dynamic values
  const calculatedPoints = calculatePoints(playerForm.ranks);
  const combatRankInfo = getCombatRank(calculatedPoints);

  // Load news
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('order_index', { ascending: true });
    if (!error && data) setNews(data as NewsItem[]);
    setNewsLoading(false);
  }, []);

  // Load players and ranks
  const fetchPlayers = useCallback(async () => {
    setPlayersLoading(true);
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('points', { ascending: false });
    
    const { data: ranksData, error: ranksError } = await supabase
      .from('player_ranks')
      .select('*');
    
    if (!playersError && playersData) setPlayers(playersData as Player[]);
    if (!ranksError && ranksData) setPlayerRanks(ranksData as PlayerRank[]);
    setPlayersLoading(false);
  }, []);

  // Mods review
  const fetchPendingMods = useCallback(async () => {
    setModsLoading(true);
    const { data, error } = await supabase
      .from('mods')
      .select('id, title, author_name, category, status, created_at')
      .in('status', ['pending', 'on_hold'])
      .order('created_at', { ascending: true });
    if (!error && data) setPendingMods(data);
    setModsLoading(false);
  }, []);

  const fetchIdeas = useCallback(async () => {
    setIdeasLoading(true);
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setIdeas(data as Idea[]);
    setIdeasLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
    fetchPlayers();
    fetchPendingMods();
    fetchIdeas();
    // Fetch countdown target
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'countdown_target')
        .single();
      if (data?.value) setCountdownTarget(data.value.slice(0, 16));
    })();
    // Fetch contacts
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['contact_email', 'contact_discord', 'contact_instagram', 'contact_youtube', 'contact_description']);
      if (data) {
        data.forEach((row: { key: string; value: string }) => {
          if (row.key === 'contact_email') setContactEmail(row.value);
          if (row.key === 'contact_discord') setContactDiscord(row.value);
          if (row.key === 'contact_instagram') setContactInstagram(row.value);
          if (row.key === 'contact_youtube') setContactYoutube(row.value);
          if (row.key === 'contact_description') setContactDescription(row.value);
        });
      }
    })();
  }, [fetchNews, fetchPlayers, fetchPendingMods, fetchIdeas]);

  const handleSaveCountdown = async () => {
    setCountdownSaving(true);
    await supabase.from('site_settings').upsert({ key: 'countdown_target', value: countdownTarget });
    setCountdownSaving(false);
  };

  const handleSaveContacts = async () => {
    setContactsSaving(true);
    await supabase.from('site_settings').upsert([
      { key: 'contact_email', value: contactEmail },
      { key: 'contact_discord', value: contactDiscord },
      { key: 'contact_instagram', value: contactInstagram },
      { key: 'contact_youtube', value: contactYoutube },
      { key: 'contact_description', value: contactDescription },
    ]);
    setContactsSaving(false);
  };

  const handleModAction = async (modId: string, action: 'approved' | 'rejected' | 'on_hold') => {
    await supabase.from('mods').update({ status: action }).eq('id', modId);
    fetchPendingMods();
  };

  // News CRUD
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newsForm.title,
      content: newsForm.content,
      title_en: newsForm.title_en || null,
      content_en: newsForm.content_en || null,
      category: newsForm.category,
      variant: newsForm.variant,
      icon: newsForm.icon,
      active: newsForm.active,
      order_index: newsForm.order_index,
    };
    if (editingNews) {
      await supabase.from('news').update(payload).eq('id', editingNews.id);
    } else {
      await supabase.from('news').insert([payload]);
    }
    setShowNewsForm(false);
    setEditingNews(null);
    setNewsLang('it');
    setNewsForm({
      title: '',
      content: '',
      title_en: '',
      content_en: '',
      category: 'GENERALE',
      variant: 'default',
      icon: 'newspaper',
      active: true,
      order_index: 0,
    });
    fetchNews();
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Eliminare questa news?')) return;
    await supabase.from('news').delete().eq('id', id);
    fetchNews();
  };

  const handleEditNews = (item: NewsItem) => {
    setEditingNews(item);
    setNewsLang('it');
    setNewsForm({
      title: item.title,
      content: item.content,
      title_en: item.title_en || '',
      content_en: item.content_en || '',
      category: item.category,
      variant: item.variant,
      icon: item.icon,
      active: item.active,
      order_index: item.order_index,
    });
    setShowNewsForm(true);
  };

  // Get tier for player in specific category
  const getPlayerTier = (playerId: string, category: string) => {
    const rank = playerRanks.find(r => r.player_id === playerId && r.category === category);
    return rank?.tier || 'UNRANKED';
  };

  // Get all ranks for player
  const getPlayerRanks = (playerId: string): Record<string, string> => {
    const ranks: Record<string, string> = { ...DEFAULT_RANKS };
    playerRanks
      .filter(r => r.player_id === playerId)
      .forEach(r => { ranks[r.category] = r.tier; });
    return ranks;
  };

  // Player CRUD
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    let playerId = editingPlayer?.id;

    const points = calculatedPoints;
    const combatRank = combatRankInfo.title;

    if (editingPlayer) {
      // Update player base info
      await supabase.from('players').update({
        ign: playerForm.ign,
        region: playerForm.region,
        points,
        combat_rank: combatRank,
      }).eq('id', editingPlayer.id);
    } else {
      // Insert new player
      const { data: newPlayer } = await supabase.from('players').insert({
        ign: playerForm.ign,
        region: playerForm.region,
        points,
        combat_rank: combatRank,
      }).select().single();
      
      if (newPlayer) playerId = newPlayer.id;
    }

    // Calculate OVERALL tier from average of other categories
    const overallTier = calculateOverallTier(playerForm.ranks);
    
    // Save/update all category ranks (including calculated OVERALL)
    if (playerId) {
      const allRanks: Record<string, string> = { ...playerForm.ranks, OVERALL: overallTier };
      
      for (const category of CATEGORIES) {
        const tier = allRanks[category] || 'HT3';
        const existingRank = playerRanks.find(r => r.player_id === playerId && r.category === category);
        
        if (existingRank) {
          await supabase.from('player_ranks').update({ tier }).eq('id', existingRank.id);
        } else {
          await supabase.from('player_ranks').insert({ player_id: playerId, category, tier });
        }
      }
    }

    // Aggiorna lo stato locale immediatamente per feedback istantaneo
    if (playerId) {
      setPlayerRanks(prev => {
        const updated = [...prev];
        const allRanks: Record<string, string> = { ...playerForm.ranks, OVERALL: overallTier };
        
        CATEGORIES.forEach(category => {
          const tier = allRanks[category] || 'HT3';
          const existingIndex = updated.findIndex(r => r.player_id === playerId && r.category === category);
          if (existingIndex >= 0) {
            updated[existingIndex] = { ...updated[existingIndex], tier };
          } else {
            updated.push({ id: crypto.randomUUID(), player_id: playerId, category, tier });
          }
        });
        return updated;
      });
      
      // Aggiorna anche i punti e combat_rank nel player locale
      setPlayers(prev => prev.map(p => 
        p.id === playerId 
          ? { ...p, points, combat_rank: combatRank }
          : p
      ));
    }

    setShowPlayerForm(false);
    setEditingPlayer(null);
    setPlayerForm({
      ign: '',
      region: 'EU',
      ranks: { ...DEFAULT_RANKS },
    });
    await fetchPlayers();
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Eliminare questo player?')) return;
    // Delete ranks first, then player
    await supabase.from('player_ranks').delete().eq('player_id', id);
    await supabase.from('players').delete().eq('id', id);
    fetchPlayers();
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setPlayerForm({
      ign: player.ign,
      region: player.region,
      ranks: getPlayerRanks(player.id),
    });
    setShowPlayerForm(true);
  };

  return (
    <PageAnimator className="min-h-[calc(100vh-76px)] w-full px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline-lg text-[48px] uppercase leading-none text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              PANNELLO ADMIN
            </h1>
            <p className="mt-2 font-body-sm text-on-surface-variant">
              Gestisci News e TierList • Loggato come <span className="text-primary-container font-bold">{profile?.minecraft_username}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <TransitionLink
              to="/store"
              className="rounded-2xl border-[3px] border-black bg-tertiary px-6 py-3 font-headline-md text-[16px] text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <span className="material-symbols-outlined mr-1 inline-block text-[18px]">storefront</span>
              STORE
            </TransitionLink>
            <TransitionLink
              to="/"
              className="rounded-2xl border-[3px] border-black bg-surface-bright px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              TORNA ALLA HOME
            </TransitionLink>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('news')}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'news'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">newspaper</span>
            {t('admin.tab.news')}
          </button>
          <button
            onClick={() => setActiveTab('tierlist')}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'tierlist'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">emoji_events</span>
            {t('admin.tab.tierlist')}
          </button>
          <button
            onClick={() => setActiveTab('countdown')}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'countdown'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">timer</span>
            COUNTDOWN
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'contacts'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">contacts</span>
            CONTATTI
          </button>
          <button
            onClick={() => setActiveTab('mods')}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'mods'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">extension</span>
            MODS
          </button>
          <button
            onClick={async () => {
              setActiveTab('ideas');
              // Mark ideas as seen
              if (profile) {
                await supabase.from('profiles').update({ last_ideas_seen_at: new Date().toISOString() }).eq('id', profile.id);
              }
            }}
            className={`rounded-2xl border-[3px] border-black px-6 py-3 font-headline-md text-[16px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
              activeTab === 'ideas'
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface hover:-translate-y-1'
            }`}
          >
            <span className="material-symbols-outlined mr-2 inline-block">lightbulb</span>
            IDEE
          </button>
        </div>

        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline-md text-[28px] text-white">{t('admin.news.title')}</h2>
              <button
                onClick={() => {
                  setEditingNews(null);
                  setNewsLang('it');
                  setNewsForm({
                    title: '',
                    content: '',
                    title_en: '',
                    content_en: '',
                    category: 'GENERALE',
                    variant: 'default',
                    icon: 'newspaper',
                    active: true,
                    order_index: news.length,
                  });
                  setShowNewsForm(true);
                }}
                className="rounded-xl border-[3px] border-black bg-tertiary px-4 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span className="material-symbols-outlined mr-1 inline-block text-[18px]">add</span>
                {t('admin.news.new')}
              </button>
            </div>

            {/* News Form */}
            {showNewsForm && (
              <form onSubmit={handleSaveNews} className="mb-6 rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-4 font-headline-md text-[20px] text-white">
                  {editingNews ? t('admin.news.edit') : t('admin.news.create')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
                      {t('admin.news.form.title')} {newsLang === 'en' && <span className="text-blue-400">(English)</span>}
                    </label>
                    <input
                      type="text"
                      value={newsLang === 'it' ? newsForm.title : newsForm.title_en}
                      onChange={(e) => setNewsForm({ ...newsForm, [newsLang === 'it' ? 'title' : 'title_en']: e.target.value })}
                      required={newsLang === 'it'}
                      placeholder={newsLang === 'en' ? 'English title (optional)' : ''}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">{t('admin.news.form.category')}</label>
                    <input
                      type="text"
                      value={newsForm.category}
                      onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                      required
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
                      {t('admin.news.form.content')} {newsLang === 'en' && <span className="text-blue-400">(English)</span>}
                    </label>
                    <textarea
                      value={newsLang === 'it' ? newsForm.content : newsForm.content_en}
                      onChange={(e) => setNewsForm({ ...newsForm, [newsLang === 'it' ? 'content' : 'content_en']: e.target.value })}
                      required={newsLang === 'it'}
                      placeholder={newsLang === 'en' ? 'English content (optional)' : ''}
                      rows={3}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Icona (Material Symbol)</label>
                    <input
                      type="text"
                      value={newsForm.icon}
                      onChange={(e) => setNewsForm({ ...newsForm, icon: e.target.value })}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Variante</label>
                    <select
                      value={newsForm.variant}
                      onChange={(e) => setNewsForm({ ...newsForm, variant: e.target.value as 'default' | 'urgent' | 'event' })}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <option value="default">Default</option>
                      <option value="urgent">Urgente (Blu)</option>
                      <option value="event">Evento (Secondario)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Ordine</label>
                    <input
                      type="number"
                      value={newsForm.order_index}
                      onChange={(e) => setNewsForm({ ...newsForm, order_index: parseInt(e.target.value) })}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={newsForm.active}
                      onChange={(e) => setNewsForm({ ...newsForm, active: e.target.checked })}
                      className="h-5 w-5 rounded border-2 border-black"
                    />
                    <label htmlFor="active" className="font-label-caps text-[11px] text-on-surface-variant">Attiva</label>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-xl border-[3px] border-black bg-primary-container px-6 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    SALVA
                  </button>
                  {/* ITA/ENG Switch */}
                  <div className="flex items-center gap-2 rounded-xl border-[2px] border-black bg-surface-container-high px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-label-caps text-[11px] text-on-surface-variant">LINGUA</span>
                    <div className="flex items-center gap-1 rounded-lg border-2 border-black bg-black p-1">
                      <button
                        type="button"
                        onClick={() => setNewsLang('it')}
                        className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${newsLang === 'it' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
                      >
                        IT
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewsLang('en')}
                        className={`rounded px-2 py-1 font-label-caps text-[10px] transition-all ${newsLang === 'en' ? 'bg-tertiary text-black' : 'text-white hover:bg-white/10'}`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewsForm(false); setNewsLang('it'); }}
                    className="rounded-xl border-[3px] border-black bg-surface-bright px-6 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    ANNULLA
                  </button>
                </div>
              </form>
            )}

            {/* News List */}
            {newsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border-[3px] border-black bg-surface-container-high p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined rounded-lg border-2 border-black p-2 ${
                        item.variant === 'urgent' ? 'bg-blue-600 text-white' : 
                        item.variant === 'event' ? 'bg-secondary-container text-on-secondary-container' : 
                        'bg-primary-container text-white'
                      }`}>
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="font-headline-md text-[16px] text-white">{item.title}</h4>
                        <p className="text-xs text-on-surface-variant">{item.category} • Ordine: {item.order_index}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg border-2 border-black px-2 py-1 text-xs ${
                        item.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}>
                        {item.active ? 'ATTIVA' : 'DISATTIVA'}
                      </span>
                      <button
                        onClick={() => handleEditNews(item)}
                        className="rounded-lg border-2 border-black bg-tertiary p-2 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="rounded-lg border-2 border-black bg-error-container p-2 text-on-error-container shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                {news.length === 0 && (
                  <p className="text-center py-8 text-on-surface-variant">Nessuna news trovata. Clicca "NUOVA NEWS" per aggiungerne una.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TIERLIST TAB */}
        {activeTab === 'tierlist' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline-md text-[28px] text-white">{t('admin.tierlist.title')}</h2>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setPlayerForm({
                    ign: '',
                    region: 'EU',
                    ranks: { ...DEFAULT_RANKS },
                  });
                  setShowPlayerForm(true);
                }}
                className="rounded-xl border-[3px] border-black bg-tertiary px-4 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span className="material-symbols-outlined mr-1 inline-block text-[18px]">add</span>
                {t('admin.tierlist.new')}
              </button>
            </div>

            {/* Player Form */}
            {showPlayerForm && (
              <form onSubmit={handleSavePlayer} className="mb-6 rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-4 font-headline-md text-[20px] text-white">
                  {editingPlayer ? t('admin.tierlist.edit') : t('admin.tierlist.create')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">{t('admin.tierlist.form.ign')}</label>
                    <input
                      type="text"
                      value={playerForm.ign}
                      onChange={(e) => setPlayerForm({ ...playerForm, ign: e.target.value })}
                      required
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    />
                  </div>
                  {/* Display OVERALL calcolato */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between rounded-2xl border-[3px] border-black bg-surface-container-high p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined rounded-xl border-2 border-black bg-primary p-2 text-[28px] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          {CATEGORY_ICONS['OVERALL']}
                        </span>
                        <div>
                          <p className="font-label-caps text-[11px] text-on-surface-variant">{t('admin.tierlist.form.overall')}</p>
                          <p className="font-headline-md text-[20px] text-primary">{calculateOverallTier(playerForm.ranks)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-on-surface-variant">{t('admin.tierlist.form.overall.desc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid Ranks per categorie modificabili (senza OVERALL) */}
                  <div className="sm:col-span-2">
                    <label className="mb-3 block font-label-caps text-[14px] text-primary-container">
                      <span className="material-symbols-outlined mr-1 inline-block text-[18px]">emoji_events</span>
                      {t('admin.tierlist.form.ranks')}
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {EDITABLE_CATEGORIES.map((cat) => (
                        <div key={cat} className="rounded-xl border-[2px] border-black bg-surface-container-high p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">{CATEGORY_ICONS[cat]}</span>
                            {cat}
                          </label>
                          <select
                            value={playerForm.ranks[cat] || 'HT3'}
                            onChange={(e) => setPlayerForm({
                              ...playerForm,
                              ranks: { ...playerForm.ranks, [cat]: e.target.value }
                            })}
                            className="w-full rounded-lg border-[2px] border-black bg-surface-container px-2 py-1.5 text-xs font-bold text-on-surface shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          >
                            <option value="HT1">HT1 (60 pts)</option>
                            <option value="LT1">LT1 (45 pts)</option>
                            <option value="HT2">HT2 (30 pts)</option>
                            <option value="LT2">LT2 (20 pts)</option>
                            <option value="HT3">HT3 (10 pts)</option>
                            <option value="LT3">LT3 (6 pts)</option>
                            <option value="HT4">HT4 (4 pts)</option>
                            <option value="LT4">LT4 (3 pts)</option>
                            <option value="HT5">HT5 (2 pts)</option>
                            <option value="LT5">LT5 (1 pt)</option>
                            <option value="UNRANKED">-</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">Region</label>
                    <select
                      value={playerForm.region}
                      onChange={(e) => setPlayerForm({ ...playerForm, region: e.target.value })}
                      className="w-full rounded-xl border-[3px] border-black bg-surface-container px-3 py-2 text-sm text-on-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <option value="EU">EU</option>
                      <option value="NA">NA</option>
                      <option value="AS">AS</option>
                      <option value="SA">SA</option>
                      <option value="OC">OC</option>
                    </select>
                  </div>
                  {/* Combat Rank Display (calculated) */}
                  <div className="sm:col-span-2 rounded-2xl border-[3px] border-black bg-tertiary-container p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined rounded-xl border-2 border-black bg-tertiary p-3 text-[32px] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {combatRankInfo.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline-md text-[20px] text-white">{calculatedPoints.toLocaleString()}</span>
                          <span className="rounded-lg border-2 border-black bg-surface-container px-2 py-0.5 text-xs text-on-surface">pts</span>
                        </div>
                        <div className="font-headline-md text-[18px] text-tertiary">{combatRankInfo.title}</div>
                        <p className="text-xs text-on-surface-variant">{combatRankInfo.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="submit"
                    className="rounded-xl border-[3px] border-black bg-primary-container px-6 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    SALVA
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlayerForm(false)}
                    className="rounded-xl border-[3px] border-black bg-surface-bright px-6 py-2 font-label-caps text-[12px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    ANNULLA
                  </button>
                </div>
              </form>
            )}

            {/* Players List */}
            {playersLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {players.map((player) => {
                  const combatInfo = getCombatRank(player.points);
                  return (
                    <div
                      key={player.id}
                      className="rounded-2xl border-[4px] border-black bg-surface-container-high p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${player.ign}/64`}
                          alt={player.ign}
                          className="h-14 w-14 rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="truncate font-headline-md text-[18px] text-white">{player.ign}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {CATEGORIES.slice(0, 4).map(cat => {
                              const tier = getPlayerTier(player.id, cat);
                              return tier !== 'UNRANKED' ? (
                                <span key={cat} className="flex items-center gap-0.5 rounded border border-black bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface">
                                  <span className="material-symbols-outlined text-[10px]">{CATEGORY_ICONS[cat]}</span>
                                  {tier}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Combat Rank Card */}
                      <div className="mt-3 rounded-xl border-[2px] border-black bg-tertiary/20 p-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-tertiary text-[20px]">{combatInfo.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-label-caps text-[11px] font-bold text-tertiary">{combatInfo.title}</p>
                            <p className="truncate text-[10px] text-on-surface-variant">{player.points.toLocaleString()} pts • {player.region}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="rounded-lg border-[2px] border-black bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          ATTIVO
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPlayer(player)}
                            className="rounded-lg border-[2px] border-black bg-tertiary p-2 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="rounded-lg border-[2px] border-black bg-error-container p-2 text-on-error-container shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {players.length === 0 && (
                  <p className="col-span-full text-center py-8 text-on-surface-variant">Nessun player trovato. Clicca "NUOVO PLAYER" per aggiungerne uno.</p>
                )}
              </div>
            )}
          </div>
        )}
        {/* COUNTDOWN TAB */}
        {activeTab === 'countdown' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-6 font-headline-md text-[28px] text-white">Countdown ??? SMP</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">Data e ora target</label>
                <input
                  type="datetime-local"
                  value={countdownTarget}
                  onChange={(e) => setCountdownTarget(e.target.value)}
                  className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                />
              </div>
              <button
                onClick={handleSaveCountdown}
                disabled={countdownSaving}
                className="rounded-2xl border-[3px] border-black bg-primary-container px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none disabled:opacity-50"
              >
                {countdownSaving ? '...' : t('admin.save')}
              </button>
            </div>
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-6 font-headline-md text-[28px] text-white">Gestione Contatti</h2>
            <p className="mb-6 font-body-sm text-on-surface-variant">Modifica le informazioni visibili nella pagina <span className="font-bold text-tertiary">/contatti</span> del sito.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">Descrizione pagina</label>
                <textarea
                  value={contactDescription}
                  onChange={(e) => setContactDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">Discord (link invito)</label>
                  <input
                    type="url"
                    value={contactDiscord}
                    onChange={(e) => setContactDiscord(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">Instagram (URL profilo)</label>
                  <input
                    type="url"
                    value={contactInstagram}
                    onChange={(e) => setContactInstagram(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-label-caps text-[12px] text-on-surface-variant">YouTube (URL canale)</label>
                  <input
                    type="url"
                    value={contactYoutube}
                    onChange={(e) => setContactYoutube(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:border-primary-container"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveContacts}
                disabled={contactsSaving}
                className="mt-2 self-start rounded-2xl border-[3px] border-black bg-primary-container px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none disabled:opacity-50"
              >
                {contactsSaving ? '...' : t('admin.save')}
              </button>
            </div>
          </div>
        )}

        {/* MODS TAB */}
        {activeTab === 'mods' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline-md text-[28px] text-white">Revisione Mods</h2>
              <span className="rounded-xl border-[2px] border-black bg-yellow-600 px-3 py-1 font-label-caps text-[11px] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {pendingMods.length} IN ATTESA
              </span>
            </div>

            {modsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
              </div>
            ) : pendingMods.length === 0 ? (
              <p className="py-8 text-center font-body-sm text-on-surface-variant">Nessuna mod in attesa di revisione.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingMods.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-[2px] border-black bg-primary-container shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="material-symbols-outlined text-[20px] text-white">extension</span>
                      </div>
                      <div>
                        <h4 className="font-headline-md text-[16px] text-white">{mod.title}</h4>
                        <p className="font-label-caps text-[10px] text-on-surface-variant">
                          di {mod.author_name} • {mod.category.toUpperCase()} • {new Date(mod.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/mods/${mod.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border-[2px] border-black bg-surface-bright p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </a>
                      <button
                        onClick={() => handleModAction(mod.id, 'approved')}
                        className="rounded-lg border-[2px] border-black bg-green-600 p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                        title="Approva"
                      >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                      <button
                        onClick={() => handleModAction(mod.id, 'on_hold')}
                        className="rounded-lg border-[2px] border-black bg-yellow-600 p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                        title="Metti in attesa"
                      >
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                      </button>
                      <button
                        onClick={() => handleModAction(mod.id, 'rejected')}
                        className="rounded-lg border-[2px] border-black bg-error p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                        title="Rifiuta"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IDEAS TAB */}
        {activeTab === 'ideas' && (
          <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-6 font-headline-md text-[28px] text-white">Idee della Community</h2>
            {ideasLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
              </div>
            ) : ideas.length === 0 ? (
              <p className="py-8 text-center font-body-sm text-on-surface-variant">Nessuna idea ricevuta.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {ideas.map((idea) => (
                  <div key={idea.id} className="rounded-2xl border-[3px] border-black bg-surface-container-high p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-headline-md text-[16px] text-white">{idea.title}</h3>
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={`material-symbols-outlined text-[16px] ${s <= idea.rating ? 'text-yellow-400' : 'text-on-surface-variant/20'}`}>star</span>
                            ))}
                          </div>
                        </div>
                        <p className="font-body-sm text-[13px] text-on-surface-variant mb-2">{idea.content}</p>
                        <p className="font-label-caps text-[9px] text-on-surface-variant/60">
                          by {idea.author_name} • {new Date(idea.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="relative flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => setIdeaDropdownOpen(ideaDropdownOpen === idea.id ? null : idea.id)}
                          className={`flex items-center gap-1.5 rounded-lg border-[2px] border-black px-3 py-1.5 font-label-caps text-[9px] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            idea.status === 'pending' ? 'bg-yellow-600' :
                            idea.status === 'reviewed' ? 'bg-primary-container' :
                            idea.status === 'implemented' ? 'bg-green-600' : 'bg-error'
                          }`}
                        >
                          {idea.status.toUpperCase()}
                          <span className="material-symbols-outlined text-[12px]">expand_more</span>
                        </button>
                        {ideaDropdownOpen === idea.id && (
                          <div className="absolute top-full right-0 z-50 mt-1 w-[140px] rounded-xl border-[2px] border-black/40 bg-surface-container p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {(['pending', 'reviewed', 'implemented', 'rejected'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={async () => {
                                  await supabase.from('ideas').update({ status: s }).eq('id', idea.id);
                                  setIdeaDropdownOpen(null);
                                  fetchIdeas();
                                }}
                                className={`w-full rounded-lg px-3 py-1.5 text-left font-label-caps text-[9px] transition-all ${
                                  idea.status === s ? 'bg-primary-container/20 text-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                              >
                                {s.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageAnimator>
  );
};

export default AdminPanel;
