import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  updateDoc,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
} from 'firebase/database';
import { db, auth, storage, rtdb } from '../lib/firebase';
export { rtdb };
import { getApiBaseUrl } from '../config/apiConfig';
import { Member, OrganizationSettings, DepositTransaction, PaymentRecord, AnnualExpense, NotificationEvent } from '../types';
import {
  normalizeBangladeshiPhone,
  phoneToInternalEmail,
  internalEmailToPhone,
} from '../utils/phoneUtils';

// The designated Firebase Authentication Admin UID
export const ADMIN_FIREBASE_UID = '2YNWowSVMrPBf8HwLlitJcJuMum2';

export function formatFirebaseAuthPassword(raw: string): string {
  if (raw && raw.length < 6) {
    return `org_${raw}_auth`;
  }
  return raw;
}

// Strip undefined fields to prevent Firestore unsupported value errors
function cleanData<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// -------------------------------------------------------------
// Firebase Authentication (Phone Number + Password)
// -------------------------------------------------------------

export interface LoginResult {
  role: 'admin' | 'member';
  member?: Member;
  user: FirebaseUser;
  mustChangePassword?: boolean;
  matchingMembers?: Member[];
}

/**
 * Authenticate with Bangladeshi Phone Number + Password via Firebase Auth.
 * Uses internal email identifier architecture (e.g. 01745197109@ourorganization.local)
 * so users only ever see and interact with their Phone Number and Password.
 */
