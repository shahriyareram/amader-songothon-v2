import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Settings, 
  LogOut, 
  RotateCcw, 
  Download, 
  Check, 
  Sliders
} from 'lucide-react';
import { OrganizationSettings } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils/bengali';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (pin: string) => boolean;
  onLogout: () => void;
  settings: OrganizationSettings;
  onUpdateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  onResetDefaultData: () => void;
  onExportData: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onLogout,
  settings,
  onUpdateSettings,
  onResetDefaultData,
  onExportData,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [currentWeek, setCurrentWeek] = useState(settings.currentWeek);
  const [settingsSaved, setSettingsSaved] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(pinInput);
    if (!success) {
      setPinError(true);
    } else {
      setPinError(false);
      setPinInput('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      weeklyTarget: Number(weeklyTarget),
      currentWeek: Number(currentWeek),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between text-white ${
          isAdmin ? 'bg-amber-600' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <ShieldCheck className="w-5 h-5 text-white" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400" />
            )}
            <h3 className="font-bold text-base">
              {isAdmin ? 'অ্যাডমিন ড্যাশবোর্ড ও সেটিংস' : 'অ্যাডমিন লগইন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {!isAdmin ? (
            /* PIN Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">
                  অ্যাডমিন পিন কোড প্রদান করুন
                </h4>
              </div>

              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="পিন কোড লিখুন..."
                  className="w-full text-center text-lg tracking-widest font-bold py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  required
                />
                {pinError && (
                  <p className="text-center text-rose-600 font-semibold text-[11px] mt-1.5">
                    ভুল পিন কোড! পুনরায় চেষ্টা করুন।
                  </p>
                )}
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 font-medium"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-xl font-bold shadow-xs transition-colors"
                >
                  লগইন করুন
                </button>
              </div>
            </form>
          ) : (
            /* Logged in Admin Control Panel */
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">স্ট্যাটাস</span>
                  <span className="text-xs font-bold text-amber-950">অ্যাডমিন হিসেবে সক্রিয় আছেন</span>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="flex items-center gap-1 bg-white text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>

              {/* Organization Settings Form */}
              <form onSubmit={handleSaveSettings} className="space-y-3 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                  <span>সংগঠনের হিসাব সেটিংস</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      সাপ্তাহিক কিস্তি (টাকা):
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="10"
                      value={weeklyTarget}
                      onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      চলতি সপ্তাহ নম্বর:
                    </label>
                    <select
                      value={currentWeek}
                      onChange={(e) => setCurrentWeek(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          সপ্তাহ {toBengaliNumber(w)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{settingsSaved ? 'সেটিংস সংরক্ষিত হয়েছে!' : 'সেটিংস আপডেট করুন'}</span>
                </button>
              </form>

              {/* Data Export / Reset */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">তথ্য ব্যবস্থাপনা</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ব্যাকআপ ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('আপনি কি পূর্বনির্ধারিত ২৫ জন সদস্যের ডিফল্ট তথ্যে ফিরে যেতে চান?')) {
                        onResetDefaultData();
                        onClose();
                      }
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-[11px] border border-rose-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ডিফল্ট রিসেট</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
