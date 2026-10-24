import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Wallet, 
  FileText, 
  ArrowUpRight, 
  Building2, 
  Smartphone,
  Coins
} from 'lucide-react';
import { DepositTransaction, OrganizationSettings } from '../types';
import { 
  toBengaliNumber, 
  formatBengaliCurrency, 
  getShortBengaliDate 
} from '../utils/bengali';

interface DepositHistoryPageProps {
  transactions: DepositTransaction[];
  settings: OrganizationSettings;
  onSelectMember: (memberId: string) => void;
  onOpenDepositModal: () => void;
  isAdmin: boolean;
}

export const DepositHistoryPage: React.FC<DepositHistoryPageProps> = ({
  transactions,
  settings,
  onSelectMember,
  onOpenDepositModal,
  isAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const memberName = tx?.memberName || '';
    const memberCode = tx?.memberCode || '';
    const receiptNo = tx?.receiptNo || '';
    const matchesSearch =
      memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receiptNo.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedWeek !== 'all' && tx.weekNumber !== selectedWeek) {
      return false;
    }

    if (selectedMethod !== 'all' && tx.paymentMethod !== selectedMethod) {
      return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bkash':
      case 'nagad':
        return <Smartphone className="w-3 h-3 text-rose-600" />;
      case 'bank':
        return <Building2 className="w-3 h-3 text-blue-600" />;
      default:
        return <Coins className="w-3 h-3 text-emerald-600" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'bkash':
        return 'বিকাশ';
      case 'nagad':
        return 'নগদ';
      case 'bank':
        return 'ব্যাংক';
      default:
        return 'ক্যাশ';
    }
  };

  return (
    <div className="pb-28 pt-2 px-3.5 max-w-md mx-auto space-y-4 font-sans">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-emerald-800 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
            <History className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase bg-white/15 px-2 py-0.5 rounded-full border border-white/10">
              লেনদেন রেজিস্টার
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">জমার ইতিহাস</h2>
            <p className="text-xs text-amber-100 font-medium">
              সদস্য, সপ্তাহ, জমার পরিমাণ ও তারিখের রেকর্ড
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenDepositModal}
            className="bg-white text-slate-900 hover:bg-amber-50 active:scale-95 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            + নতুন জমা
          </button>
        )}
      </div>

      {/* Overview Statistics Banner */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[11px] text-emerald-800 font-medium">ফিল্টারকৃত মোট আদায়</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">
            {formatBengaliCurrency(totalFilteredAmount)}
          </p>
          <p className="text-[10px] text-emerald-600">
            {toBengaliNumber(filteredTransactions.length)} টি ভাউচার
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-[11px] text-slate-600 font-medium">মোট সর্বকালীন লেনদেন</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {toBengaliNumber(transactions.length)} টি
          </p>
          <p className="text-[10px] text-slate-500">
            সর্বশেষ: {transactions.length > 0 ? getShortBengaliDate(transactions[0].date) : '-'}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="deposit-history-search"
            type="text"
            placeholder="সদস্যের নাম, কোড (সো-০১) বা রসিদ নং লিখুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
          />
        </div>

        {/* Filters: Week & Method */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-1">
              সপ্তাহ ফিল্টার:
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">সব সপ্তাহ (১ - ৫২)</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  সপ্তাহ {toBengaliNumber(w)} {w === settings.currentWeek ? '(চলতি)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-1">
              পেমেন্ট মাধ্যম:
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">সকল মাধ্যম</option>
              <option value="cash">নগদ (Cash)</option>
              <option value="bkash">বিকাশ (bKash)</option>
              <option value="nagad">নগদ (Nagad)</option>
              <option value="bank">ব্যাংক (Bank)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>লেনদেনের তালিকা</span>
          <span>{toBengaliNumber(filteredTransactions.length)} টি ফলাফল</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">কোনো জমার রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">ফিল্টার পরিবর্তন করে আবার দেখুন</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              id={`transaction-${tx.id}`}
              className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] uppercase font-bold opacity-80">সপ্তাহ</span>
                    <span className="text-xs font-bold">{toBengaliNumber(tx.weekNumber)}</span>
                  </div>

                  <div>
                    <button
                      onClick={() => onSelectMember(tx.memberId)}
                      className="text-xs font-bold text-slate-900 hover:text-emerald-800 flex items-center gap-1 group text-left"
                    >
                      <span>{tx.memberName}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                        {tx.memberCode}
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                    </button>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {getShortBengaliDate(tx.date)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        {getMethodIcon(tx.paymentMethod)}
                        <span>{getMethodLabel(tx.paymentMethod)}</span>
                      </span>
                    </div>

                    {tx.note && (
                      <p className="text-[10px] text-slate-500 italic mt-1">
                        "{tx.note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-emerald-700">
                    +{formatBengaliCurrency(tx.amount)}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {tx.receiptNo}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
