import React from 'react';
import { Home, Users, BarChart3, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dueMembersCount?: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#d6e8f6] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'settings' && (activeTab === 'more' || activeTab === 'history'));

          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 relative transition-all duration-150 active:scale-95 cursor-pointer ${
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

