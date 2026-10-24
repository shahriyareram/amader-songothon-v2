import React from 'react';
import { Shield, ShieldCheck, Calendar, CheckCircle2 } from 'lucide-react';
import { getBengaliDate, toBengaliNumber } from '../utils/bengali';

interface HeaderProps {
  isAdmin: boolean;
  currentWeek: number;
  onAdminClick: () => void;
  onSelectWeek?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  currentWeek,
  onAdminClick,
}) => {
  const todayBengali = getBengaliDate();

  return (
    <header className="sticky top-0 z-30 bg-emerald-900 text-white shadow-xs border-b border-emerald-950/40 backdrop-blur-md">
      <div className="max-w-md mx-auto px-3.5 py-2.5">
        {/* Top row: Brand & Admin toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 text-emerald-200 font-bold text-base shadow-inner">
              আ
            </div>
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

          {/* Admin Toggle Button */}
          <button
            id="admin-status-btn"
            type="button"
            onClick={onAdminClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isAdmin
                ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 ring-2 ring-amber-300/60'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
            }`}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-950" />
                <span>অ্যাডমিন</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-200" />
                <span>অ্যাডমিন পিন</span>
              </>
            )}
          </button>
        </div>

        {/* Current week status pill strip */}
        <div className="mt-2 pt-1.5 border-t border-emerald-800/80 flex items-center justify-between text-[11px] text-emerald-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              চলতি সপ্তাহ: <strong className="text-white font-extrabold text-xs">সপ্তাহ {toBengaliNumber(currentWeek)}</strong> / ৫২
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>সঞ্চয় ও কিস্তি ট্র্যাকার</span>
          </div>
        </div>
      </div>
    </header>
  );
};
