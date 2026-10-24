import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  Phone,
  Wallet,
  ChevronRight,
  CheckCircle2,
  Users,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Member, OrganizationSettings } from '../../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getCalculatedDisplayMemberMap,
} from '../../utils/bengali';
import { AdminAvatar } from './AdminAvatar';
import { processMember52Weeks } from '../../utils/calculations';

export interface AdminDueMembersPageProps {
  members: Member[];
  settings: OrganizationSettings;
  onSelectMember: (memberId: string) => void;
  onRecordDeposit: (memberId: string, weekNumber?: number) => void;
}

interface DueWeekItem {
  weekNumber: number;
  dueAmount: number;
  targetAmount: number;
  paidAmount: number;
  status: 'বকেয়া';
}

interface ProcessedDueMember {
  member: Member;
  dueWeeks: DueWeekItem[];
  totalDue: number;
  totalPaid: number;
  earliestUnpaidWeek: number;
}

/**
 * AdminDueMembersPage
 * Dedicated due members tracking page for the Admin Panel.
 * Completely isolated from Member UI components.
 */
export const AdminDueMembersPage: React.FC<AdminDueMembersPageProps> = ({
  members,
  settings,
  onSelectMember,
  onRecordDeposit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Continuous display map for active members
  const displayMap = useMemo(() => {
    return getCalculatedDisplayMemberMap(members);
  }, [members]);

  // Process and filter ONLY members who have due payments
  const dueMembersList = useMemo<ProcessedDueMember[]>(() => {
    return members
      .map((member) => {
        const finances = processMember52Weeks(member, settings.currentWeek, settings.weeklyTarget);

        const dueWeeks: DueWeekItem[] = finances.all52Weeks
          .filter((w) => w.weekNumber <= settings.currentWeek && w.status === 'due' && w.dueAmount > 0)
          .map((w) => ({
            weekNumber: w.weekNumber,
            dueAmount: w.dueAmount,
            targetAmount: w.targetAmount,
            paidAmount: w.paidAmount,
            status: 'বকেয়া',
          }));

        const earliestUnpaidWeek = dueWeeks[0]?.weekNumber || settings.currentWeek;

        return {
          member,
          dueWeeks,
          totalDue: finances.totalDue,
          totalPaid: finances.totalDeposit,
          earliestUnpaidWeek,
        };
      })
      .filter((item) => item.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [members, settings.currentWeek, settings.weeklyTarget]);

  // Search filter
  const filteredDueMembers = useMemo(() => {
    if (!searchQuery.trim()) return dueMembersList;
    const q = searchQuery.toLowerCase().trim();
    return dueMembersList.filter(({ member }) => {
      const name = member?.name || '';
      const code = member?.memberCode || '';
      const displayCode = displayMap.get(member.id)?.displayMemberCode || '';
      const displaySerial = displayMap.get(member.id)?.displaySerialPadded || '';
      const serial = member?.serialNumber != null ? member.serialNumber.toString() : '';
      const phone = member?.phone || '';
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        displayCode.toLowerCase().includes(q) ||
        serial.includes(q) ||
        toBengaliNumber(serial).includes(q) ||
        displaySerial.includes(q) ||
        toBengaliNumber(displaySerial).includes(q) ||
        phone.includes(q)
      );
    });
  }, [dueMembersList, searchQuery, displayMap]);

  // Overall due summary
  const totalDueAmount = useMemo(() => {
    return dueMembersList.reduce((sum, item) => sum + item.totalDue, 0);
  }, [dueMembersList]);

  return (
    <div className="pb-28 pt-2.5 px-3.5 max-w-md mx-auto space-y-4 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white rounded-3xl p-5 border border-rose-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600" />
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                বকেয়া সদস্য
              </h1>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-500 mt-1">
              চলতি সপ্তাহ {toBengaliNumber(settings.currentWeek)} পর্যন্ত অনাদায়ী কিস্তির হিসাব
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 border border-rose-200/80">
            <AlertCircle className="w-6 h-6 stroke-[2.3]" />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-[#fff1f2] rounded-2xl p-3.5 border border-rose-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-600">
                মোট বকেয়া সদস্য
              </span>
              <Users className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight leading-none block">
                {toBengaliNumber(dueMembersList.length)} জন
              </span>
              <span className="text-[11px] font-bold text-rose-500 mt-1 block">
                কিস্তি পরিশোধ বাকি রয়েছে
              </span>
            </div>
          </div>

          <div className="bg-[#fff1f2] rounded-2xl p-3.5 border border-rose-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-600">
                মোট বকেয়া টাকা
              </span>
              <Wallet className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-none block">
                {formatBengaliCurrency(totalDueAmount)}
              </span>
              <span className="text-[11px] font-bold text-rose-500 mt-1 block">
                সর্বমোট অনাদায়ী সঞ্চয়
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          id="admin-due-members-search"
          type="text"
          placeholder="বকেয়া সদস্যের নাম বা Member ID খুঁজুন..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-10 bg-white border border-rose-200/80 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Due Members List */}
      {dueMembersList.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-9 h-9 stroke-[2.3]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">
              অভিনন্দন! কোনো বকেয়া নেই
            </h2>
            <p className="text-sm font-semibold text-slate-500 max-w-xs mx-auto">
              চলতি সপ্তাহ {toBengaliNumber(settings.currentWeek)} পর্যন্ত সকল সদস্যের কিস্তি সম্পূর্ণ পরিশোধিত হয়েছে।
            </p>
          </div>
        </div>
      ) : filteredDueMembers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 shadow-xs">
          <p className="text-base font-bold text-slate-700">খোঁজা অনুযায়ী কোনো বকেয়া সদস্য পাওয়া যায়নি</p>
          <p className="text-xs text-slate-400 mt-1">সদস্যের সঠিক নাম বা মেম্বার আইডি লিখুন</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1 text-xs sm:text-sm font-bold text-slate-500">
            <span>বকেয়া সদস্য তালিকা ({toBengaliNumber(filteredDueMembers.length)} জন)</span>
            <span>সর্বোচ্চ বকেয়া ক্রমানুসারে</span>
          </div>

          {filteredDueMembers.map(({ member, dueWeeks, totalDue, earliestUnpaidWeek }) => (
            <div
              key={member.id}
              id={`admin-due-member-card-${member.id}`}
              className="bg-white rounded-3xl p-5 border border-rose-200/80 hover:border-rose-300 shadow-xs hover:shadow-sm transition-all space-y-4 group"
            >
              {/* Card Header: AdminAvatar, Name, Member ID, Phone & Chevron */}
              <div
                onClick={() => onSelectMember(member.id)}
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AdminAvatar member={member} size="md" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors leading-tight truncate">
                        {member.name}
                      </h2>
                      <span className="font-mono text-xs font-bold bg-rose-100/80 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-lg shrink-0">
                        {displayMap.get(member.id)?.displayMemberCode || member.memberCode}
                      </span>
                    </div>

                    {member.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{member.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-rose-50 text-slate-400 group-hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors">
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#fff1f2] rounded-2xl p-3 border border-rose-200/80">
                  <span className="text-xs font-bold text-slate-600 block">
                    বকেয়া সপ্তাহের সংখ্যা
                  </span>
                  <span className="text-lg sm:text-xl font-black text-rose-600 mt-0.5 block leading-tight">
                    {toBengaliNumber(dueWeeks.length)}টি সপ্তাহ
                  </span>
                </div>

                <div className="bg-[#fff1f2] rounded-2xl p-3 border border-rose-200/80">
                  <span className="text-xs font-bold text-slate-600 block">
                    মোট বকেয়া টাকা
                  </span>
                  <span className="text-lg sm:text-xl font-black text-rose-600 mt-0.5 block leading-tight">
                    {formatBengaliCurrency(totalDue)}
                  </span>
                </div>
              </div>

              {/* Due Week Details */}
              <div className="bg-[#fff8f8] rounded-2xl p-3 border border-rose-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span>কোন কোন সপ্তাহ বকেয়া আছে:</span>
                  </span>
                  <span className="text-rose-600 font-extrabold">
                    {toBengaliNumber(dueWeeks.length)}টি কিস্তি বাকি
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {dueWeeks.map((week) => (
                    <div
                      key={week.weekNumber}
                      className="bg-white rounded-xl px-3 py-2 border border-rose-100 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-black text-slate-900">
                          সপ্তাহ {toBengaliNumber(week.weekNumber)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <strong className="font-black text-rose-600">
                          {formatBengaliCurrency(week.dueAmount)}
                        </strong>
                        <span className="bg-rose-100 text-rose-600 border border-rose-200 font-extrabold text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{week.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id={`admin-due-member-collect-${member.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordDeposit(member.id, earliestUnpaidWeek);
                  }}
                  className="flex-1 h-12 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-100" />
                  <span>জমা নিন (সপ্তাহ {toBengaliNumber(earliestUnpaidWeek)})</span>
                </button>

                <button
                  type="button"
                  id={`admin-due-member-details-${member.id}`}
                  onClick={() => onSelectMember(member.id)}
                  className="h-12 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>বিবরণী</span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
