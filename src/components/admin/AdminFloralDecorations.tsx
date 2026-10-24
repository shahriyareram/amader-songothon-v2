import React from 'react';

interface BotanicalBranchProps {
  side?: 'left' | 'right';
  className?: string;
}

/**
 * AdminCardBotanicalBranch
 * Dedicated botanical sprig for Admin member cards.
 * Independent from Member UI botanical decorations.
 */
export const AdminCardBotanicalBranch: React.FC<BotanicalBranchProps> = ({
  side = 'left',
  className = '',
}) => {
  const isRight = side === 'right';

  return (
    <div
      className={`pointer-events-none select-none shrink-0 flex items-center justify-center w-5 sm:w-6 h-[104px] sm:h-[110px] ${
        isRight ? 'scale-x-[-1]' : ''
      } ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 28 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          d="M20 98 C17 80 8 60 14 36 C16 26 15 16 13 4"
          stroke="#4b8663"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M17 86 C8 88 4 81 7 77 C12 75 16 81 17 86Z"
          fill="#53996f"
        />
        <path
          d="M16 85 C11 83 9 79 8 78"
          stroke="#38704f"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
        <path
          d="M16 93 C11 96 6 93 8 89 C11 87 15 90 16 93Z"
          fill="#78c296"
          opacity="0.95"
        />
        <g transform="translate(7, 72)">
          <circle cx="0" cy="-3.8" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="3.6" cy="-1.2" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="2.2" cy="3.1" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-2.2" cy="3.1" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-3.6" cy="-1.2" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1.7" fill="#f59e0b" stroke="#d97706" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="0.9" fill="#fef08a" />
        </g>
        <path
          d="M14 66 C19 65 24 71 21 74 C17 76 13 70 14 66Z"
          fill="#44875f"
        />
        <path
          d="M13 54 C5 53 3 45 8 42 C13 41 14 49 13 54Z"
          fill="#53996f"
        />
        <path
          d="M12 52 C9 49 7 46 7 44"
          stroke="#38704f"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
        <path
          d="M11 43 C6 39 8 33 12 34 C15 36 14 41 11 43Z"
          fill="#86d4a5"
        />
        <g transform="translate(6, 40)">
          <circle cx="0" cy="-4.2" r="2.7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="4.0" cy="-1.3" r="2.7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="2.5" cy="3.4" r="2.7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-2.5" cy="3.4" r="2.7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-4.0" cy="-1.3" r="2.7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1.9" fill="#f59e0b" stroke="#d97706" strokeWidth="0.4" />
          <circle cx="0.2" cy="-0.2" r="1.0" fill="#fef08a" />
        </g>
        <path
          d="M15 39 C21 37 25 43 22 47 C18 49 15 42 15 39Z"
          fill="#44875f"
        />
        <path
          d="M14 26 C7 24 6 17 11 14 C15 14 16 21 14 26Z"
          fill="#53996f"
        />
        <path
          d="M13 24 C11 20 10 17 10 16"
          stroke="#38704f"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
        <g transform="translate(7, 20)">
          <circle cx="0" cy="-3.3" r="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="3.1" cy="-1.0" r="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="1.9" cy="2.7" r="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-1.9" cy="2.7" r="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-3.1" cy="-1.0" r="2.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1.4" fill="#f59e0b" stroke="#d97706" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="0.7" fill="#fef08a" />
        </g>
        <path
          d="M13 5 C12 1 15 0 16 2 C17 5 15 7 13 5Z"
          fill="#3b7352"
        />
        <path
          d="M14 13 C20 10 22 17 19 19 C15 20 14 15 14 13Z"
          fill="#70bd8f"
        />
      </svg>
    </div>
  );
};

export const CardBotanicalBranch = AdminCardBotanicalBranch;

/**
 * AdminCornerBotanicalBranch
 * Corner foliage dedicated to Admin Panel headers and cards.
 */
export const AdminCornerBotanicalBranch: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}> = ({ position, className = '' }) => {
  const isTopLeft = position === 'top-left';
  const isRight = position.includes('right');
  const isBottom = position.includes('bottom');

  if (isTopLeft) {
    return (
      <div
        className={`pointer-events-none absolute select-none z-0 left-0 top-0 opacity-60 sm:opacity-70 ${className}`}
        aria-hidden="true"
      >
        <svg
          width="56"
          height="36"
          viewBox="0 0 56 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 1 C14 2 28 2 48 1"
            stroke="#41705b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M1 0 C2 8 2 16 1 24"
            stroke="#41705b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 1 C15 -3 24 -2 28 2 C22 4 14 4 8 1Z"
            fill="#6ea887"
            opacity="0.85"
          />
          <path
            d="M25 2 C33 -2 42 -1 46 2 C39 5 31 4 25 2Z"
            fill="#7ec29d"
            opacity="0.9"
          />
          <path
            d="M1 6 C-3 12 -2 18 1 22 C3 17 3 10 1 6Z"
            fill="#52886e"
            opacity="0.85"
          />
          <circle cx="4" cy="4" r="2.4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.4" />
          <circle cx="4" cy="4" r="1.1" fill="#f59e0b" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute select-none z-0 opacity-45 sm:opacity-55 ${
        isRight ? 'right-0' : 'left-0'
      } ${isBottom ? 'bottom-0' : 'top-0'} ${
        isRight ? (isBottom ? 'scale-[-1]' : 'scale-x-[-1]') : isBottom ? 'scale-y-[-1]' : ''
      } ${className}`}
      aria-hidden="true"
    >
      <svg
        width="76"
        height="76"
        viewBox="0 0 76 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0 C20 12 36 28 50 52 C56 61 60 70 62 76"
          stroke="#41705b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M18 13 C15 5 24 2 29 8 C31 13 23 18 18 13Z"
          fill="#6ea887"
          opacity="0.85"
        />
        <path
          d="M29 21 C37 15 43 22 40 29 C34 32 28 26 29 21Z"
          fill="#44745e"
          opacity="0.8"
        />
        <path
          d="M36 36 C34 27 45 25 48 31 C51 38 43 41 36 36Z"
          fill="#7ec29d"
          opacity="0.9"
        />
        <path
          d="M47 46 C56 41 61 49 56 56 C50 59 45 53 47 46Z"
          fill="#52886e"
          opacity="0.85"
        />
        <circle cx="23" cy="22" r="3.4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="23" cy="22" r="1.5" fill="#f59e0b" />
        <circle cx="40" cy="42" r="2.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="40" cy="42" r="1.2" fill="#f59e0b" />
      </svg>
    </div>
  );
};

export const CornerBotanicalBranch = AdminCornerBotanicalBranch;
