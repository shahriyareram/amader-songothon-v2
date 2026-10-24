import React, { useState, useEffect, useMemo } from 'react';
import { getApiBaseUrl } from '../config/apiConfig';
import { getSplashLogoAssetFromFirestore } from '../services/firebaseService';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number; // Duration in seconds (1 to 5)
  transition?: 'fade' | 'zoom' | 'slide' | 'none';
  logoPreset?: string;
  logoUrl?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 3,
  transition = 'fade',
  logoPreset = 'default',
  logoUrl,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [officialLogoError, setOfficialLogoError] = useState(false);
  const [usingBase64Fallback, setUsingBase64Fallback] = useState(false);

  // Safely resolve relative logo URL to absolute backend URL on Android APK
  const resolvedLogoUrl = useMemo(() => {
    if (!logoUrl) return undefined;
    const trimmed = logoUrl.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('/')) {
      const baseUrl = getApiBaseUrl();
      return baseUrl ? `${baseUrl}${trimmed}` : trimmed;
    }
    return trimmed;
  }, [logoUrl]);

  const [activeImageSrc, setActiveImageSrc] = useState<string | undefined>(resolvedLogoUrl);
  const [base64Data, setBase64Data] = useState<string | null>(() => {
    try {
      return localStorage.getItem('amader_shongothon_splash_logo_cached');
    } catch {
      return null;
    }
  });

  // Keep activeImageSrc in sync when resolvedLogoUrl updates
  useEffect(() => {
    if (resolvedLogoUrl && !usingBase64Fallback && !imageError) {
      setActiveImageSrc(resolvedLogoUrl);
    }
  }, [resolvedLogoUrl, usingBase64Fallback, imageError]);

  // Pre-load / warm Base64 fallback from Firestore in the background
  useEffect(() => {
    let isMounted = true;
    getSplashLogoAssetFromFirestore().then((b64) => {
      if (isMounted && b64) {
        setBase64Data(b64);
        // If no logoUrl was passed but an asset exists in Firestore
        if (!logoUrl && !imageError) {
          setActiveImageSrc(b64);
          setUsingBase64Fallback(true);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [logoUrl, imageError]);

  const handleCustomImageError = () => {
    console.warn('[SplashScreen] Custom splash image failed to load.');
    const cached = base64Data || (() => {
      try {
        return localStorage.getItem('amader_shongothon_splash_logo_cached');
      } catch {
        return null;
      }
    })();

    // If we have a base64 backup and haven't tried it yet, switch to it seamlessly
    if (!usingBase64Fallback && cached && cached !== activeImageSrc) {
      console.log('[SplashScreen] Switching to Base64 Firestore backup splash image.');
      setUsingBase64Fallback(true);
      setActiveImageSrc(cached);
      return;
    }

    // Both remote URL and Base64 failed -> gracefully show default emblem & app title
    setImageError(true);
  };

  const showCustomBackground = Boolean(activeImageSrc && !imageError);

  // Exit Transition Duration:
  // For 'none', transition duration is 0ms
  // For 'fade', 'zoom', 'slide', transition duration is 700ms
  const transDurationMs = transition === 'none' ? 0 : 700;
  const safeDurationSec = Math.max(1, Math.min(5, Number(duration) || 3));
  const displayDurationMs = safeDurationSec * 1000;

  useEffect(() => {
    // 1. None: Wait displayDurationMs, then finish immediately
    if (transition === 'none') {
      const timer = setTimeout(() => {
        onFinish();
      }, displayDurationMs);
      return () => clearTimeout(timer);
    }

    // 2. Fade, Zoom, Slide:
    // Stage 1: Display duration ends -> start exit transition
    const startTransitionTimer = setTimeout(() => {
      setIsTransitioning(true);
    }, displayDurationMs);

    // Stage 2: Exit transition completes (displayDurationMs + transDurationMs) -> onFinish()
    const finishTimer = setTimeout(() => {
      onFinish();
    }, displayDurationMs + transDurationMs);

    return () => {
      clearTimeout(startTransitionTimer);
      clearTimeout(finishTimer);
    };
  }, [displayDurationMs, transDurationMs, transition, onFinish]);

  const handleManualSkip = () => {
    if (isTransitioning) return;
    if (transition === 'none') {
      onFinish();
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      onFinish();
    }, transDurationMs);
  };

  // Compute transition CSS animation classes
  const getTransitionStyle = () => {
    if (!isTransitioning) {
      return 'opacity-100 scale-100 translate-x-0 translate-y-0';
    }

    switch (transition) {
      case 'zoom':
        return 'opacity-0 scale-75 pointer-events-none transition-all duration-700 ease-in-out';
      case 'slide':
        return '-translate-x-full opacity-0 pointer-events-none transition-all duration-700 ease-in-out';
      case 'none':
        return 'opacity-0 pointer-events-none';
      case 'fade':
      default:
        return 'opacity-0 pointer-events-none transition-opacity duration-700 ease-in-out';
    }
  };

  const renderLogo = () => {
    // 1. Primary: Official High-Resolution App Logo
    if (!officialLogoError) {
      return (
        <img
          src="/amader_songothon_logo_1024_transparent.png"
          alt="আমাদের সংগঠন Logo"
          className="w-full h-full object-contain rounded-2xl drop-shadow-md"
          onError={() => setOfficialLogoError(true)}
        />
      );
    }

    if (logoPreset === 'crest') {
      return (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-300 drop-shadow-md">
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

    if (logoPreset === 'minimal') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center font-black text-emerald-200 select-none">
          <span className="text-3xl font-extrabold tracking-wider">আ</span>
          <span className="text-[10px] font-bold tracking-widest text-emerald-300/80 -mt-1">সংগঠন</span>
        </div>
      );
    }

    // Default: Beautiful official Cooperative Community Emblem
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-300 drop-shadow-md"
      >
        <circle cx="24" cy="13" r="5" fill="#34d399" />
        <path
          d="M17 26C17 22.5 20 20 24 20C28 20 31 22.5 31 26V30H17V26Z"
          fill="#34d399"
        />
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
        <path
          d="M10 35C15 39 33 39 38 35"
          stroke="#6ee7b7"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div
      id="app-splash-screen"
      onClick={handleManualSkip}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white select-none font-sans cursor-pointer ${getTransitionStyle()}`}
      aria-label="স্প্ল্যাশ স্ক্রিন - লগইন স্ক্রিনে যেতে ট্যাপ করুন"
    >
      {/* 1. Full-Screen Custom Background Image (9:16 Cover, No Distortion, 100% Original Brightness & Color) */}
      {showCustomBackground ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={activeImageSrc}
            alt="আমাদের সংগঠন Splash Screen"
            className="w-full h-full object-cover object-center"
            onError={handleCustomImageError}
          />
        </div>
      ) : (
        /* 2. Default Ambient Radial Glow */
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-700/20 rounded-full blur-3xl" />
        </div>
      )}

      {/* Screen Content */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-6 flex flex-col items-center text-center">
        {!showCustomBackground ? (
          /* Default Emblem & Branding when no custom background image OR if custom image fails to load */
          <>
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-emerald-800/90 border-2 border-emerald-500/40 p-4 shadow-2xl flex items-center justify-center mb-6">
              {renderLogo()}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              আমাদের সংগঠন
            </h1>

            <p className="text-base sm:text-lg font-medium text-emerald-200/90 mt-2 tracking-wide">
              স্বচ্ছ হিসাব সবার জন্য
            </p>
          </>
        ) : null}

        {/* Subtle, elegant pulsing indicator */}
        <div className="flex items-center gap-1.5 mt-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse [animation-delay:200ms] shadow-md" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/30 animate-pulse [animation-delay:400ms] shadow-md" />
        </div>
      </div>
    </div>
  );
};
