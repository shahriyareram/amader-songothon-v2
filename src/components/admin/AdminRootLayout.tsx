import React from 'react';
import { ActiveTab } from '../../types';
import { AdminHeader } from './AdminHeader';
import { AdminNavigation } from './AdminNavigation';

export interface AdminRootLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentWeek: number;
  dueMembersCount: number;
  onAdminClick: () => void;
  children: React.ReactNode;
}

/**
 * AdminRootLayout
 * The isolated visual root and layout shell for the Admin Panel.
 * All Admin styling, background colors, containers, headers, and navigation
 * are encapsulated here, completely separated from the Member UI system.
 */
export const AdminRootLayout: React.FC<AdminRootLayoutProps> = ({
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
    activeTab !== 'due' &&
    activeTab !== 'sets';

  return (
    <div
      id="admin-app-root"
      className="admin-panel-root min-h-screen bg-[#eaf4fc] text-slate-900 flex flex-col font-sans"
    >
      {/* Admin Dedicated Top Header */}
      {showTopHeader && (
        <AdminHeader
          currentWeek={currentWeek}
          onAdminClick={onAdminClick}
        />
      )}

      {/* Admin Dedicated Main Content Container */}
      <main id="admin-main-content" className="flex-1 w-full max-w-lg mx-auto">
        {children}
      </main>

      {/* Admin Dedicated Bottom Navigation */}
      <AdminNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        dueMembersCount={dueMembersCount}
      />
    </div>
  );
};
