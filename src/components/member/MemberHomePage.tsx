import React from 'react';
import { Member, OrganizationSettings, ActiveTab } from '../../types';
import { MemberProfilePage } from './MemberProfilePage';

export interface MemberHomePageProps {
  member: Member;
  settings: OrganizationSettings;
  allMembers?: Member[];
  onNavigateTab?: (tab: ActiveTab) => void;
  onRecordDeposit: (memberId: string, weekNumber?: number) => void;
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
 * MemberHomePage
 * Dedicated Member Home Screen.
 * Displays logged-in member's personal profile, 3 summary cards, and 52-week deposit record.
 */
export const MemberHomePage: React.FC<MemberHomePageProps> = ({
  member,
  settings,
  allMembers,
  onNavigateTab,
  onRecordDeposit,
  onUpdateMemberAvatar,
  onUpdateWeeklyDeposit,
}) => {
  return (
    <div id="member-home-page" className="space-y-4 pb-20">
      <MemberProfilePage
        member={member}
        settings={settings}
        isAdmin={false}
        allMembers={allMembers}
        currentUserMemberId={member.id}
        onBack={() => onNavigateTab && onNavigateTab('members')}
        onRecordDeposit={onRecordDeposit}
        onUpdateMemberAvatar={onUpdateMemberAvatar}
        onUpdateWeeklyDeposit={onUpdateWeeklyDeposit}
      />
    </div>
  );
};
