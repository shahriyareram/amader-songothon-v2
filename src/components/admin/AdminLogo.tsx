import React from 'react';

export interface AdminLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * AdminLogo
 * Dedicated branding and logo component for the Admin Panel.
 * Changing its styling, SVG, dimensions, or iconography
 * will NEVER alter the Member Panel logo.
 */
export const AdminLogo: React.FC<AdminLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-xl',
    md: 'w-9 h-9 text-base rounded-2xl',
    lg: 'w-12 h-12 text-xl rounded-3xl',
  }[size];

  return (
    <div
      id="admin-header-logo"
      className={`${sizeClasses} bg-white/10 flex items-center justify-center border border-white/15 text-emerald-200 font-bold shadow-inner select-none ${className}`}
      aria-label="Admin Organization Logo"
    >
      আ
    </div>
  );
};
