import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../config/supabaseClient';
import { validateWord, getRandomSyllable, loadDictionary, isDictionaryLoaded } from '../../utils/bombPartyDictionary';
import type { RoomState } from '../../pages/BombParty';
import BombTimer from './BombTimer';

interface Props {
  roomState: RoomState;
  setRoomState: (r: RoomState | null) => void;
  nickname: string;
}

const BombPartyGame: React.FC<Props> = ({ roomState, setRoomState, nickname }) => {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [timeLeft, setTimeLeft] = useState(roomState.settings.turnTime);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [dictReady, setDictReady] = useState(isDictionaryLoaded());
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load dictionary on mount
  useEffect(() => {
    if (!isDictionaryLoaded()) {
      loadDictionary().then(() => setDictReady(true));
    }
  }, []);

  const currentPlayer = roomState.players[roomState.currentTurnIndex];
  const isMyTurn = currentPlayer?.nickname === nickname;
  const _myPlayer = roomState.players.find(p => p.nickname === nickname);
  const alivePlayers = roomState.players.filter(p => p.lives > 0);

  // Check for winner
  useEffect(() => {
    if (alivePlayers.length === 1 && roomState.status === 'playing') {
      setRoomState({ ...roomState, status: 'finished' });
    }
  }, [alivePlayers.length, roomState, setRoomState]);

  // Timer logic
  useEffect(() => {
    if (roomState.status !== 'playing') return;

    setTimeLeft(roomState.settings.turnTime);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return roomState.settings.turnTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomState.currentTurnIndex, roomState.currentSyllable, roomState.status]);

  // Focus input on my turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  // Listen for broadcast events
  useEffect(() => {
    const channel = supabase.channel(`bombparty:${roomState.roomCode}`);

    channel
      .on('broadcast', { event: 'word_submitted' }, ({ payload }) => {
        const { newState, word } = payload as { newState: RoomState; word: string };
        setRoomState(newState);
        setUsedWords(prev => new Set([...prev, word.toLowerCase()]));
        setTimeLeft(newState.settings.turnTime);
        setInput('');
        setFeedback({ message: '', type: '' });
      })
      .on('broadcast', { event: 'time_up' }, ({ payload }) => {
        setRoomState(payload as RoomState);
        setTimeLeft((payload as RoomState).settings.turnTime);
        setInput('');
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        setRoomState(payload as RoomState);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomState.roomCode, setRoomState]);

  const handleTimeUp = useCallback(async () => {
    if (!isMyTurn) return;

    const updatedPlayers = roomState.players.map((p, i) =>
      i === roomState.currentTurnIndex ? { ...p, lives: p.lives - 1 } : p
    );

    const alive = updatedPlayers.filter(p => p.lives > 0);

    if (alive.length <= 1) {
      const finishedState: RoomState = {
        ...roomState,
        players: updatedPlayers,
        status: 'finished',
      };

      const channel = supabase.channel(`bombparty:${roomState.roomCode}`);
      channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'game_over',
        payload: finishedState,
      });
      setRoomState(finishedState);
      return;
    }

    // Move to next alive player
    let nextIndex = (roomState.currentTurnIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex].lives <= 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }

    // Logica età sillaba: se il contatore fallimenti raggiunge syllableMaxAge, cambia sillaba
    const newFailCount = roomState.syllableFailCount + 1;
    const shouldChangeSyllable = newFailCount >= roomState.settings.syllableMaxAge;
    const newSyllable = shouldChangeSyllable ? getRandomSyllable() : roomState.currentSyllable;

    const newState: RoomState = {
      ...roomState,
      players: updatedPlayers,
      currentTurnIndex: nextIndex,
      currentSyllable: newSyllable,
      roundNumber: roomState.roundNumber + 1,
      syllableFailCount: shouldChangeSyllable ? 0 : newFailCount,
    };

    const channel = supabase.channel(`bombparty:${roomState.roomCode}`);
    channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'time_up',
      payload: newState,
    });

    setRoomState(newState);
  }, [isMyTurn, roomState, setRoomState]);

  const submitWord = async () => {
    if (!isMyTurn || !input.trim()) return;

    const word = input.trim().toLowerCase();

    // Check if word was already used
    if (usedWords.has(word)) {
      setFeedback({ message: 'Parola già usata!', type: 'error' });
      return;
    }

    // Check if word contains the syllable
    if (!word.includes(roomState.currentSyllable.toLowerCase())) {
      setFeedback({ message: `La parola deve contenere "${roomState.currentSyllable}"!`, type: 'error' });
      return;
    }

    // Validate word against dictionary
    if (!validateWord(word)) {
      setFeedback({ message: 'Parola non valida!', type: 'error' });
      return;
    }

    // Word is valid - move to next player
    setUsedWords(prev => new Set([...prev, word]));

    const updatedPlayers = roomState.players.map((p, i) =>
      i === roomState.currentTurnIndex ? { ...p, score: p.score + word.length } : p
    );

    let nextIndex = (roomState.currentTurnIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex].lives <= 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }

    // Parola valida = sillaba cambia sempre e reset fail count
    const newSyllable = getRandomSyllable();
    const newState: RoomState = {
      ...roomState,
      players: updatedPlayers,
      currentTurnIndex: nextIndex,
      currentSyllable: newSyllable,
      roundNumber: roomState.roundNumber + 1,
      syllableFailCount: 0,
    };

    const channel = supabase.channel(`bombparty:${roomState.roomCode}`);
    channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'word_submitted',
      payload: { newState, word },
    });

    setRoomState(newState);
    setInput('');
    setFeedback({ message: `✓ "${word}" accettata!`, type: 'success' });
    setTimeLeft(roomState.settings.turnTime);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitWord();
    }
  };

  const leaveGame = () => {
    setRoomState(null);
  };

  // Game Over screen
  if (roomState.status === 'finished') {
    const winner = alivePlayers[0] || roomState.players.reduce((a, b) => a.score > b.score ? a : b);
    const isWinner = winner.nickname === nickname;

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-10 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[64px]">{isWinner ? '🏆' : '💀'}</div>
          <h2 className="mt-4 font-headline-lg text-[36px] text-white">
            {isWinner ? 'HAI VINTO!' : 'GAME OVER'}
          </h2>
          <p className="mt-2 font-headline-md text-[20px] text-primary-container">
            Vincitore: {winner.nickname}
          </p>

          {/* Scoreboard */}
          <div className="mt-6 space-y-2">
            {[...roomState.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border-[3px] border-black bg-surface-container-high p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-headline-md text-[18px] text-on-surface-variant">
                      #{i + 1}
                    </span>
                    <span className="font-headline-md text-[14px] text-white">{p.nickname}</span>
                  </div>
                  <span className="font-headline-md text-[14px] text-primary-container">
                    {p.score} pts
                  </span>
                </div>
              ))}
          </div>
        </div>

        <button
          onClick={leaveGame}
          className="w-full rounded-2xl border-[4px] border-black bg-primary-container px-8 py-4 font-headline-md text-[18px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          TORNA ALLA LOBBY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game board */}
      <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Current turn indicator */}
        <div className="mb-4 text-center">
          <p className="font-label-caps text-[12px] text-on-surface-variant">TURNO DI</p>
          <p className={`font-headline-md text-[22px] ${isMyTurn ? 'text-green-400' : 'text-white'}`}>
            {isMyTurn ? '🎯 TOCCA A TE!' : currentPlayer?.nickname}
          </p>
        </div>

        {/* Syllable display */}
        <div className="my-6 flex items-center justify-center">
          <div className="rounded-2xl border-[4px] border-black bg-primary-container px-10 py-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-headline-lg text-[48px] uppercase tracking-wider text-white sm:text-[64px]">
              {roomState.currentSyllable}
            </span>
          </div>
        </div>

        {/* Timer */}
        <BombTimer timeLeft={timeLeft} maxTime={roomState.settings.turnTime} />

        {/* Input */}
        <div className="mt-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isMyTurn}
              placeholder={isMyTurn ? 'Scrivi una parola...' : 'Aspetta il tuo turno...'}
              className="flex-1 rounded-xl border-[3px] border-black bg-surface-container-high px-4 py-3 font-headline-md text-[18px] text-white placeholder:text-on-surface-variant/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-50"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              onClick={submitWord}
              disabled={!isMyTurn || !input.trim()}
              className="rounded-xl border-[3px] border-black bg-green-600 px-6 py-3 font-headline-md text-[16px] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">send</span>
            </button>
          </div>

          {/* Feedback */}
          {feedback.message && (
            <p className={`mt-3 text-center font-body-lg ${
              feedback.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {feedback.message}
            </p>
          )}
        </div>
      </div>

      {/* Players sidebar */}
      <div className="rounded-[2rem] border-[4px] border-black bg-surface-container p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="mb-3 font-headline-md text-[16px] text-white">Giocatori</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {roomState.players.map((player, index) => (
            <div
              key={player.id}
              className={`rounded-xl border-[3px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
                index === roomState.currentTurnIndex
                  ? 'bg-primary-container/30 ring-2 ring-primary-container'
                  : player.lives <= 0
                    ? 'bg-surface-container-high opacity-50'
                    : 'bg-surface-container-high'
              }`}
            >
              <p className="truncate font-headline-md text-[13px] text-white">
                {player.nickname}
                {player.nickname === nickname && ' (tu)'}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {Array.from({ length: roomState.settings.maxLives }).map((_, i) => (
                  <span key={i} className={`text-[14px] ${i < player.lives ? 'text-red-500' : 'text-gray-600'}`}>
                    ❤️
                  </span>
                ))}
              </div>
              <p className="mt-1 font-label-caps text-[10px] text-on-surface-variant">
                {player.score} pts
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave button */}
      <button
        onClick={leaveGame}
        className="rounded-xl border-[3px] border-black bg-surface-container-high px-6 py-2 font-body-lg text-on-surface-variant shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:text-red-400"
      >
        <span className="material-symbols-outlined mr-1 align-middle text-[18px]">logout</span>
        Abbandona
      </button>
    </div>
  );
};

export default BombPartyGame;
