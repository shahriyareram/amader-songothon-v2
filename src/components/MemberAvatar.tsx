import React, { useState } from 'react';
import { Camera, User } from 'lucide-react';
import { toBengaliNumber } from '../utils/bengali';

interface MemberAvatarProps {
  member: {
    name?: string;
    serialNumber?: number;
    avatarColor?: string;
    photoUrl?: string;
    memberCode?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'card';
  className?: string;
  editable?: boolean;
  onEdit?: () => void;
  onClick?: () => void;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  size = 'md',
  className = '',
  editable = false,
  onEdit,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Size definitions
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px] rounded-lg',
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-2xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
    xl: 'w-16 h-16 text-lg rounded-2xl',
    '2xl': 'w-20 h-20 text-xl rounded-3xl',
    '3xl': 'w-[88px] h-[88px] text-2xl rounded-2xl',
    card: 'w-full h-full text-2xl rounded-2xl aspect-square shrink-0',
  };

  const hasPhoto = Boolean(member.photoUrl && !imageError);
  const colorClass = member.avatarColor || 'bg-emerald-700';

  // Fallback initial or serial number
  const initialLetter = member.name ? member.name.trim().charAt(0) : 'স';
  const displayLabel =
    member.serialNumber !== undefined
      ? toBengaliNumber(member.serialNumber)
      : initialLetter;

  return (
    <div
      onClick={onClick || onEdit}
      className={`relative group shrink-0 select-none ${
        onClick || onEdit ? 'cursor-pointer' : ''
      } ${size === 'card' ? 'w-full h-full' : ''} ${className}`}
    >
      <div
        className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center font-black text-white ${
          size === 'card' ? '' : 'shadow-xs border border-black/10'
        } transition-all ${
          hasPhoto ? 'bg-slate-100' : colorClass
        }`}
      >
        {hasPhoto ? (
          <img
            src={member.photoUrl}
            alt={member.name || 'সদস্য'}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-[inherit] transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none">
            <span>{displayLabel}</span>
            {size === 'xl' || size === '2xl' || size === '3xl' ? (
              <span className="text-[10px] font-bold opacity-80 mt-0.5">সিরিয়াল</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Editable Camera Overlay Badge */}
      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          aria-label="ছবি পরিবর্তন বা আপলোড করুন"
          className={`absolute -bottom-1 -right-1 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white flex items-center justify-center shadow-md border-2 border-white transition-transform cursor-pointer ${
            size === '3xl' || size === '2xl' ? 'w-7 h-7' : 'w-6 h-6'
          }`}
        >
          <Camera className={size === '3xl' || size === '2xl' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </div>
  );
};
