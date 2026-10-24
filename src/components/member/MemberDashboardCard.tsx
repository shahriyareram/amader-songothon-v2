import React from 'react';

export interface MemberDashboardCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * MemberDashboardCard
 * Independent container card for the Member Panel.
 * Any styling changes to member cards will ONLY affect the Member Panel.
 */
export const MemberDashboardCard: React.FC<MemberDashboardCardProps> = ({
  children,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`bg-white rounded-2xl sm:rounded-3xl border border-[#d6e8f6] shadow-xs ${className}`}
    >
      {children}
    </div>
  );
};
