import React, { useMemo } from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { Member, OrganizationSettings } from '../types';
import { toBengaliNumber, getBengaliDate } from '../utils/bengali';
import { MemberCard } from './MemberCard';

interface HomePageProps {
  members: Member[];
  settings: OrganizationSettings;
  isAdmin: boolean;
  onSelectMember: (memberId: string) => void;
  onLogout?: () => void;
  onAdminToggle?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  members,
  settings,
  isAdmin,
  onSelectMember,
  onLogout,
  onAdminToggle,
}) => {
  // Format today's date in Bengali (e.g., ৫ সেপ্টেম্বর ২০২৬)
  const todayBengali = useMemo(() => getBengaliDate(), []);

  // Deduplicate and sort members strictly by serial number (1, 2, 3...)
  const sortedMembers = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => {
      // Ensure unique member by ID or serial number
      const key = m.id || `serial-${m.serialNumber}`;
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.serialNumber - b.serialNumber);
  }, [members]);

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-16 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* ============================================================ */}
        {/* উপরের অংশে একটি সুন্দর Header                               */}
        {/* Header:                                                      */}
        {/* “আমাদের সংগঠন”                                              */}
        {/* তার নিচে ছোট তথ্য:                                           */}
        {/* আজ: [বর্তমান তারিখ] • সপ্তাহ: [বর্তমান সপ্তাহ]              */}
        {/* ============================================================ */}
        <header className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {/* Header Title */}
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                আমাদের সংগঠন
              </h1>

              {/* Header Subtitle Info */}
              <div className="text-xs sm:text-sm font-semibold text-slate-600 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span>আজ: {todayBengali}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-800 font-bold">
                  সপ্তাহ: {toBengaliNumber(settings.currentWeek)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* পরিষ্কার Section Title: “সদস্য তালিকা”                        */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between px-1 pt-1">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>সদস্য তালিকা</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
              {toBengaliNumber(sortedMembers.length)} জন
            </span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            বিস্তারিত দেখতে কার্ডে চাপুন
          </span>
        </div>

        {/* ============================================================ */}
        {/* এর নিচে সকল সদস্যকে GRID আকারে দেখাবে                         */}
        {/* অত্যন্ত গুরুত্বপূর্ণ:                                        */}
        {/* প্রতিটি row-তে ঠিক ২ জন সদস্য থাকবে।                         */}
        {/* 2-column responsive grid                                     */}
        {/* দুই পাশের card-এর width সমান, height সমান                    */}
        {/* কোনো duplicate member নেই                                    */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {sortedMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              currentWeek={settings.currentWeek}
              onClick={() => onSelectMember(member.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
