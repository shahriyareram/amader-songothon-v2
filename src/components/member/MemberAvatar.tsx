import React, { useState } from 'react';
import { Camera, User } from 'lucide-react';
import { toBengaliNumber } from '../../utils/bengali';

export interface MemberAvatarProps {
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

/**
 * MemberAvatar: Member-scoped avatar presentation component.
 */
export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  size = 'md',
  className = '',
  editable = false,
  onEdit,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

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
          hasPhoto ? 'bg-slate-100' : colorClass
        } border border-emerald-100/60 shadow-xs transition-transform duration-200 group-hover:scale-[1.02]`}
      >
        {hasPhoto ? (
          <img
            src={member.photoUrl}
            alt={member.name || 'Member'}
            className="w-full h-full object-cover object-center"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            {member.serialNumber !== undefined ? (
              <span className="leading-none drop-shadow-xs">{displayLabel}</span>
            ) : (
              <User className="w-1/2 h-1/2 opacity-90 stroke-[2.2]" />
            )}
          </div>
        )}
      </div>

      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) onEdit();
          }}
          className="absolute -bottom-1 -right-1 bg-emerald-700 hover:bg-emerald-800 text-white p-1.5 rounded-full shadow-md border-2 border-white transition-all cursor-pointer group-hover:scale-110 active:scale-95"
          title="ছবি পরিবর্তন করুন"
          aria-label="Change photo"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
