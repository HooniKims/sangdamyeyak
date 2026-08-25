import type { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAdminServices } from '@/lib/firebase-admin';

export type AdminActor = {
  uid: string;
  email: string;
};

export async function requireAdmin(request: NextRequest): Promise<AdminActor> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!token) {
    throw new AdminApiError(401, '관리자 인증이 필요합니다.');
  }

  const { adminAuth, adminDb } = getFirebaseAdminServices();
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch {
    throw new AdminApiError(401, '관리자 인증이 만료되었거나 올바르지 않습니다.');
  }
  const profileSnap = await adminDb.doc(`users/${decodedToken.uid}`).get();

  if (!profileSnap.exists || profileSnap.data()?.role !== 'admin') {
    throw new AdminApiError(403, '관리자 권한이 없습니다.');
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || profileSnap.data()?.email || '',
  };
}

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
