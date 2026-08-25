import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Auth, UserRecord } from 'firebase-admin/auth';
import type {
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { AdminApiError, requireAdmin, type AdminActor } from '@/lib/admin-api';
import { getFirebaseAdminServices } from '@/lib/firebase-admin';
import { getCurrentSchoolYear } from '@/lib/school-year';

export const runtime = 'nodejs';

type ManagedRole = 'teacher' | 'admin';

type ProfileInput = {
  name: string;
  role: ManagedRole;
  schoolName: string;
  schoolCode: string;
  grade: number;
  classNum: number;
};

type AdminActionBody = {
  action?: string;
  uid?: string;
  email?: string;
  password?: string;
  profile?: Partial<ProfileInput>;
  disabled?: boolean;
};

function serializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        serializeValue(child),
      ]),
    );
  }

  return value;
}

function parseProfile(input: Partial<ProfileInput> | undefined): ProfileInput {
  const name = input?.name?.trim() || '';
  const role = input?.role;
  const schoolName = input?.schoolName?.trim() || '';
  const schoolCode = input?.schoolCode?.trim() || '';
  const grade = Number(input?.grade);
  const classNum = Number(input?.classNum);

  if (!name || !schoolName || !schoolCode) {
    throw new AdminApiError(400, '이름과 학교 정보가 필요합니다.');
  }

  if (role !== 'teacher' && role !== 'admin') {
    throw new AdminApiError(400, '교사 또는 관리자 역할만 지정할 수 있습니다.');
  }

  const isNonHomeroom = grade === 0 && classNum === 0;
  if (!isNonHomeroom && (!Number.isInteger(grade) || grade < 1 || grade > 6)) {
    throw new AdminApiError(400, '학년 정보가 올바르지 않습니다.');
  }

  if (
    !isNonHomeroom &&
    (!Number.isInteger(classNum) || classNum < 1 || classNum > 30)
  ) {
    throw new AdminApiError(400, '반 정보가 올바르지 않습니다.');
  }

  return { name, role, schoolName, schoolCode, grade, classNum };
}

async function listAllAuthUsers(adminAuth: Auth): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

async function assertNoDuplicateClass(
  adminDb: Firestore,
  profile: ProfileInput,
  excludedUid?: string,
) {
  if (profile.grade === 0 && profile.classNum === 0) {
    return;
  }

  const snapshot = await adminDb
    .collection('users')
    .where('role', 'in', ['teacher', 'admin'])
    .where('schoolCode', '==', profile.schoolCode)
    .where('grade', '==', profile.grade)
    .where('classNum', '==', profile.classNum)
    .get();

  const duplicate = snapshot.docs.find((docSnap) => docSnap.id !== excludedUid);
  if (duplicate) {
    const data = duplicate.data();
    throw new AdminApiError(
      409,
      `${profile.schoolName} ${profile.grade}학년 ${profile.classNum}반에 ${data.name || '다른 교사'} 계정이 이미 있습니다.`,
    );
  }
}

