import { supabase } from '../config/supabaseClient';
import type { RoomState } from '../pages/BombParty';

/**
 * Salva il risultato di una partita completata su Supabase.
 * Aggiorna anche le statistiche dei giocatori autenticati.
 */
export async function saveMatchResult(
  roomState: RoomState,
  winnerNickname: string,
  startTime: number
): Promise<void> {
  const duration = Math.floor((Date.now() - startTime) / 1000);

  // Trova il vincitore
  const winner = roomState.players.find(p => p.nickname === winnerNickname);

  // Salva nella cronologia partite
  await supabase.from('bomb_party_match_history').insert({
    room_code: roomState.roomCode,
    winner_nickname: winnerNickname,
    players: roomState.players.map(p => ({
      nickname: p.nickname,
      score: p.score,
      lives_remaining: p.lives,
    })),
    settings: roomState.settings,
    rounds_played: roomState.roundNumber,
    duration_seconds: duration,
  });

  // Aggiorna statistiche per il giocatore corrente (se autenticato)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existingStats } = await supabase
    .from('bomb_party_stats')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  const myPlayer = roomState.players.find(p => p.nickname === winnerNickname && winner);
  const isWinner = winner?.nickname === winnerNickname;

  if (existingStats) {
    // Update
    const newWinStreak = isWinner ? existingStats.win_streak + 1 : 0;
    await supabase.from('bomb_party_stats').update({
      games_played: existingStats.games_played + 1,
      games_won: existingStats.games_won + (isWinner ? 1 : 0),
      total_words: existingStats.total_words + (myPlayer?.score || 0),
      win_streak: newWinStreak,
      best_win_streak: Math.max(existingStats.best_win_streak, newWinStreak),
    }).eq('profile_id', user.id);
  } else {
    // Insert
    await supabase.from('bomb_party_stats').insert({
      profile_id: user.id,
      games_played: 1,
      games_won: isWinner ? 1 : 0,
      total_words: myPlayer?.score || 0,
      win_streak: isWinner ? 1 : 0,
      best_win_streak: isWinner ? 1 : 0,
    });
  }
}

/**
 * Salva lo stato del gioco per recovery da disconnect.
 */
export async function saveGameState(roomState: RoomState): Promise<void> {
  await supabase
    .from('bomb_party_rooms')
    .update({ game_state: roomState, status: roomState.status })
    .eq('room_code', roomState.roomCode);
}

/**
 * Crea una stanza nel database per persistenza.
 */
export async function createRoom(roomCode: string, settings: RoomState['settings']): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('bomb_party_rooms').insert({
    room_code: roomCode,
    host_id: user?.id || null,
    settings,
    status: 'waiting',
  });
}

/**
 * Recupera lo stato di una stanza per reconnect.
 */
export async function recoverRoom(roomCode: string): Promise<RoomState | null> {
  const { data } = await supabase
    .from('bomb_party_rooms')
    .select('game_state')
    .eq('room_code', roomCode)
    .eq('status', 'playing')
    .single();

  if (data?.game_state) {
    return data.game_state as RoomState;
  }
  return null;
}

/**
 * Carica la classifica top giocatori.
 */
export async function getLeaderboard(limit = 10): Promise<{
  nickname: string;
  games_won: number;
  games_played: number;
  best_win_streak: number;
}[]> {
  const { data } = await supabase
    .from('bomb_party_stats')
    .select('profile_id, games_won, games_played, best_win_streak')
    .order('games_won', { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Fetch nicknames
  const profileIds = data.map(d => d.profile_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, minecraft_username')
    .in('id', profileIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p.minecraft_username]) || []);

  return data.map(d => ({
    nickname: profileMap.get(d.profile_id) || 'Unknown',
    games_won: d.games_won,
    games_played: d.games_played,
    best_win_streak: d.best_win_streak,
  }));
}