export async function loginWithPhoneAndPassword(
  identifier: string,
  password: string,
  cachedMembers?: Member[]
): Promise<LoginResult> {
  const trimmed = identifier.trim();
  let emailToUse: string;

  // Support direct email if admin uses email, otherwise normalize Bangladeshi phone
  if (trimmed.includes('@')) {
    emailToUse = trimmed;
  } else {
    const normalizedPhone = normalizeBangladeshiPhone(trimmed);
    if (!normalizedPhone) {
      throw new Error('সঠিক ১১ সংখ্যার ফোন নম্বর দিন।');
    }
    emailToUse = phoneToInternalEmail(normalizedPhone);
  }

  if (!password || !password.trim()) {
    throw new Error('অনুগ্রহ করে পাসওয়ার্ড লিখুন।');
  }

  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalizedPassword = password
    .trim()
    .replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('ইন্টারনেট সংযোগ নেই। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
  }

  try {
    const fbPassword = formatFirebaseAuthPassword(normalizedPassword);
    const userCred = await signInWithEmailAndPassword(auth, emailToUse, fbPassword);
    const fbUser = userCred.user;

    // Cache Firebase ID token asynchronously in background without delaying login return
    fbUser.getIdToken().then((idToken) => {
      if (idToken) {
        localStorage.setItem('amader_shongothon_session_token_v2', idToken);
      }
    }).catch(() => {});

    // 1. Designated Admin UID check (Requirement #5)
    if (fbUser.uid === ADMIN_FIREBASE_UID) {
      return {
        role: 'admin',
        user: fbUser,
      };
    }

    // 2. Fast Member lookup and non-blocking UID linking (Requirement #4 & #6)
    const member = await resolveMemberByAuthUser(fbUser, trimmed, cachedMembers);

    if (member) {
      // Check status
      const status = (member.Status || member.status || '').toLowerCase();
      if (status === 'inactive' || status === 'নিষ্ক্রিয়') {
        await signOut(auth);
        throw new Error('এই account বর্তমানে নিষ্ক্রিয়।');
      }

      const roleStr = (member.Role || member.role || '').toLowerCase();
      const role = roleStr === 'admin' ? 'admin' : 'member';
      const mustChangePassword = Boolean(
        member.mustChangePassword ||
        member.requiresPasswordReset ||
        (role === 'member' && normalizedPassword === '1234')
      );

      return {
        role,
        member,
        user: fbUser,
        mustChangePassword,
      };
    }

    // Fallback if no member document found in Firestore
    return {
      role: 'member',
      user: fbUser,
      mustChangePassword: false,
    };
  } catch (error: any) {
    if (
      error.message === 'এই account বর্তমানে নিষ্ক্রিয়।' ||
      error.message === 'সঠিক ১১ সংখ্যার ফোন নম্বর দিন।' ||
      error.message === 'অনুগ্রহ করে পাসওয়ার্ড লিখুন।' ||
      error.message === 'ইন্টারনেট সংযোগ নেই। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।'
    ) {
      throw error;
    }

    // Fast in-memory check for unregistered numbers to save latency
    const normPhone = normalizeBangladeshiPhone(trimmed);
    const isPermanentAdminPhone = normPhone === '01907006460' || trimmed.toLowerCase() === 'admin';
    if (cachedMembers && cachedMembers.length > 0 && !isPermanentAdminPhone) {
      const existsInCache = cachedMembers.some((m) => {
        const mp = normalizeBangladeshiPhone(m.phone || (m as any).Phone || '');
        return (normPhone && mp === normPhone) || (m.memberCode || '').toLowerCase() === trimmed.toLowerCase();
      });
      if (normPhone && !existsInCache) {
        throw new Error('এই ফোন নম্বরটি কোনো নিবন্ধিত সদস্যের সাথে মেলেনি।');
      }
    }

    // Try backend authentication endpoint with adaptive timeout and auto-retry
    let apiResp: Response | null = null;
    let apiData: any = null;
    let lastNetworkErr: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutMs = attempt === 1 ? 15000 : 25000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        apiResp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmed, password: normalizedPassword }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        apiData = await apiResp.json().catch(() => null);
        lastNetworkErr = null;
        break; // Got response from server!
      } catch (fetchErr: any) {
        lastNetworkErr = fetchErr;
        const isAbort = fetchErr.name === 'AbortError' || fetchErr.message?.includes('aborted');
        const isNet =
          isAbort ||
          fetchErr.name === 'TypeError' ||
          (fetchErr.message && (
            fetchErr.message.includes('fetch') ||
            fetchErr.message.includes('Network')
          ));

        // If attempt 1 encountered network timeout / cold start, retry once immediately
        if (isNet && attempt === 1) {
          continue;
        }
        break;
      }
    }

    if (apiResp && apiData) {
      if (apiResp.ok && apiData.success) {
        if (apiData.token) {
          localStorage.setItem('amader_shongothon_session_token_v2', apiData.token);
        }

        // Asynchronously self-heal / provision Firebase Auth in background so login returns immediately
        const fbPassword = formatFirebaseAuthPassword(normalizedPassword);
        (async () => {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, emailToUse, fbPassword);
            if (newCred?.user && apiData.member?.id) {
              updateDoc(doc(db, 'members', apiData.member.id), {
                uid: newCred.user.uid,
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            }
          } catch (createErr: any) {
            if (createErr?.code === 'auth/email-already-in-use') {
              signInWithEmailAndPassword(auth, emailToUse, fbPassword).catch(() => {});
            }
          }
        })().catch(() => {});

        return {
          role: apiData.role,
          member: apiData.member,
          matchingMembers: apiData.members || (apiData.member ? [apiData.member] : []),
          user: { uid: apiData.member?.uid || 'session-user-' + (apiData.member?.id || 'uid') } as any,
          mustChangePassword: Boolean(apiData.mustChangePassword),
        };
      } else if (apiData.error) {
        throw new Error(apiData.error);
      }
    }

    if (apiResp && (apiResp.status === 401 || apiResp.status === 403 || apiResp.status === 404)) {
      throw new Error(apiData?.error || 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
    }

    if (lastNetworkErr) {
      const isAbort = lastNetworkErr.name === 'AbortError' || lastNetworkErr.message?.includes('aborted');
      const isNet =
        isAbort ||
        lastNetworkErr.name === 'TypeError' ||
        (lastNetworkErr.message && (
          lastNetworkErr.message.includes('fetch') ||
          lastNetworkErr.message.includes('Network')
        ));

      if (isNet) {
        if (error?.code === 'auth/wrong-password') {
          throw new Error('ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
        }
        throw new Error('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট সংযোগ ও সার্ভার স্ট্যাটাস পরীক্ষা করুন।');
      }
      throw lastNetworkErr;
    }

    const code = error?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-email'
    ) {
      throw new Error('ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
    } else if (code === 'auth/user-disabled') {
      throw new Error('এই account বর্তমানে নিষ্ক্রিয়।');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }

    throw new Error(error.message || 'ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
  }
}

/**
 * Allows an existing organization member to activate their account by setting a password.
 * Checks that the phone number matches an existing member in the Firestore "members" collection,
 * then creates the Firebase Auth credential and links the UID into their member record.
 */
export async function registerOrActivateMemberAccount(
  phone: string,
  password: string
): Promise<LoginResult> {
  const normalizedPhone = normalizeBangladeshiPhone(phone);
  if (!normalizedPhone) {
    throw new Error('সঠিক ১১ সংখ্যার ফোন নম্বর দিন।');
  }

  if (!password || password.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
  }

  // Find member in Firestore by phone
  const membersRef = collection(db, 'members');
  const snap = await getDocs(membersRef);
  let matchedDoc: any = null;

  snap.forEach((d) => {
    if (matchedDoc) return;
    const data = d.data();
    const p = data.phone || data.Phone || '';
    if (normalizeBangladeshiPhone(p) === normalizedPhone) {
      matchedDoc = d;
    }
  });

  if (!matchedDoc) {
    throw new Error('এই ফোন নম্বরটি কোনো নিবন্ধিত সদস্যের সাথে মেলেনি। সংগঠনের অ্যাডমিনের সাথে যোগাযোগ করুন।');
  }

  const memberData = matchedDoc.data() as Member;
  const status = (memberData.Status || memberData.status || '').toLowerCase();
  if (status === 'inactive' || status === 'নিষ্ক্রিয়') {
    throw new Error('এই account বর্তমানে নিষ্ক্রিয়।');
  }

  const internalEmail = phoneToInternalEmail(normalizedPhone);

  try {
    const cred = await createUserWithEmailAndPassword(auth, internalEmail, password);
    const fbUser = cred.user;

    // Link Firebase UID into the member document without overwriting other fields
    await updateDoc(matchedDoc.ref, {
      uid: fbUser.uid,
      updatedAt: serverTimestamp(),
    });

    const roleStr = (memberData.Role || memberData.role || '').toLowerCase();
    const role = roleStr === 'admin' || fbUser.uid === ADMIN_FIREBASE_UID ? 'admin' : 'member';

    return {
      role,
      member: { ...memberData, id: matchedDoc.id, uid: fbUser.uid },
      user: fbUser,
    };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('এই নম্বরে ইতিমধ্যে পাসওয়ার্ড সেট করা আছে। অনুগ্রহ করে পাসওয়ার্ড দিয়ে লগইন করুন।');
    } else if (err.code === 'auth/weak-password') {
      throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    } else if (err.code === 'auth/network-request-failed') {
      throw new Error('ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।');
    }
    throw new Error(err.message || 'অ্যাকাউন্ট সক্রিয়করণ ব্যর্থ হয়েছে।');
  }
}

/**
 * Resolves a Member document by matching auth UID or Phone number.
 * Uses fast in-memory members list when available (0ms), avoiding blocking Firestore queries.
 * Links the UID to the member document asynchronously in the background without blocking login.
 */
