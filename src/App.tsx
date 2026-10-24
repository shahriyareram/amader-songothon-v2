import React, { useState, useEffect, useMemo } from 'react';
import { 
  Member, 
  DepositTransaction, 
  OrganizationSettings, 
  ActiveTab,
  WeeklyRecord,
  UserSession,
  AnnualExpense
} from './types';
import { 
  getInitialMembers, 
  initialSettings, 
  INITIAL_CURRENT_WEEK 
} from './data/initialData';
import { getCurrentWeekNumber, getBangladeshDateString } from './utils/bengali';
import {
  subscribeToMembers,
  subscribeToSettings,
  subscribeToTransactions,
  subscribeToAnnualExpenses,
  subscribeToPopupConfig,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  batchSaveMembersToFirestore,
  saveSettingsToFirestore,
  saveTransactionToFirestore,
  deleteTransactionsForMemberWeek,
  batchSaveTransactionsToFirestore,
  saveAnnualExpenseToFirestore,
  deleteAnnualExpenseFromFirestore,
  updateUserPassword,
  signOutFirebaseUser,
  loginWithPhoneAndPassword,
  adminResetMemberPassword,
  completeForcedPasswordChange,
  updateWhatsAppGroupLinkInFirestore,
} from './services/firebaseService';
import { DepositHistoryPage } from './components/DepositHistoryPage';
import { DepositEntryPage } from './components/DepositEntryPage';
import { MoreSettingsPage } from './components/MoreSettingsPage';
import { DepositModal } from './components/DepositModal';
import { AdminModal } from './components/AdminModal';
import { AdminDashboardPage } from './components/AdminDashboardPage';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { PanelSelectionScreen } from './components/PanelSelectionScreen';
import { MemberProfileSelectionScreen } from './components/MemberProfileSelectionScreen';
import { AdminRootLayout } from './components/admin/AdminRootLayout';
import { MemberRootLayout } from './components/member/MemberRootLayout';
import { AdminHomePage } from './components/admin/AdminHomePage';
import { MemberHomePage } from './components/member/MemberHomePage';
import { AdminMembersListPage } from './components/admin/AdminMembersListPage';
import { MemberDirectoryPage } from './components/member/MemberDirectoryPage';
import { AdminMemberDetailsPage } from './components/admin/AdminMemberDetailsPage';
import { MemberProfilePage } from './components/member/MemberProfilePage';
import { AdminReportPage } from './components/admin/AdminReportPage';
import { MemberReportPage } from './components/member/MemberReportPage';
import { AdminSettingsPage } from './components/admin/AdminSettingsPage';
import { AdminSetsPage } from './components/admin/AdminSetsPage';
import { MemberSettingsPage } from './components/member/MemberSettingsPage';
import { AdminDueMembersPage } from './components/admin/AdminDueMembersPage';
import { AdminMemberFormModal } from './components/admin/AdminMemberFormModal';
import { ForceNewPasswordScreen } from './components/ForceNewPasswordScreen';
import { AdminPasswordResetModal } from './components/admin/AdminPasswordResetModal';
import {
  PopupDialog,
  STORAGE_POPUP_IMAGE,
  STORAGE_POPUP_IMAGE_NAME,
} from './components/PopupDialog';
import { calculateMemberFinances, processMember52Weeks } from './utils/calculations';
import { PRESET_AVATARS } from './utils/avatarUtils';
import { normalizeBangladeshiPhone } from './utils/phoneUtils';
import { ShieldAlert, LogOut, Bell, CheckCircle2, ArrowDownToLine, ArrowRight } from 'lucide-react';
import {
  syncFcmTokenForActiveMember,
  setupForegroundNotificationListener,
} from './services/notificationService';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import {
  checkAvailableOtaUpdate,
  downloadAndStageOtaUpdate,
  AvailableOtaInfo,
} from './services/otaUpdateService';

const STORAGE_MEMBERS = 'amader_shongothon_members_v2';
const STORAGE_SETTINGS = 'amader_shongothon_settings_v2';
const STORAGE_TRANSACTIONS = 'amader_shongothon_transactions_v2';
const STORAGE_ADMIN = 'amader_shongothon_admin_v2';
const STORAGE_SESSION = 'amader_shongothon_session_v2';

let isAppReadyNotified = false;

// Helper to ensure loaded member data is always valid and contains all 52 weeks
function validateAndSanitizeMembers(raw: any[]): Member[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  try {
    const sanitized: Member[] = raw.map((m: any, idx: number) => {
      const serialNumber = typeof m?.serialNumber === 'number' ? m.serialNumber : idx + 1;
      const id = m?.id || `mem-${serialNumber}`;
      const name = m?.name || `সদস্য ${serialNumber}`;
      const memberCode = m?.memberCode || `সো-${String(serialNumber).padStart(2, '0')}`;
      const phone = m?.phone || '০১৭০০-০০০০০০';
      const joinedDate = m?.joinedDate || '০১ জানুয়ারি ২০২৬';
      const avatarColor = m?.avatarColor || 'bg-emerald-600';
      const photoUrl = typeof m?.photoUrl === 'string' && m.photoUrl.trim() !== ''
        ? m.photoUrl
        : PRESET_AVATARS[(serialNumber - 1) % PRESET_AVATARS.length]?.url;
      const notes = m?.notes || undefined;

      const existingRecords: any[] = Array.isArray(m?.weeklyRecords) ? m.weeklyRecords : [];
      const weeklyRecords: WeeklyRecord[] = Array.from({ length: 52 }, (_, i) => {
        const weekNum = i + 1;
        const found = existingRecords.find((r) => r && r.weekNumber === weekNum);
        if (found) {
          const rawPaid = typeof found.paidAmount === 'number' ? found.paidAmount : 0;
          const rawDate = found.paymentDate ? String(found.paymentDate).trim() : undefined;
          const status = found.status || (rawPaid > 0 && rawDate ? 'paid' : 'due');
          // Normalize legacy 200 to 100 for weekly payments
          const normalizedPaid = rawPaid === 200 ? 100 : rawPaid;
          return {
            weekNumber: weekNum,
            targetAmount: typeof found.targetAmount === 'number' ? (found.targetAmount === 200 ? 100 : found.targetAmount) : 100,
            paidAmount: normalizedPaid,
            status,
            paymentDate: rawDate,
            paymentMethod: found.paymentMethod || 'cash',
            receiptNo: found.receiptNo,
            notes: found.notes,
          };
        }
        return {
          weekNumber: weekNum,
          targetAmount: 100,
          paidAmount: 0,
          status: 'due',
          paymentMethod: 'cash',
        };
      });

      const totalDeposited = weeklyRecords.reduce((acc, r) => acc + (Number(r?.paidAmount) || 0), 0);
      const role = m?.role || (serialNumber === 1 ? 'admin' : 'member');

      return {
        id,
        serialNumber,
        memberCode,
        name,
        phone,
        role,
        Role: role,
        joinedDate,
        avatarColor,
        photoUrl,
        notes,
        totalDeposited,
        weeklyRecords,
      };
    });

    return sanitized;
  } catch (err) {
    console.error('Error validating members:', err);
    return null;
  }
}

