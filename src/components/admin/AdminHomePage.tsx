import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Member, OrganizationSettings, ActiveTab } from '../../types';
import { AdminHomeOverview } from './AdminHomeOverview';
import { AdminFridayNotificationPage } from './AdminFridayNotificationPage';

export interface AdminHomePageProps {
  adminMember?: Member;
  allMembers: Member[];
  settings: OrganizationSettings;
  onNavigateTab: (tab: ActiveTab) => void;
  onRecordDeposit: (memberId?: string, weekNumber?: number) => void;
  onEditMember?: (member: Member) => void;
  onUpdateMemberAvatar?: (memberId: string, photoUrl?: string) => void;
  onUpdateWeeklyDeposit?: (data: {
    memberId: string;
    weekNumber: number;
    amount: number;
    date?: string;
    status: 'paid' | 'due' | 'advance';
    method?: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
  }) => void;
}

/**
 * AdminHomePage
 * Dedicated Admin Home Screen.
 * Renders Administrative Overview, organization summary, quick actions,
 * and handles sub-navigation to Friday Notification page.
 */
export const AdminHomePage: React.FC<AdminHomePageProps> = ({
  adminMember,
  allMembers,
  settings,
  onNavigateTab,
  onRecordDeposit,
}) => {
  const [currentView, setCurrentView] = useState<'home' | 'friday-notification'>('home');

  if (currentView === 'friday-notification') {
    return (
      <AdminFridayNotificationPage
        onBack={() => setCurrentView('home')}
        members={allMembers}
        settings={settings}
      />
    );
  }

  return (
    <div id="admin-home-page" className="space-y-4 pb-20">
      {/* Administrative Overview & Quick Actions */}
      <AdminHomeOverview
        members={allMembers}
        settings={settings}
        onNavigateTab={onNavigateTab}
        onRecordDeposit={(mId, wNum) =>
          onRecordDeposit(mId || adminMember?.id, wNum || settings.currentWeek)
        }
        onNavigateFridayNotification={() => setCurrentView('friday-notification')}
      />

      {/* Organization Branding Banner - Mint-Green Gradient & Compact Android Mobile Layout */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-2xl p-3 sm:p-3.5 shadow-md border border-emerald-500/40 text-center space-y-1 relative overflow-hidden text-white">
        {/* Subtle decorative leaf & floral watermark (Left Corner) */}
        <div className="absolute -left-2 -bottom-2 text-white/10 pointer-events-none select-none" aria-hidden="true">
          <svg className="w-14 h-14 rotate-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 38C10 38 14 26 26 20C38 14 38 10 38 10C38 10 34 22 22 28C10 34 10 38 10 38Z" fill="currentColor" fillOpacity="0.3" />
            <path d="M16 32C20 28 26 26 32 24" strokeLinecap="round" />
            <circle cx="34" cy="14" r="2.5" fill="currentColor" fillOpacity="0.4" />
            <circle cx="28" cy="10" r="1.8" fill="currentColor" fillOpacity="0.3" />
          </svg>
        </div>

        {/* Subtle decorative leaf & floral watermark (Right Corner) */}
        <div className="absolute -right-2 -top-2 text-white/10 pointer-events-none select-none" aria-hidden="true">
          <svg className="w-14 h-14 -rotate-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M38 10C38 10 34 22 22 28C10 34 10 38 10 38C10 38 14 26 26 20C38 14 38 10 38 10Z" fill="currentColor" fillOpacity="0.3" />
            <path d="M32 16C28 20 22 22 16 24" strokeLinecap="round" />
            <circle cx="14" cy="34" r="2.5" fill="currentColor" fillOpacity="0.4" />
            <circle cx="20" cy="38" r="1.8" fill="currentColor" fillOpacity="0.3" />
          </svg>
        </div>

        {/* Title with inline brand badge icon */}
        <div className="flex items-center justify-center gap-1.5 relative z-10">
          <ShieldCheck className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
            আমাদের সংগঠন
          </h3>
        </div>

        {/* Main Slogan */}
        <p className="text-xs sm:text-sm font-semibold text-emerald-100 leading-tight relative z-10">
          একতায় শক্তি, সঞ্চয়ে সমৃদ্ধি
        </p>

        {/* Three Core Pillars */}
        <div className="pt-0.5 flex items-center justify-center gap-2 text-xs font-medium text-emerald-200/90 tracking-wide relative z-10">
          <span className="text-amber-300 font-semibold">ঐক্য</span>
          <span className="text-emerald-400 font-black">•</span>
          <span className="text-amber-300 font-semibold">সঞ্চয়</span>
          <span className="text-emerald-400 font-black">•</span>
          <span className="text-amber-300 font-semibold">সহযোগিতা</span>
        </div>
      </div>
    </div>
  );
};

