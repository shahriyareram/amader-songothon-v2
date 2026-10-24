export interface WeeklyRecord {
  weekNumber: number; // 1 to 52
  targetAmount: number;
  paidAmount: number;
  dueAmount?: number;
  paymentDate?: string;
  status: 'paid' | 'due' | 'advance' | 'partial' | 'upcoming';
  paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'bank';
  notes?: string;
  receiptNo?: string;
}

export interface Member {
  id: string;
  serialNumber: number; // 1 to 25
  memberCode: string;   // e.g. "সো-০১"
  name: string;
  phone: string;
  joinedDate: string;
  avatarColor: string;
  photoUrl?: string; // Profile picture URL or data URL
  weeklyRecords: WeeklyRecord[];
  totalDeposited?: number;
  notes?: string;
  // Firestore role & link fields
  uid?: string;
  Role?: string;
  role?: string;
  Status?: string;
  status?: string;
  Phone?: string;
  weeklyAmount?: number;
  'Weekly Amount'?: number;
  JoinDate?: any;
  mustChangePassword?: boolean;
  requiresPasswordReset?: boolean;
  passwordSetupCompleted?: boolean;
  passwordResetAt?: any;
  fcmToken?: string;
  fcmUpdatedAt?: any;
  notificationsEnabled?: boolean;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  uid?: string;
  memberUid?: string;
  weekNumber: number;
  amount: number;
  date: string;
  timestamp: number;
  paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'bank';
  note?: string;
  receiptNo?: string;
  status?: string;
}

export interface DepositTransaction {
  id: string;
  memberId: string;
  uid?: string;
  memberName: string;
  memberCode: string;
  weekNumber: number;
  amount: number;
  date: string;
  timestamp: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
  note?: string;
  receiptNo: string;
}

export interface OrganizationSettings {
  orgName: string;
  weeklyTarget: number;
  currentWeek: number;
  currentYear: number;
  adminPin: string;
  whatsappGroupUrl?: string;
  splashEnabled?: boolean;
  splashDuration?: number;
  splashTransition?: 'fade' | 'zoom' | 'slide' | 'none';
  splashLogo?: string;
  splashLogoUrl?: string;
  popupEnabled?: boolean;
  popupDuration?: number;
}

export type UserRole = 'admin' | 'member';

export interface UserSession {
  role: UserRole;
  memberId?: string;
  name: string;
  phone?: string;
  uid?: string;
  token?: string;
  mustChangePassword?: boolean;
  loginTime?: number;
}

export interface AnnualExpense {
  id: string; // e.g. "2026"
  year: number; // e.g. 2026
  amount: number;
  description: string;
  date: string;
  recordedBy?: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: any;
}

export type ActiveTab = 'home' | 'members' | 'report' | 'settings' | 'deposit' | 'due' | 'more' | 'history' | 'sets';

export type NotificationType = 'payment_confirmation' | 'deposit_confirmation' | 'weekly_reminder' | 'announcement';
export type NotificationStatus = 'pending' | 'ready' | 'confirmed' | 'sent' | 'skipped' | 'cancelled';

export interface NotificationEvent {
  id: string;
  memberId: string;
  type: NotificationType;
  message: string;
  createdAt: string | number;
  status: NotificationStatus;
  confirmedAt?: string | number;
  sentAt?: string | number;
  // Context metadata for payment/week reference
  weekNumber?: number;
  amount?: number;
  receiptNo?: string;
  paymentDate?: string;
  memberName?: string;
  memberPhone?: string;
}