export function App() {
  // Members State
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_MEMBERS);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        const sanitized = validateAndSanitizeMembers(parsed);
        if (sanitized && sanitized.length > 0) return sanitized;
      }
      const savedV1 = localStorage.getItem('amader_shongothon_members_v1');
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        const sanitized = validateAndSanitizeMembers(parsed);
        if (sanitized && sanitized.length > 0) return sanitized;
      }
    } catch (e) {
      console.error('Error loading members from localStorage', e);
    }
    const initial = getInitialMembers();
    return initial.members;
  });

  // Settings State
  const [settings, setSettings] = useState<OrganizationSettings>(() => {
    const dynamicWeek = getCurrentWeekNumber();
    const defaultWhatsAppUrl = initialSettings.whatsappGroupUrl || 'https://chat.whatsapp.com/DfrtIDj9qRd4kZJ80czlFU';
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS) || localStorage.getItem('amader_shongothon_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.weeklyTarget === 'number') {
          const rawUrl = parsed.whatsappGroupUrl;
          const cleanUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0 && !rawUrl.includes('sample-invite-group'))
            ? rawUrl.trim().replace(/^["']|["']$/g, '')
            : defaultWhatsAppUrl;

          return {
            ...initialSettings,
            ...parsed,
            weeklyTarget: parsed.weeklyTarget === 200 ? 100 : (parsed.weeklyTarget || 100),
            whatsappGroupUrl: cleanUrl,
            currentWeek: dynamicWeek,
            splashEnabled: parsed.splashEnabled !== undefined ? Boolean(parsed.splashEnabled) : true,
            splashDuration: parsed.splashDuration || 3,
            splashTransition: parsed.splashTransition || 'fade',
            splashLogo: parsed.splashLogo || 'default',
            splashLogoUrl: parsed.splashLogoUrl,
            popupEnabled: parsed.popupEnabled !== undefined ? Boolean(parsed.popupEnabled) : true,
            popupDuration: parsed.popupDuration !== undefined ? Number(parsed.popupDuration) : 5,
          };
        }
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
    return {
      ...initialSettings,
      whatsappGroupUrl: defaultWhatsAppUrl,
      currentWeek: dynamicWeek,
      splashEnabled: true,
      splashDuration: 3,
      splashTransition: 'fade',
      splashLogo: 'default',
      popupEnabled: true,
      popupDuration: 5,
    };
  });

  // Transactions State
  const [transactions, setTransactions] = useState<DepositTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TRANSACTIONS) || localStorage.getItem('amader_shongothon_transactions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize any legacy Demo/Seed transactions with amount 200 to 100
          return parsed.map((tx: DepositTransaction) => {
            if (tx && (tx.id?.startsWith('tx-') || tx.amount === 200)) {
              return {
                ...tx,
                amount: tx.amount === 200 ? 100 : tx.amount,
              };
            }
            return tx;
          });
        }
      }
    } catch (e) {
      console.error('Error loading transactions', e);
    }
    const initial = getInitialMembers();
    return initial.allTransactions;
  });

  // User Authentication & Session State (Admin vs Member RBAC)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Admin Mode State (Strictly derived from authenticated admin session)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_SESSION);
      if (savedSession) {
        const parsed: UserSession = JSON.parse(savedSession);
        return parsed.role === 'admin';
      }
      const saved = localStorage.getItem(STORAGE_ADMIN);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // App Lifecycle Phase (Splash Screen -> Login Screen -> Panel Selection -> Member Profile Selection -> Main App -> Forced Password Change)
  const [appPhase, setAppPhase] = useState<
    'splash' | 'login' | 'panel-selection' | 'member-profile-selection' | 'app' | 'force-new-password'
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS) || localStorage.getItem('amader_shongothon_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.splashEnabled === false) {
          return 'login';
        }
      }
    } catch {}
    return 'splash';
  });

  // Member Profile Selection State (for multiple profiles under the same mobile number)
  const [availableMemberProfiles, setAvailableMemberProfiles] = useState<Member[]>([]);
  const [pendingAuthUser, setPendingAuthUser] = useState<any>(null);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Modals & Navigation Helpers
  const [resetModalMember, setResetModalMember] = useState<Member | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositModalInitials, setDepositModalInitials] = useState<{
    memberId?: string;
    weekNumber?: number;
  }>({});

  const [depositEntryInitials, setDepositEntryInitials] = useState<{
    memberId?: string | null;
    weekNumber?: number | null;
  }>({});

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Popup Dialog session dismissal state (shown once per app reload/session if popupEnabled is true)
  const [isPopupDismissedThisSession, setIsPopupDismissedThisSession] = useState<boolean>(false);

  // Push Notification Foreground Banner State
  const [foregroundNotification, setForegroundNotification] = useState<{
    title: string;
    body: string;
  } | null>(null);

  // OTA Update Dialog State
  const [otaUpdateInfo, setOtaUpdateInfo] = useState<AvailableOtaInfo | null>(null);
  const [isOtaUpdating, setIsOtaUpdating] = useState<boolean>(false);
  const [otaUpdateSuccess, setOtaUpdateSuccess] = useState<boolean>(false);
  const [otaErrorMessage, setOtaErrorMessage] = useState<string | null>(null);
  const [isOtaDismissedThisSession, setIsOtaDismissedThisSession] = useState<boolean>(false);

  // Capgo OTA readiness notification: confirms bundle initialized successfully to prevent automatic rollback
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !isAppReadyNotified) {
      isAppReadyNotified = true;
      CapacitorUpdater.notifyAppReady().catch((err) => {
        console.warn('[OTA] notifyAppReady note:', err);
      });
    }
  }, []);

  // Check for OTA updates 3 seconds after app launch (native Android only, non-blocking)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = setTimeout(async () => {
      try {
        const info = await checkAvailableOtaUpdate();
        if (info && info.hasUpdate && !info.isAlreadyStaged) {
          setOtaUpdateInfo(info);
        }
      } catch (err) {
        console.warn('[OTA] Check note:', err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handlePerformOtaUpdate = async () => {
    if (!otaUpdateInfo?.manifest) return;
    setIsOtaUpdating(true);
    setOtaErrorMessage(null);
    try {
      const result = await downloadAndStageOtaUpdate(otaUpdateInfo.manifest);
      if (result.success) {
        setOtaUpdateSuccess(true);
      } else {
        setOtaErrorMessage(result.error || 'আপডেট ডাউনলোড করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setOtaErrorMessage(err?.message || 'আপডেট ডাউনলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsOtaUpdating(false);
    }
  };

  const handleDismissOtaDialog = () => {
    setIsOtaDismissedThisSession(true);
    setOtaUpdateInfo(null);
    setOtaUpdateSuccess(false);
    setOtaErrorMessage(null);
  };

  // Early non-blocking warm-up ping to wake up hosted backend if cold/sleeping
  useEffect(() => {
    fetch('/api/csrf-token').catch(() => {});
  }, []);

  // Early prefetch & cache of popup configuration so member devices have it warm on launch
  useEffect(() => {
    const unsub = subscribeToPopupConfig((config) => {
      if (config?.imageData && config.imageData.trim()) {
        try {
          localStorage.setItem(STORAGE_POPUP_IMAGE, config.imageData);
          if (config.imageName) {
            localStorage.setItem(STORAGE_POPUP_IMAGE_NAME, config.imageName);
          }
        } catch {}
      } else if (config === null) {
        try {
          localStorage.removeItem(STORAGE_POPUP_IMAGE);
          localStorage.removeItem(STORAGE_POPUP_IMAGE_NAME);
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  // Automatically sync FCM token for active member profile (completely detached and isolated from main navigation)
  useEffect(() => {
    if (currentUser?.memberId && appPhase === 'app') {
      const timeoutId = setTimeout(() => {
        try {
          syncFcmTokenForActiveMember(currentUser).catch((err) => {
            console.warn('[FCM] Active member token auto-sync note:', err);
          });
        } catch (e) {
          console.warn('[FCM] Synchronous catch note:', e);
        }
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [currentUser?.memberId, appPhase]);

  // Setup foreground push notification listener
  useEffect(() => {
    const unsubscribe = setupForegroundNotificationListener((payload) => {
      if (payload.title || payload.body) {
        setForegroundNotification({
          title: payload.title || 'আমাদের সংগঠন',
          body: payload.body || '',
        });
        setTimeout(() => {
          setForegroundNotification(null);
        }, 5000);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Annual Expenses State (বার্ষিক ব্যয়)
  const [annualExpenses, setAnnualExpenses] = useState<AnnualExpense[]>(() => {
    try {
      const saved = localStorage.getItem('amader_shongothon_annual_expenses_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist Annual Expenses
  useEffect(() => {
    try {
      localStorage.setItem(
        'amader_shongothon_annual_expenses_v1',
        JSON.stringify(annualExpenses)
      );
    } catch (e) {
      console.error('Failed to save annual expenses to local storage', e);
    }
  }, [annualExpenses]);

  // Persist to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error('Failed to save members', e);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Dynamically sync currentWeek according to Bangladesh date and 27/03/2026 cycle
  useEffect(() => {
    const dynamicWeek = getCurrentWeekNumber();
    if (settings.currentWeek !== dynamicWeek) {
      setSettings((prev) => ({
        ...prev,
        currentWeek: dynamicWeek,
      }));
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMIN, String(isAdmin));
    } catch (e) {
      console.error('Failed to save admin state', e);
    }
  }, [isAdmin]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_SESSION);
      }
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }, [currentUser]);

  // ============================================================
  // Firebase Realtime Backend Sync (Auth & Cloud Firestore)
  // ============================================================
  useEffect(() => {
    // 1. Realtime Members listener from Cloud Firestore
    let hasSeededMembers = false;
    let hasNormalizedMemberPaidAmounts = false;
    const unsubMembers = subscribeToMembers((remoteMembers) => {
      if (remoteMembers && remoteMembers.length > 0) {
        const membersNeedingDbUpdate: Member[] = [];
        const normalized = remoteMembers.map((m) => {
          if (!m) return m;
          const isMem1 = m.id === 'mem-1' || m.serialNumber === 1 || m.memberCode === 'সো-০১' || m.memberCode === 'সো-01';
          const effectivePhone = m.phone || (isMem1 ? '01907006460' : '');
          const effectiveRole = isMem1 ? 'admin' : (m.role || 'member');
          let hadLegacy200 = false;
          const weeklyRecords = Array.isArray(m.weeklyRecords)
            ? m.weeklyRecords.map((r) => {
                if (!r) return r;
                const rawTarget = typeof r.targetAmount === 'number' ? r.targetAmount : 100;
                const rawPaid = typeof r.paidAmount === 'number' ? r.paidAmount : 0;
                // If legacy demo/seed record had 200 paidAmount, normalize to 100
                const normalizedPaid = rawPaid === 200 ? 100 : rawPaid;
                if (rawPaid === 200 || rawTarget === 200) {
                  hadLegacy200 = true;
                }
                return {
                  ...r,
                  targetAmount: rawTarget === 200 ? 100 : rawTarget,
                  paidAmount: normalizedPaid,
                };
              })
            : [];
          const totalDeposited = weeklyRecords.reduce((acc, r) => acc + (Number(r?.paidAmount) || 0), 0);
          const updatedM = {
            ...m,
            totalDeposited,
            phone: effectivePhone,
            role: effectiveRole,
            Role: effectiveRole,
            weeklyRecords,
          };
          if (isMem1 && !m.phone) {
            saveMemberToFirestore(updatedM);
          }
          if (hadLegacy200) {
            membersNeedingDbUpdate.push(updatedM);
          }
          return updatedM;
        });
        setMembers(normalized);
        if (membersNeedingDbUpdate.length > 0 && !hasNormalizedMemberPaidAmounts) {
          hasNormalizedMemberPaidAmounts = true;
          setTimeout(() => {
            batchSaveMembersToFirestore(membersNeedingDbUpdate);
          }, 8000);
        }
      } else if (!hasSeededMembers && members.length > 0) {
        hasSeededMembers = true;
        batchSaveMembersToFirestore(members);
      }
    });

    // 2. Realtime Settings listener from Cloud Firestore
    let hasSeededSettings = false;
    const unsubSettings = subscribeToSettings((remoteSettings) => {
      if (remoteSettings) {
        const effectiveWeeklyTarget = remoteSettings.weeklyTarget === 200 ? 100 : (remoteSettings.weeklyTarget || 100);
        const dynamicWeek = getCurrentWeekNumber();
        const rawUrl = remoteSettings.whatsappGroupUrl;
        const effectiveWhatsAppUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0 && !rawUrl.includes('sample-invite-group'))
          ? rawUrl.trim().replace(/^["']|["']$/g, '')
          : (initialSettings.whatsappGroupUrl || 'https://chat.whatsapp.com/DfrtIDj9qRd4kZJ80czlFU');
        const effectiveSplashEnabled = remoteSettings.splashEnabled !== undefined ? remoteSettings.splashEnabled : true;
        const effectiveSplashDuration = remoteSettings.splashDuration || 3;
        const effectiveSplashTransition = remoteSettings.splashTransition || 'fade';
        const effectiveSplashLogo = remoteSettings.splashLogo || 'default';
        const effectiveSplashLogoUrl = remoteSettings.splashLogoUrl;
        const effectivePopupEnabled = remoteSettings.popupEnabled !== undefined ? remoteSettings.popupEnabled : true;
        const effectivePopupDuration = remoteSettings.popupDuration !== undefined ? Number(remoteSettings.popupDuration) : 5;

        setSettings({
          ...remoteSettings,
          weeklyTarget: effectiveWeeklyTarget,
          whatsappGroupUrl: effectiveWhatsAppUrl,
          currentWeek: dynamicWeek,
          splashEnabled: effectiveSplashEnabled,
          splashDuration: effectiveSplashDuration,
          splashTransition: effectiveSplashTransition,
          splashLogo: effectiveSplashLogo,
          splashLogoUrl: effectiveSplashLogoUrl,
          popupEnabled: effectivePopupEnabled,
          popupDuration: effectivePopupDuration,
        });

        // If splash is currently showing but disabled remotely, immediately skip to login
        if (effectiveSplashEnabled === false) {
          setAppPhase((prev) => (prev === 'splash' ? 'login' : prev));
        }
      } else if (!hasSeededSettings) {
        hasSeededSettings = true;
        saveSettingsToFirestore(settings);
      }
    });

    // 3. Realtime Transactions listener from Cloud Firestore
    let hasSeededTxs = false;
    let hasCleanedLegacyDemoTxs = false;
    const unsubTxs = subscribeToTransactions((remoteTransactions) => {
      if (remoteTransactions && remoteTransactions.length > 0) {
        const txsToUpdate: DepositTransaction[] = [];
        const normalizedTxs = remoteTransactions.map((tx) => {
          if (!tx) return tx;
          // Check for legacy Demo/Seed transaction where amount is 200 (created when target was 200)
          if (tx.amount === 200 && (tx.id?.startsWith('tx-') || tx.receiptNo?.startsWith('REC-26-'))) {
            const corrected: DepositTransaction = {
              ...tx,
              amount: 100,
            };
            txsToUpdate.push(corrected);
            return corrected;
          }
          return tx;
        });

        setTransactions(normalizedTxs);

        // If there were legacy Demo transactions in Firestore with 200, update them in Firestore to 100
        if (txsToUpdate.length > 0 && !hasCleanedLegacyDemoTxs) {
          hasCleanedLegacyDemoTxs = true;
          setTimeout(() => {
            batchSaveTransactionsToFirestore(txsToUpdate);
          }, 8000);
        }
      } else if (!hasSeededTxs && transactions.length > 0) {
        hasSeededTxs = true;
        batchSaveTransactionsToFirestore(transactions);
      }
    });

    // 4. Realtime Annual Expenses listener from Cloud Firestore
    const unsubExpenses = subscribeToAnnualExpenses((remoteExpenses) => {
      if (remoteExpenses) {
        setAnnualExpenses(remoteExpenses);
      }
    });

    // 5. Realtime Popup Config pre-fetch listener from Cloud Firestore
    // Preloads the popup announcement image into localStorage at app startup
    // so general members' phones have the image ready instantly with zero lag when PopupDialog opens
    const unsubPopup = subscribeToPopupConfig((config) => {
      if (config && config.imageData && config.imageData.trim()) {
        try {
          localStorage.setItem(STORAGE_POPUP_IMAGE, config.imageData);
          if (config.imageName) {
            localStorage.setItem(STORAGE_POPUP_IMAGE_NAME, config.imageName);
          }
        } catch {}
      } else if (config === null) {
        try {
          localStorage.removeItem(STORAGE_POPUP_IMAGE);
          localStorage.removeItem(STORAGE_POPUP_IMAGE_NAME);
        } catch {}
      }
    });

    return () => {
      unsubMembers();
      unsubSettings();
      unsubTxs();
      unsubExpenses();
      unsubPopup();
    };
  }, []);

  // Direct Route protection: Ensures Member accounts cannot access secret admin dashboard
  useEffect(() => {
    const handleUrlRouteCheck = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const isAdminRoute =
        hash.includes('admin') ||
        hash.includes('more') ||
        search.includes('admin') ||
        search.includes('tab=more');

      if (isAdminRoute) {
        if (!isAdmin || currentUser?.role !== 'admin') {
          // If a member attempts to access admin dashboard via URL, block and return to home
          if (appPhase === 'app') {
            setActiveTab('home');
            if (currentUser?.memberId) {
              setSelectedMemberId(currentUser.memberId);
            }
          }
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else if (appPhase === 'app') {
          setActiveTab('more');
        }
      }
    };

    window.addEventListener('hashchange', handleUrlRouteCheck);
    handleUrlRouteCheck();
    return () => window.removeEventListener('hashchange', handleUrlRouteCheck);
  }, [isAdmin, currentUser, appPhase]);

  // Count members with due
  const dueMembersCount = members.filter(
    (m) => calculateMemberFinances(m, settings.currentWeek).isDefaulter
  ).length;

  // Handlers
  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetails = () => {
    setSelectedMemberId(null);
  };

  const handleTabChange = (tab: ActiveTab) => {
    // Security check (Requirement #6):
    // Regular members cannot access admin dashboard or settings page!
    if (tab === 'more' && (!isAdmin || currentUser?.role !== 'admin')) {
      console.warn('Unauthorized access blocked: Admin role required for settings/admin tab');
      return;
    }
    setActiveTab(tab);
    setSelectedMemberId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open the dedicated Deposit Entry Screen (Requirements #1 - #13)
  const handleOpenDepositEntryScreen = (memberId?: string, weekNumber?: number) => {
    setDepositEntryInitials({
      memberId: memberId || selectedMemberId || undefined,
      weekNumber: weekNumber || settings.currentWeek,
    });
    setSelectedMemberId(null);
    setActiveTab('deposit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open modal fallback if needed
  const handleOpenDepositModal = (memberId?: string, weekNumber?: number) => {
    setDepositModalInitials({
      memberId: memberId || (selectedMemberId ? selectedMemberId : undefined),
      weekNumber: weekNumber || settings.currentWeek,
    });
    setDepositModalOpen(true);
  };

  // Unified 52-Week Deposit Saver & Updater (Requirements #7, #8, #9, #10)
  // - Saves or updates selected week's deposit
  // - Sets status to "paid" (জমা হয়েছে) or "due" (বকেয়া)
  // - Prevents duplicates: updates existing entry in-place
  // - Automatically recalculates member's total deposited, paid weeks, and due weeks
  const handleSaveWeeklyDepositEntry = ({
    memberId,
    weekNumber,
    amount,
    date,
    method = 'cash',
    notes,
    status = 'paid',
  }: {
    memberId: string;
    weekNumber: number;
    amount: number;
    date?: string;
    method?: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
    status?: 'paid' | 'due' | 'partial' | 'advance' | 'upcoming';
  }) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;

    const isDue = status === 'due' || (!status && amount <= 0);
    const isFutureWeek = weekNumber > settings.currentWeek;

    // Rule 1: A member's payment must ALWAYS be applied to outstanding arrears FIRST.
    // If a member has any current/past unpaid weeks (বকেয়া), future weeks cannot be saved as advance/paid.
    if (isFutureWeek && !isDue) {
      const detailed = processMember52Weeks(targetMember, settings.currentWeek, settings.weeklyTarget);
      const hasArrears = detailed.all52Weeks.some(
        (w) => w.weekNumber <= settings.currentWeek && w.status === 'due'
      );
      if (hasArrears) {
        alert('আপনার বকেয়া পরিশোধ করুন।');
        return;
      }
    }

    const finalAmount = isDue ? 0 : (amount > 0 ? amount : 100);
    const finalDate = isDue ? undefined : (date || getBangladeshDateString());

    // 1. Update member's 52-week ledger in-place
    // Existing weekly record must update the SAME record.
    // Preserve memberId and week number.
    // Editing one existing week must NOT create duplicate records.
    // Editing one existing week must NOT redistribute money to other weeks.
    // "বকেয়া" must save with amount 0.
    // "জমা হয়েছে" must save normally.
    const updatedMembers = members.map((m) => {
      if (m.id !== memberId) return m;

      let records = Array.isArray(m.weeklyRecords) ? [...m.weeklyRecords] : [];
      const targetAmount = 100;
      const existingIdx = records.findIndex((r) => Number(r?.weekNumber) === Number(weekNumber));

      if (isDue) {
        const updatedRecord: WeeklyRecord = {
          weekNumber,
          targetAmount,
          paidAmount: 0,
          dueAmount: targetAmount,
          paymentDate: undefined,
          status: 'due',
          paymentMethod: undefined,
          notes: notes !== undefined ? notes : (existingIdx >= 0 ? records[existingIdx].notes : undefined),
          receiptNo: undefined,
        };
        if (existingIdx >= 0) {
          records = records.map((r, i) => (i === existingIdx ? updatedRecord : r));
        } else {
          records = [...records, updatedRecord];
        }
      } else {
        const isFutureWeek = weekNumber > settings.currentWeek;
        const weekStatus: WeeklyRecord['status'] = isFutureWeek ? 'advance' : 'paid';
        const receiptNo = existingIdx >= 0 && records[existingIdx].receiptNo
          ? records[existingIdx].receiptNo
          : `REC-26-${String(weekNumber).padStart(2, '0')}-${String(targetMember.serialNumber).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

        const updatedRecord: WeeklyRecord = {
          weekNumber,
          targetAmount,
          paidAmount: finalAmount > 0 ? finalAmount : targetAmount,
          dueAmount: 0,
          paymentDate: finalDate,
          status: weekStatus,
          paymentMethod: method,
          notes: notes !== undefined ? notes : (existingIdx >= 0 ? records[existingIdx].notes : undefined),
          receiptNo,
        };

        if (existingIdx >= 0) {
          records = records.map((r, idx) => (idx === existingIdx ? updatedRecord : r));
        } else {
          records = [...records, updatedRecord];
        }
      }

      records.sort((a, b) => a.weekNumber - b.weekNumber);

      // Recalculate total deposited
      const totalDeposited = records.reduce((acc, r) => acc + (Number(r?.paidAmount) || 0), 0);

      return {
        ...m,
        totalDeposited,
        weeklyRecords: records,
      };
    });

    setMembers(updatedMembers);

    // Save updated member record to Cloud Firestore
    const updatedTargetMember = updatedMembers.find((m) => m.id === memberId);
    if (updatedTargetMember) {
      saveMemberToFirestore(updatedTargetMember);
    }

    // 2. Update existing transaction or insert new one (Requirement #8: no duplicate transaction)
    if (!isDue && finalAmount > 0 && finalDate) {
      const txReceiptNo = `REC-26-${String(weekNumber).padStart(2, '0')}-${String(targetMember.serialNumber).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      const defaultNote = `সপ্তাহ ${weekNumber}-এর কিস্তি`;

      let txToSave: DepositTransaction | null = null;
      setTransactions((prev) => {
        const existingIdx = prev.findIndex(
          (tx) => tx.memberId === memberId && tx.weekNumber === weekNumber
        );

        if (existingIdx >= 0) {
          // Update existing transaction in place
          const updated = [...prev];
          const updatedTx: DepositTransaction = {
            ...updated[existingIdx],
            amount: finalAmount,
            date: finalDate,
            timestamp: new Date(finalDate).getTime() || Date.now(),
            paymentMethod: method,
            note: notes || defaultNote,
            receiptNo: updated[existingIdx].receiptNo || txReceiptNo,
          };
          updated[existingIdx] = updatedTx;
          txToSave = updatedTx;
          return updated;
        } else {
          // Insert new transaction at top
          const newTx: DepositTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            memberId: targetMember.id,
            memberName: targetMember.name,
            memberCode: targetMember.memberCode,
            weekNumber,
            amount: finalAmount,
            date: finalDate,
            timestamp: new Date(finalDate).getTime() || Date.now(),
            paymentMethod: method,
            note: notes || defaultNote,
            receiptNo: txReceiptNo,
          };
          txToSave = newTx;
          return [newTx, ...prev];
        }
      });
      if (txToSave) {
        saveTransactionToFirestore(txToSave);
      }
    } else if (isDue) {
      // If marked as due, remove any transaction for this member and week
      setTransactions((prev) =>
        prev.filter((tx) => !(tx.memberId === memberId && tx.weekNumber === weekNumber))
      );
      deleteTransactionsForMemberWeek(memberId, weekNumber);
    }
  };

  // Direct 52-week deposit update (uses unified saver)
  const handleDirectWeeklyDepositUpdate = handleSaveWeeklyDepositEntry;
  const handleSaveDeposit = handleSaveWeeklyDepositEntry;

  // Add or edit a member
  const handleSaveMember = (data: {
    id?: string;
    serialNumber: number;
    memberCode: string;
    name: string;
    phone: string;
    joinedDate: string;
    notes?: string;
    photoUrl?: string;
  }) => {
    // Only Admin can perform this action
    if (!isAdmin) {
      console.warn('Unauthorized: only admin can edit members');
      return;
    }

    if (data.id) {
      // Edit existing member: strictly updates ONLY Name and Mobile Number!
      // Member ID, serialNumber, joinedDate, notes, role, status, weeklyRecords are preserved.
      let updatedMemberToSave: Member | null = null;
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === data.id) {
            const updated: Member = {
              ...m,
              name: data.name.trim(),
              phone: data.phone.trim(),
            };
            updatedMemberToSave = updated;
            return updated;
          }
          return m;
        })
      );
      if (updatedMemberToSave) {
        saveMemberToFirestore(updatedMemberToSave);
      }

      // If current logged-in user session matches this member, keep session in sync
      if (currentUser && currentUser.memberId === data.id) {
        const updatedSession: UserSession = {
          ...currentUser,
          name: data.name.trim(),
          phone: data.phone.trim(),
        };
        setCurrentUser(updatedSession);
        try {
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedSession));
        } catch {}
      }
    } else {
      // Add new member
      const newMemberId = `mem-${Date.now()}`;
      const newWeeks: WeeklyRecord[] = Array.from({ length: 52 }, (_, i) => ({
        weekNumber: i + 1,
        targetAmount: settings.weeklyTarget,
        paidAmount: 0,
        status: (i + 1 <= settings.currentWeek) ? 'due' : 'upcoming',
      }));

      const newMember: Member = {
        id: newMemberId,
        serialNumber: data.serialNumber,
        memberCode: data.memberCode,
        name: data.name,
        phone: data.phone,
        joinedDate: data.joinedDate || '২০২৬-০১-০১',
        avatarColor: 'bg-emerald-600',
        photoUrl: data.photoUrl,
        weeklyRecords: newWeeks,
        notes: data.notes || 'সাধারণ সদস্য',
      };

      setMembers((prev) => [...prev, newMember]);
      saveMemberToFirestore(newMember);
    }
  };

  // Direct profile avatar update (from MemberDetails or avatar modal)
  const handleUpdateMemberAvatar = (memberId: string, photoUrl?: string) => {
    // Security check: Only admin or the member themselves can update their avatar
    const currentMemberId = currentUser?.memberId || loggedInMember?.id;
    if (!isAdmin && currentMemberId !== memberId) {
      console.warn('Unauthorized avatar update attempt blocked.');
      return;
    }
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const updated = { ...m, photoUrl };
          saveMemberToFirestore(updated);
          return updated;
        }
        return m;
      })
    );
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    deleteMemberFromFirestore(memberId);
    if (selectedMemberId === memberId) {
      setSelectedMemberId(null);
    }
  };

  // Toggle member notification enabled/disabled (Admin-only)
  const handleToggleMemberNotification = (memberId: string, enabled: boolean) => {
    if (!isAdmin) {
      console.warn('Unauthorized: only admin can toggle member notifications');
      return;
    }
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const updated = { ...m, notificationsEnabled: enabled };
          saveMemberToFirestore(updated);
          return updated;
        }
        return m;
      })
    );
  };

  // Admin login / logout
  const handleAdminLogin = (pin: string): boolean => {
    const cleanPin = pin
      .replace(/[০-৯]/g, (d: string) => ({ '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' }[d] || d))
      .trim();
    if (cleanPin === '1962' || cleanPin === (settings.adminPin || '1962')) {
      setIsAdmin(true);
      setCurrentUser((prev) =>
        prev
          ? { ...prev, role: 'admin' }
          : { role: 'admin', name: 'সংগঠন অ্যাডমিন', loginTime: Date.now() }
      );
      try {
        localStorage.setItem(STORAGE_ADMIN, 'true');
      } catch {}
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentUser((prev) => (prev?.memberId ? { ...prev, role: 'member' } : null));
    try {
      localStorage.setItem(STORAGE_ADMIN, 'false');
    } catch {}
    setActiveTab('home');
  };

  const handleUpdateSettings = async (newSettings: Partial<OrganizationSettings>) => {
    const updated = {
      ...settings,
      ...newSettings,
    };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
    await saveSettingsToFirestore(updated);
  };

  const handleUpdateWhatsAppLink = async (
    newUrl: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateWhatsAppGroupLinkInFirestore(newUrl);
    if (res.success) {
      setSettings((prev) => ({
        ...prev,
        whatsappGroupUrl: newUrl.trim(),
      }));
    }
    return res;
  };

  // Reset to default 25 members
  const handleResetDefaultData = () => {
    const initial = getInitialMembers();
    setMembers(initial.members);
    setTransactions(initial.allTransactions);
    setSettings(initialSettings);
    batchSaveMembersToFirestore(initial.members);
    batchSaveTransactionsToFirestore(initial.allTransactions);
    saveSettingsToFirestore(initialSettings);
    localStorage.removeItem(STORAGE_MEMBERS);
    localStorage.removeItem(STORAGE_SETTINGS);
    localStorage.removeItem(STORAGE_TRANSACTIONS);
  };

  // Export data as JSON
  const handleExportData = () => {
    const backupData = {
      settings,
      members,
      transactions,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amader_shongothon_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Force Password Reset Guard: Members with pending password reset must be directed to set password
  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setAppPhase('force-new-password');
    } else if (currentUser?.memberId && members.length > 0) {
      const mem = members.find((m) => m.id === currentUser.memberId);
      if (mem?.mustChangePassword || mem?.requiresPasswordReset) {
        setAppPhase('force-new-password');
      }
    }
  }, [currentUser, members]);

  // Unified Login from Login Screen
  const handleLogin = async (
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedId = identifier.trim();
    const trimmedPw = (password || '').trim();

    if (!trimmedPw) {
      return {
        success: false,
        error: 'অনুগ্রহ করে পাসওয়ার্ড লিখুন।',
      };
    }

    // Try Firebase Authentication
    try {
      const loginResult = await loginWithPhoneAndPassword(trimmedId, trimmedPw, members);
      const { role, member: authMember, user: fbUser, mustChangePassword } = loginResult;

      // Match member from loaded members state or auth result
      const targetMember =
        authMember ||
        (role === 'admin'
          ? members.find((m) => m.id === 'mem-1' || m.serialNumber === 1 || (m.Role || m.role) === 'admin') || members[0]
          : members.find((m) => m.phone === trimmedId || m.memberCode === trimmedId));

      if (targetMember && !members.some((m) => m.id === targetMember.id)) {
        setMembers((prev) => [targetMember, ...prev]);
      }

      const memberId = targetMember?.id || authMember?.id || (role === 'admin' ? 'mem-1' : undefined);
      const memberName = targetMember?.name || authMember?.name || (role === 'admin' ? 'অ্যাডমিন' : 'সদস্য');
      const memberPhone = targetMember?.phone || authMember?.phone || trimmedId;

      // Check if account must change password (due to admin reset or initial 1234 demo password)
      const needsPasswordChange = Boolean(
        mustChangePassword ||
        targetMember?.mustChangePassword ||
        targetMember?.requiresPasswordReset ||
        (role === 'member' && trimmedPw === '1234')
      );

      if (needsPasswordChange) {
        const session: UserSession = {
          role: 'member',
          memberId,
          name: memberName,
          phone: memberPhone,
          uid: fbUser.uid,
          mustChangePassword: true,
          loginTime: Date.now(),
        };
        setCurrentUser(session);
        setAppPhase('force-new-password');
        try {
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
        } catch {}
        return { success: true };
      }

      if (role === 'admin') {
        const session: UserSession = {
          role: 'admin',
          memberId,
          name: memberName,
          phone: memberPhone,
          uid: fbUser.uid,
          loginTime: Date.now(),
        };
        setCurrentUser(session);
        setSelectedMemberId(null);
        setAppPhase('panel-selection');
        try {
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
          localStorage.setItem(STORAGE_ADMIN, 'true');
        } catch {}
        return { success: true };
      } else {
        // Regular Member Login: Check for single vs multiple profiles under this phone number
        const normalizedInputPhone = normalizeBangladeshiPhone(trimmedId);
        const cleanDigitsInput = trimmedId.replace(/\D/g, '');

        // Collect matching member profiles from loaded state
        const localMatched = members.filter((m) => {
          // CRITICAL: Exclude Admin account (mem-1 / role=admin) completely (Rule #4 & #5)
          if (m.id === 'mem-1' || (m.Role || m.role) === 'admin') return false;

          const mNorm = normalizeBangladeshiPhone(m.phone || '');
          const mDigits = (m.phone || '').replace(/\D/g, '');
          const phoneMatch =
            (normalizedInputPhone && mNorm && normalizedInputPhone === mNorm) ||
            (cleanDigitsInput.length >= 6 &&
              mDigits.length >= 6 &&
              (cleanDigitsInput === mDigits ||
                cleanDigitsInput.endsWith(mDigits) ||
                mDigits.endsWith(cleanDigitsInput)));
          const codeMatch = (m.memberCode || '').toLowerCase() === trimmedId.toLowerCase();

          return phoneMatch || codeMatch;
        });

        // Merge with any profiles returned from authentication result
        const profileMap = new Map<string, Member>();
        localMatched.forEach((m) => {
          if (m.id !== 'mem-1' && (m.Role || m.role) !== 'admin') {
            profileMap.set(m.id, m);
          }
        });
        if (loginResult.matchingMembers && Array.isArray(loginResult.matchingMembers)) {
          loginResult.matchingMembers.forEach((m) => {
            if (m.id !== 'mem-1' && (m.Role || m.role) !== 'admin') {
              profileMap.set(m.id, { ...profileMap.get(m.id), ...m });
            }
          });
        }
        if (authMember && authMember.id !== 'mem-1' && (authMember.Role || authMember.role) !== 'admin') {
          profileMap.set(authMember.id, { ...profileMap.get(authMember.id), ...authMember });
        }

        const allMatchingProfiles = Array.from(profileMap.values());

        if (allMatchingProfiles.length > 1) {
          // Rule #3: 2 or more profiles -> show Member Profile Selection Screen
          setPendingAuthUser(fbUser);
          setAvailableMemberProfiles(allMatchingProfiles);
          setAppPhase('member-profile-selection');
          return { success: true };
        } else {
          // Rule #2 & #10: Exactly 1 profile -> Direct login without any selection screen
          const target = allMatchingProfiles[0] || targetMember;
          if (target && !members.some((m) => m.id === target.id)) {
            setMembers((prev) => [target, ...prev]);
          }
          const chosenMemberId = target?.id;
          const chosenMemberName = target?.name || memberName;
          const chosenMemberPhone = target?.phone || memberPhone;

          const session: UserSession = {
            role: 'member',
            memberId: chosenMemberId,
            name: chosenMemberName,
            phone: chosenMemberPhone,
            uid: fbUser.uid,
            loginTime: Date.now(),
          };
          setCurrentUser(session);
          setIsAdmin(false);
          setSelectedMemberId(null);
          setAvailableMemberProfiles([]);
          setPendingAuthUser(null);
          setIsPopupDismissedThisSession(false);
          setAppPhase('app');
          setActiveTab('home');
          try {
            localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
            localStorage.setItem(STORAGE_ADMIN, 'false');
          } catch {}
          return { success: true };
        }
      }
    } catch (authError: any) {
      console.warn('Firebase Auth login attempt error:', authError);
      return {
        success: false,
        error: authError?.message || 'মোবাইল নম্বর বা পাসওয়ার্ড মেলেনি। অনুগ্রহ করে সঠিক তথ্য লিখুন।',
      };
    }
  };

  // Panel Selection Handlers for Admin + Member accounts
  const handleSelectAdminPanel = () => {
    setIsAdmin(true);
    if (currentUser) {
      const updated: UserSession = { ...currentUser, role: 'admin' };
      setCurrentUser(updated);
      try {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(updated));
        localStorage.setItem(STORAGE_ADMIN, 'true');
      } catch {}
    } else {
      try {
        localStorage.setItem(STORAGE_ADMIN, 'true');
      } catch {}
    }
    setSelectedMemberId(null);
    setIsPopupDismissedThisSession(false);
    setAppPhase('app');
    setActiveTab('home');
  };

  const handleSelectMemberPanel = () => {
    setIsAdmin(false);
    if (currentUser) {
      const updated: UserSession = { ...currentUser, role: 'member' };
      setCurrentUser(updated);
      try {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(updated));
        localStorage.setItem(STORAGE_ADMIN, 'false');
      } catch {}
    } else {
      try {
        localStorage.setItem(STORAGE_ADMIN, 'false');
      } catch {}
    }
    setSelectedMemberId(null);
    setIsPopupDismissedThisSession(false);
    setAppPhase('app');
    setActiveTab('home');
  };

  // Member Profile Selection Handler (When member chooses a profile from multiple profiles)
  const handleSelectMemberProfile = (profile: Member) => {
    // Strictly enforce member role (Rule #4 & #5)
    setIsAdmin(false);
    const session: UserSession = {
      role: 'member',
      memberId: profile.id,
      name: profile.name,
      phone: profile.phone,
      uid: pendingAuthUser?.uid || currentUser?.uid || profile.uid || ('session-user-' + profile.id),
      loginTime: Date.now(),
    };
    setCurrentUser(session);
    setSelectedMemberId(null);
    setAvailableMemberProfiles([]);
    setPendingAuthUser(null);
    setIsPopupDismissedThisSession(false);
    setAppPhase('app');
    setActiveTab('home');
    try {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
      localStorage.setItem(STORAGE_ADMIN, 'false');
    } catch {}
  };

  // Open Member Profile Selection directly from Settings (Without Logout or Re-login)
  const handleOpenProfileSelectionFromSettings = () => {
    const currentMemberPhone = loggedInMember?.phone || currentUser?.phone || '';
    const normPhone = normalizeBangladeshiPhone(currentMemberPhone);
    const cleanDigits = currentMemberPhone.replace(/\D/g, '');

    const samePhoneProfiles = members.filter((m) => {
      // Rule #4: Exclude Admin account completely
      if (m.id === 'mem-1' || (m.Role || m.role) === 'admin') return false;

      const mNorm = normalizeBangladeshiPhone(m.phone || '');
      const mDigits = (m.phone || '').replace(/\D/g, '');
      const match =
        (normPhone && mNorm && normPhone === mNorm) ||
        (cleanDigits.length >= 6 &&
          mDigits.length >= 6 &&
          (cleanDigits === mDigits ||
            cleanDigits.endsWith(mDigits) ||
            mDigits.endsWith(cleanDigits)));
      return Boolean(match);
    });

    if (samePhoneProfiles.length >= 2) {
      setAvailableMemberProfiles(samePhoneProfiles);
      setAppPhase('member-profile-selection');
    }
  };

  const handleAppLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setSelectedMemberId(null);
    setAvailableMemberProfiles([]);
    setPendingAuthUser(null);
    setIsPopupDismissedThisSession(false);
    try {
      localStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem(STORAGE_ADMIN);
    } catch {}
    signOutFirebaseUser().catch(() => {});
    setAppPhase('login');
    setActiveTab('home');
  };

  // Forced Password Change Handler
  const handleCompleteForcedPasswordChange = async (newPassword: string) => {
    if (!currentUser?.memberId) {
      throw new Error('সদস্যের তথ্য পাওয়া যায়নি।');
    }
    await completeForcedPasswordChange(currentUser.memberId, newPassword);
    const updatedSession: UserSession = {
      ...currentUser,
      mustChangePassword: false,
    };
    setCurrentUser(updatedSession);
    try {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedSession));
    } catch {}

    // Update local member state to clear password reset flags
    setMembers((prev) =>
      prev.map((m) =>
        m.id === currentUser.memberId
          ? { ...m, mustChangePassword: false, requiresPasswordReset: false }
          : m
      )
    );

    setIsPopupDismissedThisSession(false);
    setAppPhase('app');
    setActiveTab('home');
  };

  // Admin Password Reset Handlers
  const handleOpenResetPasswordModal = (member: Member) => {
    setResetModalMember(member);
  };

  const handleConfirmAdminResetPassword = async (memberId: string) => {
    return await adminResetMemberPassword(memberId);
  };

  const handleSaveAnnualExpense = async (expense: AnnualExpense) => {
    const expenseWithId: AnnualExpense = {
      ...expense,
      id:
        expense.id && expense.id.trim()
          ? expense.id
          : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: expense.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    setAnnualExpenses((prev) => {
      const exists = prev.some((e) => e.id === expenseWithId.id);
      if (exists) {
        return prev.map((e) => (e.id === expenseWithId.id ? expenseWithId : e));
      }
      return [expenseWithId, ...prev];
    });

    await saveAnnualExpenseToFirestore(expenseWithId);
  };

  const handleDeleteAnnualExpense = async (id: string) => {
    setAnnualExpenses((prev) => prev.filter((e) => e.id !== id));
    await deleteAnnualExpenseFromFirestore(id);
  };

  const handleUserPasswordUpdate = async (
    currentPassword?: string,
    newPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await updateUserPassword(currentPassword, newPassword);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে।',
      };
    }
  };

  // Find currently logged-in member from Firebase / members state (Requirement: Home displays logged-in member's profile)
  const loggedInMember = useMemo(() => {
    if (!members || members.length === 0) return null;
    if (currentUser?.memberId) {
      const found = members.find((m) => m.id === currentUser.memberId);
      if (found) return found;
    }
    if (currentUser?.phone) {
      const cleanPhone = currentUser.phone.replace(/\D/g, '');
      const found = members.find((m) => m.phone.replace(/\D/g, '') === cleanPhone);
      if (found) return found;
    }
    if (currentUser?.name) {
      const found = members.find((m) => m.name === currentUser.name);
      if (found) return found;
    }
    // Fallback if admin or general session
    const adminMember = members.find(
      (m) =>
        (m.Role || m.role) === 'admin' ||
        m.memberCode === 'সো-০১' ||
        m.memberCode === 'সো-01' ||
        m.serialNumber === 1
    );
    return adminMember || members[0] || null;
  }, [members, currentUser]);

  // Find currently selected member from members list
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  const isAdminUser = Boolean(isAdmin && currentUser?.role === 'admin');

  // 1. Splash Screen Phase
  if (appPhase === 'splash') {
    if (settings.splashEnabled === false) {
      setAppPhase('login');
      return null;
    }
    return (
      <SplashScreen
        duration={settings.splashDuration || 3}
        transition={settings.splashTransition || 'fade'}
        logoPreset={settings.splashLogo || 'default'}
        logoUrl={settings.splashLogoUrl}
        onFinish={() => setAppPhase('login')}
      />
    );
  }

  // 2. Login Screen Phase
  if (appPhase === 'login') {
    return (
      <LoginScreen
        members={members}
        onLogin={handleLogin}
        onBackToSplash={() => setAppPhase('splash')}
      />
    );
  }

  // 3. Panel Selection Phase (Admin + Member accounts)
  if (appPhase === 'panel-selection') {
    const adminMember =
      (currentUser?.memberId ? members.find((m) => m.id === currentUser.memberId) : null) ||
      loggedInMember ||
      (members && members.length > 0 ? members[0] : null);

    return (
      <PanelSelectionScreen
        member={adminMember}
        onSelectAdmin={handleSelectAdminPanel}
        onSelectMember={handleSelectMemberPanel}
      />
    );
  }

  // 3.1. Member Profile Selection Phase (For regular members with multiple profiles under same phone)
  if (appPhase === 'member-profile-selection') {
    return (
      <MemberProfileSelectionScreen
        profiles={availableMemberProfiles}
        allMembers={members}
        onSelectProfile={handleSelectMemberProfile}
        currentMemberId={currentUser?.memberId}
        isLoggedIn={Boolean(currentUser)}
        onBackToLogin={() => {
          if (currentUser) {
            setAvailableMemberProfiles([]);
            setAppPhase('app');
          } else {
            setAvailableMemberProfiles([]);
            setPendingAuthUser(null);
            setAppPhase('login');
          }
        }}
      />
    );
  }

  // 4. Force New Password Phase (Post Admin Reset)
  if (appPhase === 'force-new-password') {
    return (
      <ForceNewPasswordScreen
        currentUser={currentUser || { role: 'member', name: 'সদস্য' }}
        onSubmitNewPassword={handleCompleteForcedPasswordChange}
        onLogout={handleAppLogout}
      />
    );
  }

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'home':
        return loggedInMember ? (
          <AdminHomePage
            adminMember={loggedInMember}
            allMembers={members}
            settings={settings}
            onNavigateTab={handleTabChange}
            onRecordDeposit={handleOpenDepositEntryScreen}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setMemberModalOpen(true);
            }}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onUpdateWeeklyDeposit={handleDirectWeeklyDepositUpdate}
          />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-semibold text-slate-500">প্রোফাইল লোড হচ্ছে...</p>
          </div>
        );

      case 'deposit':
        return (
          <DepositEntryPage
            members={members}
            settings={settings}
            transactions={transactions}
            initialMemberId={depositEntryInitials.memberId}
            initialWeekNumber={depositEntryInitials.weekNumber}
            onSaveDeposit={handleSaveWeeklyDepositEntry}
            onSelectMember={handleSelectMember}
            isAdmin={true}
          />
        );

      case 'members':
        return selectedMember ? (
          <AdminMemberDetailsPage
            member={selectedMember}
            settings={settings}
            allMembers={members}
            onBack={() => setSelectedMemberId(null)}
            onRecordDeposit={handleOpenDepositEntryScreen}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setMemberModalOpen(true);
            }}
            onResetPassword={handleOpenResetPasswordModal}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onUpdateWeeklyDeposit={handleDirectWeeklyDepositUpdate}
            onToggleNotification={handleToggleMemberNotification}
            onNavigateTab={handleTabChange}
          />
        ) : (
          <AdminMembersListPage
            members={members}
            settings={settings}
            isAdmin={true}
            onSelectMember={handleSelectMember}
            onAddNewMember={() => {
              setMemberToEdit(null);
              setMemberModalOpen(true);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setMemberModalOpen(true);
            }}
            onRecordDeposit={handleOpenDepositEntryScreen}
          />
        );

      case 'due':
        return (
          <AdminDueMembersPage
            members={members}
            settings={settings}
            onSelectMember={handleSelectMember}
            onRecordDeposit={handleOpenDepositEntryScreen}
          />
        );

      case 'more':
        return isAdmin && currentUser?.role === 'admin' ? (
          <MoreSettingsPage
            settings={settings}
            isAdmin={isAdmin}
            onUpdateSettings={handleUpdateSettings}
            onResetData={handleResetDefaultData}
            onNavigateTab={handleTabChange}
            onAdminToggle={() => {
              if (isAdmin) {
                handleAdminLogout();
              } else {
                setAdminModalOpen(true);
              }
            }}
            onExportData={handleExportData}
          />
        ) : (
          <div className="p-6 m-4 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-700">অননুমোদিত প্রবেশাধিকার</h3>
              <p className="text-base font-bold text-rose-600 mt-1">
                আপনার Admin Access নেই।
              </p>
            </div>
          </div>
        );

      case 'report':
        return (
          <AdminReportPage
            members={members}
            settings={settings}
            annualExpenses={annualExpenses}
            isAdmin={true}
            onSaveAnnualExpense={handleSaveAnnualExpense}
            onDeleteAnnualExpense={handleDeleteAnnualExpense}
          />
        );

      case 'sets':
        return (
          <AdminSetsPage
            members={members}
            settings={settings}
            onUpdateSettings={async (newSetts) => {
              await handleUpdateSettings(newSetts);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setMemberModalOpen(true);
            }}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onResetPassword={handleOpenResetPasswordModal}
            onToggleNotification={handleToggleMemberNotification}
            onDeleteMember={handleDeleteMember}
          />
        );

      case 'settings':
        return (
          <AdminSettingsPage
            currentUser={currentUser}
            isAdmin={true}
            members={members}
            settings={settings}
            onLogout={handleAppLogout}
            onUpdatePassword={handleUserPasswordUpdate}
            onUpdateWhatsAppLink={handleUpdateWhatsAppLink}
          />
        );

      case 'history':
        return (
          <DepositHistoryPage
            transactions={transactions}
            settings={settings}
            onSelectMember={handleSelectMember}
            onOpenDepositModal={() => handleOpenDepositEntryScreen()}
            isAdmin={true}
          />
        );

      default:
        return isAdmin && currentUser?.role === 'admin' ? (
          <AdminDashboardPage
            members={members}
            settings={settings}
            transactions={transactions}
            isAdmin={isAdmin}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            onSelectMember={handleSelectMember}
            onAddNewMember={() => {
              setMemberToEdit(null);
              setMemberModalOpen(true);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setMemberModalOpen(true);
            }}
            onRecordDeposit={handleOpenDepositEntryScreen}
            onUpdateSettings={handleUpdateSettings}
            onResetDefaultData={handleResetDefaultData}
            onExportData={handleExportData}
            onNavigateToHistory={() => {
              setActiveTab('history');
              setSelectedMemberId(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="p-6 m-4 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-700">অননুমোদিত প্রবেশাধিকার</h3>
            </div>
          </div>
        );
    }
  };

  const renderMemberContent = () => {
    switch (activeTab) {
      case 'home':
        return loggedInMember ? (
          <MemberHomePage
            member={loggedInMember}
            settings={settings}
            allMembers={members}
            onNavigateTab={handleTabChange}
            onRecordDeposit={handleOpenDepositEntryScreen}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onUpdateWeeklyDeposit={handleDirectWeeklyDepositUpdate}
          />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-semibold text-slate-500">প্রোফাইল লোড হচ্ছে...</p>
          </div>
        );

      case 'deposit':
        return (
          <DepositEntryPage
            members={members}
            settings={settings}
            transactions={transactions}
            initialMemberId={depositEntryInitials.memberId}
            initialWeekNumber={depositEntryInitials.weekNumber}
            onSaveDeposit={handleSaveWeeklyDepositEntry}
            onSelectMember={handleSelectMember}
            isAdmin={false}
          />
        );

      case 'members':
        return selectedMember ? (
          <MemberProfilePage
            member={selectedMember}
            settings={settings}
            isAdmin={false}
            allMembers={members}
            currentUserMemberId={currentUser?.memberId || loggedInMember?.id || null}
            onBack={() => setSelectedMemberId(null)}
            onRecordDeposit={handleOpenDepositEntryScreen}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onUpdateWeeklyDeposit={handleDirectWeeklyDepositUpdate}
          />
        ) : (
          <MemberDirectoryPage
            members={members}
            settings={settings}
            isAdmin={false}
            onSelectMember={handleSelectMember}
            onAddNewMember={() => {}}
            onEditMember={() => {}}
            onRecordDeposit={handleOpenDepositEntryScreen}
          />
        );

      case 'report':
        return (
          <MemberReportPage
            members={members}
            settings={settings}
            annualExpenses={annualExpenses}
            isAdmin={false}
            onSaveAnnualExpense={handleSaveAnnualExpense}
            onDeleteAnnualExpense={handleDeleteAnnualExpense}
          />
        );

      case 'settings':
        return (
          <MemberSettingsPage
            currentUser={currentUser}
            isAdmin={false}
            members={members}
            settings={settings}
            onLogout={handleAppLogout}
            onUpdatePassword={handleUserPasswordUpdate}
            onSwitchProfile={handleOpenProfileSelectionFromSettings}
          />
        );

      case 'more':
      case 'due':
      case 'history':
      default:
        return (
          <div className="p-6 m-4 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-700">অননুমোদিত প্রবেশাধিকার</h3>
              <p className="text-base font-bold text-rose-600 mt-1">
                আপনার Admin Access নেই।
              </p>
              <p className="text-xs text-slate-500 mt-1">
                এই পেজটি শুধুমাত্র অনুমোদিত অ্যাডমিন অ্যাকাউন্টের জন্য সংরক্ষিত। সাধারণ সদস্যরা এখানে প্রবেশ করতে পারবেন না।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                if (currentUser?.memberId) setSelectedMemberId(currentUser.memberId);
              }}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 cursor-pointer"
            >
              আমার ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
        );
    }
  };

  return (
    <>
      {isAdminUser ? (
        <AdminRootLayout
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentWeek={settings.currentWeek}
          dueMembersCount={dueMembersCount}
          onAdminClick={() => handleTabChange('more')}
        >
          {renderAdminContent()}
        </AdminRootLayout>
      ) : (
        <MemberRootLayout
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentWeek={settings.currentWeek}
          dueMembersCount={dueMembersCount}
          onAdminClick={() => setAdminModalOpen(true)}
        >
          {renderMemberContent()}
        </MemberRootLayout>
      )}

      {/* Modals */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        members={members}
        initialMemberId={depositModalInitials.memberId}
        initialWeekNumber={depositModalInitials.weekNumber}
        settings={settings}
        onSaveDeposit={handleSaveDeposit}
      />

      <AdminMemberFormModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        memberToEdit={memberToEdit}
        totalMembersCount={members.length}
        onSaveMember={handleSaveMember}
        onDeleteMember={handleDeleteMember}
      />

      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaultData={handleResetDefaultData}
        onExportData={handleExportData}
      />

      <AdminPasswordResetModal
        isOpen={Boolean(resetModalMember)}
        member={resetModalMember}
        onClose={() => setResetModalMember(null)}
        onConfirmReset={handleConfirmAdminResetPassword}
      />

      {/* In-App Foreground Push Notification Banner */}
      {foregroundNotification && (
        <div
          id="foreground-fcm-banner"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-start gap-3 transition-all animate-in slide-in-from-top-4 duration-200"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">
              {foregroundNotification.title}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
              {foregroundNotification.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForegroundNotification(null)}
            className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Interface Popup Dialog (Controlled by Firestore settings: popupEnabled & popupDuration) */}
      {settings.popupEnabled !== false && !isPopupDismissedThisSession && (
        <PopupDialog
          isOpen={true}
          duration={settings.popupDuration !== undefined ? Number(settings.popupDuration) : 5}
          onClose={() => setIsPopupDismissedThisSession(true)}
        />
      )}

      {/* User-Initiated Self-Hosted OTA Update Dialog */}
      {otaUpdateInfo && !isOtaDismissedThisSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-200/80 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Gradient Header Banner */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white text-center relative overflow-hidden">
              {/* Subtle decorative circles */}
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />

              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-2.5 backdrop-blur-xs border border-white/20 shadow-inner relative z-10">
                {otaUpdateSuccess ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-200 stroke-[2.5]" />
                ) : (
                  <ArrowDownToLine className="w-6 h-6 text-white stroke-[2.5]" />
                )}
              </div>

              <h3 className="text-base font-bold text-white tracking-tight relative z-10">
                {otaUpdateSuccess ? 'আপডেট সম্পন্ন হয়েছে' : 'নতুন সংস্করণ উপলব্ধ'}
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5 relative z-10">
                {otaUpdateSuccess ? 'সফলভাবে ডাউনলোড ও প্রস্তুত হয়েছে' : 'আমাদের সংগঠনের নতুন আপডেট এসেছে'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 text-center">
              {otaUpdateSuccess ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 text-emerald-900 p-3.5 rounded-2xl border border-emerald-200/80 text-xs font-medium space-y-1">
                    <p className="font-bold text-emerald-950 text-sm">🎉 আপডেট সফল হয়েছে!</p>
                    <p className="text-emerald-800 text-[11px] leading-relaxed">
                      নতুন সংস্করণ চালু করতে অ্যাপটি বন্ধ করে পুনরায় চালু (Restart) করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissOtaDialog}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    ঠিক আছে
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs text-slate-600">
                  {/* Version Comparison Card */}
                  <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/90 rounded-2xl py-2.5 px-4">
                    <div className="text-left flex-1 min-w-0">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">বর্তমান</span>
                      <span className="font-mono font-bold text-slate-700 text-xs truncate block">{otaUpdateInfo.currentVersion}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-right flex-1 min-w-0">
                      <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">নতুন ভার্সন</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs truncate block">{otaUpdateInfo.newVersion}</span>
                    </div>
                  </div>

                  {/* Release Notes if available */}
                  {otaUpdateInfo.manifest.releaseNotes && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-left space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">আপডেট বিবরণ</span>
                      <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-3">
                        {otaUpdateInfo.manifest.releaseNotes}
                      </p>
                    </div>
                  )}

                  {/* Downloading Progress Indicator */}
                  {isOtaUpdating && (
                    <div className="space-y-2 py-1">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full animate-pulse w-4/5" />
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium animate-pulse">প্যাকেজ ডাউনলোড ও প্রতিস্থাপন হচ্ছে...</p>
                    </div>
                  )}

                  {/* Error Message Callout */}
                  {otaErrorMessage && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-left font-medium">
                      {otaErrorMessage}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isOtaUpdating}
                      onClick={handleDismissOtaDialog}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      পরে করবেন
                    </button>
                    <button
                      type="button"
                      disabled={isOtaUpdating}
                      onClick={handlePerformOtaUpdate}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isOtaUpdating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>ডাউনলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <span>এখন আপডেট করুন</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default App;
