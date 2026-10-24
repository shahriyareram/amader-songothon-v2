import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ImageIcon,
  Clock,
  Upload,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Eye,
  Trash2,
  Sliders,
  MessageSquare,
  Check,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/bengali';
import { OrganizationSettings } from '../../types';
import {
  saveSettingsToFirestore,
  subscribeToSettings,
  savePopupImageToRtdb,
  removePopupImageFromRtdb,
  subscribeToPopupConfig,
} from '../../services/firebaseService';
import {
  DEFAULT_SAMPLE_POPUP,
  STORAGE_POPUP_IMAGE,
  STORAGE_POPUP_IMAGE_NAME,
} from '../PopupDialog';

export interface AdminPopupDialogControlProps {
  onBack: () => void;
  settings?: OrganizationSettings;
  onUpdateSettings?: (newSettings: Partial<OrganizationSettings>) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const AdminPopupDialogControl: React.FC<AdminPopupDialogControlProps> = ({ 
  onBack,
  settings,
  onUpdateSettings,
}) => {
  // 1. 🔘 পপআপ ডায়ালগ চালু/বন্ধ (Default: true)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (settings?.popupEnabled !== undefined) {
      return Boolean(settings.popupEnabled);
    }
    try {
      const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.popupEnabled !== undefined) {
          return Boolean(parsed.popupEnabled);
        }
      }
    } catch {}
    return true;
  });

  // 2. 🖼️ পপআপ ছবি (Loaded from local storage or default sample)
  const [popupImage, setPopupImage] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_POPUP_IMAGE);
      if (cached && cached.trim()) return cached;
    } catch {}
    return DEFAULT_SAMPLE_POPUP;
  });
  const [imageName, setImageName] = useState<string>(() => {
    try {
      const cachedName = localStorage.getItem(STORAGE_POPUP_IMAGE_NAME);
      if (cachedName && cachedName.trim()) return cachedName;
    } catch {}
    return 'ডিফল্ট সাংগঠনিক বিজ্ঞপ্তি ব্যানার';
  });
  const [isCustomImage, setIsCustomImage] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_POPUP_IMAGE));
    } catch {}
    return false;
  });

  // 3. ⏱️ দেখানোর সময় (১–১০ সেকেন্ড, Default: 5)
  const [duration, setDuration] = useState<number>(() => {
    if (settings?.popupDuration !== undefined) {
      const val = Number(settings.popupDuration);
      if (val >= 1 && val <= 10) return val;
    }
    try {
      const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.popupDuration !== undefined) {
          const val = Number(parsed.popupDuration);
          if (val >= 1 && val <= 10) return val;
        }
      }
    } catch {}
    return 5;
  });

  // Live preview interactive states
  const [isPreviewPopupOpen, setIsPreviewPopupOpen] = useState<boolean>(true);
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState<boolean>(false);
  const [fullscreenTimer, setFullscreenTimer] = useState<number>(5);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [previousSaved, setPreviousSaved] = useState<{ image: string; name: string; isCustom: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize remote popup image from Realtime Database (/popupConfig)
  useEffect(() => {
    const unsubscribe = subscribeToPopupConfig((config) => {
      // Do not overwrite user's unconfirmed local selection while they are previewing
      if (pendingImage) return;

      if (config && config.imageData && config.imageData.trim()) {
        setPopupImage(config.imageData);
        setImageName(config.imageName || 'কাস্টম সাংগঠনিক বিজ্ঞপ্তি ব্যানার');
        setIsCustomImage(true);
        try {
          localStorage.setItem(STORAGE_POPUP_IMAGE, config.imageData);
          if (config.imageName) {
            localStorage.setItem(STORAGE_POPUP_IMAGE_NAME, config.imageName);
          }
        } catch {}
      } else if (config === null) {
        // Only fall back to default if no local custom image exists in cache
        const localCached = localStorage.getItem(STORAGE_POPUP_IMAGE);
        if (!localCached) {
          setPopupImage(DEFAULT_SAMPLE_POPUP);
          setImageName('ডিফল্ট সাংগঠনিক বিজ্ঞপ্তি ব্যানার');
          setIsCustomImage(false);
        }
      }
    });

    return () => unsubscribe();
  }, [pendingImage]);

  // 1. Sync settings when props change from App.tsx or Firestore subscription
  useEffect(() => {
    if (settings) {
      if (settings.popupEnabled !== undefined) {
        setIsEnabled(Boolean(settings.popupEnabled));
      }
      if (settings.popupDuration !== undefined) {
        const val = Number(settings.popupDuration);
        if (val >= 1 && val <= 10) {
          setDuration(val);
        }
      }
    }
  }, [settings?.popupEnabled, settings?.popupDuration]);

  // 2. Direct Firestore realtime listener to read values from settings/organization on mount
  useEffect(() => {
    const unsubscribe = subscribeToSettings((remote) => {
      if (remote) {
        if (remote.popupEnabled !== undefined) {
          setIsEnabled(Boolean(remote.popupEnabled));
        }
        if (remote.popupDuration !== undefined) {
          const val = Number(remote.popupDuration);
          if (val >= 1 && val <= 10) {
            setDuration(val);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist popupEnabled changes to Firestore
  const handleToggleEnabled = async () => {
    const nextVal = !isEnabled;
    setIsEnabled(nextVal);
    if (nextVal) {
      setIsPreviewPopupOpen(true);
    }
    setIsSaving(true);

    const updatedPayload: Partial<OrganizationSettings> = {
      popupEnabled: nextVal,
    };

    try {
      if (onUpdateSettings) {
        await onUpdateSettings(updatedPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...updatedPayload,
        });
      }

      // Synchronously write to localStorage so page reload retains latest state immediately
      try {
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({
            ...parsed,
            popupEnabled: nextVal,
          })
        );
      } catch {}

      setSaveSuccessMessage(
        nextVal ? 'পপআপ ডায়ালগ চালু করা হয়েছে এবং সেভ হয়েছে' : 'পপআপ ডায়ালগ বন্ধ করা হয়েছে এবং সেভ হয়েছে'
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update popupEnabled in Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Persist popupDuration changes to Firestore
  const handleDurationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setDuration(val);
    setIsPreviewPopupOpen(true);
    setIsSaving(true);

    const updatedPayload: Partial<OrganizationSettings> = {
      popupDuration: val,
    };

    try {
      if (onUpdateSettings) {
        await onUpdateSettings(updatedPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...updatedPayload,
        });
      }

      // Synchronously write to localStorage so page reload retains latest state immediately
      try {
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({
            ...parsed,
            popupDuration: val,
          })
        );
      } catch {}

      setSaveSuccessMessage(
        `দেখানোর সময় ${toBengaliNumber(val)} সেকেন্ড সফলভাবে সংরক্ষিত হয়েছে`
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update popupDuration in Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const MAX_IMAGE_SIZE_BYTES = 300 * 1024; // 300 KB

  // Handle local image file picker: validate 300 KB limit, show local preview ONLY (no auto-save)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveErrorMessage('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (PNG, JPG, JPEG) নির্বাচন করুন।');
      setTimeout(() => setSaveErrorMessage(null), 4000);
      return;
    }

    // 1. Strict 300 KB validation
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      setSaveSuccessMessage(null);
      setSaveErrorMessage(
        `⚠️ ছবি আপলোড করা যাচ্ছে না\n\nনির্বাচিত ছবির সাইজ ৩০০ KB-এর বেশি।\nসর্বোচ্চ ৩০০ KB-এর ছবি আপলোড করা যাবে।\nআপনার নির্বাচিত ছবির সাইজ: ${toBengaliNumber(sizeKb)} KB\n\nঅনুগ্রহ করে ৩০০ KB বা তার কম সাইজের ছবি নির্বাচন করুন।`
      );
      setTimeout(() => setSaveErrorMessage(null), 8000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        // Keep previous saved image state in case admin clicks "বাতিল"
        if (!pendingImage) {
          setPreviousSaved({ image: popupImage, name: imageName, isCustom: isCustomImage });
        }
        setPendingImage({ dataUrl, fileName: file.name });
        setPopupImage(dataUrl);
        setImageName(file.name);
        setIsCustomImage(true);
        setIsPreviewPopupOpen(true);
        setSaveErrorMessage(null);
        setSaveSuccessMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Explicit confirmation: saves selected image to Cloud & localStorage
  const handleConfirmSave = async () => {
    if (!pendingImage) return;
    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      // 1. Save to cloud via existing secure function FIRST
      await savePopupImageToRtdb(pendingImage.dataUrl, pendingImage.fileName);

      // 2. Cache locally ONLY after confirmed cloud success
      try {
        localStorage.setItem(STORAGE_POPUP_IMAGE, pendingImage.dataUrl);
        localStorage.setItem(STORAGE_POPUP_IMAGE_NAME, pendingImage.fileName);
      } catch (e) {
        console.warn('Failed to cache popup image in localStorage:', e);
      }

      setSaveSuccessMessage('নতুন পপআপ ছবি সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে');
      setPendingImage(null);
      setPreviousSaved(null);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to save popup image to Cloud:', err);
      // Revert preview state to previously saved image on failure
      if (previousSaved) {
        setPopupImage(previousSaved.image);
        setImageName(previousSaved.name);
        setIsCustomImage(previousSaved.isCustom);
      }
      setSaveErrorMessage('ছবি ক্লাউডে সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err?.message || 'পুনরায় চেষ্টা করুন'));
      setTimeout(() => setSaveErrorMessage(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel pending selection: restores previously saved banner without cloud write
  const handleCancelPending = () => {
    if (previousSaved) {
      setPopupImage(previousSaved.image);
      setImageName(previousSaved.name);
      setIsCustomImage(previousSaved.isCustom);
    }
    setPendingImage(null);
    setPreviousSaved(null);
    setSaveErrorMessage(null);
  };

  // Revert back to default sample popup and remove from Cloud
  const handleResetDefault = async () => {
    setPendingImage(null);
    setPreviousSaved(null);
    setPopupImage(DEFAULT_SAMPLE_POPUP);
    setImageName('ডিফল্ট সাংগঠনিক বিজ্ঞপ্তি ব্যানার');
    setIsCustomImage(false);
    setIsPreviewPopupOpen(true);
    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      // 1. Remove from Cloud
      await removePopupImageFromRtdb();

      // 2. Clear local cache
      try {
        localStorage.removeItem(STORAGE_POPUP_IMAGE);
        localStorage.removeItem(STORAGE_POPUP_IMAGE_NAME);
      } catch {}

      setSaveSuccessMessage('পপআপ ছবি সফলভাবে মুছে ডিফল্ট স্যাম্পল ব্যানারে ফিরিয়ে নেওয়া হয়েছে');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to remove popup image from Cloud:', err);
      setSaveErrorMessage('ছবি মুছতে ব্যর্থ হয়েছে।');
      setTimeout(() => setSaveErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Fullscreen preview countdown logic
  useEffect(() => {
    if (!isFullscreenPreviewOpen) return;
    setFullscreenTimer(duration);

    const interval = setInterval(() => {
      setFullscreenTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFullscreenPreviewOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFullscreenPreviewOpen, duration]);

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-24 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <header className="bg-white rounded-3xl p-4 border border-[#d6e8f6] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="popup-back-btn"
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#007a55]" />
                <span>Popup Dialog Control</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                হোমস্ক্রিনের গুরুত্বপূর্ণ ব্যানার ও পপআপ বিজ্ঞপ্তি
              </p>
            </div>
          </div>
        </header>

        {/* Feedback Alert */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 px-4 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {saveErrorMessage && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 text-xs font-semibold flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line leading-relaxed text-slate-800 font-medium">
                {saveErrorMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveErrorMessage(null)}
              className="text-rose-600 hover:text-rose-950 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              title="বার্তাটি বন্ধ করুন"
              aria-label="বার্তাটি বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 1. 🔘 পপআপ ডায়ালগ চালু/বন্ধ                                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base">🔘</span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                পপআপ ডায়ালগ চালু/বন্ধ
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              সক্রিয় থাকলে সদস্য বা অ্যাডমিন লগইন করার পর হোমস্ক্রিনে এই পপআপটি দৃশ্যমান হবে
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isEnabled ? 'সক্রিয়' : 'বন্ধ'}
            </span>

            <button
              type="button"
              id="toggle-popup-enabled-btn"
              onClick={handleToggleEnabled}
              disabled={isSaving}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isEnabled ? 'bg-[#007a55]' : 'bg-slate-300'
              } ${isSaving ? 'opacity-80' : ''}`}
              role="switch"
              aria-checked={isEnabled}
              title={isEnabled ? 'পপআপ ডায়ালগ বন্ধ করুন' : 'পপআপ ডায়ালগ চালু করুন'}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 🖼️ পপআপ ছবি (Upload/Select UI)                            */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🖼️</span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                পপআপ ছবি
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {isCustomImage ? 'নির্বাচিত ছবি' : 'ডিফল্ট ব্যানার'}
            </span>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="bg-[#f0f9f5] border border-emerald-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-16 rounded-xl bg-emerald-950 border border-emerald-500/40 p-1 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={popupImage}
                    alt="Popup Thumbnail"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900 truncate">
                    {imageName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {pendingImage
                      ? 'অসংরক্ষিত প্রিভিউ (সংরক্ষণ আবশ্যক)'
                      : isCustomImage
                      ? 'ডিভাইস থেকে নির্বাচিত ছবি'
                      : 'স্যাম্পল সাংগঠনিক বিজ্ঞাপন ব্যানার'}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pendingImage
                      ? 'text-amber-800 bg-amber-100 border border-amber-300'
                      : 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                  }`}>
                    {pendingImage
                      ? 'নতুন ছবি নির্বাচিত • সংরক্ষণ করুন'
                      : isCustomImage
                      ? 'Realtime Database-এ সংরক্ষিত'
                      : 'সর্বোচ্চ ৩০০ KB (PNG/JPG/JPEG)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isCustomImage && !pendingImage && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200"
                    title="ডিফল্ট ব্যানারে ফিরে যান"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  id="select-popup-image-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-[#007a55] hover:bg-[#006848] text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isCustomImage || pendingImage ? 'ছবি পরিবর্তন' : 'ছবি নির্বাচন'}</span>
                </button>
              </div>
            </div>

            {/* Confirmation workflow: “বাতিল” and “সংরক্ষণ করুন” */}
            {pendingImage && (
              <div className="pt-2.5 border-t border-emerald-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>নতুন ছবি নির্বাচিত হয়েছে। আপনি কি এটি সংরক্ষণ করতে চান?</span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-[#007a55] hover:bg-[#006848] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ⏱️ দেখানোর সময় (১–১০ সেকেন্ড Dropdown)                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⏱️</span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                দেখানোর সময়
              </h2>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
              {toBengaliNumber(duration)} সেকেন্ড
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            পপআপ খোলার পর কত সেকেন্ড পর স্বয়ংক্রিয়ভাবে বন্ধ হবে তা নির্ধারণ করুন (১ থেকে ১০ সেকেন্ড):
          </p>

          <div className="relative">
            <select
              id="popup-duration-dropdown"
              value={duration}
              onChange={handleDurationChange}
              disabled={isSaving}
              className={`w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-[#007a55] focus:ring-2 focus:ring-[#007a55]/20 text-slate-900 text-sm font-bold rounded-2xl py-3 px-4 pr-10 transition-all cursor-pointer outline-hidden ${
                isSaving ? 'opacity-80' : ''
              }`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sec) => (
                <option key={sec} value={sec}>
                  ⏱️ {toBengaliNumber(sec)} সেকেন্ড {sec === 5 ? '(ডিফল্ট রেকমেন্ডেড)' : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <Clock className="w-4 h-4 text-[#007a55]" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. 📱 লাইভ প্রিভিউ (Live Preview Section)                      */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4.5 h-4.5 text-[#007a55] stroke-[2.2]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                লাইভ প্রিভিউ (Popup Dialog)
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              মোবাইল ভিউ
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            ব্যবহারকারী অ্যাপ ওপেন করলে বর্তমান ইন্টারফেসে পপআপটি যেভাবে প্রদর্শিত হবে:
          </p>

          {/* Mobile Screen Mockup Card */}
          <div className="relative w-full max-w-[280px] sm:max-w-[300px] mx-auto aspect-[9/16] bg-slate-100 rounded-[32px] shadow-2xl border-4 border-slate-800 flex flex-col justify-between overflow-hidden select-none">
            {/* Top Phone Camera Notch */}
            <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto -mt-1 flex items-center justify-center gap-1.5 z-20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-700/60" />
            </div>

            {/* Background App UI Mockup (Behind Popup) */}
            <div className="absolute inset-0 p-3 pt-6 flex flex-col gap-2.5 opacity-60 pointer-events-none">
              <div className="bg-emerald-700 text-white p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-80">আমাদের সংগঠন</div>
                  <div className="text-xs font-black">মোট জমা: ৳২৫,৪০০</div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center text-[10px]">
                  👤
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200">
                  <div className="text-[9px] text-slate-400">বর্তমান সপ্তাহ</div>
                  <div className="text-xs font-black text-slate-800">সপ্তাহ-১২</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200">
                  <div className="text-[9px] text-slate-400">সদস্য সংখ্যা</div>
                  <div className="text-xs font-black text-slate-800">৫২ জন</div>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 flex-1 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-700">সাম্প্রতিক কার্যক্রম</div>
                <div className="w-full h-2 bg-slate-100 rounded-full" />
                <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                <div className="w-1/2 h-2 bg-slate-100 rounded-full" />
              </div>
            </div>

            {/* Popup Dialog Backdrop & Container inside Mockup */}
            {isEnabled && isPreviewPopupOpen ? (
              <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] p-4 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                {/* Popup Dialog Box */}
                <div className="relative w-full max-w-[240px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                  {/* Floating Circular X Close Button (Top Right) */}
                  <button
                    type="button"
                    onClick={() => setIsPreviewPopupOpen(false)}
                    className="absolute top-2.5 right-2.5 z-40 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
                    title="পপআপ বন্ধ করুন"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Responsive Popup Image */}
                  <div className="w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                    <img
                      src={popupImage}
                      alt="Popup Dialog"
                      className="w-full h-auto max-h-[300px] object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
                <div className="bg-white/95 rounded-2xl p-4 text-center shadow-lg max-w-[200px] space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    {!isEnabled ? 'পপআপ বর্তমানে বন্ধ রয়েছে' : 'পপআপটি বন্ধ করা হয়েছে'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEnabled(true);
                      setIsPreviewPopupOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#007a55] text-white text-[11px] font-bold rounded-xl shadow-xs hover:bg-[#006848] transition-all cursor-pointer flex items-center gap-1 mx-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>পুনরায় দেখুন</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Status Bar in Mockup */}
            <div className="relative z-10 p-2.5 bg-slate-900/90 text-white flex items-center justify-between text-[10px] font-medium">
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{toBengaliNumber(duration)} সে. পর বন্ধ হবে</span>
              </span>
              <span className={`font-bold ${isEnabled ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isEnabled ? 'পপআপ চালু' : 'পপআপ বন্ধ'}
              </span>
            </div>
          </div>

          {/* Preview Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPreviewPopupOpen(!isPreviewPopupOpen)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isPreviewPopupOpen ? 'পপআপ লুকিয়ে রাখুন' : 'পপআপ রিলোড করুন'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreenPreviewOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-[#007a55] border border-emerald-200 rounded-2xl text-xs font-black transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ফুলস্ক্রিন প্রিভিউ</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Fullscreen Interactive Modal Preview                         */}
        {/* ============================================================ */}
        {isFullscreenPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
            {/* Countdown Badge & Manual Close */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{toBengaliNumber(fullscreenTimer)} সেকেন্ড</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenPreviewOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center cursor-pointer shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popup Dialog Centered in Fullscreen */}
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
              {/* Floating Circular X Close Button on Top Right */}
              <button
                type="button"
                onClick={() => setIsFullscreenPreviewOpen(false)}
                className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
                title="বন্ধ করুন"
              >
                <X className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>

              {/* Responsive Popup Image */}
              <div className="w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                <img
                  src={popupImage}
                  alt="Fullscreen Popup"
                  className="w-full h-auto max-h-[500px] object-cover object-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
