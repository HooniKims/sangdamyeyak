import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getCredential() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (!serviceAccountKey) {
    return applicationDefault();
  }

  const parsed = JSON.parse(serviceAccountKey) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, '\n'),
  });
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: getCredential(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export function getFirebaseAdminServices() {
  const app = getAdminApp();

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}
