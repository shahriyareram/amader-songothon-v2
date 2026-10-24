import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Member } from '../../types';
import { AdminAvatar } from './AdminAvatar';
import { AdminCardBotanicalBranch as CardBotanicalBranch } from './AdminFloralDecorations';
import { calculateMemberFinances } from '../../utils/calculations';
import { getCurrentWeekNumber } from '../../utils/bengali';

export interface AdminMemberCardProps {
  member: Member;
  currentWeek?: number;
  onClick?: () => void;
  className?: string;
  displayMemberCode?: string;
  displaySerial?: string;
}

/**
 * AdminMemberCard
 * Dedicated member card component for the Admin Panel.
 * Changing visual properties here will NEVER affect Member Panel cards.
 */
export const AdminMemberCard: React.FC<AdminMemberCardProps> = ({
  member,
  currentWeek,
  onClick,
  className = '',
  displayMemberCode,
  displaySerial,
}) => {
  const paddedSerialEn = displaySerial || String(member.serialNumber || 0).padStart(2, '0');
  const codeToDisplay = displayMemberCode || member.memberCode;
  const effectiveWeek = currentWeek && currentWeek > 0 ? currentWeek : getCurrentWeekNumber();
  const summary = calculateMemberFinances(member, effectiveWeek);
  const hasDue = summary.isDefaulter;

  return (
    <div
      id={`admin-member-card-${member.serialNumber || member.id}`}
      onClick={onClick}
      className={`group bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-[#cde8f8] shadow-[0_2px_10px_rgba(2,132,199,0.06)] hover:border-sky-300 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between text-center cursor-pointer select-none w-full h-[188px] min-h-[188px] max-h-[188px] sm:h-[194px] sm:min-h-[194px] sm:max-h-[194px] relative overflow-hidden ${className}`}
    >
      {/* Top Bar: Serial Number on left, Status Badge in middle, Member Code on right */}
      <div className="w-full h-5 flex items-center justify-between shrink-0 px-0.5 gap-1">
        <span className="px-2 py-0.5 rounded-md bg-[#e8f8f0] text-[#065f46] text-[11px] font-bold border border-[#a7f3d0] font-mono leading-none shrink-0">
          {paddedSerialEn}
        </span>

        {/* Status Badge: লাল 'বকেয়া আছে' বা সবুজ 'জমা আছে' */}
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold leading-none shrink-0 ${
            hasDue
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {hasDue ? 'বকেয়া আছে' : 'জমা আছে'}
        </span>

        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 font-sans tracking-tight truncate max-w-[65px] text-right shrink-0">
          {codeToDisplay}
        </span>
      </div>

      {/* Center: Profile image frame */}
      <div className="w-full flex items-center justify-between px-0.5 mt-1 mb-2.5 shrink-0">
        <CardBotanicalBranch side="left" />
        <div className="w-[104px] h-[104px] min-w-[104px] min-h-[104px] max-w-[104px] max-h-[104px] sm:w-[110px] sm:h-[110px] sm:min-w-[110px] sm:min-h-[110px] sm:max-w-[110px] sm:max-h-[110px] aspect-square rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 shadow-2xs">
          <AdminAvatar member={member} size="card" />
        </div>
        <CardBotanicalBranch side="right" />
      </div>

      {/* Bottom: Name Bar */}
      <div className="w-full h-8 min-h-8 max-h-8 bg-gradient-to-r from-[#d9f0fc] to-[#e7f4fe] rounded-xl sm:rounded-2xl flex items-center justify-between px-1.5 sm:px-2 py-0.5 gap-1.5 shrink-0 border border-[#bae6fd]">
        <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-[#0284c7] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-black">
            {member.name ? member.name.charAt(0) : 'স'}
          </span>
        </div>

        <span className="flex-1 text-[13px] sm:text-[14px] font-black text-slate-900 truncate text-left tracking-tight">
          {member.name}
        </span>

        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284c7] shrink-0 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
};
