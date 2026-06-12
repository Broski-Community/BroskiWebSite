import React from 'react';

interface Props {
  timeLeft: number;
  maxTime: number;
}

const BombTimer: React.FC<Props> = ({ timeLeft, maxTime }) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isUrgent = timeLeft <= 3;
  const isCritical = timeLeft <= 1;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Bomb emoji with shake animation */}
      <div className={`text-[48px] transition-transform ${
        isUrgent ? 'animate-bounce' : ''
      } ${isCritical ? 'scale-125' : ''}`}>
        💣
      </div>

      {/* Timer bar */}
      <div className="h-4 w-full max-w-[300px] overflow-hidden rounded-full border-[3px] border-black bg-surface-container-high shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isCritical
              ? 'bg-red-600'
              : isUrgent
                ? 'bg-orange-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Time number */}
      <span className={`font-headline-md text-[24px] ${
        isCritical ? 'text-red-500 animate-pulse' : isUrgent ? 'text-orange-400' : 'text-white'
      }`}>
        {timeLeft}s
      </span>
    </div>
  );
};

export default BombTimer;