export async function resolveMemberByAuthUser(
  fbUser: FirebaseUser,
  hintPhone?: string,
  cachedMembers?: Member[]
): Promise<Member | null> {
  try {
    let cleanPhone = normalizeBangladeshiPhone(hintPhone || '');
    if (!cleanPhone && hintPhone && hintPhone.includes('@')) {
      cleanPhone = normalizeBangladeshiPhone(hintPhone.split('@')[0]);
    }
    if (!cleanPhone && fbUser.email) {
      const emailPrefix = fbUser.email.split('@')[0];
      cleanPhone = normalizeBangladeshiPhone(emailPrefix) || internalEmailToPhone(fbUser.email);
    }

    // 1. FAST IN-MEMORY RESOLUTION (0ms):
    // If cachedMembers array is provided from App state, resolve instantly without network round-trips
    if (cachedMembers && cachedMembers.length > 0) {
      const matchedMember = cachedMembers.find((m) => {
        if (!m) return false;
        if (m.uid && m.uid === fbUser.uid) return true;
        if (cleanPhone) {
          const p = m.phone || (m as any).Phone || '';
          const normP = normalizeBangladeshiPhone(p);
          if (normP && normP === cleanPhone) return true;
        }
        if (hintPhone && (m.memberCode || '').toLowerCase() === hintPhone.toLowerCase()) {
          return true;
        }
        return false;
      });

      if (matchedMember) {
        // Non-blocking UID linking in the background if not already linked
        if (!matchedMember.uid || matchedMember.uid !== fbUser.uid) {
          try {
            const memberRef = doc(db, 'members', matchedMember.id);
            updateDoc(memberRef, {
              uid: fbUser.uid,
              updatedAt: serverTimestamp(),
            }).catch((linkErr) => {
              console.warn('[Background] Non-fatal UID linking notice:', linkErr);
            });
          } catch (e) {
            console.warn('[Background] Non-fatal UID dispatch notice:', e);
          }
        }

        return { ...matchedMember, uid: fbUser.uid };
      }
    }

    // 2. TARGETED NETWORK FALLBACK (Parallel lookup by UID and Phone)
    const membersRef = collection(db, 'members');
    const qUid = query(membersRef, where('uid', '==', fbUser.uid));
    const qPhone = cleanPhone ? query(membersRef, where('phone', '==', cleanPhone)) : null;

    const [snapUid, snapPhone] = await Promise.all([
      getDocs(qUid).catch(() => null),
      qPhone ? getDocs(qPhone).catch(() => null) : Promise.resolve(null),
    ]);

    if (snapUid && !snapUid.empty) {
      const docSnap = snapUid.docs[0];
      return { ...(docSnap.data() as Member), id: docSnap.id };
    }

    if (snapPhone && !snapPhone.empty) {
      const docSnap = snapPhone.docs[0];
      // Non-blocking UID linking in background
      updateDoc(docSnap.ref, {
        uid: fbUser.uid,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('[Background] Non-fatal UID linking notice:', err);
      });
      return { ...(docSnap.data() as Member), id: docSnap.id, uid: fbUser.uid };
    }
  } catch (err) {
    console.warn('Error resolving member by auth user:', err);
  }

  return null;
}

/**
 * Logs the user out of Firebase Authentication
 */
export async function logOutApp(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Error during signOut:', e);
  }
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Validates Firestore server connection on startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'organization'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore operating in offline cache mode.');
    }
    return false;
  }
}

// -------------------------------------------------------------
// Cloud Firestore - Members
// -------------------------------------------------------------

export function subscribeToMembers(
  onData: (members: Member[]) => void,
  onError?: (err: Error) => void
) {
  const membersRef = collection(db, 'members');
  const q = query(membersRef, orderBy('serialNumber', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: Member[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Member;
        list.push({ ...data, id: docSnap.id });
      });
      // Sort by serialNumber ascending
      list.sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
      onData(list);
    },
    (err) => {
      console.warn('Firestore members subscription status:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function saveMemberToFirestore(member: Member): Promise<void> {
  try {
    const docRef = doc(db, 'members', member.id);
    const cleaned = cleanData(member);
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn(`Firestore member write permission status for ${member.id}:`, err?.message || err);
    } else {
      console.error(`Failed to save member ${member.id} to Firestore:`, err);
    }
  }
}

export async function deleteMemberFromFirestore(memberId: string): Promise<void> {
  try {
    const docRef = doc(db, 'members', memberId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn(`Firestore member delete permission status for ${memberId}:`, err?.message || err);
    } else {
      console.error(`Failed to delete member ${memberId} from Firestore:`, err);
    }
  }
}

export async function batchSaveMembersToFirestore(members: Member[]): Promise<void> {
  if (members.length === 0) return;
  try {
    // Firestore batches are limited to 500 operations
    const chunks: Member[][] = [];
    for (let i = 0; i < members.length; i += 400) {
      chunks.push(members.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const m of chunk) {
        const ref = doc(db, 'members', m.id);
        batch.set(ref, { ...cleanData(m), updatedAt: serverTimestamp() }, { merge: true });
      }
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore batch save members permission status:', err?.message || err);
    } else {
      console.error('Failed to batch save members to Firestore:', err);
    }
  }
}

// -------------------------------------------------------------
// Cloud Firestore - Organization Settings
// -------------------------------------------------------------

export function subscribeToSettings(
  onData: (settings: OrganizationSettings | null) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'settings', 'organization');

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as OrganizationSettings);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.warn('Firestore settings subscription status:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function saveSettingsToFirestore(
  settings: OrganizationSettings
): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'organization');
    await setDoc(docRef, { ...cleanData(settings), updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore settings write permission status:', err?.message || err);
    } else {
      console.error('Failed to save settings to Firestore:', err);
    }
  }
}

