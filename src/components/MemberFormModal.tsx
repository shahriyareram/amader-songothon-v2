import React, { useState, useEffect, useRef } from 'react';
import { X, Check, UserPlus, UserCheck, Trash2, Camera, Sparkles, Upload } from 'lucide-react';
import { Member } from '../types';
import { toBengaliNumber } from '../utils/bengali';
import { MemberAvatar } from './MemberAvatar';
import { generateRandomAvatar, compressAndResizeImage } from '../utils/avatarUtils';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  totalMembersCount: number;
  onSaveMember: (memberData: {
    id?: string;
    serialNumber: number;
    memberCode: string;
    name: string;
    phone: string;
    joinedDate: string;
    notes?: string;
    photoUrl?: string;
  }) => void;
  onDeleteMember?: (memberId: string) => void;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  totalMembersCount,
  onSaveMember,
  onDeleteMember,
}) => {
  const isEditing = Boolean(memberToEdit);

  const [name, setName] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [serialNumber, setSerialNumber] = useState<number>(totalMembersCount + 1);
  const [phone, setPhone] = useState('');
  const [joinedDate, setJoinedDate] = useState('২০২৪-০১-০১');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setMemberCode(memberToEdit.memberCode);
      setSerialNumber(memberToEdit.serialNumber);
      setPhone(memberToEdit.phone);
      setJoinedDate(memberToEdit.joinedDate);
      setNotes(memberToEdit.notes || '');
      setPhotoUrl(memberToEdit.photoUrl || undefined);
    } else {
      setName('');
      const nextNum = totalMembersCount + 1;
      setSerialNumber(nextNum);
      setMemberCode(`সো-${String(nextNum).padStart(2, '0')}`);
      setPhone('017');
      setJoinedDate('২০২৬-০১-০১');
      setNotes('সাধারণ সদস্য');
      setPhotoUrl(undefined);
    }
  }, [memberToEdit, totalMembersCount, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndResizeImage(file, 240);
      setPhotoUrl(base64);
    } catch (err) {
      console.error('Photo processing error', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateAvatar = () => {
    const random = generateRandomAvatar(`${name || 'member'}-${Date.now()}`);
    setPhotoUrl(random);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !memberCode.trim()) return;

    onSaveMember({
      id: memberToEdit?.id,
      serialNumber: Number(serialNumber),
      memberCode: memberCode.trim(),
      name: name.trim(),
      phone: phone.trim(),
      joinedDate,
      notes: notes.trim(),
      photoUrl,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <UserCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="font-bold text-base">
              {isEditing ? 'সদস্যের তথ্য সম্পাদনা' : 'নতুন সদস্য যোগ করুন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
          {/* Avatar Upload & Generation Section */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center gap-3.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <MemberAvatar
              member={{
                name,
                serialNumber: Number(serialNumber) || 1,
                avatarColor: memberToEdit?.avatarColor || 'bg-emerald-700',
                photoUrl,
              }}
              size="lg"
            />
            <div className="flex-1 space-y-1.5 min-w-0">
              <span className="block font-bold text-slate-800 text-xs">
                প্রোফাইল ছবি / অবতার
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>জেনারেট</span>
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(undefined)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="ছবি মুছুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              সদস্যের পুরো নাম:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: মোঃ কামরুল ইসলাম"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          {/* Member ID and Serial Number */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                সদস্য আইডি (Code):
              </label>
              <input
                type="text"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="যেমন: সো-০১"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                সিরিয়াল নম্বর:
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={serialNumber}
                onChange={(e) => setSerialNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মোবাইল নম্বর:
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          {/* Joining Date & Role */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                যোগদানের তারিখ:
              </label>
              <input
                type="text"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                placeholder="২০২৪-০১-০১"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পদবি / নোট:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="যেমন: সদস্য / কোষাধ্যক্ষ"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="w-2/3 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'তথ্য আপডেট করুন' : 'সদস্য সংরক্ষণ করুন'}</span>
              </button>
            </div>

            {/* Optional Delete (only in edit mode and if > 1 member) */}
            {isEditing && onDeleteMember && memberToEdit && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`আপনি কি নিশ্চিত যে সদস্য "${memberToEdit.name}" কে মুছে ফেলতে চান?`)) {
                    onDeleteMember(memberToEdit.id);
                    onClose();
                  }
                }}
                className="w-full py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>সদস্য অপসারণ করুন</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
