import React from 'react';
import { ActiveTab } from '../../types';
import { MemberHeader } from './MemberHeader';
import { MemberNavigation } from './MemberNavigation';

export interface MemberRootLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentWeek: number;
  dueMembersCount: number;
  onAdminClick: () => void;
  children: React.ReactNode;
}

/**
 * MemberRootLayout
 * The isolated visual root and layout shell for the Member Panel.
 * All Member styling, background colors, containers, headers, and navigation
 * are encapsulated here, completely separated from the Admin UI system.
 */
export const MemberRootLayout: React.FC<MemberRootLayoutProps> = ({
  activeTab,
  onTabChange,
  currentWeek,
  dueMembersCount,
  onAdminClick,
  children,
}) => {
  const showTopHeader =
    activeTab !== 'home' &&
    activeTab !== 'members' &&
    activeTab !== 'report' &&
    activeTab !== 'settings' &&
    activeTab !== 'deposit' &&
    activeTab !== 'due';

  return (
    <div
      id="member-app-root"
      className="member-panel-root min-h-screen bg-[#eaf4fc] text-slate-900 flex flex-col font-sans"
    >
      {/* Member Dedicated Top Header */}
      {showTopHeader && (
        <MemberHeader
          currentWeek={currentWeek}
          onAdminClick={onAdminClick}
        />
      )}

      {/* Member Dedicated Main Content Container */}
      <main id="member-main-content" className="flex-1 w-full max-w-lg mx-auto">
        {children}
      </main>

      {/* Member Dedicated Bottom Navigation */}
      <MemberNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        dueMembersCount={dueMembersCount}
      />
    </div>
  );
};