/**
 * Reads a File object into an uncompressed, 100% byte-accurate Base64 Data URL.
 * Preserves exact original resolution, color profile, and bit-depth without any canvas/compression.
 */
export function readFileAsOriginalDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ফাইল রিড করতে ব্যর্থ হয়েছে।'));
      }
    };
    reader.onerror = () => reject(new Error('ফাইল রিড করতে ব্যর্থ হয়েছে।'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an uncompressed, original official organization logo without Firebase Storage and without Billing.
 * Retains exact 100% original bytes, resolution, and color profile.
 * Dual-persists to backend local disk /api/assets/splash-logo and Firestore appAssets/splashLogo backup.
 */
export async function uploadSplashLogoToStorage(file: File): Promise<string> {
  if (!file) {
    throw new Error('কোনো ফাইল নির্বাচন করা হয়নি।');
  }

  // Validate allowed extensions and MIME types
  const lowerName = file.name.toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  const isPng = fileType === 'image/png' || lowerName.endsWith('.png');
  const isJpg = fileType === 'image/jpeg' || fileType === 'image/jpg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');

  if (!isPng && !isJpg) {
    throw new Error('শুধুমাত্র PNG বা JPG/JPEG ফরম্যাটের ইমেজ ফাইল নির্বাচন করুন। PNG অগ্রাধিকারযোগ্য।');
  }

  const effectiveMime = isPng ? 'image/png' : 'image/jpeg';
  const extension = isPng ? 'png' : 'jpg';

  // 1. Read 100% original binary bytes as Data URL (Zero compression, zero resizing)
  const originalDataUrl = await readFileAsOriginalDataUrl(file);

  // Instant local preview/offline cache in browser
  try {
    localStorage.setItem('amader_shongothon_splash_logo_cached', originalDataUrl);
  } catch (storageErr) {
    console.warn('Local storage cache note:', storageErr);
  }

  // 2. Upload to backend server endpoint with verified Admin Auth token
  let sessionToken = '';
  if (auth.currentUser) {
    try {
      sessionToken = await auth.currentUser.getIdToken(true);
    } catch (tokenErr) {
      console.warn('Could not retrieve Firebase Auth ID token:', tokenErr);
    }
  }
  if (!sessionToken) {
    sessionToken = localStorage.getItem('amader_shongothon_session_token_v2') || '';
  }

  const baseUrl = getApiBaseUrl();
  let serverUploadedUrl: string | null = null;

  try {
    const uploadEndpoint = baseUrl
      ? `${baseUrl}/api/admin/upload-splash-logo`
      : '/api/admin/upload-splash-logo';

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        fileData: originalDataUrl,
        fileName: file.name,
        mimeType: effectiveMime,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        // Construct full absolute URL so Android APK (https://localhost) loads without 404
        serverUploadedUrl = data.url.startsWith('http')
          ? data.url
          : (baseUrl ? `${baseUrl}${data.url}` : data.url);
      }
    } else {
      const errData = await response.json().catch(() => ({}));
      console.warn('Backend server upload returned status:', response.status, errData);
    }
  } catch (netErr) {
    console.warn('Direct server upload note (switching to Firestore cloud sync):', netErr);
  }

  // 3. Fallback / Synchronous Cloud Firestore persistence (appAssets/splashLogo)
  try {
    const base64Content = originalDataUrl.includes(';base64,')
      ? originalDataUrl.split(';base64,')[1]
      : originalDataUrl;

    const CHUNK_SIZE = 600 * 1024; // 600 KB chunks (under 1MB Firestore doc limit)
    const totalChunks = Math.ceil(base64Content.length / CHUNK_SIZE);

    if (totalChunks <= 1) {
      await setDoc(doc(db, 'appAssets', 'splashLogo'), {
        data: base64Content,
        mimeType: effectiveMime,
        fileName: file.name,
        totalChunks: 1,
        deleted: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'appAssets', 'splashLogo'), {
        mimeType: effectiveMime,
        fileName: file.name,
        totalChunks,
        deleted: false,
        updatedAt: serverTimestamp(),
      });

      for (let i = 0; i < totalChunks; i++) {
        const chunk = base64Content.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'appAssets', 'splashLogo', 'chunks', String(i)), {
          index: i,
          data: chunk,
        });
      }
    }
  } catch (fsErr) {
    console.warn('Firestore asset backup note:', fsErr);
  }

  // 4. Return reliable URL: Absolute URL or server-relative asset URL (Never save oversized Base64 to settings/organization)
  let finalUrl = '';
  if (serverUploadedUrl) {
    if (serverUploadedUrl.startsWith('http')) {
      finalUrl = serverUploadedUrl;
    } else if (baseUrl) {
      finalUrl = `${baseUrl}${serverUploadedUrl}`;
    } else {
      // In web browser, save serverUploadedUrl (e.g. '/api/assets/splash-logo.png?v=...')
      finalUrl = serverUploadedUrl;
    }
  } else {
    // Fallback if backend server endpoint is unreachable:
    // If Data URL is under 500KB safe Firestore limit, use it; otherwise use asset endpoint
    finalUrl = originalDataUrl.length < 500 * 1024
      ? originalDataUrl
      : `/api/assets/splash-logo.${extension}?v=${Date.now()}`;
  }
  return finalUrl;
}

/**
 * Removes the custom splash logo and resets back to the default emblem.
 */
