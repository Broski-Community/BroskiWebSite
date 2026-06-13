import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getRandomSyllable, loadDictionary } from '../../utils/bombPartyDictionary';
import { useAuth } from '../../context/AuthContext';
import { rollBombEvent } from '../../config/bombPartyEvents';
import { createRoom as persistCreateRoom } from '../../utils/bombPartyPersistence';
import type { RoomState, BombPartyPlayer, RoomSettings } from '../../pages/BombParty';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Props {
  nickname: string;
  setNickname: (n: string) => void;
  roomState: RoomState | null;
  setRoomState: (r: RoomState | null | ((prev: RoomState | null) => RoomState | null)) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const DEFAULT_SETTINGS: RoomSettings = {
  turnTime: 10,
  syllableMaxAge: 3,
  startLives: 3,
  maxLives: 5,
  maxPlayers: 8,
};

const BombPartyLobby: React.FC<Props> = ({ nickname, setNickname, roomState, setRoomState }) => {
  const { profile } = useAuth();
  const isLoggedIn = !!profile?.minecraft_username;
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef<string>(crypto.randomUUID());

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Subscribe to Presence + Broadcast for real-time player sync
  const subscribeToRoom = useCallback((
    roomCode: string,
    myPlayer: BombPartyPlayer,
    roomSettings: RoomSettings,
    isHost: boolean
  ) => {
    // Remove old channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`bombparty:${roomCode}`, {
      config: { presence: { key: myPlayer.id } },
    });

    // Track presence state to build player list
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const players: BombPartyPlayer[] = [];

      Object.values(presenceState).forEach((presences) => {
        // Each key has an array of presences (usually 1)
        const p = (presences as unknown as { player: BombPartyPlayer }[])[0];
        if (p?.player) {
          players.push(p.player);
        }
      });

      // Sort: host first, then by join order (id)
      players.sort((a, b) => {
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        return a.id.localeCompare(b.id);
      });

      setRoomState((prev) => {
        const base = prev || {
          roomCode,
          players: [],
          status: 'waiting' as const,
          currentTurnIndex: 0,
          currentSyllable: '',
          roundNumber: 0,
          settings: roomSettings,
          syllableFailCount: 0,
      currentBomb: 'normal',
        };
        return { ...base, players };
      });
    });

    // Listen for game start broadcast from host
    channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
      setRoomState(payload as RoomState);
    });

    // Listen for settings update from host
    channel.on('broadcast', { event: 'settings_update' }, ({ payload }) => {
      setRoomState((prev) => prev ? { ...prev, settings: payload as RoomSettings } : prev);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track this player in presence
        await channel.track({
          player: myPlayer,
          isHost,
        });
      }
    });

    channelRef.current = channel;
  }, [setRoomState]);

  const createRoom = async () => {
    if (!nickname.trim() && !isLoggedIn) {
      setError('Inserisci un nickname!');
      return;
    }
    const finalNickname = nickname.trim() || profile?.minecraft_username || 'Player';
    setLoading(true);
    setError('');

    const avatarUrl = finalNickname ? `https://mc-heads.net/avatar/${finalNickname}/64` : undefined;

    const roomCode = generateRoomCode();
    const player: BombPartyPlayer = {
      id: playerIdRef.current,
      nickname: finalNickname,
      lives: settings.startLives,
      score: 0,
      isHost: true,
      hasShield: false,
      avatarUrl,
    };

    const newRoom: RoomState = {
      roomCode,
      players: [player],
      status: 'waiting',
      currentTurnIndex: 0,
      currentSyllable: '',
      roundNumber: 0,
      settings,
      syllableFailCount: 0,
      currentBomb: 'normal',
    };

    setRoomState(newRoom);
    subscribeToRoom(roomCode, player, settings, true);
    persistCreateRoom(roomCode, settings);
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!nickname.trim() && !isLoggedIn) {
      setError('Inserisci un nickname!');
      return;
    }
    if (!joinCode.trim()) {
      setError('Inserisci il codice della stanza!');
      return;
    }
    setLoading(true);
    setError('');

    const finalNickname = nickname.trim() || profile?.minecraft_username || 'Player';
    const code = joinCode.trim().toUpperCase();
    const avatarUrl = finalNickname ? `https://mc-heads.net/avatar/${finalNickname}/64` : undefined;

    // Verifica che la stanza esista nel database
    const { data: roomData } = await supabase
      .from('bomb_party_rooms')
      .select('status, settings')
      .eq('room_code', code)
      .single();

    if (!roomData) {
      setError('Stanza non trovata! Controlla il codice.');
      setLoading(false);
      return;
    }

    // Se la partita è già in corso, entra come spettatore
    const isSpectator = roomData.status === 'playing';

    const player: BombPartyPlayer = {
      id: playerIdRef.current,
      nickname: finalNickname,
      lives: isSpectator ? 0 : DEFAULT_SETTINGS.startLives,
      score: 0,
      isHost: false,
      hasShield: false,
      avatarUrl,
      isSpectator,
    };

    const roomSettings = (roomData.settings as RoomSettings) || DEFAULT_SETTINGS;

    const joinedRoom: RoomState = {
      roomCode: code,
      players: [player],
      status: roomData.status as RoomState['status'],
      currentTurnIndex: 0,
      currentSyllable: '',
      roundNumber: 0,
      settings: roomSettings,
      syllableFailCount: 0,
      currentBomb: 'normal',
    };

    setRoomState(joinedRoom);
    subscribeToRoom(code, player, DEFAULT_SETTINGS, false);
    setLoading(false);
  };

  const startGame = async () => {
    if (!roomState || roomState.players.length < 2) {
      setError('Servono almeno 2 giocatori per iniziare!');
      return;
    }

    await loadDictionary();
    const syllable = getRandomSyllable();

    // Assign lives to all players based on settings
    const playersWithLives = roomState.players.map(p => ({
      ...p,
      lives: roomState.settings.startLives,
      score: 0,
    }));

    const startedRoom: RoomState = {
      ...roomState,
      players: playersWithLives,
      status: 'playing',
      currentSyllable: syllable,
      roundNumber: 1,
      currentTurnIndex: 0,
      syllableFailCount: 0,
      currentBomb: rollBombEvent(true),
    };

    // Broadcast game start to all players
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game_start',
        payload: startedRoom,
      });
    }

    setRoomState(startedRoom);
  };

  const isHost = roomState?.players.some(p => p.isHost && p.id === playerIdRef.current);

  // Lobby waiting room
  if (roomState) {
    return (
      <div className="space-y-6">
        {/* Room code display */}
        <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-center">
            <p className="font-label-caps text-[12px] text-on-surface-variant">CODICE STANZA</p>
            <p className="mt-2 font-headline-lg text-[56px] tracking-widest text-primary-container">
              {roomState.roomCode}
            </p>
            <p className="mt-2 font-body-sm text-on-surface-variant">
              Condividi questo codice con i tuoi amici!
            </p>
          </div>
        </div>

        {/* Players list */}
        <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="mb-4 font-headline-md text-[18px] text-white">
            Giocatori ({roomState.players.length}/{roomState.settings.maxPlayers})
          </h3>
          <div className="space-y-3">
            {roomState.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-surface-container-high p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-[2px] border-black bg-primary-container">
                  <span className="material-symbols-outlined text-[20px] text-white">person</span>
                </div>
                <span className="font-headline-md text-[14px] text-white">
                  {player.nickname}
                  {player.id === playerIdRef.current && ' (tu)'}
                </span>
                {player.isHost && (
                  <span className="ml-auto rounded-lg border-[2px] border-black bg-orange-500 px-2 py-0.5 font-label-caps text-[10px] text-white">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Room settings display */}
        <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="mb-4 font-headline-md text-[18px] text-white">⚙️ Impostazioni</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border-[2px] border-black bg-surface-container-high p-3 text-center">
              <p className="font-label-caps text-[10px] text-on-surface-variant">⏲ TEMPO</p>
              <p className="font-headline-md text-[16px] text-white">{roomState.settings.turnTime}s</p>
            </div>
            <div className="rounded-xl border-[2px] border-black bg-surface-container-high p-3 text-center">
              <p className="font-label-caps text-[10px] text-on-surface-variant">❤️ VITE</p>
              <p className="font-headline-md text-[16px] text-white">{roomState.settings.startLives}</p>
            </div>
            <div className="rounded-xl border-[2px] border-black bg-surface-container-high p-3 text-center">
              <p className="font-label-caps text-[10px] text-on-surface-variant">🔃 ETÀ SILLABA</p>
              <p className="font-headline-md text-[16px] text-white">{roomState.settings.syllableMaxAge}</p>
            </div>
            <div className="rounded-xl border-[2px] border-black bg-surface-container-high p-3 text-center">
              <p className="font-label-caps text-[10px] text-on-surface-variant">👥 MAX</p>
              <p className="font-headline-md text-[16px] text-white">{roomState.settings.maxPlayers}</p>
            </div>
          </div>
        </div>

        {/* Start button (host only) */}
        {isHost && (
          <button
            onClick={startGame}
            disabled={roomState.players.length < 2}
            className="w-full rounded-2xl border-[4px] border-black bg-green-600 px-8 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="material-symbols-outlined mr-2 align-middle text-[24px]">play_arrow</span>
            INIZIA PARTITA
          </button>
        )}

        {!isHost && (
          <div className="rounded-xl border-[3px] border-black bg-surface-container-high p-4 text-center">
            <p className="font-body-lg text-on-surface-variant">
              ⏳ In attesa che l'host avvii la partita...
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl border-[3px] border-black bg-red-600/20 p-3 text-center font-body-lg text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Join/Create screen
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Create room */}
      <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black bg-green-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[24px] text-white">add</span>
          </div>
          <h2 className="font-headline-md text-[22px] text-white">CREA STANZA</h2>
        </div>

        <div className="space-y-4">
          {/* Nickname - solo se non loggato */}
          {!isLoggedIn && (
            <div>
              <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">NICKNAME</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Il tuo nome..."
                maxLength={16}
                className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          )}
          {isLoggedIn && (
            <div className="flex items-center gap-2 rounded-xl border-[2px] border-black bg-surface-container-high p-3">
              <span className="material-symbols-outlined text-[18px] text-primary-container">person</span>
              <span className="font-headline-md text-[14px] text-white">{nickname}</span>
              <span className="ml-auto rounded-lg bg-green-600/20 px-2 py-0.5 font-label-caps text-[9px] text-green-400">LOGGATO</span>
            </div>
          )}

          {/* ⏲ Durata minima del turno */}
          <div>
            <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
              ⏲ DURATA MINIMA DEL TURNO (SECONDI)
            </label>
            <p className="mb-2 font-body-sm text-[11px] text-on-surface-variant/70">
              Ogni giocatore ha almeno questa durata prima che la bomba esploda
            </p>
            <select
              value={settings.turnTime}
              onChange={(e) => setSettings(s => ({ ...s, turnTime: Number(e.target.value) }))}
              className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
            >
              <option value={5}>5 secondi</option>
              <option value={8}>8 secondi</option>
              <option value={10}>10 secondi</option>
              <option value={15}>15 secondi</option>
              <option value={20}>20 secondi</option>
              <option value={30}>30 secondi</option>
            </select>
          </div>

          {/* 🔃 Età massima della sillaba */}
          <div>
            <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
              🔃 ETÀ MASSIMA DELLA SILLABA (TURNI)
            </label>
            <p className="mb-2 font-body-sm text-[11px] text-on-surface-variant/70">
              La sillaba cambia se questo numero di giocatori fallisce
            </p>
            <select
              value={settings.syllableMaxAge}
              onChange={(e) => setSettings(s => ({ ...s, syllableMaxAge: Number(e.target.value) }))}
              className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
            >
              <option value={1}>1 fallimento</option>
              <option value={2}>2 fallimenti</option>
              <option value={3}>3 fallimenti</option>
              <option value={4}>4 fallimenti</option>
              <option value={5}>5 fallimenti</option>
            </select>
          </div>

          {/* ❤️ Vite */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
                ❤️ VITE INIZIO
              </label>
              <select
                value={settings.startLives}
                onChange={(e) => setSettings(s => ({ ...s, startLives: Number(e.target.value) }))}
                className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
                ❤️ VITE MASSIMO
              </label>
              <select
                value={settings.maxLives}
                onChange={(e) => setSettings(s => ({ ...s, maxLives: Number(e.target.value) }))}
                className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </div>
          </div>

          {/* 👱‍♂️ Numero massimo di giocatori */}
          <div>
            <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">
              👱‍♂️ NUMERO MASSIMO DI GIOCATORI
            </label>
            <p className="mb-2 font-body-sm text-[11px] text-on-surface-variant/70">
              Il numero massimo di giocatori che possono unirsi alla partita
            </p>
            <select
              value={settings.maxPlayers}
              onChange={(e) => setSettings(s => ({ ...s, maxPlayers: Number(e.target.value) }))}
              className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
            >
              <option value={2}>2 giocatori</option>
              <option value={4}>4 giocatori</option>
              <option value={6}>6 giocatori</option>
              <option value={8}>8 giocatori</option>
              <option value={10}>10 giocatori</option>
              <option value={12}>12 giocatori</option>
              <option value={16}>16 giocatori</option>
            </select>
          </div>

          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full rounded-2xl border-[3px] border-black bg-green-600 px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {loading ? 'Creazione...' : 'CREA STANZA'}
          </button>
        </div>
      </div>

      {/* Join room */}
      <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black bg-blue-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[24px] text-white">group_add</span>
          </div>
          <h2 className="font-headline-md text-[22px] text-white">UNISCITI</h2>
        </div>

        <div className="space-y-4">
          {/* Nickname - solo se non loggato */}
          {!isLoggedIn && (
            <div>
              <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">NICKNAME</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Il tuo nome..."
                maxLength={16}
                className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-body-lg text-white placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          )}
          {isLoggedIn && (
            <div className="flex items-center gap-2 rounded-xl border-[2px] border-black bg-surface-container-high p-3">
              <span className="material-symbols-outlined text-[18px] text-primary-container">person</span>
              <span className="font-headline-md text-[14px] text-white">{nickname}</span>
              <span className="ml-auto rounded-lg bg-green-600/20 px-2 py-0.5 font-label-caps text-[9px] text-green-400">LOGGATO</span>
            </div>
          )}

          <div>
            <label className="mb-1 block font-label-caps text-[11px] text-on-surface-variant">CODICE STANZA</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ES: AB3K9"
              maxLength={5}
              className="w-full rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-headline-md text-[20px] tracking-widest text-white placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>

          <button
            onClick={joinRoom}
            disabled={loading}
            className="w-full rounded-2xl border-[3px] border-black bg-blue-600 px-6 py-3 font-headline-md text-[16px] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {loading ? 'Connessione...' : 'ENTRA'}
          </button>
        </div>
      </div>

      {error && (
        <p className="col-span-full rounded-xl border-[3px] border-black bg-red-600/20 p-3 text-center font-body-lg text-red-300">
          {error}
        </p>
      )}

      {/* How to play */}
      <div className="col-span-full rounded-[2rem] border-[4px] border-black bg-surface-container-highest p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined shrink-0 rounded-2xl border-[3px] border-black bg-orange-500 p-3 text-[28px] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            help
          </span>
          <div>
            <h3 className="font-headline-md text-[18px] text-white">Come si gioca?</h3>
            <ul className="mt-2 space-y-1 font-body-sm text-on-surface-variant">
              <li>💣 Ad ogni turno viene mostrata una sillaba (es. "RA", "TI", "PRE")</li>
              <li>⌨️ Devi scrivere una parola italiana che CONTIENE quella sillaba</li>
              <li>⏱️ Hai un tempo limitato per rispondere</li>
              <li>💀 Se il tempo scade, perdi una vita</li>
              <li>🏆 L'ultimo giocatore in vita vince!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BombPartyLobby;
