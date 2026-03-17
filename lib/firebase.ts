import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseConfigKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const missingFirebaseConfigKeys = requiredFirebaseConfigKeys.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim() === '';
});

let app: FirebaseApp | null = null;
let db: Firestore;
let auth: Auth;
let googleProvider: GoogleAuthProvider;
let firebaseInitErrorMessage: string | null = null;

try {
  if (missingFirebaseConfigKeys.length > 0) {
    firebaseInitErrorMessage = `Missing Firebase env vars: ${missingFirebaseConfigKeys.join(', ')}`;
    throw new Error(firebaseInitErrorMessage);
  }

  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  if (!firebaseInitErrorMessage) {
    firebaseInitErrorMessage =
      error instanceof Error ? error.message : 'Unknown Firebase initialization error';
  }

  console.warn('Firebase 초기화 실패 (빌드 타임일 수 있음):', error);
  db = {} as Firestore;
  auth = {} as Auth;
  googleProvider = {} as GoogleAuthProvider;
}

const isFirebaseConfigured = app !== null && firebaseInitErrorMessage === null;

export { app, db, auth, googleProvider, isFirebaseConfigured, firebaseInitErrorMessage };