export async function removeSplashLogo(): Promise<void> {
  try {
    localStorage.removeItem('amader_shongothon_splash_logo_cached');
  } catch {}

  let sessionToken = '';
  if (auth.currentUser) {
    try {
      sessionToken = await auth.currentUser.getIdToken();
    } catch {}
  }
  if (!sessionToken) {
    sessionToken = localStorage.getItem('amader_shongothon_session_token_v2') || '';
  }

  const baseUrl = getApiBaseUrl();
  const removeEndpoint = baseUrl ? `${baseUrl}/api/admin/remove-splash-logo` : '/api/admin/remove-splash-logo';

  try {
    await fetch(removeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch {}

  try {
    await setDoc(
      doc(db, 'appAssets', 'splashLogo'),
      {
        deleted: true,
        data: '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {}
}

/**
 * Retrieves the custom splash logo asset from Cloud Firestore (appAssets/splashLogo)
 * or local storage cache, returning a valid Data URL (Base64) or null.
 * Provides resilient offline/startup fallback when remote URL is unavailable.
 */
export async function getSplashLogoAssetFromFirestore(): Promise<string | null> {
  // 1. Instant check from local storage cache
  try {
    const cached = localStorage.getItem('amader_shongothon_splash_logo_cached');
    if (cached && (cached.startsWith('data:image/') || cached.startsWith('http'))) {
      return cached;
    }
  } catch {}

  // 2. Fetch from Cloud Firestore doc appAssets/splashLogo
  try {
    const metaRef = doc(db, 'appAssets', 'splashLogo');
    const snap = await getDoc(metaRef);
    if (!snap.exists()) return null;

    const meta = snap.data();
    if (meta.deleted) return null;

    const mime = meta.mimeType || 'image/png';
    const totalChunks = meta.totalChunks || 1;

    let base64 = '';
    if (totalChunks <= 1 && meta.data) {
      base64 = meta.data;
    } else {
      const chunksCol = collection(db, 'appAssets', 'splashLogo', 'chunks');
      const chunksSnap = await getDocs(chunksCol);
      const chunkDocs = chunksSnap.docs
        .map((d) => d.data())
        .sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
      base64 = chunkDocs.map((c: any) => c.data || '').join('');
    }

    if (base64) {
      const dataUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
      // Cache in localStorage for future 0ms instant startup
      try {
        localStorage.setItem('amader_shongothon_splash_logo_cached', dataUrl);
      } catch {}
      return dataUrl;
    }
  } catch (err) {
    console.warn('[firebaseService] Note: Could not retrieve splash logo from Firestore:', err);
  }
  return null;
}

/**
 * Reliably waits for the existing Firebase Auth instance to resolve its current authentication state.
 * Prevents race conditions where auth.currentUser is initially null before IndexedDB session persistence resolves.
 */
export async function waitForAuthInit(): Promise<FirebaseUser | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  // 1. If modern Firebase authStateReady is available, await it
  if (typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
      if (auth.currentUser) {
        return auth.currentUser;
      }
    } catch (e) {
      console.warn('Notice waiting for authStateReady:', e);
    }
  }

  // 2. Fallback to onAuthStateChanged first emission
  return new Promise<FirebaseUser | null>((resolve) => {
    let settled = false;
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (!settled) {
          settled = true;
          unsub();
          resolve(user);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          unsub();
          resolve(null);
        }
      }
    );

    // Timeout safety net (1500ms)
    setTimeout(() => {
      if (!settled) {
        settled = true;
        unsub();
        resolve(auth.currentUser);
      }
    }, 1500);
  });
}

/**
 * Checks whether the current active session belongs to an authorized Admin.
 * Checks both Firebase Auth state and the application's persistent admin session.
 */
export function isCurrentAdminSession(): { isAdmin: boolean; isSignedOut: boolean } {
  // 1. Firebase Auth check
  if (auth.currentUser) {
    if (auth.currentUser.uid === ADMIN_FIREBASE_UID) {
      return { isAdmin: true, isSignedOut: false };
    }
    const email = auth.currentUser.email?.toLowerCase();
    if (email && ['shahriyareram94@gmail.com', 'shahriyareram3@gmail.com'].includes(email)) {
      return { isAdmin: true, isSignedOut: false };
    }
  }

  // 2. Application UserSession & Admin Flag check
  try {
    const savedSession =
      localStorage.getItem('amader_shongothon_session_v2') ||
      localStorage.getItem('amader_shongothon_user_session_v2');
    const isAdminFlag =
      localStorage.getItem('amader_shongothon_admin_v2') ||
      localStorage.getItem('amader_shongothon_is_admin_v2');

    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      const isRoleAdmin =
        parsed.role === 'admin' ||
        (parsed.Role || '').toLowerCase() === 'admin' ||
        parsed.isAdmin === true;
      const isUidAdmin =
        parsed.uid === ADMIN_FIREBASE_UID ||
        parsed.memberId === 'mem-1' ||
        parsed.id === 'mem-1';
      const isPhoneAdmin = parsed.phone === '01907006460';
      if (isRoleAdmin || isUidAdmin || isPhoneAdmin || isAdminFlag === 'true') {
        return { isAdmin: true, isSignedOut: false };
      }
      if (isAdminFlag === 'true') {
        return { isAdmin: true, isSignedOut: false };
      }
      // If session exists but role is member
      return { isAdmin: false, isSignedOut: false };
    }

    if (isAdminFlag === 'true') {
      return { isAdmin: true, isSignedOut: false };
    }
  } catch (e) {
    console.warn('Session check note:', e);
  }

  // No session found at all
  return { isAdmin: false, isSignedOut: true };
}

