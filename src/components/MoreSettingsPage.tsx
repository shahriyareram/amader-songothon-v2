import React, { useState } from 'react';
import {
  Settings,
  History,
  ShieldCheck,
  Download,
  RotateCcw,
  KeyRound,
  Building,
  Calendar,
  Wallet,
  ChevronRight,
  Check,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { OrganizationSettings, ActiveTab } from '../types';
import { toBengaliNumber, formatBengaliCurrency, getCurrentWeekNumber } from '../utils/bengali';

interface MoreSettingsPageProps {
  settings: OrganizationSettings;
  isAdmin: boolean;
  onUpdateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  onResetData: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onAdminToggle: () => void;
  onExportData?: () => void;
}

export const MoreSettingsPage: React.FC<MoreSettingsPageProps> = ({
  settings,
  isAdmin,
  onUpdateSettings,
  onResetData,
  onNavigateTab,
  onAdminToggle,
  onExportData,
}) => {
  const [editingTarget, setEditingTarget] = useState(false);
  const [weeklyTargetInput, setWeeklyTargetInput] = useState(settings.weeklyTarget.toString());

  const [editingWeek, setEditingWeek] = useState(false);
  const [currentWeekInput, setCurrentWeekInput] = useState(settings.currentWeek.toString());

  const [editingPin, setEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Save weekly target
  const handleSaveTarget = () => {
    const val = Number(weeklyTargetInput);
    if (val > 0) {
      onUpdateSettings({ weeklyTarget: val });
      setEditingTarget(false);
    }
  };

  // Save current week
  const handleSaveWeek = () => {
    const val = Number(currentWeekInput);
    if (val >= 1 && val <= 52) {
      onUpdateSettings({ currentWeek: val });
      setEditingWeek(false);
    }
  };

  // Save admin PIN
  const handleSavePin = () => {
    if (pinInput.trim().length >= 4) {
      onUpdateSettings({ adminPin: pinInput.trim() });
      setEditingPin(false);
      setPinInput('');
      setPinMessage('পিন সফলভাবে পরিবর্তিত হয়েছে');
      setTimeout(() => setPinMessage(''), 3000);
    }
  };

  // Export JSON backup
  const handleExportData = () => {
    if (onExportData) {
      onExportData();
      return;
    }
    const backup = {
      timestamp: new Date().toISOString(),
      settings,
      members: localStorage.getItem('amader_songothon_members_v2')
        ? JSON.parse(localStorage.getItem('amader_songothon_members_v2')!)
        : [],
      transactions: localStorage.getItem('amader_songothon_transactions_v2')
        ? JSON.parse(localStorage.getItem('amader_songothon_transactions_v2')!)
        : [],
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `amader_songothon_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="pb-28 pt-2 px-3.5 max-w-md mx-auto space-y-4 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase bg-white/15 px-2 py-0.5 rounded-full border border-white/10">
              অ্যাডমিন ও ব্যবস্থাপনা
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">
              আরও ফিচার ও সেটিংস
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              ইতিহাস, ব্যাকআপ ও সমিতির কনফিগারেশন
            </p>
          </div>
        </div>
      </div>

      {pinMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{pinMessage}</span>
        </div>
      )}

      {/* Main Navigation Options */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-xs space-y-1">
        {/* Deposit History */}
        <button
          type="button"
          onClick={() => onNavigateTab('history')}
          className="w-full p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">জমার ইতিহাস</span>
              <span className="text-[10px] text-slate-500">সকল জমার সম্পূর্ণ তালিকা ও রসিদ</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="h-px bg-slate-100 mx-3" />

        {/* Export / Backup */}
        <button
          type="button"
          onClick={handleExportData}
          className="w-full p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">ডেটা ব্যাকআপ (JSON)</span>
              <span className="text-[10px] text-slate-500">সকল মেম্বার ও হিসাবের অফলাইন ব্যাকআপ</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="h-px bg-slate-100 mx-3" />

        {/* Print Summary */}
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">রিপোর্ট প্রিন্ট / PDF সেভ</span>
              <span className="text-[10px] text-slate-500">সমিতির সার্বিক খতিয়ান প্রিন্ট করুন</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Organization Settings */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          সমিতির সেটিংস
        </h3>

        {/* Weekly Target */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">সাপ্তাহিক কিস্তির পরিমাণ</span>
              <span className="text-[11px] text-slate-500">
                বর্তমানে: {formatBengaliCurrency(settings.weeklyTarget)} / সপ্তাহ
              </span>
            </div>
            {!editingTarget ? (
              <button
                type="button"
                onClick={() => setEditingTarget(true)}
                className="text-xs text-emerald-700 font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                পরিবর্তন
              </button>
            ) : null}
          </div>

          {editingTarget && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                value={weeklyTargetInput}
                onChange={(e) => setWeeklyTargetInput(e.target.value)}
                className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
                placeholder="যেমন: ২০০"
              />
              <button
                type="button"
                onClick={handleSaveTarget}
                className="h-9 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800"
              >
                সেভ
              </button>
              <button
                type="button"
                onClick={() => setEditingTarget(false)}
                className="h-9 px-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
              >
                বাতিল
              </button>
            </div>
          )}
        </div>

        {/* Current Accounting Week */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">চলতি হিসাব সপ্তাহ</span>
              <span className="text-[11px] text-slate-500">
                বর্তমানে: সপ্তাহ {toBengaliNumber(settings.currentWeek)} / ৫২
              </span>
            </div>
            {!editingWeek ? (
              <button
                type="button"
                onClick={() => setEditingWeek(true)}
                className="text-xs text-emerald-700 font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                পরিবর্তন
              </button>
            ) : null}
          </div>

          {editingWeek && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={currentWeekInput}
                  onChange={(e) => setCurrentWeekInput(e.target.value)}
                  className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
                  placeholder="১ থেকে ৫২"
                />
                <button
                  type="button"
                  onClick={handleSaveWeek}
                  className="h-9 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800"
                >
                  সেভ
                </button>
                <button
                  type="button"
                  onClick={() => setEditingWeek(false)}
                  className="h-9 px-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
                >
                  বাতিল
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const autoWeek = getCurrentWeekNumber();
                  setCurrentWeekInput(autoWeek.toString());
                  onUpdateSettings({ currentWeek: autoWeek });
                  setEditingWeek(false);
                }}
                className="text-[11px] text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>স্বয়ংক্রিয় ক্যালেন্ডার হিসাব (বর্তমান তারিখ অনুযায়ী: সপ্তাহ {toBengaliNumber(getCurrentWeekNumber())})</span>
              </button>
            </div>
          )}
        </div>

        {/* Change Admin PIN */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">অ্যাডমিন পিন কোড</span>
              <span className="text-[11px] text-slate-500">বর্তমানে পিন সেট করা আছে</span>
            </div>
            {!editingPin ? (
              <button
                type="button"
                onClick={() => setEditingPin(true)}
                className="text-xs text-emerald-700 font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                নতুন পিন
              </button>
            ) : null}
          </div>

          {editingPin && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
                placeholder="ন্যূনতম ৪ সংখ্যার পিন"
              />
              <button
                type="button"
                onClick={handleSavePin}
                className="h-9 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800"
              >
                সেভ
              </button>
              <button
                type="button"
                onClick={() => setEditingPin(false)}
                className="h-9 px-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
              >
                বাতিল
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-xs space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">
          রিসেট জোন
        </h3>
        <p className="text-[11px] text-slate-500">
          সমিতির সকল তথ্য মুছে মূল ডেমো ২৫ জন সদস্যে ফিরে যেতে চাইলে রিসেট করুন।
        </p>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full h-10 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ডিফল্ট ডেটায় রিসেট করুন</span>
          </button>
        ) : (
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-2">
            <p className="text-xs font-bold text-rose-800">
              আপনি কি নিশ্চিত? সংরক্ষিত সকল ডেটা মুছে যাবে!
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
              >
                হ্যাঁ, রিসেট করুন
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="h-9 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                বাতিল
              </button>
            </div>
          </div>
        )}
      </div>

      {/* App Info Footer */}
      <div className="text-center text-xs text-slate-400 pt-2">
        <p className="font-bold text-slate-600">আমাদের সংগঠন • v2.0</p>
        <p className="text-[10px] mt-0.5">৫০+ সদস্য ও ৫২ সপ্তাহের সঞ্চয় ট্র্যাকার</p>
      </div>
    </div>
  );
};
