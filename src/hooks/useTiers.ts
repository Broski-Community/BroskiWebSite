import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

export type Tier = 'HT1' | 'LT1' | 'HT2' | 'LT2' | 'HT3' | 'LT3' | 'HT4' | 'LT4' | 'HT5' | 'LT5' | 'UNRANKED';
export type Category = 'SWORD' | 'AXE' | 'MACE' | 'SPEAR MACE' | 'SMP' | 'DIA SMP' | 'CART PVP' | 'VANILLA' | 'NETHOP';

export interface PlayerRank {
  player_id: string;
  ign: string;
  discord_id: string;
  region: string;
  category: Category;
  tier: Tier;
  tier_weight: number;
}

export type TiersData = Record<Tier, PlayerRank[]>;

const initialTiersData: TiersData = {
  HT1: [], LT1: [],
  HT2: [], LT2: [],
  HT3: [], LT3: [],
  HT4: [], LT4: [],
  HT5: [], LT5: [],
  UNRANKED: []
};

export const useTiers = (category: Category | 'OVERALL') => {
  const [data, setData] = useState<TiersData>(initialTiersData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('leaderboard_view').select('*');
      
      if (category !== 'OVERALL') {
        query = query.eq('category', category);
      }
      
      const { data: ranks, error: queryError } = await query
        .order('tier_weight', { ascending: false })
        .order('ign', { ascending: true });
      
      if (queryError) throw queryError;
      
      const grouped: TiersData = {
        HT1: [], LT1: [],
        HT2: [], LT2: [],
        HT3: [], LT3: [],
        HT4: [], LT4: [],
        HT5: [], LT5: [],
        UNRANKED: []
      };
      
      ranks?.forEach((rank: PlayerRank) => {
        if (grouped[rank.tier]) {
          grouped[rank.tier].push(rank);
        } else {
          grouped.UNRANKED.push(rank);
        }
      });
      
      setData(grouped);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("Errore nel caricamento tiers:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      await fetchTiers();
    };
    
    if (mounted) {
      load();
    }
    
    return () => {
      mounted = false;
    };
  }, [fetchTiers]);

  const submitTest = async (
    testerId: string, 
    playerId: string, 
    testCategory: Category, 
    oldTier: Tier | null, 
    newTier: Tier, 
    notes: string = ''
  ) => {
    try {
      const { error: rankError } = await supabase
        .from('player_ranks')
        .upsert({ 
          player_id: playerId, 
          category: testCategory, 
          tier: newTier 
        }, { 
          onConflict: 'player_id,category' 
        });

      if (rankError) throw rankError;

      const { error: logError } = await supabase
        .from('test_logs')
        .insert({
          tester_id: testerId,
          player_id: playerId,
          category: testCategory,
          old_tier: oldTier,
          new_tier: newTier,
          notes
        });

      if (logError) throw logError;

      await fetchTiers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("Errore nel submitTest:", errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return { data, loading, error, submitTest, refetch: fetchTiers };
};