/**
 * Updates the official WhatsApp group invite link in the centralized 'settings/organization' document.
 * Only callable by an authorized Admin. Reuses the existing authenticated Firebase Auth / Admin session.
 */
export async function updateWhatsAppGroupLinkInFirestore(
  newUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedUrl = newUrl.trim();

    // 1. Verify Admin session authorization
    const { isAdmin, isSignedOut } = isCurrentAdminSession();
    if (isSignedOut && !auth.currentUser) {
      return {
        success: false,
        error: 'ফায়ারবেস অথেন্টিকেশন প্রয়োজন। দয়া করে পুনরায় লগইন করুন।',
      };
    }

    if (!isAdmin) {
      return {
        success: false,
        error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন এই লিংক পরিবর্তন করতে পারেন।',
      };
    }

    const docRef = doc(db, 'settings', 'organization');
    const updatePayload = {
      whatsappGroupUrl: trimmedUrl,
      updatedAt: serverTimestamp(),
    };

    // 2. Direct Firestore update (enforced by firestore.rules)
    try {
      await setDoc(docRef, updatePayload, { merge: true });

      // Also notify backend in background if session token exists to sync server state
      const sessionToken =
        (auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null) ||
        localStorage.getItem('amader_shongothon_session_token_v2');

      if (sessionToken) {
        fetch('/api/admin/update-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ whatsappGroupUrl: trimmedUrl }),
        }).catch((err) => console.warn('Server settings sync note:', err));
      }

      return { success: true };
    } catch (directErr: any) {
      console.warn('Direct Firestore write notice, attempting API fallback:', directErr?.message || directErr);

      // 3. Fallback: Authenticated session token backend API call
      const sessionToken =
        (auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null) ||
        localStorage.getItem('amader_shongothon_session_token_v2');

      if (sessionToken) {
        try {
          const apiResp = await fetch('/api/admin/update-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ whatsappGroupUrl: trimmedUrl }),
          });
          const apiData = await apiResp.json();
          if (apiResp.ok && apiData.success) {
            return { success: true };
          } else if (apiData?.error) {
            return { success: false, error: apiData.error };
          }
        } catch (apiErr: any) {
          console.warn('Backend settings update API note:', apiErr?.message || apiErr);
        }
      }

      if (
        directErr?.code === 'permission-denied' ||
        directErr?.message?.includes('insufficient permissions')
      ) {
        return {
          success: false,
          error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন এই লিংক পরিবর্তন করতে পারেন।',
        };
      }

      return {
        success: false,
        error: directErr?.message || 'লিংক সংরক্ষণ ব্যর্থ হয়েছে।',
      };
    }
  } catch (err: any) {
    console.error('Failed to update WhatsApp link in Firestore:', err);
    if (
      err?.code === 'permission-denied' ||
      err?.message?.includes('insufficient permissions')
    ) {
      return {
        success: false,
        error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন এই লিংক পরিবর্তন করতে পারেন।',
      };
    }
    return {
      success: false,
      error: err?.message || 'লিংক সংরক্ষণ ব্যর্থ হয়েছে।',
    };
  }
}

// -------------------------------------------------------------
// Cloud Firestore - Deposit Transactions
// -------------------------------------------------------------

export function subscribeToTransactions(
  onData: (transactions: DepositTransaction[]) => void,
  onError?: (err: Error) => void
) {
  const txRef = collection(db, 'transactions');
  const q = query(txRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: DepositTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as DepositTransaction), id: docSnap.id });
      });
      onData(list);
    },
    (err) => {
      console.warn('Firestore transactions subscription status:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function saveTransactionToFirestore(
  transaction: DepositTransaction
): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', transaction.id);
    await setDoc(docRef, { ...cleanData(transaction), updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn(`Firestore transaction write permission status for ${transaction.id}:`, err?.message || err);
    } else {
      console.error('Failed to save transaction to Firestore:', err);
    }
  }
}

export async function deleteTransactionFromFirestore(transactionId: string): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn(`Firestore transaction delete permission status for ${transactionId}:`, err?.message || err);
    } else {
      console.error('Failed to delete transaction from Firestore:', err);
    }
  }
}

export async function deleteTransactionsForMemberWeek(
  memberId: string,
  weekNumber: number
): Promise<void> {
  try {
    const txRef = collection(db, 'transactions');
    const q = query(
      txRef,
      where('memberId', '==', memberId),
      where('weekNumber', '==', weekNumber)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore transaction delete permission status:', err?.message || err);
    } else {
      console.error('Failed to delete transaction by member & week:', err);
    }
  }
}

