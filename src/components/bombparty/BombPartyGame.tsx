import React, { useState, useEffect, useRef, useCallback } from 'react';
import { validateWord, getRandomSyllable, loadDictionary, isDictionaryLoaded } from '../../utils/bombPartyDictionary';
import { BOMB_EVENTS, rollBombEvent } from '../../config/bombPartyEvents';
import { saveMatchResult, saveGameState } from '../../utils/bombPartyPersistence';
import {
  unlockAudio, setMuted, isMuted,
  playTick, playTurnChange, playWord, playError, playExplosion, playGameOver,
} from '../../utils/bombPartySounds';
import type { RoomState } from '../../pages/BombParty';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Props {
  roomState: RoomState;
  setRoomState: (r: RoomState | null | ((prev: RoomState | null) => RoomState | null)) => void;
  nickname: string;
  channel: RealtimeChannel | null;
  playerId: string;
  onLeave: () => void;
  /** Debug only: freeze the timer completely (no countdown). */
  debugFreezeTimer?: boolean;
}

function getPlayerPositions(count: number): { top: string; left: string }[] {
  const positions: { top: string; left: string }[] = [];
  const radius = 38;
  const centerX = 50;
  const centerY = 50;
  const startAngle = -90;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (360 / count) * i;
    const rad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(rad);
    const y = centerY + radius * Math.sin(rad);
    positions.push({ top: `${y}%`, left: `${x}%` });
  }
  return positions;
}

// Grace period: if the authoritative timer owner doesn't respond,
// any other client can fire handleTimeUp after this extra delay (ms)
const FALLBACK_TIMER_EXTRA_MS = 5000;

// Shared keyframes/styles for the game (neobrutalism-friendly)
const gameStyles = `
  @keyframes bomb-shake {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(3deg) translate(1px, 0); }
    50% { transform: rotate(0deg); }
    75% { transform: rotate(-3deg) translate(-1px, 0); }
  }
  @keyframes bp-glow-pulse {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.95); }
    50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.05); }
  }
  @keyframes bp-syllable-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  @keyframes bp-ring-pulse {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.35); }
  }
  @keyframes bp-bounce-arrow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes bp-heartbeat {
    0%, 100% { transform: scale(1); }
    30% { transform: scale(1.35); }
    50% { transform: scale(1.1); }
  }
  @keyframes bp-pop-in {
    0% { opacity: 0; transform: scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes bp-banner-in {
    0% { opacity: 0; transform: translateY(-8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes bp-danger-pulse {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }
  @keyframes bp-trophy-pop {
    0% { opacity: 0; transform: scale(0.3) rotate(-15deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
`;

