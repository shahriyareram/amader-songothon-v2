import React from 'react';

export interface AdminDashboardCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * AdminDashboardCard
 * Independent container card for the Admin Panel.
 * Any styling changes to admin cards (border-radius, shadow, borders, padding)
 * will ONLY affect the Admin Panel.
 */
export const AdminDashboardCard: React.FC<AdminDashboardCardProps> = ({
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
