import React from 'react';
import { ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import { getBengaliDate, toBengaliNumber } from '../../utils/bengali';
import { AdminLogo } from './AdminLogo';

export interface AdminHeaderProps {
  currentWeek: number;
  onAdminClick?: () => void;
  adminName?: string;
}

/**
 * AdminHeader
 * Dedicated top header for the Admin Panel.
 * Changing logo, background, typography, or styling here
 * will NEVER affect the Member Panel.
 */
export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentWeek,
  onAdminClick,
  adminName,
}) => {
  const todayBengali = getBengaliDate();

  return (
    <header
      id="admin-panel-header"
      className="sticky top-0 z-30 bg-emerald-900 text-white shadow-xs border-b border-emerald-950/40 backdrop-blur-md"
    >
      <div className="max-w-md mx-auto px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Admin Branding & Logo */}
          <div className="flex items-center gap-2.5">
            <AdminLogo />
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

          {/* Admin Status Pill */}
          <div className="flex items-center gap-2">
            <button
              id="admin-status-badge-btn"
              type="button"
              onClick={onAdminClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer bg-amber-400 text-amber-950 hover:bg-amber-300 ring-2 ring-amber-300/60 select-none"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-950 stroke-[2.5]" />
              <span>অ্যাডমিন</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