const BombPartyGame: React.FC<Props> = ({ roomState, setRoomState, nickname, channel, playerId: _playerId, onLeave, debugFreezeTimer }) => {
  void _playerId; // kept for future use (e.g. player-specific logic)
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'event' | '' }>({ message: '', type: '' });
  const [timeLeft, setTimeLeft] = useState(roomState.settings.turnTime);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [playerInputs, setPlayerInputs] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [arrowRotation, setArrowRotation] = useState(() => {
    const count = roomState.players.length || 1;
    return (360 / count) * roomState.currentTurnIndex;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomStateRef = useRef(roomState);
  const gameStartTimeRef = useRef(Date.now());
  // Sound/animation bookkeeping
  const prevTimeRef = useRef(timeLeftInit());
  const prevTotalLivesRef = useRef(roomState.players.reduce((s, p) => s + p.lives, 0));
  const prevRoundRef = useRef(roomState.roundNumber);
  const prevStatusRef = useRef(roomState.status);
  const arrowPrevIndexRef = useRef(roomState.currentTurnIndex);

  function timeLeftInit() { return roomState.settings.turnTime; }

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  useEffect(() => { if (!isDictionaryLoaded()) loadDictionary(); }, []);

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      return next;
    });
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const currentPlayer = roomState.players[roomState.currentTurnIndex];
  const isMyTurn = currentPlayer?.nickname === nickname;
  const alivePlayers = roomState.players.filter(p => p.lives > 0);
  const currentBombEvent = BOMB_EVENTS[roomState.currentBomb];
  const mePlayer = roomState.players.find(p => p.nickname === nickname);
  const isSpectator = mePlayer?.isSpectator || false;

  // Effective turn time (striped bomb = half time)
  const effectiveTurnTime = roomState.currentBomb === 'striped'
    ? Math.max(3, Math.floor(roomState.settings.turnTime / 2))
    : roomState.settings.turnTime;

  // Listen to broadcast events on the unified channel for local-only UI updates
  useEffect(() => {
    if (!channel) return;

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { playerNickname, text } = payload as { playerNickname: string; text: string };
      if (playerNickname !== nickname) {
        setPlayerInputs(prev => ({ ...prev, [playerNickname]: text }));
      }
    });

    channel.on('broadcast', { event: 'word_accepted' }, ({ payload }) => {
      const { word } = payload as { newState: RoomState; word: string };
      setUsedWords(prev => new Set([...prev, word.toLowerCase()]));
      setInput('');
      setPlayerInputs({});
      setFeedback({ message: '', type: '' });
    });

    channel.on('broadcast', { event: 'game_state_update' }, () => {
      setInput('');
      setPlayerInputs({});
    });

    return () => {
      // Channel lifecycle is managed by BombParty.tsx
    };
  }, [channel, nickname]);

  // Reset timer display when turn changes (from roomState prop updates)
  useEffect(() => {
    setTimeLeft(effectiveTurnTime);
    setInput('');
    setPlayerInputs({});
  }, [roomState.currentTurnIndex, roomState.roundNumber, effectiveTurnTime]);

  // SOUND: ticking each second while playing
  useEffect(() => {
    if (roomState.status === 'playing' && timeLeft < prevTimeRef.current && timeLeft >= 0) {
      playTick(timeLeft <= 3);
    }
    prevTimeRef.current = timeLeft;
  }, [timeLeft, roomState.status]);

  // SOUND + ARROW: react to turn / life / status changes
  useEffect(() => {
    const totalLives = roomState.players.reduce((s, p) => s + p.lives, 0);

    // Rotate the central arrow forward to the active player
    const count = roomState.players.length || 1;
    const prevIdx = arrowPrevIndexRef.current;
    const steps = (roomState.currentTurnIndex - prevIdx + count) % count;
    if (steps !== 0) {
      setArrowRotation((r) => r + steps * (360 / count));
    }
    arrowPrevIndexRef.current = roomState.currentTurnIndex;

    // Game over jingle
    if (roomState.status === 'finished' && prevStatusRef.current !== 'finished') {
      const winner = roomState.players.filter(p => p.lives > 0)[0];
      playGameOver(winner?.nickname === nickname);
    } else if (roomState.roundNumber !== prevRoundRef.current && roomState.status === 'playing') {
      // Turn advanced: explosion if a life was lost, otherwise a turn-change blip
      if (totalLives < prevTotalLivesRef.current) {
        playExplosion();
      } else {
        playTurnChange();
      }
    }

    prevRoundRef.current = roomState.roundNumber;
    prevTotalLivesRef.current = totalLives;
    prevStatusRef.current = roomState.status;
  }, [roomState.roundNumber, roomState.currentTurnIndex, roomState.status, roomState.players, nickname]);

  // Note: winner checking is done inline in handleTimeUp, handleTimeUpFallback, and submitWord
  // to avoid race conditions with early game-over detection.

  // Authoritative timer: only runs on the current turn player's client
  useEffect(() => {
    if (debugFreezeTimer) return;
    if (roomState.status !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isMyTurn) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return effectiveTurnTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [roomState.currentTurnIndex, roomState.roundNumber, roomState.status, isMyTurn, effectiveTurnTime, debugFreezeTimer]);

  // Visual countdown timer for non-active players
  useEffect(() => {
    if (debugFreezeTimer) return;
    if (roomState.status !== 'playing' || isMyTurn) return;
    const visualTimer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(visualTimer);
  }, [roomState.currentTurnIndex, roomState.roundNumber, roomState.status, isMyTurn, debugFreezeTimer]);

  // FALLBACK TIMER: exactly ONE designated client fires the time-up if the
  // active player disconnects. Authority = lowest-index alive non-spectator
  // player that is NOT the current turn player.
  const fallbackAuthorityNickname = (() => {
    const candidate = roomState.players.find(
      (p, i) => p.lives > 0 && !p.isSpectator && i !== roomState.currentTurnIndex
    );
    return candidate?.nickname;
  })();
  const isFallbackAuthority = fallbackAuthorityNickname === nickname;

  useEffect(() => {
    if (roomState.status !== 'playing' || isMyTurn || !isFallbackAuthority) {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      return;
    }

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    const totalMs = (effectiveTurnTime * 1000) + FALLBACK_TIMER_EXTRA_MS;
    const capturedTurn = { turnIndex: roomState.currentTurnIndex, round: roomState.roundNumber };

    fallbackTimerRef.current = setTimeout(() => {
      const current = roomStateRef.current;
      if (
        current.currentTurnIndex === capturedTurn.turnIndex &&
        current.roundNumber === capturedTurn.round &&
        current.status === 'playing'
      ) {
        handleTimeUpFallback();
      }
    }, totalMs);

    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, [roomState.currentTurnIndex, roomState.roundNumber, roomState.status, isMyTurn, isFallbackAuthority, effectiveTurnTime]);

  // Focus input on my turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) inputRef.current.focus();
  }, [isMyTurn]);

  // Typing broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (channel && isMyTurn) {
      channel.send({
        type: 'broadcast', event: 'typing',
        payload: { playerNickname: nickname, text: value },
      });
    }
  };

  // Determine next bomb for the upcoming turn
  const getNextBomb = useCallback((players: typeof roomState.players, currentIdx: number) => {
    const otherPlayers = players.filter((p, i) => i !== currentIdx && p.lives > 0);
    const canLightning = otherPlayers.every(p => p.lives > 1);
    return rollBombEvent(canLightning);
  }, []);

  // Shared logic for advancing the turn after a time-up (life loss)
  const advanceAfterTimeout = useCallback(async (state: RoomState) => {
    const updatedPlayers = state.players.map((p, i) => {
      if (i !== state.currentTurnIndex) return p;
      if (p.hasShield) return { ...p, hasShield: false };
      return { ...p, lives: p.lives - 1 };
    });

    const alive = updatedPlayers.filter(p => p.lives > 0);
    if (alive.length <= 1) {
      const finishedState: RoomState = { ...state, players: updatedPlayers, status: 'finished' };
      if (channel) {
        await channel.send({ type: 'broadcast', event: 'game_over', payload: finishedState });
      }
      setRoomState(finishedState);
      if (timerRef.current) clearInterval(timerRef.current);
      const winner = alive[0];
      if (winner) {
        saveMatchResult(finishedState, winner.nickname, gameStartTimeRef.current);
        saveGameState(finishedState);
      }
      return;
    }

    let nextIndex = (state.currentTurnIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex].lives <= 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }

    const newFailCount = state.syllableFailCount + 1;
    const shouldChangeSyllable = newFailCount >= state.settings.syllableMaxAge;
    const nextBomb = getNextBomb(updatedPlayers, nextIndex);
    const newSyllable = shouldChangeSyllable ? getRandomSyllable() : state.currentSyllable;

    const newState: RoomState = {
      ...state,
      players: updatedPlayers,
      currentTurnIndex: nextIndex,
      currentSyllable: newSyllable,
      roundNumber: state.roundNumber + 1,
      syllableFailCount: shouldChangeSyllable ? 0 : newFailCount,
      currentBomb: nextBomb,
    };

    if (channel) {
      await channel.send({ type: 'broadcast', event: 'game_state_update', payload: newState });
    }
    setRoomState(newState);
    saveGameState(newState);
  }, [channel, getNextBomb, setRoomState]);

  // handleTimeUp: called by the authoritative timer (current turn player's client)
  const handleTimeUp = useCallback(async () => {
    const state = roomStateRef.current;
    const currentP = state.players[state.currentTurnIndex];
    if (currentP?.nickname !== nickname) return;
    await advanceAfterTimeout(state);
  }, [nickname, advanceAfterTimeout]);

  // handleTimeUpFallback: called by the fallback authority when the active player
  // appears to have disconnected (timer expired + grace period with no state change)
  const handleTimeUpFallback = useCallback(async () => {
    const state = roomStateRef.current;
    if (state.status !== 'playing') return;
    await advanceAfterTimeout(state);
  }, [advanceAfterTimeout]);

  const submitWord = async () => {
    if (!isMyTurn || !input.trim()) return;
    const word = input.trim().toLowerCase();

    if (usedWords.has(word)) {
      setFeedback({ message: 'Parola già usata!', type: 'error' });
      playError();
      return;
    }
    if (!word.includes(roomState.currentSyllable.toLowerCase())) {
      setFeedback({ message: `Deve contenere "${roomState.currentSyllable}"!`, type: 'error' });
      playError();
      return;
    }
    if (!validateWord(word)) {
      setFeedback({ message: 'Parola non valida!', type: 'error' });
      playError();
      return;
    }

    setUsedWords(prev => new Set([...prev, word]));
    playWord();

    // === APPLY BOMB EFFECTS ===
    let updatedPlayers = [...roomState.players];
    let bonusMessage = '';

    switch (roomState.currentBomb) {
      case 'dollar':
        if (word.length >= 7) {
          updatedPlayers = updatedPlayers.map((p, i) =>
            i === roomState.currentTurnIndex
              ? { ...p, lives: Math.min(p.lives + 1, roomState.settings.maxLives), score: p.score + 1, hasShield: false }
              : p
          );
          bonusMessage = '💰 PAROLA LUNGA! +1 vita!';
        } else {
          updatedPlayers = updatedPlayers.map((p, i) =>
            i === roomState.currentTurnIndex ? { ...p, score: p.score + 1, hasShield: false } : p
          );
          bonusMessage = '💰 Parola troppo corta per il bonus! (servono 7+ lettere)';
        }
        break;

      case 'lightning':
        updatedPlayers = updatedPlayers.map((p, i) => {
          if (i === roomState.currentTurnIndex) {
            return { ...p, score: p.score + 1, hasShield: false };
          }
          if (p.lives > 0) {
            if (p.hasShield) return { ...p, hasShield: false };
            return { ...p, lives: p.lives - 1 };
          }
          return p;
        });
        bonusMessage = '⚡ SHOCK! Tutti gli avversari -1 vita!';
        break;

      case 'striped':
        updatedPlayers = updatedPlayers.map((p, i) =>
          i === roomState.currentTurnIndex ? { ...p, score: p.score + 1, hasShield: false } : p
        );
        bonusMessage = '🎯 Bravo! Hai battuto il timer dimezzato!';
        break;

      case 'star':
        updatedPlayers = updatedPlayers.map((p, i) =>
          i === roomState.currentTurnIndex
            ? { ...p, score: p.score + 1, hasShield: true }
            : p
        );
        bonusMessage = '⭐ SCUDO ATTIVATO! La prossima esplosione non ti farà danno!';
        break;

      default:
        updatedPlayers = updatedPlayers.map((p, i) =>
          i === roomState.currentTurnIndex ? { ...p, score: p.score + 1, hasShield: false } : p
        );
        break;
    }

    // Check winner after bomb effects
    const alive = updatedPlayers.filter(p => p.lives > 0);
    if (alive.length <= 1) {
      const finishedState: RoomState = { ...roomState, players: updatedPlayers, status: 'finished' };
      if (channel) {
        await channel.send({ type: 'broadcast', event: 'game_over', payload: finishedState });
      }
      setRoomState(finishedState);
      if (timerRef.current) clearInterval(timerRef.current);
      const winner = alive[0];
      if (winner) {
        saveMatchResult(finishedState, winner.nickname, gameStartTimeRef.current);
        saveGameState(finishedState);
      }
      return;
    }

    // Next player
    let nextIndex = (roomState.currentTurnIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex].lives <= 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }

    const nextBomb = getNextBomb(updatedPlayers, nextIndex);
    const newSyllable = getRandomSyllable();

    const newState: RoomState = {
      ...roomState,
      players: updatedPlayers,
      currentTurnIndex: nextIndex,
      currentSyllable: newSyllable,
      roundNumber: roomState.roundNumber + 1,
      syllableFailCount: 0,
      currentBomb: nextBomb,
    };

    if (channel) {
      await channel.send({
        type: 'broadcast', event: 'word_accepted',
        payload: { newState, word },
      });
    }

    setRoomState(newState);
    saveGameState(newState);
    setInput('');
    const baseMsg = `✓ "${word}" accettata!`;
    setFeedback({
      message: bonusMessage ? `${baseMsg} — ${bonusMessage}` : baseMsg,
      type: bonusMessage ? 'event' : 'success',
    });
    setTimeLeft(effectiveTurnTime);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitWord();
  };

  // Return to lobby — host preserves host role, broadcast to all
  const returnToLobby = async () => {
    const lobbyState: RoomState = {
      ...roomState,
      status: 'waiting',
      currentTurnIndex: 0,
      currentSyllable: '',
      roundNumber: 0,
      syllableFailCount: 0,
      currentBomb: 'normal',
      players: roomState.players.map(p => ({
        ...p,
        lives: roomState.settings.startLives,
        score: 0,
        hasShield: false,
        isSpectator: false,
      })),
    };

    if (channel) {
      await channel.send({ type: 'broadcast', event: 'return_to_lobby', payload: lobbyState });
    }
    setRoomState(lobbyState);
    saveGameState(lobbyState);
  };

  // Shake intensity (bomb shakes faster as time runs out)
  const shakeIntensity = effectiveTurnTime > 0
    ? Math.max(0, 1 - timeLeft / effectiveTurnTime)
    : 0;

  const positions = getPlayerPositions(roomState.players.length);
  const isDanger = timeLeft <= 3 && roomState.status === 'playing';

  // Circular timer ring geometry
  const RING_RADIUS = 128;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const ringProgress = Math.max(0, Math.min(1, timeLeft / effectiveTurnTime));
  const ringColor = timeLeft <= 2 ? '#dc2626' : timeLeft <= 4 ? '#f97316' : '#22c55e';

  const bombGlowColor =
    roomState.currentBomb === 'dollar' ? 'rgba(34,197,94,0.55)' :
    roomState.currentBomb === 'lightning' ? 'rgba(168,85,247,0.55)' :
    roomState.currentBomb === 'striped' ? 'rgba(249,115,22,0.55)' :
    roomState.currentBomb === 'star' ? 'rgba(59,130,246,0.55)' :
    'rgba(239,68,68,0.4)';

  // Game Over screen
  if (roomState.status === 'finished') {
    const winner = alivePlayers[0] || roomState.players.reduce((a, b) => a.score > b.score ? a : b);
    const isWinner = winner.nickname === nickname;
    const amIHost = roomState.players.find(p => p.nickname === nickname)?.isHost;
    const ranked = [...roomState.players].sort((a, b) => b.lives - a.lives || b.score - a.score);

    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] border-[4px] border-black bg-surface-container p-10 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: isWinner ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.25)' }}
          />
          <div className="relative">
            <div className="text-[72px]" style={{ animation: 'bp-trophy-pop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
              {isWinner ? '🏆' : '💀'}
            </div>
            <h2 className="mt-2 font-headline-lg text-[40px] text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              {isWinner ? 'HAI VINTO!' : 'GAME OVER'}
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-primary-container px-4 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[18px]">👑</span>
              <p className="font-headline-md text-[18px] text-white">{winner.nickname}</p>
            </div>
          </div>
          <div className="relative mt-6 space-y-2">
            {ranked.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl border-[3px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  i === 0 ? 'bg-yellow-500/20' : 'bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg border-[2px] border-black font-headline-md text-[14px] ${
                    i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                  }`}>{i + 1}</span>
                  {p.avatarUrl && <img src={p.avatarUrl} alt="" className="h-7 w-7 rounded border-[2px] border-black" />}
                  <span className="font-headline-md text-[14px] text-white">{p.nickname}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">{p.lives > 0 ? '👑' : '💀'}</span>
                  <span className="rounded-lg border-[2px] border-black bg-surface-container-lowest px-2 py-0.5 font-headline-md text-[12px] text-on-surface-variant">{p.score} 📝</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          {amIHost && (
            <button onClick={returnToLobby} className="flex-1 rounded-2xl border-[4px] border-black bg-green-600 px-8 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none">
              🔄 NUOVO ROUND
            </button>
          )}
          <button onClick={onLeave} className="flex-1 rounded-2xl border-[4px] border-black bg-surface-container-high px-8 py-4 font-headline-md text-[18px] text-on-surface-variant shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none">
            ESCI
          </button>
        </div>
        <style>{gameStyles}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'relative flex h-screen w-screen flex-col items-center justify-center gap-3 overflow-hidden bg-surface-container-lowest p-3'
          : 'space-y-4'
      }
    >
      {/* Fullscreen dot-grid backdrop */}
      {isFullscreen && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)', backgroundSize: '28px 28px' }}
        />
      )}

      {/* Top bar: event banner + fullscreen toggle */}
      <div className={`relative z-10 flex w-full items-stretch gap-2 ${isFullscreen ? 'max-w-[900px]' : ''}`}>
        {roomState.currentBomb !== 'normal' ? (
          <div className={`flex flex-1 items-center justify-center rounded-xl border-[3px] border-black p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            roomState.currentBomb === 'dollar' ? 'bg-green-900/50' :
            roomState.currentBomb === 'lightning' ? 'bg-purple-900/50' :
            roomState.currentBomb === 'striped' ? 'bg-orange-900/50' :
            'bg-blue-900/50'
          }`} style={{ animation: 'bp-banner-in 0.4s ease-out' }}>
            <p className="font-headline-md text-[13px] text-white sm:text-[14px]">
              {currentBombEvent.description}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border-[3px] border-black bg-surface-container-high p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-headline-md text-[13px] text-on-surface-variant sm:text-[14px]">
              💣 Round {roomState.roundNumber} — Sillaba: <span className="text-primary-container">{roomState.currentSyllable}</span>
            </p>
          </div>
        )}
        <button
          onClick={toggleMute}
          title={muted ? 'Attiva audio' : 'Disattiva audio'}
          className="flex shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-surface-container-high px-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:text-primary-container active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[24px]">
            {muted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
          className="flex shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-surface-container-high px-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:text-primary-container active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>

      {/* Arena */}
      <div
        className={`relative z-10 mx-auto aspect-square w-full rounded-[2rem] border-[4px] border-black bg-surface-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
          isFullscreen ? '' : 'max-w-[700px]'
        }`}
        style={isFullscreen ? { width: 'min(90vw, calc(100vh - 200px))' } : undefined}
      >
        {/* Danger vignette */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.7rem] transition-opacity duration-300"
          style={{
            opacity: isDanger ? 1 : 0,
            boxShadow: 'inset 0 0 80px 20px rgba(220,38,38,0.45)',
            animation: isDanger ? 'bp-danger-pulse 0.8s ease-in-out infinite' : undefined,
          }}
        />

        {/* Bomb center with circular timer ring */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-[296px] w-[296px] items-center justify-center sm:h-[320px] sm:w-[320px]">
            {/* SVG circular timer ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 320 320">
              <circle cx="160" cy="160" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="12" />
              <circle
                cx="160" cy="160" r={RING_RADIUS} fill="none"
                stroke={ringColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC * (1 - ringProgress)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s', filter: `drop-shadow(0 0 6px ${ringColor})` }}
              />
            </svg>

            {/* Pulsing glow behind bomb */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:h-52 sm:w-52"
              style={{ background: bombGlowColor, animation: 'bp-glow-pulse 1.5s ease-in-out infinite' }}
            />

            {/* Rotating pointer that aims at the active player (pivots on bomb center) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-0 w-0"
              style={{ transform: `rotate(${arrowRotation}deg)`, transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute', left: '50%', top: 0,
                  transform: 'translate(-50%, -190px)',
                  fontSize: '40px', lineHeight: 1, color: '#22c55e',
                  fontVariationSettings: "'FILL' 1",
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,1)) drop-shadow(0 2px 2px rgba(0,0,0,0.8))',
                }}
              >
                navigation
              </span>
            </div>

            {/* Bomb image + syllable — outer div shifts position, inner div shakes */}
            <div style={{ transform: 'translate(9px, -18px)' }}>
              <div
                className="relative"
                style={{ animation: `bomb-shake ${Math.max(0.05, 0.5 - shakeIntensity * 0.45)}s infinite` }}
              >
                <div className="relative h-40 w-40 sm:h-52 sm:w-52">
                <img
                  src={currentBombEvent.image}
                  alt={currentBombEvent.name}
                  className="h-full w-full object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
            </div>

            {/* Syllable — positioned at exact ring center, independent of bomb offset */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" style={{ transform: 'translate(-50%, -50%)' }}>
              <span
                className="font-headline-lg text-[30px] uppercase tracking-wider text-white sm:text-[40px]"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)' }}
              >
                {roomState.currentSyllable}
              </span>
            </div>

            {/* Numeric timer chip */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30">
              <span className={`inline-block rounded-full border-[3px] border-black px-3 py-0.5 font-headline-md text-[16px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                timeLeft <= 2 ? 'bg-red-600 text-white' : timeLeft <= 4 ? 'bg-orange-500 text-white' : 'bg-surface-container-highest text-white'
              }`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Players around bomb */}
        {roomState.players.map((player, index) => {
          const pos = positions[index];
          const isCurrent = index === roomState.currentTurnIndex;
          const isDead = player.lives <= 0;
          const typingText = player.nickname === nickname ? input : (playerInputs[player.nickname] || '');
          const isMe = player.nickname === nickname;

          return (
            <div key={player.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ top: pos.top, left: pos.left }}>
              <div className={`flex flex-col items-center gap-1 transition-all ${isDead ? 'opacity-40 grayscale' : ''} ${isCurrent ? 'scale-110' : ''}`}>
                <p className={`flex items-center gap-1 font-headline-md text-[12px] sm:text-[14px] ${isCurrent ? 'text-primary-container' : 'text-white'}`}>
                  {player.nickname}
                  {isMe && <span className="rounded bg-primary-container/30 px-1 text-[9px] text-primary-container">TU</span>}
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: roomState.settings.maxLives }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-[10px] sm:text-[13px] ${i < player.lives ? '' : 'opacity-25 grayscale'}`}
                      style={isCurrent && i === player.lives - 1 ? { animation: 'bp-heartbeat 1s ease-in-out infinite' } : undefined}
                    >❤️</span>
                  ))}
                  {player.hasShield && <span className="text-[11px] sm:text-[14px]" title="Scudo attivo">🛡️</span>}
                </div>
                <div className="relative">
                  {isCurrent && !isDead && (
                    <span className="pointer-events-none absolute -inset-1 rounded-2xl border-[3px] border-green-400" style={{ animation: 'bp-ring-pulse 1.2s ease-out infinite' }} />
                  )}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:h-16 sm:w-16 ${
                    isCurrent ? 'bg-primary-container ring-2 ring-green-400' : 'bg-surface-container-high'
                  }`}>
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={player.nickname} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[24px] text-white sm:text-[32px]">person</span>
                    )}
                  </div>
                </div>
                {isCurrent && typingText && (
                  <p className="mt-1 max-w-[160px] whitespace-normal break-words rounded-lg border-[2px] border-black bg-surface-container-highest px-2 py-0.5 text-center font-headline-md text-[11px] text-primary-container shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:max-w-[200px] sm:text-[13px]" style={{ animation: 'bp-pop-in 0.15s ease-out' }}>
                    {typingText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className={`relative z-10 w-full rounded-[2rem] border-[4px] border-black bg-surface-container p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:p-6 ${isFullscreen ? 'max-w-[900px]' : ''}`}>
        {isSpectator ? (
          <p className="text-center font-headline-md text-[14px] text-on-surface-variant">
            👀 Stai guardando la partita come spettatore. Potrai giocare al prossimo round!
          </p>
        ) : (
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!isMyTurn}
              placeholder={isMyTurn ? `Scrivi una parola con "${roomState.currentSyllable}"...` : 'Aspetta il tuo turno...'}
              className={`flex-1 rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-headline-md text-[16px] text-white placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-50 sm:text-[18px] ${isMyTurn ? 'ring-2 ring-green-400/60' : ''}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              onClick={submitWord}
              disabled={!isMyTurn || !input.trim()}
              className="rounded-xl border-[3px] border-black bg-green-600 px-5 py-3 font-headline-md text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">send</span>
            </button>
          </div>
        )}
        {feedback.message && (
          <p
            className={`mt-2 text-center font-body-lg text-[14px] ${
              feedback.type === 'success' ? 'text-green-400' :
              feedback.type === 'event' ? 'text-yellow-400' :
              'text-red-400'
            }`}
            style={{ animation: 'bp-pop-in 0.2s ease-out' }}
          >
            {feedback.message}
          </p>
        )}
      </div>

      {/* Leave (hidden in fullscreen to keep it clean) */}
      {!isFullscreen && (
        <button onClick={onLeave} className="rounded-xl border-[3px] border-black bg-surface-container-high px-6 py-2 font-body-lg text-on-surface-variant shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:text-red-400">
          <span className="material-symbols-outlined mr-1 align-middle text-[18px]">logout</span>
          Abbandona
        </button>
      )}

      <style>{gameStyles}</style>
    </div>
  );
};

export default BombPartyGame;
