import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Clock,
  Image as ImageIcon,
  Check,
  Play,
  CheckCircle2,
  X,
  Upload,
  Eye,
  Sliders,
  Smartphone,
  Layers,
  Info,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { OrganizationSettings } from '../../types';
import { saveSettingsToFirestore, uploadSplashLogoToStorage, removeSplashLogo } from '../../services/firebaseService';
import { getApiBaseUrl } from '../../config/apiConfig';
import { toBengaliNumber } from '../../utils/bengali';

export interface AdminSplashScreenControlProps {
  onBack: () => void;
  settings?: OrganizationSettings;
  onUpdateSettings?: (newSettings: Partial<OrganizationSettings>) => Promise<{ success: boolean; error?: string } | void> | void;
}

export type TransitionEffect = 'fade' | 'zoom' | 'slide' | 'none';
export type SplashDuration = 1 | 2 | 3 | 4 | 5;
export type LogoPreset = 'default' | 'crest' | 'minimal';

export const AdminSplashScreenControl: React.FC<AdminSplashScreenControlProps> = ({ 
  onBack,
  settings,
  onUpdateSettings,
}) => {
  // Local Settings States (Initialized from saved Firestore settings or defaults)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return settings?.splashEnabled !== undefined ? settings.splashEnabled : true;
  });
  const [duration, setDuration] = useState<SplashDuration>(() => {
    const raw = Number(settings?.splashDuration);
    return ([1, 2, 3, 4, 5].includes(raw) ? raw : 3) as SplashDuration;
  });
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>(() => {
    return (settings?.splashTransition as TransitionEffect) || 'fade';
  });
  const [selectedLogo, setSelectedLogo] = useState<LogoPreset>(() => {
    return (settings?.splashLogo as LogoPreset) || 'default';
  });
  const [splashLogoUrl, setSplashLogoUrl] = useState<string | undefined>(() => {
    return settings?.splashLogoUrl;
  });
  const [previewImageError, setPreviewImageError] = useState(false);
  const [previewOfficialLogoError, setPreviewOfficialLogoError] = useState(false);

  // Reset preview image error when splashLogoUrl changes
  useEffect(() => {
    setPreviewImageError(false);
  }, [splashLogoUrl]);

  // Safely resolve relative logo URL to absolute backend URL on Android APK
  const resolvedPreviewUrl = React.useMemo(() => {
    if (!splashLogoUrl) return undefined;
    const trimmed = splashLogoUrl.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('/')) {
      const baseUrl = getApiBaseUrl();
      return baseUrl ? `${baseUrl}${trimmed}` : trimmed;
    }
    return trimmed;
  }, [splashLogoUrl]);

  const [activePreviewSrc, setActivePreviewSrc] = useState<string | undefined>(resolvedPreviewUrl);

  useEffect(() => {
    setActivePreviewSrc(resolvedPreviewUrl);
  }, [resolvedPreviewUrl]);

  const handlePreviewImageError = () => {
    // Try localStorage base64 cache if remote fails
    try {
      const cached = localStorage.getItem('amader_shongothon_splash_logo_cached');
      if (cached && cached !== activePreviewSrc) {
        setActivePreviewSrc(cached);
        return;
      }
    } catch {}
    setPreviewImageError(true);
  };

  const showCustomLogoInPreview = Boolean(activePreviewSrc && !previewImageError);

  // UI Interactive States
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [previewTimerSeconds, setPreviewTimerSeconds] = useState(3);
  const [previewIsFading, setPreviewIsFading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync settings when loaded or updated from Cloud Firestore
  useEffect(() => {
    if (settings) {
      if (settings.splashEnabled !== undefined) {
        setIsEnabled(settings.splashEnabled);
      }
      if (settings.splashDuration) {
        const raw = Number(settings.splashDuration);
        if ([1, 2, 3, 4, 5].includes(raw)) {
          setDuration(raw as SplashDuration);
        }
      }
      if (settings.splashTransition) {
        setTransitionEffect(settings.splashTransition as TransitionEffect);
      }
      if (settings.splashLogo) {
        setSelectedLogo(settings.splashLogo as LogoPreset);
      }
      if (settings.splashLogoUrl !== undefined) {
        setSplashLogoUrl(settings.splashLogoUrl);
      }
    }
  }, [settings?.splashEnabled, settings?.splashDuration, settings?.splashTransition, settings?.splashLogo, settings?.splashLogoUrl]);

  // Clear save message after 3 seconds
  useEffect(() => {
    if (saveSuccessMessage) {
      const t = setTimeout(() => setSaveSuccessMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccessMessage]);

  // Handle Fullscreen Live Preview Trigger
  const handleLaunchPreview = () => {
    setPreviewTimerSeconds(duration);
    setPreviewIsFading(false);
    setIsPreviewModalOpen(true);
  };

  // Allow manual skip during fullscreen preview
  const handleManualSkipPreview = () => {
    if (previewIsFading) return;
    if (transitionEffect === 'none') {
      setIsPreviewModalOpen(false);
      return;
    }
    setPreviewIsFading(true);
    setTimeout(() => {
      setIsPreviewModalOpen(false);
      setPreviewIsFading(false);
    }, 700);
  };

  // Run preview countdown and auto-dismiss
  useEffect(() => {
    if (!isPreviewModalOpen) return;

    const displayDurationMs = duration * 1000;
    const transDurationMs = transitionEffect === 'none' ? 0 : 700;

    // Countdown timer for preview visualization
    const countdown = setInterval(() => {
      setPreviewTimerSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    // 1. Trigger transition exactly when Display Duration ends
    const transTimer = setTimeout(() => {
      setPreviewIsFading(true);
    }, displayDurationMs);

    // 2. Auto dismiss after Display Duration + 700ms Exit Transition completes
    const closeTimer = setTimeout(() => {
      setIsPreviewModalOpen(false);
      setPreviewIsFading(false);
    }, displayDurationMs + transDurationMs);

    return () => {
      clearInterval(countdown);
      clearTimeout(transTimer);
      clearTimeout(closeTimer);
    };
  }, [isPreviewModalOpen, duration, transitionEffect]);

  // Save changes to Firestore and Local Storage with feedback
  const handleSaveSettings = async () => {
    setIsSaving(true);
    const updatedPayload: Partial<OrganizationSettings> = {
      splashEnabled: isEnabled,
      splashDuration: duration,
      splashTransition: transitionEffect,
      splashLogo: selectedLogo,
      splashLogoUrl: splashLogoUrl || '',
    };

    try {
      // 1. Primary update via props callback if available
      if (onUpdateSettings) {
        await onUpdateSettings(updatedPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...updatedPayload,
        });
      }

      // 2. Also ensure local cache is synchronously updated for startup performance
      try {
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({ ...parsed, ...updatedPayload })
        );
      } catch (cacheErr) {
        console.warn('Local storage cache write note:', cacheErr);
      }

      // 3. Background server endpoint sync
      try {
        const sessionToken = localStorage.getItem('amader_shongothon_session_token_v2');
        if (sessionToken) {
          fetch('/api/admin/update-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify(updatedPayload),
          }).catch(() => {});
        }
      } catch {}

      setSaveSuccessMessage('Splash Screen সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err: any) {
      console.error('Failed to save splash screen settings:', err);
      setSaveSuccessMessage('Splash Screen সেটিংস সংরক্ষণ সম্পন্ন হয়েছে (লোকাল মোড)');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore Default Settings
  const handleRestoreDefaults = async () => {
    setIsSaving(true);
    setIsEnabled(true);
    setDuration(3);
    setTransitionEffect('fade');
    setSelectedLogo('default');
    setSplashLogoUrl(undefined);

    const defaultPayload: Partial<OrganizationSettings> = {
      splashEnabled: true,
      splashDuration: 3,
      splashTransition: 'fade',
      splashLogo: 'default',
      splashLogoUrl: '',
    };

    try {
      if (onUpdateSettings) {
        await onUpdateSettings(defaultPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...defaultPayload,
        });
      }

      try {
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({ ...parsed, ...defaultPayload })
        );
      } catch {}

      setSaveSuccessMessage('ডিফল্ট সেটিংস সফলভাবে ফিরিয়ে আনা ও সংরক্ষণ করা হয়েছে');
    } catch (err) {
      console.error('Failed to restore default settings:', err);
      setSaveSuccessMessage('ডিফল্ট সেটিংস ফিরিয়ে আনা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logo Upload from Standard Mobile File Picker
  // Preserves 100% original bytes (no compression, no resize, no crop)
  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input so user can pick again if needed
    e.target.value = '';

    if (!file) return;

    // Validate type: PNG / JPG / JPEG (PNG prioritized)
    const lowerName = file.name.toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isPng = fileType === 'image/png' || lowerName.endsWith('.png');
    const isJpg = fileType === 'image/jpeg' || fileType === 'image/jpg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');

    if (!isPng && !isJpg) {
      setLogoUploadError('শুধুমাত্র PNG বা JPG/JPEG ইমেজ ফাইল নির্বাচন করুন। PNG অগ্রাধিকারযোগ্য।');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    setSaveSuccessMessage(null);

    try {
      // 1. Upload original uncompressed bytes to Firebase Storage
      // Path: splash/logos/organization-logo-[timestamp].[ext]
      const downloadUrl = await uploadSplashLogoToStorage(file);

      // 2. Update local state
      setSplashLogoUrl(downloadUrl);

      // 3. Save new splashLogoUrl to Firestore settings/organization
      const updatedPayload: Partial<OrganizationSettings> = {
        splashLogoUrl: downloadUrl,
      };

      if (onUpdateSettings) {
        await onUpdateSettings(updatedPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...updatedPayload,
        });
      }

      // 4. Update local storage cache
      try {
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({ ...parsed, ...updatedPayload })
        );
      } catch (cacheErr) {
        console.warn('Local storage cache write note:', cacheErr);
      }

      // 5. Background server sync
      try {
        const sessionToken = localStorage.getItem('amader_shongothon_session_token_v2');
        if (sessionToken) {
          fetch('/api/admin/update-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify(updatedPayload),
          }).catch(() => {});
        }
      } catch {}

      // 6. Success feedback
      setSaveSuccessMessage('লোগো সফলভাবে আপলোড ও সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setLogoUploadError(err.message || 'লোগো ফাইল আপলোড ব্যর্থ হয়েছে। পূর্বের লোগো অপরিবর্তিত রয়েছে।');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Revert custom logo back to default emblem
  const handleRemoveCustomLogo = async () => {
    setIsSaving(true);
    setSplashLogoUrl(undefined);
    try {
      await removeSplashLogo();
      const updatedPayload: Partial<OrganizationSettings> = {
        splashLogoUrl: '',
      };
      if (onUpdateSettings) {
        await onUpdateSettings(updatedPayload);
      } else {
        await saveSettingsToFirestore({
          ...(settings || ({} as any)),
          ...updatedPayload,
        });
      }
      try {
        localStorage.removeItem('amader_shongothon_splash_logo_cached');
        const cached = localStorage.getItem('amader_shongothon_settings_v2') || localStorage.getItem('amader_shongothon_settings_v1');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'amader_shongothon_settings_v2',
          JSON.stringify({ ...parsed, ...updatedPayload })
        );
      } catch {}
      setSaveSuccessMessage('কাস্টম লোগো মুছে ডিফল্ট এমব্লেমে ফিরিয়ে নেওয়া হয়েছে');
    } catch (err) {
      console.error('Failed to remove custom logo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Logo Emblem Renderer based on custom uploaded logo or selected preset
  const renderLogoEmblem = (sizeClass: string = 'w-14 h-14 sm:w-16 sm:h-16') => {
    // If a custom original logo has been uploaded to Firebase Storage, render it directly
    if (splashLogoUrl) {
      return (
        <img
          src={splashLogoUrl}
          alt="Organization Logo"
          className={`${sizeClass} object-contain rounded-xl drop-shadow-md`}
        />
      );
    }

    if (selectedLogo === 'crest') {
      return (
        <svg viewBox="0 0 48 48" fill="none" className={`${sizeClass} text-emerald-300 drop-shadow-md`}>
          <path
            d="M24 4L8 10V22C8 32.5 14.8 42.3 24 44C33.2 42.3 40 32.5 40 22V10L24 4Z"
            fill="#065f46"
            stroke="#34d399"
            strokeWidth="2.5"
          />
          <circle cx="24" cy="20" r="6" fill="#6ee7b7" />
          <path d="M16 32C16 28 19.5 26 24 26C28.5 26 32 28 32 32" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }

    if (selectedLogo === 'minimal') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center font-black text-emerald-200 select-none">
          <span className="text-3xl font-extrabold tracking-wider">আ</span>
          <span className="text-[10px] font-bold tracking-widest text-emerald-300/80 -mt-1">সংগঠন</span>
        </div>
      );
    }

    // Default Cooperative Community Emblem
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} text-emerald-300 drop-shadow-md`}
      >
        <circle cx="24" cy="13" r="5" fill="#34d399" />
        <path d="M17 26C17 22.5 20 20 24 20C28 20 31 22.5 31 26V30H17V26Z" fill="#34d399" />
        <circle cx="12" cy="16" r="3.5" fill="#a7f3d0" />
        <path
          d="M7 28C7 25 9.2 23 12 23C13.5 23 14.8 23.6 15.6 24.6C15.2 25.6 15 26.8 15 28V30H7V28Z"
          fill="#a7f3d0"
          fillOpacity="0.85"
        />
        <circle cx="36" cy="16" r="3.5" fill="#a7f3d0" />
        <path
          d="M41 28C41 25 38.8 23 36 23C34.5 23 33.2 23.6 32.4 24.6C32.8 25.6 33 26.8 33 28V30H41V28Z"
          fill="#a7f3d0"
          fillOpacity="0.85"
        />
        <path d="M10 35C15 39 33 39 38 35" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  };

  // Get transition CSS class for interactive preview
  const getTransitionClass = () => {
    if (!previewIsFading) return 'opacity-100 scale-100 translate-x-0 translate-y-0';
    switch (transitionEffect) {
      case 'fade':
        return 'opacity-0 scale-100 transition-opacity duration-700 ease-in-out pointer-events-none';
      case 'zoom':
        return 'opacity-0 scale-75 transition-all duration-700 ease-in-out pointer-events-none';
      case 'slide':
        return 'opacity-0 -translate-x-full transition-all duration-700 ease-in-out pointer-events-none';
      case 'none':
      default:
        return 'opacity-0 pointer-events-none';
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-28 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* ============================================================ */}
        {/* 1. Header Bar                                                */}
        {/* ============================================================ */}
        <header className="bg-white rounded-3xl p-4 border border-[#d6e8f6] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="splash-control-back-btn"
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="ফিরে যান"
              aria-label="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                <span className="text-xl">🖼️</span>
                <span>Splash Screen Control</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                স্টার্টআপ স্প্ল্যাশ স্ক্রিন ও ব্র্যান্ডিং কনফিগারেশন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200"
            title="Default Settings ফিরিয়ে আনুন"
            aria-label="Default Settings ফিরিয়ে আনুন"
          >
            <RotateCcw className="w-4 h-4 stroke-[2]" />
          </button>
        </header>

        {/* Success Alert Banner */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 px-4 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. বর্তমান Splash Screen Live Preview Card                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4.5 h-4.5 text-[#007a55] stroke-[2.2]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                বর্তমান Splash Screen Preview
              </h2>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                isEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {isEnabled ? 'সক্রিয় প্রিভিউ' : 'বন্ধ রয়েছে'}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            মোবাইল ডিভাইসে ব্যবহারকারী অ্যাপ ওপেন করলে যেভাবে স্ক্রিনটি প্রদর্শিত হবে:
          </p>

          {/* Mobile Screen Mockup Card */}
          <div className="relative w-full max-w-[250px] sm:max-w-[270px] mx-auto aspect-[9/16] bg-slate-900 rounded-[32px] p-4 shadow-2xl border-4 border-slate-800 flex flex-col items-center justify-between text-center overflow-hidden select-none">
            {/* Top Phone Notch / Camera Pill */}
            <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto -mt-1.5 flex items-center justify-center gap-1.5 z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700/60" />
            </div>

            {/* Full-Screen Custom Background Image (9:16 Cover, 100% Original Brightness & Color) */}
            {showCustomLogoInPreview ? (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img
                  src={activePreviewSrc}
                  alt="Splash Background"
                  className="w-full h-full object-cover object-center"
                  onError={handlePreviewImageError}
                />
              </div>
            ) : (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-600/20 rounded-full blur-2xl" />
              </div>
            )}

            {/* Center Content */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full px-2">
              {!showCustomLogoInPreview ? (
                <>
                  {/* Emblem / Logo Container */}
                  <div className="w-20 h-20 rounded-2xl bg-emerald-800/90 border-2 border-emerald-500/40 p-3.5 shadow-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-200">
                    {renderLogoEmblem('w-12 h-12')}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                    আমাদের সংগঠন
                  </h3>

                  {/* Tagline */}
                  <p className="text-xs font-medium text-emerald-200/90 mt-1 tracking-wide">
                    স্বচ্ছ হিসাব সবার জন্য
                  </p>
                </>
              ) : null}

              {/* Pulsing indicator dots */}
              <div className="flex items-center gap-1.5 mt-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-md" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse [animation-delay:200ms] shadow-md" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/30 animate-pulse [animation-delay:400ms] shadow-md" />
              </div>
            </div>

            {/* Bottom Status / Duration Pill */}
            <div className="relative z-10 mb-1 w-full flex items-center justify-between text-[10px] font-semibold text-slate-300 bg-slate-950/80 backdrop-blur-xs py-1.5 px-3 rounded-full border border-slate-700/80">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{toBengaliNumber(duration)} সেকেন্ড</span>
              </span>
              <span className="capitalize text-emerald-300 font-bold">{transitionEffect}</span>
            </div>
          </div>

          {/* Quick Preview Button */}
          <button
            type="button"
            id="splash-preview-action-btn"
            onClick={handleLaunchPreview}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-[#007a55] border border-emerald-200 rounded-2xl text-xs font-black transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>লাইভ অ্যানিমেশন প্রিভিউ দেখুন ({toBengaliNumber(duration)} সে.)</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 3. Splash Screen চালু/বন্ধ (Toggle Switch)                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🔘</span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Splash Screen চালু
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              অ্যাপ লোড হওয়ার সময় ব্র্যান্ডেড স্প্ল্যাশ স্ক্রিন প্রদর্শন করুন
            </p>
          </div>

          <label
            htmlFor="splash-screen-toggle"
            className="relative inline-flex items-center cursor-pointer shrink-0"
          >
            <input
              type="checkbox"
              id="splash-screen-toggle"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[#007a55]"></div>
          </label>
        </div>

        {/* ============================================================ */}
        {/* 4. প্রদর্শনের সময় (Duration Selector)                       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-[#007a55] stroke-[2.2]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                প্রদর্শনের সময়
              </h2>
            </div>
            <span className="text-xs font-bold text-[#007a55] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {toBengaliNumber(duration)} সেকেন্ড
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            স্প্ল্যাশ স্ক্রিনটি কতক্ষণ স্ক্রিনে দৃশ্যমান থাকবে তা নির্ধারণ করুন:
          </p>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
            {([1, 2, 3, 4, 5] as SplashDuration[]).map((sec) => {
              const isSelected = duration === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#007a55] text-white border-[#007a55] shadow-xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold'
                  }`}
                >
                  <span className="text-sm sm:text-base leading-none">
                    {toBengaliNumber(sec)}
                  </span>
                  <span className={`text-[10px] mt-1 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    সেকেন্ড
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
            <span>দ্রুত (১ সে.)</span>
            <span className="text-emerald-700 font-bold">ডিফল্ট: ৩ সেকেন্ড</span>
            <span>দীর্ঘ (৫ সে.)</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. Transition Effect Selector                                */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#007a55] stroke-[2.2]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Transition Effect
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full capitalize">
              {transitionEffect}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            স্প্ল্যাশ স্ক্রিন শেষ হওয়ার সময় যে অ্যানিমেশনটি ব্যবহার হবে:
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {[
              { id: 'fade', name: 'Fade', bn: 'স্মুথ মিলিয়ে যাওয়া', icon: '✨' },
              { id: 'zoom', name: 'Zoom', bn: 'জুম আউট ট্রানজিশন', icon: '🔍' },
              { id: 'slide', name: 'Slide', bn: 'ডান দিক থেকে বাম দিকে স্লাইড', icon: '⬅️' },
              { id: 'none', name: 'None', bn: 'সরাসরি লগইনে যাওয়া', icon: '⚡' },
            ].map((effect) => {
              const isSelected = transitionEffect === effect.id;
              return (
                <button
                  key={effect.id}
                  type="button"
                  onClick={() => setTransitionEffect(effect.id as TransitionEffect)}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer active:scale-[0.98] ${
                    isSelected
                      ? 'bg-emerald-50/80 border-[#007a55] shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{effect.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{effect.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#007a55] stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      {effect.bn}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. Splash Logo / Full-Screen Background Section             */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4.5 h-4.5 text-[#007a55] stroke-[2.2]" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Splash Screen ব্যাকগ্রাউন্ড
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {splashLogoUrl ? 'ফুল-স্ক্রিন কাস্টম ইমেজ' : 'ডিফল্ট সমবায় এমব্লেম'}
            </span>
          </div>

          {/* Hidden standard file input accepting PNG/JPG/JPEG */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
            onChange={handleLogoFileSelect}
            className="hidden"
            disabled={isUploadingLogo || isSaving}
          />

          <div className="bg-[#f0f9f5] border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-900 border border-emerald-500/50 p-1.5 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                {renderLogoEmblem('w-11 h-11')}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  {splashLogoUrl ? 'মূল ফুল-স্ক্রিন ব্যাকগ্রাউন্ড (ক্লাউড সংরক্ষিত)' : 'অফিসিয়াল সমবায় এমব্লেম'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {splashLogoUrl ? '1536×1536 মূল হাই-রেজ্যুলুশন (9:16 কভার)' : '“আমাদের সংগঠন” অ্যাপের মূল ব্র্যান্ডিং'}
                </p>
                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  splashLogoUrl 
                    ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' 
                    : 'text-emerald-800 bg-emerald-100'
                }`}>
                  {splashLogoUrl ? 'সক্রিয় ফুল-স্ক্রিন কভার' : 'রেকমেন্ডেড'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {splashLogoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCustomLogo}
                  disabled={isUploadingLogo || isSaving}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="ডিফল্ট এমব্লেম ফিরিয়ে আনুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                id="change-splash-logo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo || isSaving}
                className="px-3 py-2 bg-[#007a55] hover:bg-[#006848] text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>আপলোড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>লোগো পরিবর্তন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload Progress Notification */}
          {isUploadingLogo && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 px-4 text-xs font-medium flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>মূল লোগো ফাইলটি সুরক্ষিতভাবে সংরক্ষিত হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।</span>
            </div>
          )}

          {/* Upload Error Banner */}
          {logoUploadError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3 px-4 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{logoUploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLogoUploadError(null)}
                className="text-red-600 hover:text-red-900 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 7. Action Buttons (Preview, Save, Reset)                     */}
        {/* ============================================================ */}
        <div className="space-y-2.5 pt-2">
          {/* Main Save Button */}
          <button
            type="button"
            id="save-splash-settings-btn"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#007a55] hover:bg-[#006848] active:scale-[0.98] text-white rounded-2xl font-black text-sm transition-all shadow-md cursor-pointer ${
              isSaving ? 'opacity-80 cursor-wait pointer-events-none' : ''
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>সংরক্ষণ করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>পরিবর্তন সংরক্ষণ করুন</span>
              </>
            )}
          </button>

          {/* Full Preview Button */}
          <button
            type="button"
            onClick={handleLaunchPreview}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-[#d6e8f6] rounded-2xl font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-emerald-700" />
            <span>ফুল স্ক্রিন প্রিভিউ দেখুন</span>
          </button>

          {/* Reset Defaults Option */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSaving}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Default Settings ফিরিয়ে আনুন
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Interactive Fullscreen Demo Preview Modal                   */}
      {/* ============================================================ */}
      {isPreviewModalOpen && (
        <div
          id="splash-interactive-preview-modal"
          onClick={handleManualSkipPreview}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white select-none cursor-pointer ${getTransitionClass()}`}
          aria-label="স্প্ল্যাশ স্ক্রিন ডেমো প্রিভিউ"
        >
          {/* Close hint button at top right */}
          <div className="absolute top-4 right-4 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewModalOpen(false);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 border border-slate-700 backdrop-blur-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>বন্ধ করুন ({toBengaliNumber(previewTimerSeconds)} সে.)</span>
            </button>
          </div>

          {/* Full-Screen Custom Background Image or Ambient Radial Glow */}
          {showCustomLogoInPreview ? (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <img
                src={activePreviewSrc}
                alt="Splash Background Preview"
                className="w-full h-full object-cover object-center"
                onError={handlePreviewImageError}
              />
            </div>
          ) : (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
            </div>
          )}

          {/* Center Content */}
          <div className="relative z-10 w-full max-w-sm mx-auto px-6 flex flex-col items-center text-center">
            {!showCustomLogoInPreview ? (
              <>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-emerald-800/90 border-2 border-emerald-500/40 p-4 shadow-2xl flex items-center justify-center mb-6">
                  {renderLogoEmblem('w-14 h-14 sm:w-16 sm:h-16')}
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  আমাদের সংগঠন
                </h2>

                <p className="text-base sm:text-lg font-medium text-emerald-200/90 mt-2 tracking-wide">
                  স্বচ্ছ হিসাব সবার জন্য
                </p>
              </>
            ) : null}

            <div className="flex items-center gap-1.5 mt-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md" />
              <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse [animation-delay:200ms] shadow-md" />
              <span className="w-2 h-2 rounded-full bg-emerald-400/30 animate-pulse [animation-delay:400ms] shadow-md" />
            </div>

            {!splashLogoUrl && (
              <p className="text-[11px] text-slate-500 mt-10">
                ট্যাপ করলে বন্ধ হবে • সময়: {toBengaliNumber(duration)} সেকেন্ড ({transitionEffect})
              </p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Logo Selection & Future Upload Placeholder Modal            */}
      {/* ============================================================ */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#007a55]" />
                <h3 className="text-base font-black text-slate-900">Logo নির্বাচন ও পরিবর্তন</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              স্প্ল্যাশ স্ক্রিনে ব্যবহারের জন্য নির্ধারিত লোগো নির্বাচন করুন:
            </p>

            {/* Presets Grid */}
            <div className="space-y-2">
              {[
                { id: 'default', title: 'অফিসিয়াল সমবায় এমব্লেম', desc: 'কমিউনিটি ও মেম্বার একতা প্রতীক (ডিফল্ট)' },
                { id: 'crest', title: 'অর্গানাইজেশন শিল্ড ক্রেস্ট', desc: 'সুরক্ষিত হিসাব ও ট্রাস্ট প্রতীক' },
                { id: 'minimal', title: 'মিনিমালিস্ট ব্র্যান্ড টাইপো', desc: '“আমাদের সংগঠন” সংক্ষিপ্ত মনোগ্রাম' },
              ].map((preset) => {
                const isCurrent = selectedLogo === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedLogo(preset.id as LogoPreset);
                      setIsLogoModalOpen(false);
                      setSaveSuccessMessage(`লোগো পরিবর্তিত হয়েছে: ${preset.title}`);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-50 border-[#007a55] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-black text-slate-900">{preset.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{preset.desc}</p>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-[#007a55] shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom File Upload Option (Firebase Storage) */}
            <div className="bg-[#f0fdf4] border border-dashed border-emerald-300 rounded-2xl p-4 text-center space-y-2">
              <Upload className="w-6 h-6 text-emerald-600 mx-auto" />
              <div>
                <p className="text-xs font-black text-slate-800">ডিভাইস থেকে মূল Logo আপলোড</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Firebase Storage-এ আপনার ডিভাইসের মূল PNG/JPG লোগো আপলোড করতে নির্বাচন করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLogoModalOpen(false);
                  fileInputRef.current?.click();
                }}
                disabled={isUploadingLogo}
                className="w-full py-2 px-3 bg-[#007a55] hover:bg-[#006848] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ফাইল নির্বাচন করুন (PNG/JPG)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsLogoModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
