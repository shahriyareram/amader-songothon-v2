import React from 'react';
import { User, Calendar } from 'lucide-react';
import { getBengaliDate } from '../../utils/bengali';
import { MemberLogo } from './MemberLogo';

export interface MemberHeaderProps {
  currentWeek: number;
  memberName?: string;
  onProfileClick?: () => void;
  onAdminClick?: () => void;
}

/**
 * MemberHeader
 * Dedicated top header for the Member Panel.
 * Changing logo, background, typography, or styling here
 * will NEVER affect the Admin Panel.
 */
export const MemberHeader: React.FC<MemberHeaderProps> = ({
  currentWeek,
  memberName,
  onProfileClick,
}) => {
  const todayBengali = getBengaliDate();

  return (
    <header
      id="member-panel-header"
      className="sticky top-0 z-30 bg-emerald-900 text-white shadow-xs border-b border-emerald-950/40 backdrop-blur-md"
    >
      <div className="max-w-md mx-auto px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Member Branding & Logo */}
          <div className="flex items-center gap-2.5">
            <MemberLogo />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight leading-none text-white">
                  আমাদের সংগঠন
                </h1>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 font-bold px-1.5 py-0.2 rounded border border-emerald-700">
                  ৫২ সপ্তাহ
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 inline text-emerald-300" />
                <span>{todayBengali}</span>
              </p>
            </div>
          </div>

          {/* Member Status Pill */}
          <div className="flex items-center gap-2">
            <div
              id="member-status-badge"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 select-none"
            >
              <User className="w-3.5 h-3.5 text-emerald-200 stroke-[2.3]" />
              <span>সদস্য</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
