import React, { useMemo } from 'react';
import { User, ArrowRight, ArrowLeft, Users, CheckCircle2 } from 'lucide-react';
import { Member } from '../types';
import { getCalculatedDisplayMemberMap, toBengaliNumber } from '../utils/bengali';

interface MemberProfileSelectionScreenProps {
  profiles: Member[];
  onSelectProfile: (profile: Member) => void;
  onBackToLogin: () => void;
  isLoggedIn?: boolean;
  currentMemberId?: string | null;
  allMembers?: Member[];
}

export const MemberProfileSelectionScreen: React.FC<MemberProfileSelectionScreenProps> = ({
  profiles,
  onSelectProfile,
  onBackToLogin,
  isLoggedIn = false,
  currentMemberId,
  allMembers,
}) => {
  // CRITICAL RULE: Filter out any admin profile so admin is never shown
  const memberOnlyProfiles = profiles.filter(
    (p) => p.id !== 'mem-1' && (p.Role || p.role) !== 'admin'
  );

  const phone = memberOnlyProfiles[0]?.phone || '';

  const displayMap = useMemo(() => {
    return getCalculatedDisplayMemberMap(allMembers && allMembers.length > 0 ? allMembers : profiles);
  }, [allMembers, profiles]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 text-white shadow-md mx-auto mb-1">
            <Users className="w-9 h-9 text-white stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            সদস্য প্রোফাইল নির্বাচন
          </h1>
          <p className="text-sm font-medium text-slate-600 leading-relaxed px-2">
            এই মোবাইল নম্বরের অধীনে একাধিক সদস্য প্রোফাইল পাওয়া গেছে। আপনি যে প্রোফাইলে প্রবেশ করতে চান তা নির্বাচন করুন:
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 border border-emerald-200/90 rounded-full text-xs font-bold text-emerald-800">
            {phone && <span>মোবাইল: {phone}</span>}
            {phone && <span>•</span>}
            <span className="text-emerald-700 font-extrabold">মোট {memberOnlyProfiles.length} টি প্রোফাইল</span>
          </div>
        </div>

        {/* Member Profile Cards List */}
        <div className="space-y-3">
          {memberOnlyProfiles.map((profile) => {
            const displayInfo = displayMap.get(profile.id);
            const memberCode = displayInfo?.displayMemberCode || profile.memberCode || `সো-${profile.serialNumber || '০১'}`;
            const displaySerial = displayInfo?.displayIndex || profile.serialNumber;
            const status = (profile.status || profile.Status || 'active').toLowerCase();
            const isActive = status === 'active' || status === 'সক্রিয়';

            return (
              <button
                key={profile.id}
                id={`select-profile-${profile.id}`}
                type="button"
                onClick={() => onSelectProfile(profile)}
                className="w-full text-left p-4 sm:p-5 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-500/80 rounded-2xl shadow-xs hover:shadow-md transition-all group cursor-pointer focus:outline-none focus:ring-3 focus:ring-emerald-500/30"
              >
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                      {profile.photoUrl ? (
                        <img
                          src={profile.photoUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 stroke-[2.2] text-emerald-700" />
                      )}
                    </div>

                    {/* Member Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-800 transition-colors truncate">
                          {profile.name}
                        </h3>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            সক্রিয়
                          </span>
                        )}
                        {currentMemberId && profile.id === currentMemberId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                            বর্তমান প্রোফাইল
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                        <span className="font-semibold text-slate-700">সদস্য কোড: {memberCode}</span>
                        {displaySerial && (
                          <>
                            <span>•</span>
                            <span>ক্রমিক: {toBengaliNumber(displaySerial)}</span>
                          </>
                        )}
                      </div>

                      {profile.joinedDate && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          যোগদানের তারিখ: {profile.joinedDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Arrow */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-all">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="pt-2 text-center">
          <button
            id="back-to-login-from-profiles-btn"
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isLoggedIn ? 'সদস্য প্যানেলে ফিরে যান' : 'লগইন স্ক্রিনে ফিরে যান'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