async function commitInChunks(
  adminDb: Firestore,
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = adminDb.batch();
    operations
      .slice(index, index + 400)
      .forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function syncTeacherAssignments(
  adminDb: Firestore,
  uid: string,
  profile: ProfileInput,
) {
  const [
    matchedParents,
    sameClassParents,
    assignedRequests,
    sameClassRequests,
  ] = await Promise.all([
    adminDb.collection('users').where('matchedTeacherId', '==', uid).get(),
    adminDb
      .collection('users')
      .where('role', '==', 'parent')
      .where('schoolCode', '==', profile.schoolCode)
      .where('grade', '==', profile.grade)
      .where('classNum', '==', profile.classNum)
      .get(),
    adminDb
      .collection('nonHomeroomRequests')
      .where('homeroomTeacherId', '==', uid)
      .get(),
    adminDb
      .collection('nonHomeroomRequests')
      .where('schoolCode', '==', profile.schoolCode)
      .where('grade', '==', profile.grade)
      .where('classNum', '==', profile.classNum)
      .get(),
  ]);

  const parentTargets = new Map<string, string | null>();
  matchedParents.docs.forEach((docSnap) => parentTargets.set(docSnap.id, null));
  if (!(profile.grade === 0 && profile.classNum === 0)) {
    sameClassParents.docs.forEach((docSnap) =>
      parentTargets.set(docSnap.id, uid),
    );
  }

  const requestTargets = new Map<string, string | null>();
  assignedRequests.docs.forEach((docSnap) =>
    requestTargets.set(docSnap.id, null),
  );
  if (!(profile.grade === 0 && profile.classNum === 0)) {
    sameClassRequests.docs.forEach((docSnap) =>
      requestTargets.set(docSnap.id, uid),
    );
  }

  const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  parentTargets.forEach((matchedTeacherId, parentUid) => {
    operations.push((batch) =>
      batch.update(adminDb.doc(`users/${parentUid}`), {
        matchedTeacherId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });
  requestTargets.forEach((homeroomTeacherId, requestId) => {
    operations.push((batch) =>
      batch.update(adminDb.doc(`nonHomeroomRequests/${requestId}`), {
        homeroomTeacherId,
      }),
    );
  });

  await commitInChunks(adminDb, operations);
}

async function writeAudit(
  adminDb: Firestore,
  actor: AdminActor,
  action: string,
  target: { uid?: string; email?: string },
  summary: string,
  details?: Record<string, unknown>,
) {
  await adminDb.collection('adminAuditLogs').add({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    targetUid: target.uid || null,
    targetEmail: target.email || null,
    summary,
    details: details || {},
    createdAt: FieldValue.serverTimestamp(),
  });
}

function getProfileStatus(hasAuth: boolean, hasProfile: boolean) {
  if (hasAuth && hasProfile) return 'linked';
  if (hasAuth) return 'auth-only';
  return 'profile-only';
}

function buildClassIssues(profileDocs: QueryDocumentSnapshot[]) {
  type ClassProfile = {
    uid: string;
    role?: string;
    name?: string;
    email?: string;
    schoolName?: string;
    schoolCode?: string;
    grade?: number;
    classNum?: number;
  };

  const teachers: ClassProfile[] = profileDocs
    .map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }) as ClassProfile)
    .filter(
      (profile) => profile.role === 'teacher' || profile.role === 'admin',
    );
  const groups = new Map<string, typeof teachers>();

  teachers
    .filter(
      (profile) => Number(profile.grade) > 0 && Number(profile.classNum) > 0,
    )
    .forEach((profile) => {
      const key = `${profile.schoolCode}|${profile.grade}|${profile.classNum}`;
      groups.set(key, [...(groups.get(key) || []), profile]);
    });

  const duplicates = [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => {
      const [schoolCode, grade, classNum] = key.split('|');
      return {
        schoolCode,
        schoolName: members[0].schoolName || '',
        grade: Number(grade),
        classNum: Number(classNum),
        teachers: members.map((member) => ({
          uid: member.uid,
          name: member.name,
          email: member.email,
        })),
      };
    });

  const gradeGroups = new Map<string, typeof teachers>();
  teachers
    .filter(
      (profile) => Number(profile.grade) > 0 && Number(profile.classNum) > 0,
    )
    .forEach((profile) => {
      const key = `${profile.schoolCode}|${profile.grade}`;
      gradeGroups.set(key, [...(gradeGroups.get(key) || []), profile]);
    });

  const missingClasses = [...gradeGroups.entries()].flatMap(
    ([key, members]) => {
      const [schoolCode, grade] = key.split('|');
      const maxClass = Math.max(
        ...members.map((member) => Number(member.classNum)),
      );
      const registered = new Set(
        members.map((member) => Number(member.classNum)),
      );

      return Array.from({ length: maxClass }, (_, index) => index + 1)
        .filter((classNum) => !registered.has(classNum))
        .map((classNum) => ({
          schoolCode,
          schoolName: members[0].schoolName || '',
          grade: Number(grade),
          classNum,
        }));
    },
  );

  return { duplicates, missingClasses };
}

async function buildDashboard() {
  const { adminAuth, adminDb } = getFirebaseAdminServices();
  const [
    authUsers,
    profileSnapshot,
    reservationSnapshot,
    requestSnapshot,
    auditSnapshot,
  ] = await Promise.all([
    listAllAuthUsers(adminAuth),
    adminDb.collection('users').get(),
    adminDb.collection('reservations').get(),
    adminDb.collection('nonHomeroomRequests').get(),
    adminDb
      .collection('adminAuditLogs')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get(),
  ]);

  const authByUid = new Map(authUsers.map((user) => [user.uid, user]));
  const profileByUid = new Map(
    profileSnapshot.docs.map((docSnap) => [docSnap.id, docSnap]),
  );
  const allUids = new Set([...authByUid.keys(), ...profileByUid.keys()]);

  const users = [...allUids].map((uid) => {
    const authUser = authByUid.get(uid);
    const profileSnap = profileByUid.get(uid);
    const profile = profileSnap?.data() || {};

    return serializeValue({
      uid,
      email: profile.email || authUser?.email || '',
      name: profile.name || authUser?.displayName || '',
      role: profile.role || null,
      schoolName: profile.schoolName || '',
      schoolCode: profile.schoolCode || '',
      grade: profile.grade ?? null,
      classNum: profile.classNum ?? null,
      isLocked: profile.isLocked || false,
      failedLoginAttempts: profile.failedLoginAttempts || 0,
      authDisabled: authUser?.disabled || false,
      status: getProfileStatus(Boolean(authUser), Boolean(profileSnap)),
      createdAt: profile.createdAt || authUser?.metadata.creationTime || null,
      lastSignInAt: authUser?.metadata.lastSignInTime || null,
    });
  });

  const teacherNames = new Map(
    profileSnapshot.docs.map((docSnap) => [
      docSnap.id,
      docSnap.data().name || '알 수 없음',
    ]),
  );
  const reservations = [
    ...reservationSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      type: 'homeroom',
      teacherName: teacherNames.get(docSnap.data().teacherId) || '알 수 없음',
      ...docSnap.data(),
    })),
    ...requestSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      type: 'nonHomeroom',
      teacherName:
        docSnap.data().targetTeacherName ||
        teacherNames.get(docSnap.data().homeroomTeacherId) ||
        '미지정',
      ...docSnap.data(),
    })),
  ].map(serializeValue);

  const auditLogs = auditSnapshot.docs.map((docSnap) =>
    serializeValue({ id: docSnap.id, ...docSnap.data() }),
  );
  const classIssues = buildClassIssues(profileSnapshot.docs);

  return {
    users,
    reservations,
    auditLogs,
    issues: {
      authOnly: users.filter(
        (user) => (user as { status: string }).status === 'auth-only',
      ).length,
      profileOnly: users.filter(
        (user) => (user as { status: string }).status === 'profile-only',
      ).length,
      ...classIssues,
    },
    stats: {
      authUsers: authUsers.length,
      profiles: profileSnapshot.size,
      teachers: profileSnapshot.docs.filter(
        (docSnap) => docSnap.data().role === 'teacher',
      ).length,
      admins: profileSnapshot.docs.filter(
        (docSnap) => docSnap.data().role === 'admin',
      ).length,
      locked: users.filter((user) => (user as { isLocked: boolean }).isLocked)
        .length,
      disabled: authUsers.filter((user) => user.disabled).length,
      reservations: reservationSnapshot.size,
      nonHomeroomRequests: requestSnapshot.size,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await buildDashboard());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = (await request.json()) as AdminActionBody;
    const { adminAuth, adminDb } = getFirebaseAdminServices();

    switch (body.action) {
      case 'createUser': {
        const email = body.email?.trim().toLowerCase() || '';
        const password = body.password || '';
        const profile = parseProfile(body.profile);
        if (!email || password.length < 6) {
          throw new AdminApiError(
            400,
            '이메일과 6자 이상의 임시 비밀번호가 필요합니다.',
          );
        }
        await assertNoDuplicateClass(adminDb, profile);

        const authUser = await adminAuth.createUser({
          email,
          password,
          displayName: profile.name,
          disabled: false,
        });

        try {
          const now = Timestamp.now();
          await adminDb.doc(`users/${authUser.uid}`).set({
            uid: authUser.uid,
            email,
            ...profile,
            isLocked: false,
            failedLoginAttempts: 0,
            gradeClassConfirmedSchoolYear: getCurrentSchoolYear(),
            profileConfirmedAt: now,
            createdAt: now,
            updatedAt: now,
          });
          await syncTeacherAssignments(adminDb, authUser.uid, profile);
        } catch (error) {
          await adminAuth.deleteUser(authUser.uid);
          throw error;
        }

        await writeAudit(
          adminDb,
          actor,
          'user.create',
          { uid: authUser.uid, email },
          `${profile.name} 계정 생성`,
          { profile },
        );
        return NextResponse.json({ ok: true });
      }

      case 'repairProfile': {
        const uid = body.uid || '';
        const profile = parseProfile(body.profile);
        const authUser = await adminAuth.getUser(uid);
        await assertNoDuplicateClass(adminDb, profile, uid);
        const now = Timestamp.now();
        await adminDb.doc(`users/${uid}`).set({
          uid,
          email: authUser.email || body.email || '',
          ...profile,
          isLocked: false,
          failedLoginAttempts: 0,
          gradeClassConfirmedSchoolYear: getCurrentSchoolYear(),
          profileConfirmedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        await syncTeacherAssignments(adminDb, uid, profile);
        await writeAudit(
          adminDb,
          actor,
          'profile.repair',
          { uid, email: authUser.email },
          `${profile.name} 프로필 복구`,
          { profile },
        );
        return NextResponse.json({ ok: true });
      }

      case 'repairAuth': {
        const uid = body.uid || '';
        const password = body.password || '';
        const profileSnap = await adminDb.doc(`users/${uid}`).get();
        if (!profileSnap.exists) {
          throw new AdminApiError(404, '복구할 프로필이 없습니다.');
        }
        const profile = profileSnap.data() || {};
        if (!profile.email || password.length < 6) {
          throw new AdminApiError(
            400,
            '6자 이상의 임시 비밀번호가 필요합니다.',
          );
        }
        await adminAuth.createUser({
          uid,
          email: profile.email,
          password,
          displayName: profile.name || '',
          disabled: Boolean(profile.isLocked),
        });
        await writeAudit(
          adminDb,
          actor,
          'auth.repair',
          { uid, email: profile.email },
          `${profile.name || profile.email} 인증 계정 복구`,
        );
        return NextResponse.json({ ok: true });
      }

      case 'updateUser': {
        const uid = body.uid || '';
        const profile = parseProfile(body.profile);
        const profileRef = adminDb.doc(`users/${uid}`);
        const beforeSnap = await profileRef.get();
        if (!beforeSnap.exists) {
          throw new AdminApiError(404, '수정할 프로필이 없습니다.');
        }
        if (uid === actor.uid && profile.role !== 'admin') {
          throw new AdminApiError(
            400,
            '현재 로그인한 관리자 역할은 해제할 수 없습니다.',
          );
        }
        await assertNoDuplicateClass(adminDb, profile, uid);
        await adminAuth.updateUser(uid, { displayName: profile.name });
        await profileRef.update({
          ...profile,
          profileConfirmedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await syncTeacherAssignments(adminDb, uid, profile);
        await writeAudit(
          adminDb,
          actor,
          'user.update',
          { uid, email: beforeSnap.data()?.email },
          `${profile.name} 정보 수정`,
          {
            before: serializeValue(beforeSnap.data()),
            after: profile,
          },
        );
        return NextResponse.json({ ok: true });
      }

      case 'setDisabled': {
        const uid = body.uid || '';
        if (uid === actor.uid && body.disabled) {
          throw new AdminApiError(
            400,
            '현재 로그인한 관리자 계정은 비활성화할 수 없습니다.',
          );
        }
        const authUser = await adminAuth.updateUser(uid, {
          disabled: Boolean(body.disabled),
        });
        const profileRef = adminDb.doc(`users/${uid}`);
        if ((await profileRef.get()).exists) {
          await profileRef.update({
            isLocked: Boolean(body.disabled),
            failedLoginAttempts: body.disabled ? 10 : 0,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        await writeAudit(
          adminDb,
          actor,
          body.disabled ? 'user.disable' : 'user.enable',
          { uid, email: authUser.email },
          `${authUser.email || uid} 계정 ${body.disabled ? '비활성화' : '활성화'}`,
        );
        return NextResponse.json({ ok: true });
      }

      case 'deleteUser': {
        const uid = body.uid || '';
        if (uid === actor.uid) {
          throw new AdminApiError(
            400,
            '현재 로그인한 관리자 계정은 삭제할 수 없습니다.',
          );
        }
        const profileRef = adminDb.doc(`users/${uid}`);
        const profileSnap = await profileRef.get();
        const email = profileSnap.data()?.email || body.email || '';
        const [matchedParents, assignedRequests, availableSlots] =
          await Promise.all([
            adminDb
              .collection('users')
              .where('matchedTeacherId', '==', uid)
              .get(),
            adminDb
              .collection('nonHomeroomRequests')
              .where('homeroomTeacherId', '==', uid)
              .get(),
            adminDb
              .collection('availableSlots')
              .where('teacherId', '==', uid)
              .where('status', '==', 'available')
              .get(),
          ]);
        const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> =
          [];
        matchedParents.docs.forEach((docSnap) =>
          operations.push((batch) =>
            batch.update(docSnap.ref, {
              matchedTeacherId: null,
              updatedAt: FieldValue.serverTimestamp(),
            }),
          ),
        );
        assignedRequests.docs.forEach((docSnap) =>
          operations.push((batch) =>
            batch.update(docSnap.ref, { homeroomTeacherId: null }),
          ),
        );
        availableSlots.docs.forEach((docSnap) =>
          operations.push((batch) => batch.delete(docSnap.ref)),
        );
        if (profileSnap.exists)
          operations.push((batch) => batch.delete(profileRef));
        const teacherDoc = adminDb.doc(`teachers/${uid}`);
        if ((await teacherDoc.get()).exists)
          operations.push((batch) => batch.delete(teacherDoc));
        await commitInChunks(adminDb, operations);
        try {
          await adminAuth.deleteUser(uid);
        } catch (error) {
          if ((error as { code?: string }).code !== 'auth/user-not-found')
            throw error;
        }
        await writeAudit(
          adminDb,
          actor,
          'user.delete',
          { uid, email },
          `${email || uid} 계정 삭제`,
        );
        return NextResponse.json({ ok: true });
      }

      case 'passwordResetLink': {
        const email = body.email?.trim() || '';
        if (!email) throw new AdminApiError(400, '이메일이 필요합니다.');
        const link = await adminAuth.generatePasswordResetLink(email);
        await writeAudit(
          adminDb,
          actor,
          'user.passwordResetLink',
          { email },
          `${email} 비밀번호 재설정 링크 생성`,
        );
        return NextResponse.json({ ok: true, link });
      }

      default:
        throw new AdminApiError(400, '지원하지 않는 관리자 작업입니다.');
    }
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  console.error('Admin API error:', error);
  if (error instanceof AdminApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : '관리자 작업에 실패했습니다.';
  return NextResponse.json({ error: message }, { status: 500 });
}
