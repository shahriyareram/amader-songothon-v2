import React from 'react';
import { Home, Users, BarChart3, Settings, Recycle } from 'lucide-react';
import { ActiveTab } from '../../types';

export interface AdminNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dueMembersCount?: number;
}

/**
 * AdminNavigation
 * Dedicated bottom navigation bar for the Admin Panel.
 * Changing layout, colors, labels, icons, or badges here
 * will NEVER affect the Member Panel.
 */
export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  activeTab,
  onTabChange,
  dueMembersCount = 0,
}) => {
  const navItems = [
    {
      id: 'home' as ActiveTab,
      label: 'হোম',
      icon: Home,
    },
    {
      id: 'members' as ActiveTab,
      label: 'সদস্য তালিকা',
      icon: Users,
    },
    {
      id: 'sets' as ActiveTab,
      label: '♻️ রিসেট',
      icon: Recycle,
    },
    {
      id: 'report' as ActiveTab,
      label: 'রিপোর্ট',
      icon: BarChart3,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'সেটিংস',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="admin-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#d6e8f6] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'settings' && (activeTab === 'more' || activeTab === 'history'));

          return (
            <button
              key={item.id}
              id={`admin-nav-btn-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 relative transition-all duration-150 active:scale-95 cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : ''
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-105 stroke-[2.4]' : 'stroke-[1.9]'
                    }`}
                  />
                </div>
              </div>

              <span
                className={`text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full px-0.5 tracking-tight ${
                  isActive ? 'font-bold text-emerald-800' : 'font-medium text-slate-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