export async function deleteTransactionsForMember(memberId: string): Promise<void> {
  try {
    const txRef = collection(db, 'transactions');
    const q = query(txRef, where('memberId', '==', memberId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docsToDelete = snap.docs;
      for (let i = 0; i < docsToDelete.length; i += 400) {
        const chunk = docsToDelete.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn(`Firestore transaction delete permission status for member ${memberId}:`, err?.message || err);
    } else {
      console.error(`Failed to delete transactions for member ${memberId}:`, err);
    }
  }
}

export async function batchSaveTransactionsToFirestore(
  txs: DepositTransaction[]
): Promise<void> {
  if (txs.length === 0) return;
  try {
    const chunks: DepositTransaction[][] = [];
    for (let i = 0; i < txs.length; i += 400) {
      chunks.push(txs.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const tx of chunk) {
        const ref = doc(db, 'transactions', tx.id);
        batch.set(ref, { ...cleanData(tx), updatedAt: serverTimestamp() }, { merge: true });
      }
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore batch save transactions permission status:', err?.message || err);
    } else {
      console.error('Failed to batch save transactions to Firestore:', err);
    }
  }
}

// -------------------------------------------------------------
// Cloud Firestore - Annual Expenses (বার্ষিক ব্যয়)
// -------------------------------------------------------------

export function subscribeToAnnualExpenses(
  onData: (expenses: AnnualExpense[]) => void,
  onError?: (err: Error) => void
) {
  const expRef = collection(db, 'annualExpenses');
  const q = query(expRef, orderBy('year', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: AnnualExpense[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as AnnualExpense), id: docSnap.id });
      });
      onData(list);
    },
    (err) => {
      console.warn('Firestore annual expenses subscription status:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function saveAnnualExpenseToFirestore(
  expense: AnnualExpense
): Promise<void> {
  try {
    const docId =
      expense.id && expense.id.trim()
        ? expense.id
        : doc(collection(db, 'annualExpenses')).id;
    const docRef = doc(db, 'annualExpenses', docId);
    await setDoc(
      docRef,
      {
        ...cleanData(expense),
        id: docId,
        year: Number(expense.year),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore annual expense write permission status: Local persistence active.', err?.message || err);
    } else {
      console.error('Failed to save annual expense to Firestore:', err);
    }
  }
}

export async function deleteAnnualExpenseFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'annualExpenses', id);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Firestore annual expense delete permission status: Local persistence active.', err?.message || err);
    } else {
      console.error('Failed to delete annual expense from Firestore:', err);
    }
  }
}

// -------------------------------------------------------------
// Firebase Auth - Password Change
// -------------------------------------------------------------

export async function updateUserPassword(
  currentPassword?: string,
  newPassword?: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    // If current password provided and user has email, reauthenticate for security
    if (currentPassword && currentUser.email) {
      try {
        const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, cred);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-credential'
        ) {
          throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়।');
        }
      }
    }
    await updatePassword(currentUser, newPassword);
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Error signing out from Firebase Auth:', err);
  }
}

/**
 * Admin-Only Secure Server-Side Password Reset
 * Calls the backend /api/admin/reset-password endpoint using the Admin's verified ID token.
 */
export async function adminResetMemberPassword(memberId: string): Promise<{
  temporaryPassword: string;
  memberName: string;
  memberCode: string;
  phone: string;
}> {
  let token: string | null = null;
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      token = await currentUser.getIdToken(true);
    } catch {}
  }
  if (!token) {
    token = localStorage.getItem('amader_shongothon_session_token_v2');
  }

  if (!token) {
    throw new Error('লগইন সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।');
  }

  const response = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ memberId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
  }

  return {
    temporaryPassword: data.temporaryPassword,
    memberName: data.memberName,
    memberCode: data.memberCode,
    phone: data.phone,
  };
}

/**
 * Complete Forced Password Change after Member logs in with Temporary Password
 * Updates the member's password and clears the reset-required flags in Firestore.
 */
export async function completeForcedPasswordChange(
  memberId: string,
  newPassword: string
): Promise<void> {
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalizedPassword = String(newPassword)
    .replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d)
    .trim();

  if (!/^\d{4}$/.test(normalizedPassword)) {
    throw new Error('নতুন পাসওয়ার্ড অবশ্যই ঠিক ৪ সংখ্যার (ডিজিট) হতে হবে (যেমন: ১২৩৪ বা ৯৬৭৮)।');
  }

  let token: string | null = null;
  const currentUser = auth.currentUser;
  const fbPassword = formatFirebaseAuthPassword(normalizedPassword);
  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
      // Try updating password in Firebase Authentication
      await updatePassword(currentUser, fbPassword);
    } catch (authErr) {
      console.warn('Firebase Auth update in completeForcedPasswordChange note:', authErr);
    }
  }

  if (!token) {
    token = localStorage.getItem('amader_shongothon_session_token_v2');
  }

  // Call secure server endpoint to hash & save password and clear flags
  const resp = await fetch('/api/member/set-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ memberId, newPassword: normalizedPassword }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
  }

  if (data.token) {
    localStorage.setItem('amader_shongothon_session_token_v2', data.token);
  }

  // Synchronize Firebase Authentication with the new password
  if (data.phone) {
    const memberEmail = phoneToInternalEmail(data.phone);
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, fbPassword);
      } catch (authUpdateErr) {
        console.warn('Firebase Auth updatePassword note:', authUpdateErr);
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, memberEmail, fbPassword);
      } catch (signInErr: any) {
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, memberEmail, fbPassword);
          } catch (createErr) {
            console.warn('Firebase Auth createUser note:', createErr);
          }
        }
      }
    }
  }

  // Clear reset flags in Firestore client if connected
  if (db && memberId) {
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, {
        mustChangePassword: false,
        requiresPasswordReset: false,
        updatedAt: serverTimestamp(),
      });
    } catch {}
  }
}

// -------------------------------------------------------------
// Notification Events (Part 2: Notification Confirm Save & Queue)
// -------------------------------------------------------------

export function subscribeToNotificationEvents(
  onData: (events: NotificationEvent[]) => void,
  onError?: (error: Error) => void
): () => void {
  const eventsRef = collection(db, 'notificationEvents');
  const q = query(eventsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: NotificationEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as NotificationEvent;
        list.push({ ...data, id: docSnap.id });
      });
      onData(list);
    },
    (err) => {
      console.warn('Firestore notificationEvents subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveNotificationEventToFirestore(event: NotificationEvent): Promise<void> {
  try {
    const docRef = doc(db, 'notificationEvents', event.id);
    const cleaned = cleanData(event);
    await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    console.error(`Failed to save notificationEvent ${event.id}:`, err);
  }
}

export async function updateNotificationEventStatusInFirestore(
  eventId: string,
  updates: Partial<NotificationEvent>
): Promise<void> {
  try {
    const docRef = doc(db, 'notificationEvents', eventId);
    const cleaned = cleanData(updates);
    await updateDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() });
  } catch (err: any) {
    console.error(`Failed to update notificationEvent ${eventId}:`, err);
  }
}

