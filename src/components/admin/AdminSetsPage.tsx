import React, { useState, useMemo } from 'react';
import { ArrowLeft, Recycle, Users, ChevronRight, Edit3, Phone, Camera, KeyRound, Bell, BellOff, UserX, AlertTriangle } from 'lucide-react';
import { Member, OrganizationSettings } from '../../types';
import { toBengaliNumber, formatBengaliCurrency, getCalculatedDisplayMemberMap } from '../../utils/bengali';
import { deleteMemberFromFirestore, deleteTransactionsForMember } from '../../services/firebaseService';
import { AdminAvatar as MemberAvatar } from './AdminAvatar';
import { AdminAvatarUploadModal as AvatarUploadModal } from './AdminAvatarUploadModal';
import { AdminSplashScreenControl } from './AdminSplashScreenControl';
import { AdminPopupDialogControl } from './AdminPopupDialogControl';

export interface AdminSetsPageProps {
  members?: Member[];
  onEditMember?: (member: Member) => void;
  onUpdateMemberAvatar?: (memberId: string, photoUrl?: string) => void;
  onResetPassword?: (member: Member) => void;
  onToggleNotification?: (memberId: string, enabled: boolean) => void;
  onDeleteMember?: (memberId: string) => void;
  settings?: OrganizationSettings;
  onUpdateSettings?: (newSettings: Partial<OrganizationSettings>) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const AdminSetsPage: React.FC<AdminSetsPageProps> = ({
  members = [],
  onEditMember,
  onUpdateMemberAvatar,
  onResetPassword,
  onToggleNotification,
  onDeleteMember,
  settings,
  onUpdateSettings,
}) => {
  const [activeSubView, setActiveSubView] = useState<'none' | 'splash' | 'popup'>('none');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  }, [members]);

  const displayMap = useMemo(() => {
    return getCalculatedDisplayMemberMap(members);
  }, [members]);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  if (activeSubView === 'splash') {
    return (
      <AdminSplashScreenControl
        onBack={() => setActiveSubView('none')}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }

  if (activeSubView === 'popup') {
    return (
      <AdminPopupDialogControl
        onBack={() => setActiveSubView('none')}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }

  if (selectedMember) {
    const isAdminProfile =
      selectedMember.id === 'mem-1' ||
      selectedMember.serialNumber === 1 ||
      selectedMember.memberCode === 'সো-০১' ||
      selectedMember.memberCode === 'সো-01' ||
      selectedMember.phone === '01907006460' ||
      selectedMember.phone === '০১৯০৭০০৬৪৬০';

    return (
      <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-24 font-sans">
        <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Top Bar with Back Button */}
          <header className="bg-white rounded-3xl p-4 border border-[#d6e8f6] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                id="admin-sets-profile-back-btn"
                type="button"
                onClick={() => setSelectedMemberId(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  সদস্য প্রোফাইল
                </h1>
                <p className="text-xs text-slate-500 font-medium">প্রশাসনিক নিয়ন্ত্রণ ও সেটিংস</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
              সক্রিয় সদস্য
            </span>
          </header>

          {/* Member Profile Card (Avatar, ID, Name, Phone) */}
          <div className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs space-y-4">
            <div className="flex items-center gap-4">
              {/* Profile Photo: Square presentation */}
              <div className="w-20 h-20 min-w-20 min-h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 aspect-square flex items-center justify-center shadow-2xs">
                {selectedMember.photoUrl ? (
                  <img
                    src={selectedMember.photoUrl}
                    alt={selectedMember.name || 'Member'}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div
                    className={`w-full h-full ${
                      selectedMember.avatarColor || 'bg-emerald-700'
                    } flex items-center justify-center text-white font-black text-2xl`}
                  >
                    {selectedMember.name ? selectedMember.name.charAt(0) : 'স'}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <span className="inline-block font-mono text-xs font-bold bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded-lg border border-sky-100/90">
                    আইডি : {displayMap.get(selectedMember.id)?.displayMemberCode || selectedMember.memberCode || selectedMember.id}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug break-words">
                  {selectedMember.name}
                </h2>
                {selectedMember.phone ? (
                  <div>
                    <a
                      href={`tel:${selectedMember.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono">{selectedMember.phone}</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-400">মোবাইল নম্বর নেই</span>
                )}
              </div>
            </div>

            {/* Administrative Options Section */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
                প্রশাসনিক অপশন
              </h3>

              {/* 📷 ছবি পরিবর্তন Button */}
              <button
                id={`admin-sets-profile-change-photo-btn-${selectedMember.id}`}
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all font-bold text-sm cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">📷</span>
                  <span>ছবি পরিবর্তন</span>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-700" />
              </button>

              {/* ✏️ নাম ও মোবাইল পরিবর্তন Button */}
              <button
                id={`admin-sets-profile-edit-member-btn-${selectedMember.id}`}
                type="button"
                onClick={() => {
                  if (onEditMember) {
                    onEditMember(selectedMember);
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all font-bold text-sm cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">✏️</span>
                  <span>নাম ও মোবাইল পরিবর্তন</span>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-700" />
              </button>

              {/* 🔑 পাসওয়ার্ড রিসেট Button (শুধু সাধারণ সদস্যদের জন্য) */}
              {!isAdminProfile && onResetPassword && (
                <button
                  id={`admin-sets-profile-reset-pw-btn-${selectedMember.id}`}
                  type="button"
                  onClick={() => onResetPassword(selectedMember)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all font-bold text-sm cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">🔑</span>
                    <span>পাসওয়ার্ড রিসেট</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-700" />
                </button>
              )}

              {/* 🔔 পুশ নোটিফিকেশন স্ট্যাটাস Button */}
              {onToggleNotification && (
                <button
                  id={`admin-sets-profile-toggle-notif-btn-${selectedMember.id}`}
                  type="button"
                  onClick={() => {
                    const currentVal = selectedMember.notificationsEnabled !== false;
                    onToggleNotification(selectedMember.id, !currentVal);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all font-bold text-sm cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">🔔</span>
                    <span>পুশ নোটিফিকেশন স্ট্যাটাস</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        selectedMember.notificationsEnabled !== false
                          ? 'bg-emerald-200/90 text-emerald-950'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedMember.notificationsEnabled !== false ? 'চালু আছে' : 'বন্ধ আছে'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-emerald-700" />
                  </div>
                </button>
              )}

              {/* ❌ সদস্য বাতিল করুন Button (শুধু সাধারণ সদস্যদের জন্য) */}
              {!isAdminProfile && (
                <button
                  id={`admin-sets-profile-cancel-member-btn-${selectedMember.id}`}
                  type="button"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all font-bold text-sm cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">❌</span>
                    <span>সদস্য বাতিল করুন</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rose-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* সদস্য বাতিল Confirmation Dialog */}
        {isCancelDialogOpen && !isAdminProfile && (() => {
          // Authoritative refundable calculation from member's actual paid records
          // Only actual paid records (status === 'paid' or 'advance', or positive paidAmount with paymentDate)
          // Unpaid/due/upcoming placeholder records are excluded
          // If advance was paid, it's counted once from the paid record
          const refundableDeposit = (selectedMember.weeklyRecords || []).reduce((sum, r) => {
            if (!r) return sum;
            const isPaid = (r.status === 'paid' || r.status === 'advance' || (Number(r.paidAmount) > 0 && Boolean(r.paymentDate)));
            if (!isPaid) return sum;
            const actualPaid = typeof r.paidAmount === 'number' ? (r.paidAmount === 200 ? 100 : r.paidAmount) : 0;
            return sum + actualPaid;
          }, 0);

          return (
            <div
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-member-dialog-title"
            >
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 text-center space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 id="cancel-member-dialog-title" className="text-lg font-black text-slate-900">
                    সদস্য বাতিল
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    সদস্যপদ বাতিলের পূর্ববর্তী যাচাইকরণ
                  </p>
                </div>

                {/* Member Info Card */}
                <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/80 space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold">সদস্যের নাম:</span>
                    <span className="text-slate-900 font-black">{selectedMember.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500 font-bold">আইডি:</span>
                    <span className="text-slate-900 font-black font-mono">
                      {displayMap.get(selectedMember.id)?.displayMemberCode || selectedMember.memberCode || `সো-${toBengaliNumber(selectedMember.serialNumber)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2">
                    <span className="text-emerald-700 font-black">ফেরতযোগ্য জমা:</span>
                    <span className="text-emerald-700 font-black text-base">
                      {formatBengaliCurrency(refundableDeposit)}
                    </span>
                  </div>
                </div>

                {/* Warning Text */}
                <div className="bg-rose-50/80 rounded-2xl p-3 border border-rose-200/70 text-left">
                  <p className="text-xs text-rose-800 leading-relaxed font-semibold">
                    ⚠️ সদস্য বাতিল করলে তার সদস্যপদ ও সংশ্লিষ্ট তথ্য স্থায়ীভাবে মুছে যাবে এবং তার জমাকৃত টাকা মোট তহবিল থেকে বাদ যাবে।
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCancelDialogOpen(false)}
                    className="w-full py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    ফিরে যান
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isAdminProfile && selectedMember?.id) {
                        const targetId = selectedMember.id;
                        try {
                          await deleteMemberFromFirestore(targetId);
                          await deleteTransactionsForMember(targetId);

                          // Update primary localStorage cache immediately
                          try {
                            const storageKey = 'amader_shongothon_members_v2';
                            const raw = localStorage.getItem(storageKey);
                            if (raw) {
                              const list = JSON.parse(raw);
                              if (Array.isArray(list)) {
                                const filtered = list.filter((m: any) => m?.id !== targetId);
                                localStorage.setItem(storageKey, JSON.stringify(filtered));
                              }
                            }
                          } catch (e) {
                            console.error('Failed to update members cache in localStorage', e);
                          }
                        } catch (err) {
                          console.error('Failed to delete member or transactions:', err);
                        }

                        // Update global/parent React state immediately if handler passed
                        if (onDeleteMember) {
                          onDeleteMember(targetId);
                        }
                      }
                      setIsCancelDialogOpen(false);
                      setSelectedMemberId(null);
                    }}
                    className="w-full py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    সদস্য বাতিল নিশ্চিত করুন
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Avatar Upload & Generation Modal */}
        <AvatarUploadModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          memberName={selectedMember.name}
          currentPhotoUrl={selectedMember.photoUrl}
          avatarColor={selectedMember.avatarColor}
          serialNumber={selectedMember.serialNumber}
          onSaveAvatar={(newPhotoUrl) => {
            if (onUpdateMemberAvatar) {
              onUpdateMemberAvatar(selectedMember.id, newPhotoUrl);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-24 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Header: ♻️ রিসেট */}
        <header className="bg-white rounded-3xl px-5 py-3.5 border border-[#d6e8f6] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  রিসেট
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-600">
                সিস্টেম ও কনফিগারেশন সেটিংস
              </p>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Recycle className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
          </div>
        </header>

        {/* 2 Equal-Sized Side-by-Side Cards / Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. 🖼️ Splash Screen Control */}
          <button
            id="splash-screen-control-card"
            type="button"
            onClick={() => setActiveSubView('splash')}
            className="w-full h-24 bg-white hover:bg-slate-50/80 active:scale-[0.98] rounded-3xl px-3 py-2.5 border border-[#d6e8f6] shadow-xs hover:border-indigo-200 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1 border border-indigo-100/80 group-hover:scale-105 transition-transform text-lg">
              🖼️
            </div>
            <span className="text-xs font-black text-slate-800 leading-tight">
              Splash Screen Control
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              ক্লিক করে খুলুন
            </span>
          </button>

          {/* 2. 💬 Popup Dialog Control */}
          <button
            id="popup-dialog-control-card"
            type="button"
            onClick={() => setActiveSubView('popup')}
            className="w-full h-24 bg-white hover:bg-slate-50/80 active:scale-[0.98] rounded-3xl px-3 py-2.5 border border-[#d6e8f6] shadow-xs hover:border-amber-200 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1 border border-amber-100/80 group-hover:scale-105 transition-transform text-lg">
              💬
            </div>
            <span className="text-xs font-black text-slate-800 leading-tight">
              Popup Dialog Control
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              ক্লিক করে খুলুন
            </span>
          </button>
        </div>

        {/* সদস্য নির্বাচন করুন Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                সদস্য নির্বাচন করুন
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-[#d6e8f6] shadow-2xs">
              মোট: {toBengaliNumber(sortedMembers.length)} জন
            </span>
          </div>

          {/* Member List Cards */}
          {sortedMembers.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-[#d6e8f6] shadow-xs text-center space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">কোনো সদস্য পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedMembers.map((member) => {
                return (
                  <div
                    key={member.id}
                    id={`admin-sets-member-${member.id}`}
                    onClick={() => setSelectedMemberId(member.id)}
                    className="w-full bg-white rounded-2xl p-3 border border-[#d6e8f6] hover:border-slate-300 hover:bg-slate-50/50 transition-all flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Profile Photo: Square, NOT circular, equal width & height, object-fit: cover */}
                      <div className="w-12 h-12 min-w-12 min-h-12 max-w-12 max-h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/90 shrink-0 aspect-square flex items-center justify-center shadow-2xs">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name || 'Member'}
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`w-full h-full ${
                              member.avatarColor || 'bg-emerald-700'
                            } flex items-center justify-center text-white font-black text-sm`}
                          >
                            {member.name ? member.name.charAt(0) : 'স'}
                          </div>
                        )}
                      </div>

                      {/* Member Details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {member.name}
                        </h3>

                        {/* Mobile Number */}
                        <p className="text-xs font-semibold text-slate-600 font-mono truncate">
                          {member.phone || 'মোবাইল নম্বর নেই'}
                        </p>

                        {/* Member ID/Code */}
                        <p className="text-[11px] font-bold text-slate-500">
                          ID: <span className="font-mono text-slate-700">{displayMap.get(member.id)?.displayMemberCode || member.memberCode || member.id}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Side > Arrow */}
                    <div className="shrink-0 pl-1">
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
