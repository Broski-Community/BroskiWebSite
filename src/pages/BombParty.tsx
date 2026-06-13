import React, { useState, useCallback, useEffect } from 'react';
import PageAnimator from '../components/PageAnimator';
import BombPartyLobby from '../components/bombparty/BombPartyLobby';
import BombPartyGame from '../components/bombparty/BombPartyGame';
import { useAuth } from '../context/AuthContext';

import type { BombType } from '../config/bombPartyEvents';

export interface BombPartyPlayer {
  id: string;
  nickname: string;
  lives: number;
  score: number;
  isHost: boolean;
  hasShield: boolean;
  avatarUrl?: string;        // URL immagine profilo (skin Minecraft head)
  isSpectator?: boolean;     // Spettatore (entrato a partita in corso)
}

export interface RoomSettings {
  turnTime: number;          // ⏲ Durata minima del turno (secondi)
  syllableMaxAge: number;    // 🔃 Età massima della sillaba (turni di fallimento prima che cambi)
  startLives: number;        // ❤️ Vite iniziali
  maxLives: number;          // ❤️ Vite massime
  maxPlayers: number;        // 👱‍♂️ Numero massimo di giocatori
}

export interface RoomState {
  roomCode: string;
  players: BombPartyPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  currentTurnIndex: number;
  currentSyllable: string;
  roundNumber: number;
  settings: RoomSettings;
  syllableFailCount: number;
  currentBomb: BombType;     // Tipo di bomba corrente (imprevisto)
}

const BombParty: React.FC = () => {
  const { profile } = useAuth();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [nickname, setNickname] = useState(profile?.minecraft_username || '');

  // Sync nickname when profile loads asynchronously
  useEffect(() => {
    if (profile?.minecraft_username && !nickname) {
      setNickname(profile.minecraft_username);
    }
  }, [profile?.minecraft_username]);

  // Wrapper to handle both direct values and updater functions
  const updateRoomState = useCallback((update: RoomState | null | ((prev: RoomState | null) => RoomState | null)) => {
    if (typeof update === 'function') {
      setRoomState(update);
    } else {
      setRoomState(update);
    }
  }, []);

  return (
    <PageAnimator className="relative w-full overflow-hidden px-4 pb-14 pt-8 sm:px-margin">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-surface-container-lowest" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)', backgroundSize: '28px 28px' }} />
      <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-red-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-[1100px]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="inline-flex -rotate-2 items-center gap-2 self-start rounded-2xl border-[3px] border-black bg-red-600 px-4 py-2 font-label-caps text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined text-[18px]">bomb</span>
            WORD GAME
          </div>
          <h1 className="font-headline-lg text-[48px] uppercase leading-none tracking-tighter text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] sm:text-[64px]">
            BOMB PARTY
          </h1>
          <p className="max-w-lg font-body-lg text-on-surface-variant">
            Scrivi parole che contengono la sillaba mostrata prima che la bomba esploda! 💣
          </p>
        </div>

        {/* Game content */}
        {!roomState || roomState.status === 'waiting' ? (
          <BombPartyLobby
            nickname={nickname}
            setNickname={setNickname}
            roomState={roomState}
            setRoomState={updateRoomState}
          />
        ) : (
          <BombPartyGame
            roomState={roomState}
            setRoomState={updateRoomState}
            nickname={nickname}
          />
        )}
      </div>
    </PageAnimator>
  );
};

export default BombParty;
