import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  initializeFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import fs from 'fs';
import { Member } from './src/types';
import { getCurrentWeekNumber, toBengaliNumber } from './src/utils/bengali';
import { processMember52Weeks } from './src/utils/calculations';
import {
  buildWeeklyPaymentNotificationMessage,
  getWeeklyPaymentNotificationTitle,
  deriveNotificationTitleFromMessage,
} from './src/utils/notificationMessageHelper';

// Bengali numerals to English digits mapping
const bnToEnMap: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

// Read Firebase Applet Configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

const ADMIN_FIREBASE_UID = '2YNWowSVMrPBf8HwLlitJcJuMum2';
const ADMIN_EMAIL = 'shahriyareram94@gmail.com';
const AUTHORIZED_ADMIN_EMAILS = [
  'shahriyareram3@gmail.com',
  'shahriyareram94@gmail.com',
  '01907006460@ourorganization.local',
];
const GMAIL_OAUTH_CLIENT_ID =
  process.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
  '511488965421-2h52lrf2d7r6at5e6nugi7mct1lmqpfe.apps.googleusercontent.com';

// Initialize Firebase Admin SDK if service account or project credentials are provided
let adminAuthInstance: any = null;
let adminMessagingInstance: any = null;
try {
  if (getAdminApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initAdminApp({
        credential: cert(sa),
        projectId: firebaseConfig.projectId,
      });
      console.log('Firebase Admin SDK initialized with service account.');
    } else {
      initAdminApp({
        projectId: firebaseConfig.projectId,
      });
      console.log('Firebase Admin SDK initialized with project ID:', firebaseConfig.projectId);
    }
  }
  adminAuthInstance = getAdminAuth();
  try {
    adminMessagingInstance = getAdminMessaging();
  } catch (mErr) {
    console.warn('Firebase Admin Messaging initialization note:', mErr);
  }
} catch (e: any) {
  console.warn('Firebase Admin SDK initialization note:', e?.message || e);
}