export async function deleteNotificationEventFromFirestore(eventId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notificationEvents', eventId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error(`Failed to delete notificationEvent ${eventId}:`, err);
  }
}

// -------------------------------------------------------------
// Realtime Database Popup Image Configuration (/popupConfig)
// -------------------------------------------------------------

export interface PopupConfigData {
  imageData?: string;
  imageName?: string;
}

const STORAGE_POPUP_IMAGE_KEY = 'amader_shongothon_popup_image';
const STORAGE_POPUP_IMAGE_NAME_KEY = 'amader_shongothon_popup_image_name';

/**
 * Saves popup image Data URL and filename via secure server-side authenticated path.
 * Enforces admin session verification.
 */
export async function savePopupImageToRtdb(imageData: string, imageName: string): Promise<void> {
  const adminCheck = isCurrentAdminSession();
  if (!adminCheck.isAdmin) {
    throw new Error('অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন পপআপ ব্যানার পরিবর্তন করতে পারেন।');
  }

  if (!imageData || typeof imageData !== 'string' || imageData.length > 500000) {
    throw new Error('ছবির সাইজ অনুমোদিত সীমার (৩০০ KB) চেয়ে বেশি।');
  }

  // 1. Resolve Admin Session or Firebase ID Token
  let token = localStorage.getItem('amader_shongothon_session_token_v2');
  if (auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken();
      if (freshToken) token = freshToken;
    } catch {}
  }

  if (!token) {
    throw new Error('প্রমাণীকরণ টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।');
  }

  // 2. Persist to Cloud via Secure Server API
  const resp = await fetch('/api/admin/popup-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageData,
      imageName: imageName || 'কাস্টম সাংগঠনিক বিজ্ঞপ্তি ব্যানার',
    }),
  });
  const resData = await resp.json().catch(() => null);
  if (!resp.ok || resData?.error) {
    throw new Error(resData?.error || 'পপআপ ব্যানার সংরক্ষণ করতে ব্যর্থ হয়েছে।');
  }

  // 3. Cache locally ONLY after confirmed successful server response
  try {
    localStorage.setItem(STORAGE_POPUP_IMAGE_KEY, imageData);
    if (imageName) localStorage.setItem(STORAGE_POPUP_IMAGE_NAME_KEY, imageName);
  } catch {}
}

/**
 * Removes custom popup image via secure server-side authenticated path.
 * Enforces admin session verification.
 */
export async function removePopupImageFromRtdb(): Promise<void> {
  const adminCheck = isCurrentAdminSession();
  if (!adminCheck.isAdmin) {
    throw new Error('অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন পপআপ ব্যানার মুছতে পারেন।');
  }

  // 1. Resolve Admin Session or Firebase ID Token
  let token = localStorage.getItem('amader_shongothon_session_token_v2');
  if (auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken();
      if (freshToken) token = freshToken;
    } catch {}
  }

  if (!token) {
    throw new Error('প্রমাণীকরণ টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।');
  }

  // 2. Reset in Cloud via Secure Server API
  const resp = await fetch('/api/admin/popup-config', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const resData = await resp.json().catch(() => null);
  if (!resp.ok || resData?.error) {
    throw new Error(resData?.error || 'পপআপ ব্যানার রিসেট করতে ব্যর্থ হয়েছে।');
  }

  // 3. Clear local cache ONLY after confirmed successful server deletion
  try {
    localStorage.removeItem(STORAGE_POPUP_IMAGE_KEY);
    localStorage.removeItem(STORAGE_POPUP_IMAGE_NAME_KEY);
  } catch {}
}

/**
 * Realtime listener for popup configuration (Firestore appAssets/popupConfig)
 */
export function subscribeToPopupConfig(callback: (config: PopupConfigData | null) => void): () => void {
  const assetRef = doc(db, 'appAssets', 'popupConfig');
  const unsubscribeFirestore = onSnapshot(
    assetRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.imageData && data.imageData.trim()) {
          callback({
            imageData: data.imageData,
            imageName: data.imageName || 'কাস্টম সাংগঠনিক বিজ্ঞপ্তি ব্যানার',
          });
          return;
        } else if (data && data.imageData === '') {
          callback(null);
          return;
        }
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Firestore popupConfig subscription note:', err);
    }
  );

  return () => {
    unsubscribeFirestore();
  };
}

/**
 * One-time fetch for /popupConfig from Realtime Database
 */
export async function getPopupConfigFromRtdb(): Promise<PopupConfigData | null> {
  try {
    const popupRef = rtdbRef(rtdb, 'popupConfig');
    const snap = await rtdbGet(popupRef);
    if (snap.exists()) {
      return snap.val() as PopupConfigData;
    }
  } catch (err) {
    console.warn('Failed to fetch popupConfig from Realtime Database:', err);
  }

  // Backup: Check Firestore appAssets if RTDB snapshot is unavailable
  try {
    const assetRef = doc(db, 'appAssets', 'popupConfig');
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
      const data = assetSnap.data();
      if (data && data.imageData) {
        return {
          imageData: data.imageData,
          imageName: data.imageName || 'কাস্টম সাংগঠনিক বিজ্ঞপ্তি ব্যানার',
        };
      }
    }
  } catch (fsErr) {
    console.warn('Failed to fetch popupConfig backup from Firestore:', fsErr);
  }

  return null;
}




