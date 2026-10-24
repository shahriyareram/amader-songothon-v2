import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Member, OrganizationSettings, WeeklyRecord } from '../../types';
import { toBengaliNumber, getCalculatedDisplayMemberMap, matchesMemberSearch } from '../../utils/bengali';
import { calculateMemberFinances } from '../../utils/calculations';
import { MemberCard } from './MemberCard';
import { MemberCornerBotanicalBranch as CornerBotanicalBranch } from './MemberFloralDecorations';

export interface MemberDirectoryPageProps {
  members: Member[];
  settings: OrganizationSettings;
  isAdmin: boolean;
  onSelectMember?: (memberId: string) => void;
  onAddNewMember: () => void;
  onEditMember: (member: Member) => void;
  onRecordDeposit: (memberId: string) => void;
}

export const MemberDirectoryPage: React.FC<MemberDirectoryPageProps> = ({
  members,
  settings,
  isAdmin,
  onSelectMember,
  onAddNewMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'serial' | 'due' | 'deposit'>('serial');

  // Calculated continuous display mapping for all active members (e.g. সো-০১, সো-০২, ...)
  const displayMap = useMemo(() => {
    return getCalculatedDisplayMemberMap(members);
  }, [members]);

  // Filter & sort members
  const processedMembers = useMemo(() => {
    return members
      .filter((m: Member) => {
        const summary = calculateMemberFinances(m, settings.currentWeek);
        const displayInfo = displayMap.get(m.id);

        const matchesSearch = matchesMemberSearch(m, searchQuery, displayInfo);
        if (!matchesSearch) return false;

        if (filterType === 'due') return summary.isDefaulter;
        if (filterType === 'paid') return !summary.isDefaulter;
        return true;
      })
      .sort((a: Member, b: Member) => {
        const sumA = calculateMemberFinances(a, settings.currentWeek);
        const sumB = calculateMemberFinances(b, settings.currentWeek);

        if (sortBy === 'due') {
          return sumB.totalDue - sumA.totalDue;
        }
        if (sortBy === 'deposit') {
          return sumB.totalPaid - sumA.totalPaid;
        }
        return a.serialNumber - b.serialNumber;
      });
  }, [members, settings.currentWeek, searchQuery, filterType, sortBy, displayMap]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef8fe] via-[#f2faf6] to-[#eaf5fc] pb-24 pt-1 px-2.5 sm:px-3.5 max-w-md mx-auto space-y-2 sm:space-y-2.5 font-sans text-slate-800 relative overflow-hidden">
      {/* Decorative corner botanical flourishes */}
      <CornerBotanicalBranch position="top-right" />
      <CornerBotanicalBranch position="bottom-left" />
      <CornerBotanicalBranch position="bottom-right" />

      {/* ============================================================ */}
      {/* 1. Header (Reference Screenshot):                           */}
      {/* Left: “সদস্য তালিকা” with icon                                 */}
      {/* Right: “মোট সদস্য: ২৫ জন >” pill                              */}
      {/* ============================================================ */}
      <header className="flex items-center justify-between gap-2 pt-1 pb-0.5 relative z-10">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#065f46] stroke-[2.5]" />
          <h1 className="text-xl sm:text-2xl font-black text-[#064e3b] tracking-tight">
            সদস্য তালিকা
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="bg-[#e6f7ef] border border-[#a7f3d0] rounded-full px-3 py-1 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#065f46] shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#065f46] shrink-0" />
            <span>{`মোট সদস্য: ${toBengaliNumber(members.length)} জন`}</span>
          </div>

          {/* New Member Button if Admin */}
          {isAdmin && (
            <button
              id="members-page-add-member-btn"
              type="button"
              onClick={onAddNewMember}
              className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white p-1.5 rounded-full flex items-center justify-center shadow-xs transition-all cursor-pointer shrink-0"
              title="নতুন সদস্য যুক্ত করুন"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. Search Box (Rounded full pill, screenshot style)           */}
      {/* ============================================================ */}
      <div className="space-y-1.5 relative z-10">
        <div className="relative">
          <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2.2]" />
          <input
            id="members-list-search"
            type="text"
            placeholder="সদস্যের নাম বা Member ID খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 sm:h-11 pl-10 sm:pl-11 pr-9 bg-white border border-[#bde1f7] rounded-full text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips & Sort Select */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 sm:px-3.5 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer text-xs ${
                filterType === 'all'
                  ? 'bg-[#064e3b] text-white shadow-2xs'
                  : 'bg-white/80 text-slate-600 border border-[#bde1f7] hover:bg-white'
              }`}
            >
              {`সকল (${toBengaliNumber(members.length)})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('due')}
              className={`px-2.5 sm:px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 text-xs ${
                filterType === 'due'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-[#fff1f2] text-rose-600 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <User className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>বকেয়া</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('paid')}
              className={`px-2.5 sm:px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 text-xs ${
                filterType === 'paid'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-[#ecfdf5] text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>জমা হয়েছে</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'serial' | 'due' | 'deposit')}
              className="bg-white border border-[#bde1f7] rounded-xl px-2 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer shadow-2xs"
            >
              <option value="serial">সিরিয়াল নম্বর</option>
              <option value="due">বকেয়া বেশি</option>
              <option value="deposit">জমা বেশি</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. 2-column × 3-row grid showing 6 members per screen         */}
      {/* Identical card dimensions, identical profile frames           */}
      {/* Remaining members (07-25 and future members) scroll below    */}
      {/* ============================================================ */}
      {processedMembers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 shadow-xs relative z-10">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-slate-700">কোনো সদস্য পাওয়া যায়নি</p>
          <p className="text-sm text-slate-400 mt-1">অন্য নাম বা আইডি দিয়ে খুঁজুন</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 relative z-10">
          {processedMembers.map((member: Member) => {
            const displayInfo = displayMap.get(member.id);
            return (
              <MemberCard
                key={member.id}
                member={member}
                currentWeek={settings.currentWeek}
                displayMemberCode={displayInfo?.displayMemberCode}
                displaySerial={displayInfo?.displaySerialPadded}
                onClick={() => onSelectMember && onSelectMember(member.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