// Client Firestore instance for reliable Firestore server operations
let clientDb: any = null;
try {
  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  clientDb = initializeFirestore(
    clientApp,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch (e: any) {
  console.warn('Server Firebase client initialization note:', e?.message || e);
}

/**
 * Generate a strong, secure, and user-friendly temporary password.
 * At least 10 characters with uppercase, lowercase, digit, and safe symbols.
 */
function generateSecureTempPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = uppers + lowers + digits + symbols;

  const bytes = crypto.randomBytes(12);
  const result: string[] = [
    uppers[bytes[0] % uppers.length],
    lowers[bytes[1] % lowers.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];

  for (let i = 4; i < 10; i++) {
    result.push(allChars[bytes[i] % allChars.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

/**
 * Convert phone number to internal Firebase email identifier.
 */
function phoneToInternalEmail(phone: string): string {
  const cleanDigits = phone
    .replace(/[০-৯]/g, (d) => bnToEnMap[d] || d)
    .replace(/\D/g, '');

  let normalized = cleanDigits;
  if (normalized.startsWith('880')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('88')) {
    normalized = normalized.slice(2);
  }
  return `${normalized}@ourorganization.local`;
}

// -------------------------------------------------------------
// Cryptographic Password Hashing & Safe Verification
// Stored as `${salt}:${hash}` - Never plaintext in database!
// -------------------------------------------------------------
const SESSION_SECRET = process.env.SESSION_SECRET || 'amader_shongothon_org_secure_secret_key_2026';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}

function formatFirebaseAuthPassword(raw: string): string {
  if (raw && raw.length < 6) {
    return `org_${raw}_auth`;
  }
  return raw;
}

function createSessionToken(payload: any): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifySessionToken(token: string): any | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function createRecoveryToken(payload: any, expiresInMs: number = 15 * 60 * 1000): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + expiresInMs })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyRecoveryToken(token: string): any | null {
  return verifySessionToken(token);
}


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS Middleware for Capacitor Android APK, Web App, and Render
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Public uploads directory setup
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  }));

  // Asset Serving: Splash Logo with Firestore Cloud Restore fallback (No Storage/No Billing)
  app.get(['/api/assets/splash-logo', '/api/assets/splash-logo.png', '/api/assets/splash-logo.jpg', '/api/assets/splash-logo.jpeg'], async (req, res) => {
    try {
      const localPng = path.join(uploadsDir, 'splash-logo.png');
      const localJpg = path.join(uploadsDir, 'splash-logo.jpg');

      let targetFile = '';
      let contentType = 'image/png';

      if (fs.existsSync(localPng)) {
        targetFile = localPng;
        contentType = 'image/png';
      } else if (fs.existsSync(localJpg)) {
        targetFile = localJpg;
        contentType = 'image/jpeg';
      }

      if (targetFile) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return fs.createReadStream(targetFile).pipe(res);
      }

      // If not on local disk (e.g. freshly booted container), fetch from Firestore appAssets/splashLogo
      if (clientDb) {
        try {
          const metaDocRef = doc(clientDb, 'appAssets', 'splashLogo');
          const metaSnap = await getDoc(metaDocRef);
          if (metaSnap.exists()) {
            const meta = metaSnap.data();
            if (!meta.deleted) {
              const mime = meta.mimeType || 'image/png';
              const totalChunks = meta.totalChunks || 1;

              let fullBase64 = '';
              if (totalChunks <= 1 && meta.data) {
                fullBase64 = meta.data;
              } else {
                const chunksCol = collection(clientDb, 'appAssets', 'splashLogo', 'chunks');
                const chunksSnap = await getDocs(chunksCol);
                const chunkDocs = chunksSnap.docs.map((d: any) => d.data()).sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
                fullBase64 = chunkDocs.map((c: any) => c.data || '').join('');
              }

              if (fullBase64) {
                const buffer = Buffer.from(fullBase64, 'base64');
                const saveExt = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
                const restorePath = path.join(uploadsDir, `splash-logo.${saveExt}`);
                try {
                  fs.writeFileSync(restorePath, buffer);
                } catch (writeErr) {
                  console.warn('Could not cache restored logo to disk:', writeErr);
                }

                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', mime);
                res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
                return res.send(buffer);
              }
            }
          }
        } catch (dbErr) {
          console.warn('Failed to restore splash logo from Firestore:', dbErr);
        }
      }

      return res.status(404).send('No custom splash logo available');
    } catch (e: any) {
      console.error('Error serving splash logo:', e);
      return res.status(500).send('Error serving logo');
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // Authentication & Password Management API Endpoints
  // -------------------------------------------------------------

  // 1. Unified Secure Login Endpoint (Phone / Password)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'মোবাইল নম্বর ও পাসওয়ার্ড প্রদান করুন।' });
      }

      const cleanDigits = String(identifier)
        .replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d)
        .replace(/\D/g, '');
      let normalizedPhone = cleanDigits;
      if (normalizedPhone.startsWith('880')) {
        normalizedPhone = '0' + normalizedPhone.slice(3);
      } else if (normalizedPhone.startsWith('88')) {
        normalizedPhone = normalizedPhone.slice(2);
      }

      const rawId = String(identifier).trim().toLowerCase();

      // Permanent Admin Check
      // Name: শাহরিয়ার ইরাম, Mobile: 01907006460, Role: Admin
      const isPermanentAdmin =
        normalizedPhone === '01907006460' ||
        AUTHORIZED_ADMIN_EMAILS.includes(rawId) ||
        rawId === 'admin';

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      if (isPermanentAdmin) {
        let adminData: any = {
          id: 'mem-1',
          name: 'শাহরিয়ার ইরাম',
          phone: '01907006460',
          role: 'admin',
          Role: 'admin',
          memberCode: 'সো-০১',
        };
        let adminRef: any = null;
        if (clientDb) {
          try {
            adminRef = doc(clientDb, 'members', 'mem-1');
            const adminSnap: any = await Promise.race([
              getDoc(adminRef),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]).catch(() => null);
            if (adminSnap && adminSnap.exists && adminSnap.exists()) {
              adminData = adminSnap.data();
            }
          } catch (dbErr: any) {
            console.warn('Admin record fetch note (using fallback):', dbErr?.message || dbErr);
          }
        }

        const cleanPassword = String(password)
          .replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d)
          .trim();

        // 1234 is strictly forbidden and must never be accepted
        if (cleanPassword === '1234') {
          return res.status(401).json({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' });
        }

        let isPwValid = false;
        if (adminData.passwordHash) {
          isPwValid = verifyPassword(cleanPassword, adminData.passwordHash);
        }

        if (!isPwValid) {
          return res.status(401).json({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' });
        }

        const token = createSessionToken({
          memberId: 'mem-1',
          role: 'admin',
          phone: '01907006460',
          name: adminData.name || 'শাহরিয়ার ইরাম',
        });

        // Sync admin Firebase Auth credentials for fast client logins
        if (adminAuthInstance) {
          try {
            const fbPassword = formatFirebaseAuthPassword(cleanPassword);
            const email = phoneToInternalEmail('01907006460');
            try {
              const u = await adminAuthInstance.getUserByEmail(email);
              if (u) {
                await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
              }
            } catch (nf: any) {
              if (nf?.code === 'auth/user-not-found') {
                await adminAuthInstance.createUser({
                  uid: ADMIN_FIREBASE_UID,
                  email,
                  password: fbPassword,
                  displayName: 'শাহরিয়ার ইরাম',
                });
              }
            }
          } catch (syncErr) {
            console.warn('Firebase Auth admin sync note in login:', syncErr);
          }
        }

        return res.json({
          success: true,
          token,
          role: 'admin',
          member: { ...adminData, id: 'mem-1', role: 'admin', phone: '01907006460' },
          mustChangePassword: false,
        });
      }

      // Member Lookup in Firestore
      const membersRef = collection(clientDb, 'members');
      const matchedDocs: any[] = [];

      // Fast targeted query by exact phone first
      if (normalizedPhone && normalizedPhone.length === 11) {
        try {
          const qPhone = query(membersRef, where('phone', '==', normalizedPhone));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            snapPhone.forEach((d) => {
              const data = d.data();
              if (d.id === 'mem-1' || (data.Role || data.role) === 'admin') return;
              matchedDocs.push(d);
            });
          }
        } catch {}
      }

      // Fallback scan if not matched by exact query
      if (matchedDocs.length === 0) {
        const snap = await getDocs(membersRef);
        snap.forEach((d) => {
          const data = d.data();
          if (d.id === 'mem-1' || (data.Role || data.role) === 'admin') return;
          const p = (data.phone || data.Phone || '')
            .replace(/[০-৯]/g, (digit: string) => bnToEnMap[digit] || digit)
            .replace(/\D/g, '');
          const code = (data.memberCode || data.MemberCode || '').toLowerCase();
          if (
            (normalizedPhone.length >= 6 && (p === normalizedPhone || p.endsWith(normalizedPhone))) ||
            code === rawId ||
            d.id === rawId
          ) {
            matchedDocs.push(d);
          }
        });
      }

      if (matchedDocs.length === 0) {
        return res.status(404).json({ error: 'এই ফোন নম্বরটি কোনো নিবন্ধিত সদস্যের সাথে মেলেনি।' });
      }

      const activeDocs = matchedDocs.filter((d) => {
        const status = (d.data().Status || d.data().status || '').toLowerCase();
        return status !== 'inactive' && status !== 'নিষ্ক্রিয়';
      });

      if (activeDocs.length === 0) {
        return res.status(403).json({ error: 'এই account বর্তমানে নিষ্ক্রিয়।' });
      }

      const cleanPassword = password.replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d);
      let authenticatedDoc: any = null;

      for (const d of activeDocs) {
        const mData = d.data();
        if (mData.passwordHash) {
          if (
            verifyPassword(password, mData.passwordHash) ||
            verifyPassword(cleanPassword, mData.passwordHash)
          ) {
            authenticatedDoc = d;
            break;
          }
        }
      }

      if (!authenticatedDoc) {
        const anyHasHash = activeDocs.some((d) => d.data().passwordHash);
        if (!anyHasHash && cleanPassword.length >= 4) {
          const newHash = hashPassword(cleanPassword);
          const needsChange = cleanPassword === '1234';
          for (const d of activeDocs) {
            await updateDoc(d.ref, {
              passwordHash: newHash,
              mustChangePassword: needsChange,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          authenticatedDoc = activeDocs[0];
        } else {
          return res.status(401).json({ error: 'ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' });
        }
      }

      const member = { ...authenticatedDoc.data(), id: authenticatedDoc.id };
      const mustChange = Boolean(
        member.mustChangePassword ||
        member.requiresPasswordReset ||
        cleanPassword === '1234'
      );
      const allMatchingMembers = activeDocs.map((d) => ({ ...d.data(), id: d.id }));

      const token = createSessionToken({
        memberId: member.id,
        role: 'member',
        phone: member.phone,
        name: member.name,
      });

      // Sync member Firebase Auth credentials for fast subsequent client logins
      if (adminAuthInstance) {
        try {
          const email = phoneToInternalEmail(member.phone || normalizedPhone);
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          try {
            const u = await adminAuthInstance.getUserByEmail(email);
            if (u) {
              await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
            }
          } catch (notFoundErr: any) {
            if (notFoundErr?.code === 'auth/user-not-found') {
              const created = await adminAuthInstance.createUser({
                email,
                password: fbPassword,
                displayName: member.name || 'সদস্য',
              });
              if (created?.uid && authenticatedDoc) {
                await updateDoc(authenticatedDoc.ref, { uid: created.uid }).catch(() => {});
              }
            }
          }
        } catch (syncErr) {
          console.warn('Firebase Auth member sync note in login:', syncErr);
        }
      }

      return res.json({
        success: true,
        token,
        role: 'member',
        member,
        members: allMatchingMembers,
        mustChangePassword: mustChange,
      });
    } catch (err: any) {
      console.error('Login endpoint error:', err);
      return res.status(500).json({ error: err?.message || 'লগইন ব্যর্থ হয়েছে।' });
    }
  });

  // 2. Admin-Only Password Reset API Endpoint
  app.post('/api/admin/reset-password', async (req, res) => {
    try {
      // 1. Verify Authentication Header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'প্রমাণীকরণ টোকেন অনুপস্থিত। অনুগ্রহ করে পুনরায় লগইন করুন।',
        });
      }
      const token = authHeader.split('Bearer ')[1].trim();

      // 2. Authenticate caller (Support session token and Firebase ID token)
      let isCallerAdmin = false;
      let callerUid: string | null = null;
      let callerEmail: string | null = null;

      // Primary: Verify signed session token
      const session = verifySessionToken(token);
      if (session && session.role === 'admin') {
        isCallerAdmin = true;
        callerUid = session.memberId || ADMIN_FIREBASE_UID;
      }

      // Secondary: Firebase Admin SDK verification
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          callerUid = decoded.uid;
          callerEmail = decoded.email || null;
          if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
            isCallerAdmin = true;
          }
        } catch {}
      }

      // Tertiary: Identity Toolkit token lookup
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            }
          );
          const lookupData = (await lookupResp.json()) as any;
          if (lookupData?.users && lookupData.users[0]) {
            callerUid = lookupData.users[0].localId;
            callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      // Quaternary: Firestore role check
      if (!isCallerAdmin && callerUid && clientDb) {
        try {
          const mSnap = await getDoc(doc(clientDb, 'members', callerUid));
          if (mSnap.exists()) {
            const data = mSnap.data();
            if ((data.Role || data.role || '').toLowerCase() === 'admin') {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      if (!isCallerAdmin) {
        return res.status(403).json({
          error: 'অননুমোদিত অ্যাক্সেস। শুধুমাত্র অনুমোদিত অ্যাডমিন পাসওয়ার্ড রিসেট করতে পারবেন।',
        });
      }

      // 3. Identify the target member
      const { memberId } = req.body;
      if (!memberId || typeof memberId !== 'string') {
        return res.status(400).json({ error: 'সদস্যের সঠিক আইডি প্রদান করুন।' });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const targetMemberRef = doc(clientDb, 'members', memberId);
      const targetMemberSnap = await getDoc(targetMemberRef);

      if (!targetMemberSnap.exists()) {
        return res.status(404).json({ error: 'সদস্যের তথ্য ডাটাবেসে পাওয়া যায়নি।' });
      }

      const memberData = targetMemberSnap.data() as any;
      const memberPhone = memberData.phone || memberData.Phone || '';
      const memberName = memberData.name || memberData.Name || 'সদস্য';
      const memberCode = memberData.memberCode || memberData.MemberCode || '';
      const targetEmail = phoneToInternalEmail(memberPhone);

      // 4. Generate high-entropy secure temporary password (never show existing password)
      const temporaryPassword = generateSecureTempPassword();

      // 5. Cryptographically salt & hash the temporary password
      // CRITICAL: NEVER store plaintext password in Firestore!
      const passwordHash = hashPassword(temporaryPassword);

      // 6. Update Firebase Auth if Admin SDK is configured
      let targetUid = memberData.uid || null;
      if (adminAuthInstance) {
        try {
          if (targetUid) {
            await adminAuthInstance.updateUser(targetUid, { password: temporaryPassword });
          } else {
            try {
              const existingUser = await adminAuthInstance.getUserByEmail(targetEmail);
              targetUid = existingUser.uid;
              await adminAuthInstance.updateUser(targetUid, { password: temporaryPassword });
            } catch (nf: any) {
              if (nf.code === 'auth/user-not-found') {
                const created = await adminAuthInstance.createUser({
                  email: targetEmail,
                  password: temporaryPassword,
                  displayName: memberName,
                });
                targetUid = created.uid;
              }
            }
          }
        } catch (authErr) {
          console.warn('Firebase Auth update in reset-password note:', authErr);
        }
      }

      // 7. Store salted hash and set required reset flags in Firestore
      const updatePayload: any = {
        passwordHash, // Salted scrypt hash - NOT plaintext!
        mustChangePassword: true,
        requiresPasswordReset: true,
        passwordResetAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (targetUid && (!memberData.uid || memberData.uid !== targetUid)) {
        updatePayload.uid = targetUid;
      }

      await updateDoc(targetMemberRef, updatePayload);

      // 8. Return ONLY the temporary password to the Admin
      return res.json({
        success: true,
        temporaryPassword,
        memberName,
        memberCode,
        phone: memberPhone,
      });
    } catch (err: any) {
      console.error('Password reset endpoint error:', err);
      return res.status(500).json({
        error: err?.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
    }
  });

  // 2.1 Admin-Only Settings Update Endpoint (e.g. WhatsApp Group URL)
  app.post('/api/admin/update-settings', async (req, res) => {
    try {
      // 1. Verify Authentication Header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'প্রমাণীকরণ টোকেন অনুপস্থিত। অনুগ্রহ করে পুনরায় লগইন করুন।',
        });
      }
      const token = authHeader.split('Bearer ')[1].trim();

      // 2. Authenticate caller (Support session token and Firebase ID token)
      let isCallerAdmin = false;
      let callerUid: string | null = null;
      let callerEmail: string | null = null;

      // Primary: Verify signed session token
      const session = verifySessionToken(token);
      if (session && session.role === 'admin') {
        isCallerAdmin = true;
        callerUid = session.memberId || ADMIN_FIREBASE_UID;
      }

      // Secondary: Firebase Admin SDK verification
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          callerUid = decoded.uid;
          callerEmail = decoded.email || null;
          if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
            isCallerAdmin = true;
          }
        } catch {}
      }

      // Tertiary: Identity Toolkit token lookup
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            }
          );
          const lookupData = (await lookupResp.json()) as any;
          if (lookupData?.users && lookupData.users[0]) {
            callerUid = lookupData.users[0].localId;
            callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      // Quaternary: Firestore role check
      if (!isCallerAdmin && callerUid && clientDb) {
        try {
          const mSnap = await getDoc(doc(clientDb, 'members', callerUid));
          if (mSnap.exists()) {
            const data = mSnap.data();
            if ((data.Role || data.role || '').toLowerCase() === 'admin') {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      if (!isCallerAdmin) {
        return res.status(403).json({
          error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন এই লিংক পরিবর্তন করতে পারেন।',
        });
      }

      const { 
        whatsappGroupUrl, 
        splashEnabled, 
        splashDuration, 
        splashTransition, 
        splashLogo,
        splashLogoUrl,
        weeklyTarget,
        adminPin,
        orgName,
        popupEnabled,
        popupDuration
      } = req.body;

      const updatePayload: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };

      if (typeof whatsappGroupUrl === 'string') {
        updatePayload.whatsappGroupUrl = whatsappGroupUrl.trim();
      }
      if (typeof splashEnabled === 'boolean') {
        updatePayload.splashEnabled = splashEnabled;
      }
      if (typeof splashDuration === 'number') {
        updatePayload.splashDuration = splashDuration;
      }
      if (typeof splashTransition === 'string') {
        updatePayload.splashTransition = splashTransition;
      }
      if (typeof splashLogo === 'string') {
        updatePayload.splashLogo = splashLogo;
      }
      if (typeof splashLogoUrl === 'string') {
        updatePayload.splashLogoUrl = splashLogoUrl.trim();
      }
      if (typeof popupEnabled === 'boolean') {
        updatePayload.popupEnabled = popupEnabled;
      }
      if (typeof popupDuration === 'number') {
        updatePayload.popupDuration = popupDuration;
      }
      if (typeof weeklyTarget === 'number') {
        updatePayload.weeklyTarget = weeklyTarget;
      }
      if (typeof adminPin === 'string') {
        updatePayload.adminPin = adminPin;
      }
      if (typeof orgName === 'string') {
        updatePayload.orgName = orgName;
      }

      if (Object.keys(updatePayload).length <= 1) {
        return res.status(400).json({ error: 'সঠিক সেটিংস তথ্য প্রদান করুন।' });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const settingsRef = doc(clientDb, 'settings', 'organization');
      await setDoc(
        settingsRef,
        updatePayload,
        { merge: true }
      );

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Update settings endpoint error:', err);
      return res.status(500).json({ error: err?.message || 'লিংক সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  });

  // 2.2 Admin Splash Logo Upload Endpoint (100% Original Bytes, No Billing, No Firebase Storage)
  app.post('/api/admin/upload-splash-logo', async (req, res) => {
    try {
      // 1. Verify Admin authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'প্রমাণীকরণ টোকেন অনুপস্থিত।' });
      }
      const token = authHeader.split('Bearer ')[1].trim();

      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === 'admin') {
        isCallerAdmin = true;
      }

      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || (decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase()))) {
            isCallerAdmin = true;
          }
        } catch {}
      }

      if (!isCallerAdmin) {
        return res.status(403).json({ error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন লোগো পরিবর্তন করতে পারেন।' });
      }

      const { fileData, fileName, mimeType } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: 'ফাইলের তথ্য পাওয়া যায়নি।' });
      }

      // Extract raw base64 data
      let base64Data = fileData;
      let effectiveMime = mimeType || 'image/png';
      if (typeof fileData === 'string' && fileData.includes(';base64,')) {
        const parts = fileData.split(';base64,');
        const mimeMatch = parts[0].match(/data:(.*?)$/);
        if (mimeMatch && mimeMatch[1]) {
          effectiveMime = mimeMatch[1];
        }
        base64Data = parts[1];
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const isJpg = effectiveMime.includes('jpeg') || effectiveMime.includes('jpg');
      const extension = isJpg ? 'jpg' : 'png';
      const diskFilename = `splash-logo.${extension}`;
      const diskPath = path.join(uploadsDir, diskFilename);

      // Clean up previous version if any
      try {
        const oldPng = path.join(uploadsDir, 'splash-logo.png');
        const oldJpg = path.join(uploadsDir, 'splash-logo.jpg');
        if (fs.existsSync(oldPng)) fs.unlinkSync(oldPng);
        if (fs.existsSync(oldJpg)) fs.unlinkSync(oldJpg);
      } catch {}

      // Write 100% original binary bytes directly to disk
      fs.writeFileSync(diskPath, buffer);

      // Persist to Cloud Firestore (appAssets/splashLogo) as cloud backup
      if (clientDb) {
        try {
          const CHUNK_SIZE = 600 * 1024; // 600 KB per chunk (safe under 1MB Firestore limit)
          const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);

          if (totalChunks <= 1) {
            await setDoc(doc(clientDb, 'appAssets', 'splashLogo'), {
              data: base64Data,
              mimeType: effectiveMime,
              fileName: fileName || diskFilename,
              sizeBytes: buffer.length,
              totalChunks: 1,
              deleted: false,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(clientDb, 'appAssets', 'splashLogo'), {
              mimeType: effectiveMime,
              fileName: fileName || diskFilename,
              sizeBytes: buffer.length,
              totalChunks,
              deleted: false,
              updatedAt: serverTimestamp(),
            });

            for (let i = 0; i < totalChunks; i++) {
              const chunkStr = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              await setDoc(doc(clientDb, 'appAssets', 'splashLogo', 'chunks', String(i)), {
                index: i,
                data: chunkStr,
              });
            }
          }
        } catch (dbErr) {
          console.warn('Firestore backup note (disk save succeeded):', dbErr);
        }
      }

      const assetUrl = `/api/assets/splash-logo.${extension}?v=${Date.now()}`;

      // Update Firestore settings/organization splashLogoUrl directly
      if (clientDb) {
        try {
          await setDoc(
            doc(clientDb, 'settings', 'organization'),
            {
              splashLogoUrl: assetUrl,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (settingsErr) {
          console.warn('Direct settings update note:', settingsErr);
        }
      }

      return res.json({
        success: true,
        url: assetUrl,
        size: buffer.length,
        message: 'লোগো সফলভাবে আপলোড ও সংরক্ষিত হয়েছে',
      });
    } catch (e: any) {
      console.error('Logo upload error:', e);
      return res.status(500).json({ error: e.message || 'লোগো আপলোড প্রক্রিয়ায় সমস্যা হয়েছে।' });
    }
  });

  // 2.3 Admin Splash Logo Delete/Reset Endpoint
  app.post('/api/admin/remove-splash-logo', async (req, res) => {
    try {
      try {
        const oldPng = path.join(uploadsDir, 'splash-logo.png');
        const oldJpg = path.join(uploadsDir, 'splash-logo.jpg');
        if (fs.existsSync(oldPng)) fs.unlinkSync(oldPng);
        if (fs.existsSync(oldJpg)) fs.unlinkSync(oldJpg);
      } catch {}

      if (clientDb) {
        try {
          await setDoc(
            doc(clientDb, 'appAssets', 'splashLogo'),
            {
              deleted: true,
              data: '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          await setDoc(
            doc(clientDb, 'settings', 'organization'),
            {
              splashLogoUrl: '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {}
      }

      return res.json({ success: true, message: 'কাস্টম লোগো মুছে ফেলা হয়েছে।' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 2.4 Secure Admin Popup Config Endpoints (Firestore appAssets/popupConfig)
  app.post('/api/admin/popup-config', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'প্রমাণীকরণ টোকেন অনুপস্থিত।' });
      }
      const token = authHeader.split('Bearer ')[1].trim();

      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === 'admin') {
        isCallerAdmin = true;
      }

      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || (decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase()))) {
            isCallerAdmin = true;
          }
        } catch {}
      }

      // Tertiary: Google Identity Toolkit token lookup for hosted environments without Admin SDK key
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            }
          );
          const lookupData = (await lookupResp.json()) as any;
          if (lookupData?.users && lookupData.users[0]) {
            const callerUid = lookupData.users[0].localId;
            const callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      if (!isCallerAdmin) {
        return res.status(403).json({ error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন পপআপ পরিবর্তন করতে পারেন।' });
      }

      const { imageData, imageName } = req.body;
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: 'সঠিক ছবির ডাটা প্রদান করুন।' });
      }
      if (imageData.length > 500000) {
        return res.status(400).json({ error: 'ছবির সাইজ অনুমোদিত সীমার (৩০০ KB) চেয়ে বেশি।' });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const assetRef = doc(clientDb, 'appAssets', 'popupConfig');
      await setDoc(assetRef, {
        imageData,
        imageName: imageName || 'কাস্টম সাংগঠনিক বিজ্ঞপ্তি ব্যানার',
        serverAuthToken: 'amader_shongothon_admin_popup_server_sec_2026',
        updatedAt: serverTimestamp(),
      });

      return res.json({ success: true, message: 'পপআপ ব্যানার সফলভাবে সংরক্ষিত হয়েছে।' });
    } catch (err: any) {
      console.error('Save popup config error:', err);
      return res.status(500).json({ error: err?.message || 'পপআপ সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  });

  app.delete('/api/admin/popup-config', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'প্রমাণীকরণ টোকেন অনুপস্থিত।' });
      }
      const token = authHeader.split('Bearer ')[1].trim();

      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === 'admin') {
        isCallerAdmin = true;
      }

      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || (decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase()))) {
            isCallerAdmin = true;
          }
        } catch {}
      }

      // Tertiary: Google Identity Toolkit token lookup for hosted environments without Admin SDK key
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            }
          );
          const lookupData = (await lookupResp.json()) as any;
          if (lookupData?.users && lookupData.users[0]) {
            const callerUid = lookupData.users[0].localId;
            const callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || (callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase()))) {
              isCallerAdmin = true;
            }
          }
        } catch {}
      }

      if (!isCallerAdmin) {
        return res.status(403).json({ error: 'অনুমতি নেই: শুধুমাত্র অনুমোদিত অ্যাডমিন পপআপ মুছতে পারেন।' });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const assetRef = doc(clientDb, 'appAssets', 'popupConfig');
      await setDoc(assetRef, {
        imageData: '',
        imageName: '',
        serverAuthToken: 'amader_shongothon_admin_popup_server_sec_2026',
        updatedAt: serverTimestamp(),
      });

      return res.json({ success: true, message: 'পপআপ ব্যানার মুছে ডিফল্ট করা হয়েছে।' });
    } catch (err: any) {
      console.error('Delete popup config error:', err);
      return res.status(500).json({ error: err?.message || 'পপআপ মুছতে ব্যর্থ হয়েছে।' });
    }
  });

  // 3. Member Force Password Change Endpoint
  app.post('/api/member/set-password', async (req, res) => {
    try {
      const { memberId, newPassword } = req.body;
      if (!memberId || !newPassword) {
        return res.status(400).json({ error: 'সদস্যের তথ্য ও নতুন পাসওয়ার্ড আবশ্যক।' });
      }

      const cleanPassword = String(newPassword)
        .replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d)
        .trim();

      if (!/^\d{4}$/.test(cleanPassword)) {
        return res.status(400).json({
          error: 'নতুন পাসওয়ার্ড অবশ্যই ঠিক ৪ সংখ্যার (ডিজিট) হতে হবে (যেমন: ১২৩৪ বা ৯৬৭৮)।',
        });
      }

      if (cleanPassword === '1234') {
        return res.status(400).json({
          error: 'ডিফল্ট পাসওয়ার্ড "১২৩৪" ব্যবহার করা যাবে না। অন্য ৪ সংখ্যার নতুন ব্যক্তিগত পাসওয়ার্ড দিন।',
        });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const memberRef = doc(clientDb, 'members', memberId);
      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) {
        return res.status(404).json({ error: 'সদস্যের তথ্য পাওয়া যায়নি।' });
      }

      const memberData = memberSnap.data();

      // Salt & hash the new chosen password - NEVER plaintext!
      const newHash = hashPassword(cleanPassword);

      // Clear the temporary password & reset-required flags
      await updateDoc(memberRef, {
        passwordHash: newHash,
        mustChangePassword: false,
        requiresPasswordReset: false,
        updatedAt: serverTimestamp(),
      });

      // Also update Firebase Auth if configured
      const phone = memberData.phone || memberData.Phone || '';
      const email = phoneToInternalEmail(phone);
      if (adminAuthInstance) {
        try {
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          if (memberData.uid) {
            await adminAuthInstance.updateUser(memberData.uid, { password: fbPassword });
          } else {
            const user = await adminAuthInstance.getUserByEmail(email);
            if (user) {
              await adminAuthInstance.updateUser(user.uid, { password: fbPassword });
            }
          }
        } catch (authErr) {
          console.warn('Firebase Auth update in set-password note:', authErr);
        }
      }

      const roleStr = (memberData.Role || memberData.role || '').toLowerCase();
      const role = roleStr === 'admin' ? 'admin' : 'member';

      const token = createSessionToken({
        memberId,
        role,
        phone,
        name: memberData.name || '',
      });

      return res.json({
        success: true,
        token,
        phone,
        message: 'নতুন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে।',
      });
    } catch (err: any) {
      console.error('Set password error:', err);
      return res.status(500).json({ error: err?.message || 'পাসওয়ার্ড সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  });

  // Admin Password Recovery - OAuth & Configuration Status (Safe, no secrets exposed)
  app.get('/api/admin/recovery-config', (req, res) => {
    res.json({
      configured: true,
      oauthClientId: GMAIL_OAUTH_CLIENT_ID,
      authorizedEmails: ['shahriyareram3@gmail.com', 'shahriyareram94@gmail.com'],
      scope: 'https://www.googleapis.com/auth/gmail.send',
    });
  });

  // Ephemeral in-memory store for Admin recovery OTPs (Single use, 5 minute expiry)
  interface OtpRecord {
    email: string;
    otpHash: string;
    expiresAt: number;
    attempts: number;
  }
  const recoveryOtpStore = new Map<string, OtpRecord>();

  // Send OTP via Gmail API using client-authorized OAuth Access Token
  app.post('/api/admin/send-recovery-otp', async (req, res) => {
    try {
      const { email, accessToken } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'রিকভারি ইমেইল প্রদান করুন।' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const isAuthorized =
        normalizedEmail === 'shahriyareram3@gmail.com' ||
        normalizedEmail === 'shahriyareram94@gmail.com';

      if (!isAuthorized) {
        return res.status(403).json({ error: 'এই ইমেইলটি অ্যাডমিন রিকভারির জন্য অনুমোদিত নয়।' });
      }

      if (!accessToken || typeof accessToken !== 'string') {
        return res.status(401).json({
          error: 'Google OAuth অনুমোদন প্রয়োজন। অনুগ্রহ করে Google অ্যাকাউন্ট দিয়ে অনুমোদন দিন।',
          needsConsent: true,
        });
      }

      // Generate secure 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      recoveryOtpStore.set(normalizedEmail, {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
      });

      // Construct RFC 2822 email
      const emailSubject = 'আমাদের সংগঠন - অ্যাডমিন পাসওয়ার্ড রিকভারি ওটিপি (OTP)';
      const emailBodyText = [
        'আসসালামু আলাইকুম,',
        '',
        'আমাদের সংগঠন ব্যবস্থাপনা অ্যাপ্লিকেশনে অ্যাডমিন পাসওয়ার্ড রিকভারির জন্য অনুরোধ পাওয়া গেছে।',
        '',
        `আপনার এককালীন রিকভারি পিন/ওটিপি (OTP): ${otpCode}`,
        '',
        'এই কোডটির মেয়াদ ৫ মিনিট। আপনি যদি এই অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন।',
        '',
        'ধন্যবাদ,',
        'আমাদের সংগঠন সিস্টেম',
      ].join('\n');

      const utf8Subject = `=?utf-8?B?${Buffer.from(emailSubject).toString('base64')}?=`;
      const rawMessage = [
        `To: ${normalizedEmail}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        emailBodyText,
      ].join('\r\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send through Gmail API
      const gmailResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      const gmailData = await gmailResp.json().catch(() => ({}));

      if (!gmailResp.ok) {
        console.error('Gmail API send error:', gmailResp.status, gmailData);
        const errMsg =
          gmailData?.error?.message ||
          (gmailResp.status === 401
            ? 'Google OAuth সেশন মেয়াদোত্তীর্ণ বা অননুমোদিত। অনুগ্রহ করে আবার অনুমতি দিন।'
            : 'Gmail API দিয়ে ইমেইল পাঠানো সম্ভব হয়নি।');
        return res.status(gmailResp.status).json({
          error: errMsg,
          details: gmailData?.error,
          needsConsent: gmailResp.status === 401 || gmailResp.status === 403,
        });
      }

      return res.json({
        success: true,
        message: 'রিকভারি ওটিপি (OTP) সফলভাবে আপনার জিমেইলে পাঠানো হয়েছে।',
        email: normalizedEmail,
        expiresInSeconds: 300,
      });
    } catch (err: any) {
      console.error('Send recovery OTP error:', err);
      return res.status(500).json({ error: err?.message || 'ওটিপি প্রেরণে অভ্যন্তরীণ ত্রুটি হয়েছে।' });
    }
  });

  // Verify OTP and issue temporary password reset authorization
  app.post('/api/admin/verify-recovery-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: 'ইমেইল এবং ওটিপি কোড উভয়ই আবশ্যক।' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const record = recoveryOtpStore.get(normalizedEmail);

      if (!record) {
        return res.status(400).json({ error: 'কোনো সক্রিয় ওটিপি পাওয়া যায়নি। অনুগ্রহ করে নতুন কোড পাঠান।' });
      }

      if (Date.now() > record.expiresAt) {
        recoveryOtpStore.delete(normalizedEmail);
        return res.status(400).json({ error: 'ওটিপি কোডের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার পাঠান।' });
      }

      if (record.attempts >= 5) {
        recoveryOtpStore.delete(normalizedEmail);
        return res.status(429).json({ error: 'সর্বোচ্চ প্রচেষ্টার সীমা অতিক্রম করেছে। পুনরায় নতুন কোড পাঠান।' });
      }

      record.attempts += 1;
      const inputHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

      if (inputHash !== record.otpHash) {
        return res.status(400).json({ error: 'ভুল ওটিপি কোড। পুনরায় যাচাই করুন।' });
      }

      // Valid single-use OTP consumed
      recoveryOtpStore.delete(normalizedEmail);

      // Create a temporary recovery token for password change
      const resetToken = createRecoveryToken(
        {
          role: 'admin',
          memberId: 'mem-1',
          purpose: 'admin_password_recovery',
          email: normalizedEmail,
        },
        15 * 60 * 1000 // 15 minutes
      );

      return res.json({
        success: true,
        message: 'ওটিপি সফলভাবে যাচাই করা হয়েছে।',
        resetToken,
      });
    } catch (err: any) {
      console.error('Verify recovery OTP error:', err);
      return res.status(500).json({ error: err?.message || 'ওটিপি যাচাইকরণ ব্যর্থ হয়েছে।' });
    }
  });

  // Complete Admin Password Recovery with verified resetToken
  app.post('/api/admin/reset-password-with-token', async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: 'রিকভারি টোকেন এবং নতুন পাসওয়ার্ড উভয়ই আবশ্যক।' });
      }

      const payload = verifyRecoveryToken(resetToken);
      if (!payload) {
        return res.status(401).json({ error: 'রিকভারি সেশন মেয়াদোত্তীর্ণ বা অবৈধ। আবার ওটিপি যাচাই করুন।' });
      }

      if (payload.purpose !== 'admin_password_recovery') {
        return res.status(403).json({ error: 'অবৈধ রিকভারি টোকেন।' });
      }

      const cleanPassword = String(newPassword)
        .replace(/[০-৯]/g, (d: string) => bnToEnMap[d] || d)
        .trim();

      if (!/^\d{4}$/.test(cleanPassword)) {
        return res.status(400).json({
          error: 'নতুন পাসওয়ার্ড অবশ্যই ঠিক ৪ সংখ্যার (ডিজিট) হতে হবে (যেমন: ১২৩৪ বা ৯৬৭৮)।',
        });
      }

      if (!clientDb) {
        return res.status(500).json({ error: 'ডাটাবেস সংযোগ উপলব্ধ নয়।' });
      }

      const adminMemberRef = doc(clientDb, 'members', 'mem-1');
      const adminSnap = await getDoc(adminMemberRef);
      if (!adminSnap.exists()) {
        return res.status(404).json({ error: 'অ্যাডমিন অ্যাকাউন্ট তথ্য পাওয়া যায়নি।' });
      }

      const memberData = adminSnap.data();
      const newHash = hashPassword(cleanPassword);

      await updateDoc(adminMemberRef, {
        passwordHash: newHash,
        mustChangePassword: false,
        requiresPasswordReset: false,
        updatedAt: serverTimestamp(),
      });

      const phone = memberData.phone || memberData.Phone || '01907006460';
      if (adminAuthInstance) {
        try {
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          if (memberData.uid) {
            await adminAuthInstance.updateUser(memberData.uid, { password: fbPassword });
          } else {
            const email = phoneToInternalEmail(phone);
            const u = await adminAuthInstance.getUserByEmail(email);
            if (u) {
              await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
            }
          }
        } catch (authErr) {
          console.warn('Firebase Auth update note in recovery:', authErr);
        }
      }

      const sessionToken = createSessionToken({
        memberId: 'mem-1',
        role: 'admin',
        phone,
        name: memberData.name || 'শাহরিয়ার ইরাম',
      });

      return res.json({
        success: true,
        message: 'অ্যাডমিন পাসওয়ার্ড সফলভাবে আপডেট হয়েছে।',
        token: sessionToken,
        member: {
          id: 'mem-1',
          name: memberData.name || 'শাহরিয়ার ইরাম',
          phone,
          role: 'admin',
          memberCode: memberData.memberCode || 'সো-০১',
        },
      });
    } catch (err: any) {
      console.error('Reset admin password with token error:', err);
      return res.status(500).json({ error: err?.message || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে।' });
    }
  });

  // Serve firebase-messaging-sw.js with correct Content-Type
  app.get('/firebase-messaging-sw.js', (req, res, next) => {
    const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(swPath);
    } else {
      next();
    }
  });

  // Register or update FCM push notification token for a member profile
  // CRITICAL MULTI-PROFILE RULE:
  // Explicitly binds token to memberId so multiple profiles on the same mobile number remain isolated.
  app.post('/api/notifications/register-token', async (req, res) => {
    try {
      const { token, memberId, memberName, phone, role } = req.body;
      if (!token || !memberId) {
        return res.status(400).json({ error: 'Token and memberId are required' });
      }

      const tokenDocId = 'tok_' + crypto.createHash('sha256').update(token).digest('hex').slice(0, 32);

      // Save or update the device token document
      const tokenRef = doc(clientDb, 'fcmTokens', tokenDocId);
      await setDoc(
        tokenRef,
        {
          token,
          memberId,
          memberName: memberName || '',
          phone: phone || '',
          role: role || 'member',
          platform: 'web',
          updatedAt: new Date().toISOString(),
          lastActiveAt: Date.now(),
        },
        { merge: true }
      );

      // Update the member profile document with the active token
      // Note: We do NOT overwrite notificationsEnabled if already set by Admin
      try {
        const memberRef = doc(clientDb, 'members', memberId);
        const memSnap = await getDoc(memberRef);
        const existingData = memSnap.exists() ? memSnap.data() : null;
        
        await updateDoc(memberRef, {
          fcmToken: token,
          fcmUpdatedAt: new Date().toISOString(),
          // Default to true only if not previously configured by Admin
          ...(existingData && existingData.notificationsEnabled !== undefined
            ? {}
            : { notificationsEnabled: true }),
        });
      } catch (mErr) {
        console.warn('Could not update member document fcmToken directly:', mErr);
      }

      return res.json({ success: true, message: 'FCM Token registered for profile ' + memberId });
    } catch (err: any) {
      console.error('Register FCM token error:', err);
      return res.status(500).json({ error: err?.message || 'Token registration failed' });
    }
  });

  // Dedicated "Confirm & Send" Notification Endpoint (Part 2)
  // This endpoint is ONLY triggered when the Admin explicitly clicks "Confirm Notification".
  // It verifies member's notificationsEnabled flag, updates notificationEvent, and dispatches FCM message.
  app.post('/api/notifications/confirm-and-send', async (req, res) => {
    try {
      const { eventId, memberId, memberName, weekNumber, amount, date, message, title: requestedTitle } = req.body;
      if (!memberId) {
        return res.status(400).json({ error: 'memberId is required' });
      }

      // Check member's notificationsEnabled status in Firestore
      if (clientDb) {
        try {
          const memberRef = doc(clientDb, 'members', memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            // If Admin has disabled notifications for this member, respect that decision
            if (memberData.notificationsEnabled === false) {
              if (eventId) {
                const eventRef = doc(clientDb, 'notificationEvents', eventId);
                await updateDoc(eventRef, {
                  status: 'skipped',
                  error: 'Member notifications are disabled by Admin',
                  updatedAt: new Date().toISOString(),
                });
              }
              return res.json({
                success: false,
                skipped: true,
                message: 'এই সদস্যের নোটিফিকেশন বন্ধ থাকায় পাঠানো হয়নি।',
              });
            }

            // Retrieve notification message from the stored event if not directly provided
            let finalNotificationBody = message;
            if (!finalNotificationBody && eventId) {
              try {
                const eventRef = doc(clientDb, 'notificationEvents', eventId);
                const eventSnap = await getDoc(eventRef);
                if (eventSnap.exists()) {
                  finalNotificationBody = eventSnap.data()?.message;
                }
              } catch (e) {
                console.warn('Could not read message from notificationEvents:', e);
              }
            }

            if (!finalNotificationBody) {
              const weekNumBn = String(weekNumber || '').replace(/[0-9]/g, (d) =>
                ({ '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }[d] || d)
              );
              finalNotificationBody = `সম্মানিত ${memberName || memberData.name || ''}, আপনার সপ্তাহ ${weekNumBn}-এর জমা সফলভাবে সংরক্ষিত হয়েছে। ধন্যবাদ।`;
            }

            // Determine accurate notification title
            const notificationTitle =
              (requestedTitle as string | undefined)?.trim() ||
              deriveNotificationTitleFromMessage(finalNotificationBody);

            // If Firebase Admin Messaging is available and member has an FCM token, dispatch message
            let fcmSentSuccessfully = false;
            let fcmFailureReason: string | null = null;

            if (!adminMessagingInstance) {
              fcmFailureReason = 'Firebase Admin Messaging সার্ভিস সক্রিয় নেই।';
            } else if (!memberData.fcmToken) {
              fcmFailureReason = 'এই সদস্যের ডিভাইসে পুশ নোটিফিকেশন চালু নেই (FCM Token পাওয়া যায়নি)।';
            } else {
              try {
                await adminMessagingInstance.send({
                  token: memberData.fcmToken,
                  notification: {
                    title: notificationTitle,
                    body: finalNotificationBody,
                  },
                  data: {
                    type: 'deposit_confirmation',
                    memberId: String(memberId),
                    weekNumber: String(weekNumber || ''),
                    amount: String(amount || ''),
                    date: String(date || ''),
                  },
                  android: {
                    priority: 'high',
                    notification: {
                      channelId: 'org_payment_alerts',
                      icon: 'ic_stat_notification',
                      color: '#047857',
                      visibility: 'public',
                      priority: 'high',
                      defaultSound: true,
                    },
                  },
                  webpush: {
                    fcmOptions: {
                      link: '/',
                    },
                  },
                });
                fcmSentSuccessfully = true;
              } catch (fcmErr: any) {
                console.warn('FCM send message warning:', fcmErr?.message || fcmErr);
                fcmFailureReason = 'FCM সার্ভারে নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে।';
              }
            }

            if (fcmSentSuccessfully) {
              // Mark notification event as sent ONLY when actually sent
              if (eventId) {
                const eventRef = doc(clientDb, 'notificationEvents', eventId);
                await updateDoc(eventRef, {
                  status: 'sent',
                  sentAt: new Date().toISOString(),
                  confirmedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }

              return res.json({
                success: true,
                message: 'নোটিফিকেশন সফলভাবে পাঠানো হয়েছে।',
              });
            } else {
              // Mark notification event as failed
              if (eventId) {
                const eventRef = doc(clientDb, 'notificationEvents', eventId);
                await updateDoc(eventRef, {
                  status: 'failed',
                  error: fcmFailureReason || 'নোটিফিকেশন পাঠানো যায়নি।',
                  updatedAt: new Date().toISOString(),
                });
              }

              return res.json({
                success: false,
                error: fcmFailureReason || 'নোটিফিকেশন পাঠানো সম্পন্ন করা যায়নি।',
              });
            }
          } else {
            return res.status(404).json({
              success: false,
              error: 'সদস্যের তথ্য পাওয়া যায়নি।',
            });
          }
        } catch (dbErr: any) {
          console.warn('Notification event confirm db update warning:', dbErr);
          return res.status(500).json({
            success: false,
            error: 'ডাটাবেজে নোটিফিকেশন আপডেট করতে সমস্যা হয়েছে।',
          });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
      });
    } catch (err: any) {
      console.error('Confirm and send notification error:', err);
      return res.status(500).json({ error: err?.message || 'নোটিফিকেশন পাঠানো ব্যর্থ হয়েছে।' });
    }
  });

  // Dedicated Cloud Scheduler Trigger Endpoint (Part 1)
  // Accepts 'morning_status' or 'night_due_reminder' action.
  // Compatible with Cloud Scheduler Google IAM/OIDC Bearer tokens and optional CRON_SECRET / SCHEDULER_SECRET_KEY.
  app.post('/api/scheduler/trigger', async (req, res) => {
    try {
      const expectedSecret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET_KEY;
      const providedSecret = req.headers['x-cron-secret'] || req.headers['x-scheduler-secret'];
      const authHeader = req.headers['authorization'];
      const bearerToken =
        authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.substring(7).trim()
          : null;
      const userAgent = req.headers['user-agent'] || '';

      const isAuthorized = (() => {
        // If a secret key is specified in environment, verify against header or bearer token
        if (expectedSecret) {
          return providedSecret === expectedSecret || bearerToken === expectedSecret;
        }

        // If Cloud Scheduler uses Google IAM/OIDC authentication:
        // Cloud Scheduler sends an OIDC identity token in the Authorization header.
        if (bearerToken) {
          return true;
        }

        // Check for Google Cloud Scheduler user-agent signature
        if (typeof userAgent === 'string' && userAgent.includes('Google-Cloud-Scheduler')) {
          return true;
        }

        return false;
      })();

      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing or invalid authentication token/secret.',
        });
      }

      const action = req.body?.action || req.body?.type;

      if (!action || (action !== 'morning_status' && action !== 'night_due_reminder')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions are: "morning_status", "night_due_reminder"',
        });
      }

      // Generate current date string in Asia/Dhaka timezone
      const dhakaDateString = getDhakaDateString();

      if (action === 'morning_status') {
        console.log(`[CloudSchedulerTrigger] Triggering Friday morning notification for ${dhakaDateString}...`);
        await runFridayMorningNotifications(dhakaDateString);
        return res.json({
          success: true,
          action: 'morning_status',
          date: dhakaDateString,
          message: 'Friday morning notification completed successfully.',
        });
      }

      if (action === 'night_due_reminder') {
        console.log(`[CloudSchedulerTrigger] Triggering Friday night due reminder for ${dhakaDateString}...`);
        await runFridayNightDueReminders(dhakaDateString);
        return res.json({
          success: true,
          action: 'night_due_reminder',
          date: dhakaDateString,
          message: 'Friday night due reminder completed successfully.',
        });
      }
    } catch (err: any) {
      console.error('[CloudSchedulerTrigger] Unexpected error in trigger endpoint:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error while triggering scheduler.',
      });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize 60-second Friday morning automatic notification scheduler
    initFridayMorningScheduler();
  });
}

/**
 * Helper to get current date formatted as YYYY-MM-DD in Asia/Dhaka timezone.
 */
function getDhakaDateString(): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = dtf.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value || new Date().getFullYear().toString();
  const month = (parts.find((p) => p.type === 'month')?.value || '').padStart(2, '0');
  const day = (parts.find((p) => p.type === 'day')?.value || '').padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Core processor for Friday Morning (8:00 AM) automatic weekly status notifications.
 * Uses existing FCM sending mechanism, existing calculations, and existing notificationEvents collection.
 */
async function runFridayMorningNotifications(dhakaDateString: string): Promise<void> {
  if (!clientDb || !adminMessagingInstance) {
    console.warn('[FridayScheduler] Cannot run: clientDb or adminMessagingInstance not initialized.');
    return;
  }

  const runDocId = `friday-8am-run-${dhakaDateString}`;
  const runDocRef = doc(clientDb, 'notificationEvents', runDocId);

  try {
    const runDocSnap = await getDoc(runDocRef);
    if (runDocSnap.exists()) {
      const runData = runDocSnap.data();
      if (runData?.status === 'completed') {
        console.log(`[FridayScheduler] Run ${runDocId} is already completed. Skipping.`);
        return;
      }

      if (runData?.status === 'in_progress') {
        // 5-minute stale-lock timeout
        const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
        const startedAt = runData?.startedAt || runData?.updatedAt || runData?.createdAt;
        const startedTime = startedAt ? new Date(startedAt).getTime() : 0;
        const isStale = !startedTime || (Date.now() - startedTime > STALE_LOCK_TIMEOUT_MS);

        if (!isStale) {
          console.log(`[FridayScheduler] Run ${runDocId} is actively in_progress (started at ${startedAt}). Skipping.`);
          return;
        }

        console.warn(
          `[FridayScheduler] Detected stale in_progress lock for ${runDocId} (started at ${startedAt}). Re-acquiring lock and recovering run.`
        );
      }
    }

    // Acquire or re-acquire run lock
    await setDoc(runDocRef, {
      id: runDocId,
      memberId: 'system_scheduler',
      type: 'weekly_reminder',
      message: `Friday 8:00 AM automatic weekly notification run for ${dhakaDateString}`,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      createdAt: runDocSnap.exists() && runDocSnap.data()?.createdAt ? runDocSnap.data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (lockErr) {
    console.error('[FridayScheduler] Failed to check or acquire run lock:', lockErr);
    return;
  }

  console.log(`[FridayScheduler] Starting Friday 8:00 AM notification run for ${dhakaDateString}...`);

  // 1. Determine current week and weekly target from settings
  let currentWeek = getCurrentWeekNumber();
  let weeklyTarget = 100;
  try {
    const settingsRef = doc(clientDb, 'settings', 'organization');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData?.currentWeek) currentWeek = sData.currentWeek;
      if (sData?.weeklyTarget) weeklyTarget = sData.weeklyTarget;
    }
  } catch (setErr) {
    console.warn('[FridayScheduler] Notice reading settings, using default/calculated week:', setErr);
  }

  // 2. Fetch all members
  const membersList: Member[] = [];
  try {
    const membersRef = collection(clientDb, 'members');
    const membersSnap = await getDocs(membersRef);
    membersSnap.forEach((d) => {
      const mData = d.data();
      membersList.push({ id: d.id, ...mData } as Member);
    });
  } catch (mErr) {
    console.error('[FridayScheduler] Failed to load members from Firestore:', mErr);
    try {
      await updateDoc(runDocRef, {
        status: 'failed',
        error: 'Failed to load members from Firestore',
        updatedAt: new Date().toISOString(),
      });
    } catch (_) {}
    return;
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const member of membersList) {
    // Exclude admin or master account
    if (member.id === 'mem-1' || member.role === 'admin' || (member as any).Role === 'admin') {
      skippedCount++;
      continue;
    }

    // Exclude inactive members
    const status = (member.status || (member as any).Status || '').toLowerCase();
    if (status === 'inactive' || status === 'নিষ্ক্রিয়') {
      skippedCount++;
      continue;
    }

    // Check notificationsEnabled flag (strict: notificationsEnabled !== false)
    if (member.notificationsEnabled === false) {
      skippedCount++;
      continue;
    }

    // Check valid FCM token
    const token = member.fcmToken;
    if (!token || typeof token !== 'string' || !token.trim()) {
      skippedCount++;
      continue;
    }

    // Member-level idempotency: Check if already sent for this specific Friday
    const eventId = `friday-8am-${dhakaDateString}-${member.id}`;
    const eventRef = doc(clientDb, 'notificationEvents', eventId);
    try {
      const existingSnap = await getDoc(eventRef);
      if (existingSnap.exists() && existingSnap.data()?.status === 'sent') {
        skippedCount++;
        continue;
      }
    } catch (e) {
      // Continue to send if check fails
    }

    // Calculate weekly financial status using existing helper logic
    const finances = processMember52Weeks(member, currentWeek, weeklyTarget);
    const remainingDue = finances.all52Weeks
      .filter((w) => w.weekNumber <= currentWeek && w.status === 'due')
      .map((w) => w.weekNumber);
    const advance = finances.all52Weeks
      .filter((w) => w.weekNumber > currentWeek && (w.status === 'advance' || w.status === 'paid'))
      .map((w) => w.weekNumber);

    let notificationBody = '';
    let notificationTitle = 'সাপ্তাহিক জমা সফল হয়েছে';
    if (remainingDue.length > 0 || advance.length > 0) {
      notificationBody = buildWeeklyPaymentNotificationMessage({
        remainingDueWeeks: remainingDue,
        advanceWeeks: advance,
      });
      notificationTitle = getWeeklyPaymentNotificationTitle({
        remainingDueWeeks: remainingDue,
        advanceWeeks: advance,
      });
    } else {
      notificationBody = `সম্মানিত ${member.name}, আপনার সপ্তাহ ${toBengaliNumber(currentWeek)}-এর জমা সফলভাবে সংরক্ষিত হয়েছে। ধন্যবাদ।`;
      notificationTitle = 'সাপ্তাহিক জমা সফল হয়েছে';
    }

    // Dispatch FCM Notification using existing Firebase Admin Messaging instance
    try {
      await adminMessagingInstance.send({
        token: token.trim(),
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: 'weekly_reminder',
          memberId: String(member.id),
          weekNumber: String(currentWeek),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'org_payment_alerts',
            icon: 'ic_stat_notification',
            color: '#047857',
            visibility: 'public',
            priority: 'high',
            defaultSound: true,
          },
        },
        webpush: {
          fcmOptions: {
            link: '/',
          },
        },
      });

      // Record successful event in existing notificationEvents
      await setDoc(eventRef, {
        id: eventId,
        memberId: member.id,
        type: 'weekly_reminder',
        memberName: member.name,
        memberPhone: member.phone || '',
        weekNumber: currentWeek,
        amount: weeklyTarget,
        message: notificationBody,
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      sentCount++;
    } catch (fcmErr: any) {
      console.warn(`[FridayScheduler] FCM send error for member ${member.id}:`, fcmErr?.message || fcmErr);

      // Record failure for this member without throwing or stopping the loop
      try {
        await setDoc(eventRef, {
          id: eventId,
          memberId: member.id,
          type: 'weekly_reminder',
          memberName: member.name,
          memberPhone: member.phone || '',
          weekNumber: currentWeek,
          amount: weeklyTarget,
          message: notificationBody,
          status: 'failed',
          error: fcmErr?.message || 'FCM send failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (_) {}

      failedCount++;
    }
  }

  // Mark run completed
  try {
    await updateDoc(runDocRef, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      sentCount,
      failedCount,
      skippedCount,
      updatedAt: new Date().toISOString(),
    });
    console.log(
      `[FridayScheduler] Completed Friday 8:00 AM notification run. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
    );
  } catch (cErr) {
    console.warn('[FridayScheduler] Could not update run document completion status:', cErr);
  }
}

/**
 * Core processor for Friday Night (10:00 PM) automatic due reminder notifications.
 * Sends reminders ONLY to members who still have unpaid/due weeks up to currentWeek.
 */
async function runFridayNightDueReminders(dhakaDateString: string): Promise<void> {
  if (!clientDb || !adminMessagingInstance) {
    console.warn('[FridayNightDueReminder] Cannot run: clientDb or adminMessagingInstance not initialized.');
    return;
  }

  const runDocId = `friday-10pm-run-${dhakaDateString}`;
  const runDocRef = doc(clientDb, 'notificationEvents', runDocId);

  try {
    const runDocSnap = await getDoc(runDocRef);
    if (runDocSnap.exists()) {
      const runData = runDocSnap.data();
      if (runData?.status === 'completed') {
        console.log(`[FridayNightDueReminder] Run ${runDocId} is already completed. Skipping.`);
        return;
      }

      if (runData?.status === 'in_progress') {
        // 5-minute stale-lock timeout
        const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
        const startedAt = runData?.startedAt || runData?.updatedAt || runData?.createdAt;
        const startedTime = startedAt ? new Date(startedAt).getTime() : 0;
        const isStale = !startedTime || (Date.now() - startedTime > STALE_LOCK_TIMEOUT_MS);

        if (!isStale) {
          console.log(`[FridayNightDueReminder] Run ${runDocId} is actively in_progress (started at ${startedAt}). Skipping.`);
          return;
        }

        console.warn(
          `[FridayNightDueReminder] Detected stale in_progress lock for ${runDocId} (started at ${startedAt}). Re-acquiring lock and recovering run.`
        );
      }
    }

    // Acquire or re-acquire run lock
    await setDoc(runDocRef, {
      id: runDocId,
      memberId: 'system_scheduler',
      type: 'weekly_reminder',
      message: `Friday 10:00 PM automatic due reminder run for ${dhakaDateString}`,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      createdAt: runDocSnap.exists() && runDocSnap.data()?.createdAt ? runDocSnap.data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (lockErr) {
    console.error('[FridayNightDueReminder] Failed to check or acquire run lock:', lockErr);
    return;
  }

  console.log(`[FridayNightDueReminder] Starting Friday 10:00 PM due reminder run for ${dhakaDateString}...`);

  // 1. Determine current week and weekly target from settings
  let currentWeek = getCurrentWeekNumber();
  let weeklyTarget = 100;
  try {
    const settingsRef = doc(clientDb, 'settings', 'organization');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData?.currentWeek) currentWeek = sData.currentWeek;
      if (sData?.weeklyTarget) weeklyTarget = sData.weeklyTarget;
    }
  } catch (setErr) {
    console.warn('[FridayNightDueReminder] Notice reading settings, using default/calculated week:', setErr);
  }

  // 2. Fetch all members
  const membersList: Member[] = [];
  try {
    const membersRef = collection(clientDb, 'members');
    const membersSnap = await getDocs(membersRef);
    membersSnap.forEach((d) => {
      const mData = d.data();
      membersList.push({ id: d.id, ...mData } as Member);
    });
  } catch (mErr) {
    console.error('[FridayNightDueReminder] Failed to load members from Firestore:', mErr);
    try {
      await updateDoc(runDocRef, {
        status: 'failed',
        error: 'Failed to load members from Firestore',
        updatedAt: new Date().toISOString(),
      });
    } catch (_) {}
    return;
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const member of membersList) {
    // Exclude admin or master account
    if (member.id === 'mem-1' || member.role === 'admin' || (member as any).Role === 'admin') {
      skippedCount++;
      continue;
    }

    // Exclude inactive members
    const status = (member.status || (member as any).Status || '').toLowerCase();
    if (status === 'inactive' || status === 'নিষ্ক্রিয়') {
      skippedCount++;
      continue;
    }

    // Check notificationsEnabled flag (strict: notificationsEnabled !== false)
    if (member.notificationsEnabled === false) {
      skippedCount++;
      continue;
    }

    // Check valid FCM token
    const token = member.fcmToken;
    if (!token || typeof token !== 'string' || !token.trim()) {
      skippedCount++;
      continue;
    }

    // Calculate weekly financial status using existing helper logic
    const finances = processMember52Weeks(member, currentWeek, weeklyTarget);
    const remainingDue = finances.all52Weeks
      .filter((w) => w.weekNumber <= currentWeek && w.status === 'due')
      .map((w) => w.weekNumber);

    // If no remaining due weeks, skip this member completely
    if (remainingDue.length === 0) {
      skippedCount++;
      continue;
    }

    // Member-level idempotency: Check if already sent for this specific Friday 10 PM
    const eventId = `friday-10pm-${dhakaDateString}-${member.id}`;
    const eventRef = doc(clientDb, 'notificationEvents', eventId);
    try {
      const existingSnap = await getDoc(eventRef);
      if (existingSnap.exists() && existingSnap.data()?.status === 'sent') {
        skippedCount++;
        continue;
      }
    } catch (e) {
      // Continue to send if check fails
    }

    // Build reminder message strictly using existing buildWeeklyPaymentNotificationMessage
    const notificationBody = buildWeeklyPaymentNotificationMessage({
      remainingDueWeeks: remainingDue,
      advanceWeeks: [],
    });

    const totalDueAmount = remainingDue.length * weeklyTarget;

    // Dispatch FCM Notification using existing Firebase Admin Messaging instance
    try {
      await adminMessagingInstance.send({
        token: token.trim(),
        notification: {
          title: 'সাপ্তাহিক জমা বকেয়া রয়েছে',
          body: notificationBody,
        },
        data: {
          type: 'weekly_reminder',
          memberId: String(member.id),
          weekNumber: String(currentWeek),
          reminderType: 'night_due_reminder',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'org_payment_alerts',
            visibility: 'public',
            priority: 'high',
            defaultSound: true,
          },
        },
        webpush: {
          fcmOptions: {
            link: '/',
          },
        },
      });

      // Record successful event in existing notificationEvents
      await setDoc(eventRef, {
        id: eventId,
        memberId: member.id,
        type: 'weekly_reminder',
        memberName: member.name,
        memberPhone: member.phone || '',
        weekNumber: currentWeek,
        amount: totalDueAmount,
        message: notificationBody,
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      sentCount++;
    } catch (fcmErr: any) {
      console.warn(`[FridayNightDueReminder] FCM send error for member ${member.id}:`, fcmErr?.message || fcmErr);

      // Record failure for this member without throwing or stopping the loop
      try {
        await setDoc(eventRef, {
          id: eventId,
          memberId: member.id,
          type: 'weekly_reminder',
          memberName: member.name,
          memberPhone: member.phone || '',
          weekNumber: currentWeek,
          amount: totalDueAmount,
          message: notificationBody,
          status: 'failed',
          error: fcmErr?.message || 'FCM send failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (_) {}

      failedCount++;
    }
  }

  // Mark run completed
  try {
    await updateDoc(runDocRef, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      sentCount,
      failedCount,
      skippedCount,
      updatedAt: new Date().toISOString(),
    });
    console.log(
      `[FridayNightDueReminder] Completed Friday 10:00 PM due reminder run. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
    );
  } catch (cErr) {
    console.warn('[FridayNightDueReminder] Could not update run document completion status:', cErr);
  }
}

/**
 * Checks if current Bangladesh time is Friday 8:00 AM window, and triggers the run once.
 */
function checkAndTriggerFridayMorningNotification(): void {
  if (!clientDb || !adminMessagingInstance) return;

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value.padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value.padStart(2, '0');
  const weekday = parts.find((p) => p.type === 'weekday')?.value; // "Fri"
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const isFriday = weekday === 'Fri';
  // Check Friday morning 8:00 AM window (hour === 8 checks each minute; completed status & lock ensures single execution)
  const is8AM = hour === 8;

  if (isFriday && is8AM && year && month && day) {
    const dhakaDateString = `${year}-${month}-${day}`;
    runFridayMorningNotifications(dhakaDateString).catch((err) => {
      console.error('[FridayScheduler] Unhandled error during Friday notification run:', err);
    });
  }
}

/**
 * Checks if current Bangladesh time is Friday 10:00 PM window, and triggers the run once.
 */
function checkAndTriggerFridayNightDueReminder(): void {
  if (!clientDb || !adminMessagingInstance) return;

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value.padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value.padStart(2, '0');
  const weekday = parts.find((p) => p.type === 'weekday')?.value; // "Fri"
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);

  const isFriday = weekday === 'Fri';
  // Check Friday night 10:00 PM window (hour === 22 in 24h format; completed status & lock ensures single execution)
  const is10PM = hour === 22;

  if (isFriday && is10PM && year && month && day) {
    const dhakaDateString = `${year}-${month}-${day}`;
    runFridayNightDueReminders(dhakaDateString).catch((err) => {
      console.error('[FridayNightDueReminder] Unhandled error during Friday 10 PM due reminder run:', err);
    });
  }
}

/**
 * Initializes 60-second periodic checker for Friday notifications (8:00 AM and 10:00 PM).
 */
function initFridayMorningScheduler(): void {
  console.log('[FridayScheduler] Initializing 60-second Friday notification scheduler (8:00 AM & 10:00 PM)...');
  // Check once immediately on server startup
  checkAndTriggerFridayMorningNotification();
  checkAndTriggerFridayNightDueReminder();
  // Check every 60 seconds
  setInterval(() => {
    checkAndTriggerFridayMorningNotification();
    checkAndTriggerFridayNightDueReminder();
  }, 60000);
}

startServer();
