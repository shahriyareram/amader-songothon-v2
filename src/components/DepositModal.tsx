import React, { useState, useEffect } from 'react';
import { X, Check, Wallet, Calendar, AlertCircle } from 'lucide-react';
import { Member, OrganizationSettings } from '../types';
import { 
  toBengaliNumber, 
  formatBengaliCurrency,
  getBangladeshDateString,
  getCurrentWeekNumber
} from '../utils/bengali';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  initialMemberId?: string;
  initialWeekNumber?: number;
  settings: OrganizationSettings;
  onSaveDeposit: (data: {
    memberId: string;
    weekNumber: number;
    amount: number;
    date: string;
    method: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
    status?: 'paid' | 'due' | 'partial' | 'advance' | 'upcoming';
  }) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  members,
  initialMemberId,
  initialWeekNumber,
  settings,
  onSaveDeposit,
}) => {
  const [memberId, setMemberId] = useState<string>(initialMemberId || members[0]?.id || '');
  const [weekNumber, setWeekNumber] = useState<number>(() => initialWeekNumber || settings.currentWeek || getCurrentWeekNumber());
  const [amount, setAmount] = useState<number>(settings.weeklyTarget);
  const [date, setDate] = useState<string>(() => getBangladeshDateString());
  const [method, setMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash');
  const [depositStatus, setDepositStatus] = useState<'auto' | 'paid' | 'partial' | 'due' | 'advance'>('auto');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialMemberId) setMemberId(initialMemberId);
    if (initialWeekNumber) {
      setWeekNumber(initialWeekNumber);
    } else {
      setWeekNumber(settings.currentWeek || getCurrentWeekNumber());
    }
    setDate(getBangladeshDateString());
    setAmount(settings.weeklyTarget);
    setDepositStatus('auto');
  }, [initialMemberId, initialWeekNumber, settings.currentWeek, settings.weeklyTarget, isOpen]);

  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.id === memberId);
  const currentWeekRecord = selectedMember?.weeklyRecords.find((r) => r.weekNumber === weekNumber);
  const currentPaid = currentWeekRecord?.paidAmount || 0;
  const target = currentWeekRecord?.targetAmount || settings.weeklyTarget;
  const currentDue = Math.max(0, target - currentPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;

    onSaveDeposit({
      memberId,
      weekNumber,
      amount: Number(amount),
      date,
      method,
      notes,
      status: depositStatus === 'auto' ? undefined : depositStatus,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base">সাপ্তাহিক কিস্তি জমা নিন</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Member Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              সদস্য নির্বাচন করুন:
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  #{toBengaliNumber(m.serialNumber)} - {m.name} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          {/* Week Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                সপ্তাহ নির্বাচন:
              </label>
              <select
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    সপ্তাহ {toBengaliNumber(w)} {w === settings.currentWeek ? '(চলতি)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                জমার তারিখ:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  if (newDate && !initialWeekNumber) {
                    setWeekNumber(getCurrentWeekNumber(newDate));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          {/* Current Status Preview */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[11px] block">এই সপ্তাহের ধার্য:</span>
              <span className="font-bold text-slate-900">{formatBengaliCurrency(target)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[11px] block">পূর্বে জমা:</span>
              <span className="font-semibold text-emerald-700">{formatBengaliCurrency(currentPaid)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[11px] block">বর্তমান বকেয়া:</span>
              <span className={`font-bold ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatBengaliCurrency(currentDue)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              জমার পরিমাণ (টাকা):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="যেমন: 200"
                required
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setAmount(settings.weeklyTarget)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
              >
                {formatBengaliCurrency(settings.weeklyTarget)} (পূর্ণ)
              </button>
              {currentDue > 0 && currentDue !== settings.weeklyTarget && (
                <button
                  type="button"
                  onClick={() => setAmount(currentDue)}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium"
                >
                  {formatBengaliCurrency(currentDue)} (বাকি)
                </button>
              )}
              <button
                type="button"
                onClick={() => setAmount(settings.weeklyTarget * 2)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
              >
                {formatBengaliCurrency(settings.weeklyTarget * 2)} (২ সপ্তাহ)
              </button>
            </div>
          </div>

          {/* Deposit Status (জমার স্ট্যাটাস) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              জমার স্ট্যাটাস (Deposit Status):
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'auto', label: 'স্বয়ংক্রিয়', color: 'border-slate-300 text-slate-700' },
                { id: 'paid', label: 'পরিশোধিত', color: 'border-emerald-300 text-emerald-800' },
                { id: 'due', label: 'বকেয়া', color: 'border-rose-300 text-rose-800' },
                { id: 'advance', label: 'অগ্রিম', color: 'border-sky-300 text-sky-800' },
                { id: 'partial', label: 'আংশিক', color: 'border-amber-300 text-amber-800' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setDepositStatus(st.id as any)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ${
                    depositStatus === st.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : `bg-slate-50 hover:bg-slate-100 ${st.color}`
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              পরিশোধ মাধ্যম:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { id: 'cash', label: 'নগদ ক্যাশ' },
                { id: 'bkash', label: 'বিকাশ' },
                { id: 'nagad', label: 'নগদ' },
                { id: 'bank', label: 'ব্যাংক' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as any)}
                  className={`py-1.5 rounded-lg font-medium border text-[11px] transition-all ${
                    method === m.id
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মন্তব্য / রসিদ নোট (ঐচ্ছিক):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: সরাসরি হাতে জমা দেয়া হয়েছে"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="w-2/3 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>জমা সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
