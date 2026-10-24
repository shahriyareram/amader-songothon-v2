import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with experimentalForceLongPolling
// This ensures reliable connection in cloud/iframe/container environments
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;

// Initialize Firebase Storage
let firebaseStorage: FirebaseStorage;
try {
  firebaseStorage = getStorage(app, firebaseConfig.storageBucket);
} catch {
  firebaseStorage = getStorage(app);
}

export const storage = firebaseStorage;

// Initialize Firebase Realtime Database
const rtdbUrl = (firebaseConfig as any).databaseURL || 'https://gen-lang-client-0126045378-default-rtdb.asia-southeast1.firebasedatabase.app';
export const rtdb: Database = getDatabase(app, rtdbUrl);

export default app;

