import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Check,
  Trash2,
  Camera,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { PRESET_AVATARS, generateRandomAvatar, compressAndResizeImage } from '../../utils/avatarUtils';
import { AdminAvatar } from './AdminAvatar';

export interface AdminAvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  currentPhotoUrl?: string;
  avatarColor?: string;
  serialNumber?: number;
  onSaveAvatar: (newPhotoUrl?: string) => void;
}

/**
 * AdminAvatarUploadModal
 * Dedicated avatar management modal for the Admin Panel.
 * Uses AdminAvatar and isolated admin modal styling.
 */
export const AdminAvatarUploadModal: React.FC<AdminAvatarUploadModalProps> = ({
  isOpen,
  onClose,
  memberName,
  currentPhotoUrl,
  avatarColor,
  serialNumber,
  onSaveAvatar,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | undefined>(currentPhotoUrl);
  const [activeTab, setActiveTab] = useState<'upload' | 'preset'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadError(null);
    try {
      const base64 = await compressAndResizeImage(file, 240);
      setSelectedPhoto(base64);
    } catch (err: any) {
      setUploadError(err.message || 'ছবি প্রসেস করা সম্ভব হয়নি');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Generate a random avatar
  const handleRandomGenerate = () => {
    const newAvatar = generateRandomAvatar(`${memberName}-${Date.now()}`);
    setSelectedPhoto(newAvatar);
  };

  // Select preset avatar
  const handleSelectPreset = (url: string) => {
    setSelectedPhoto(url);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setSelectedPhoto(undefined);
  };

  // Save changes
  const handleSave = () => {
    onSaveAvatar(selectedPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="admin-avatar-upload-modal"
        className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <Camera className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                প্রোফাইল ছবি নির্ধারণ (Admin)
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[190px]">
                {memberName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="relative">
            <AdminAvatar
              member={{
                name: memberName,
                serialNumber,
                avatarColor,
                photoUrl: selectedPhoto,
              }}
              size="2xl"
            />
            {selectedPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                title="ছবি মুছে ফেলুন"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs font-bold text-slate-600">
            {selectedPhoto ? 'বর্তমান ছবি প্রিভিউ' : 'ডিফল্ট অবতার'}
          </span>
        </div>

        {/* Tabs: Upload File vs Select/Generate */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span>ছবি আপলোড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preset'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>অ্যাভাটার জেনারেট</span>
          </button>
        </div>

        {/* Tab Content 1: Upload from device */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 p-4 rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-white text-emerald-700 flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  ডিভাইস থেকে ছবি নির্বাচন করুন
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ক্যামেরা বা গ্যালারি (JPG, PNG) • স্বয়ংক্রিয় ক্রপ হবে
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Preset / Random Generate */}
        {activeTab === 'preset' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRandomGenerate}
              className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-emerald-700" />
              <span>নতুন র‍্যান্ডম অবতার তৈরি করুন</span>
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                বা নিচের যেকোনো অবতার বেছে নিন:
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = selectedPhoto === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`relative rounded-xl p-1 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/40'
                          : 'border-slate-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-10 object-cover rounded-lg"
                      />
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            id="admin-btn-save-avatar"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>সংরক্ষণ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
