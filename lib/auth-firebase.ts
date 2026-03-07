import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser,
    User,
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    collection,
    where,
    getDocs,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, UserRole, ParentProfile } from '@/types/auth';

// ============================================================
// 회원가입
// ============================================================

/** 이메일/비밀번호로 회원가입 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

/** Firestore에 사용자 프로필 생성 */
export async function createUserProfile(
    uid: string,
    data: {
        email: string;
        role: UserRole;
        name: string;
        schoolName: string;
        schoolCode: string;
        grade: number;
        classNum: number;
        studentName?: string;
    }
): Promise<void> {
    const now = Timestamp.now();

    const profileData: Record<string, unknown> = {
        uid,
        email: data.email,
        role: data.role,
        name: data.name,
        schoolName: data.schoolName,
        schoolCode: data.schoolCode,
        grade: data.grade,
        classNum: data.classNum,
        isLocked: false,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now,
    };

    // 학부모인 경우 학생이름 + 교사 매칭
    if (data.role === 'parent') {
        profileData.studentName = data.studentName || '';
        profileData.matchedTeacherId = await matchTeacher(
            data.schoolCode,
            data.grade,
            data.classNum
        );
    }

    await setDoc(doc(db, 'users', uid), profileData);
}

// ============================================================
// 로그인
// ============================================================

/** 서버 사이드 잠금 확인 API 호출 */
async function serverCheckLock(email: string, action: 'check' | 'increment' | 'reset') {
    try {
        const res = await fetch('/api/auth/check-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, action }),
        });
        if (!res.ok) return { isLocked: false, failedAttempts: 0 };
        return res.json();
    } catch {
        return { isLocked: false, failedAttempts: 0 };
    }
}

/** 이메일/비밀번호로 로그인 (서버 사이드 잠금 검증) */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<{ user: User; profile: UserProfile }> {
    // 서버 사이드에서 잠금 상태 확인
    const lockStatus = await serverCheckLock(email, 'check');

    if (lockStatus.isLocked) {
        throw new Error('ACCOUNT_LOCKED');
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 로그인 성공 → 서버에서 실패 횟수 초기화
        await serverCheckLock(email, 'reset');

        const profile = await getUserProfile(user.uid);
        if (!profile) {
            throw new Error('PROFILE_NOT_FOUND');
        }

        return { user, profile };
    } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };

        // 계정 잠금 에러는 그대로 전달
        if (firebaseError.message === 'ACCOUNT_LOCKED') {
            throw error;
        }

        // 잘못된 비밀번호 → 서버에서 실패 횟수 증가
        if (
            firebaseError.code === 'auth/wrong-password' ||
            firebaseError.code === 'auth/invalid-credential'
        ) {
            const result = await serverCheckLock(email, 'increment');
            if (result.isLocked) {
                throw new Error('ACCOUNT_LOCKED');
            }
        }

        throw error;
    }
}

/** Google 소셜 로그인 */
export async function signInWithGoogle(): Promise<{
    user: User;
    profile: UserProfile | null;
    isNewUser: boolean;
}> {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    // 기존 프로필이 있는지 확인
    const profile = await getUserProfile(user.uid);

    if (profile) {
        // 잠금 확인
        if (profile.isLocked) {
            await signOut(auth);
            throw new Error('ACCOUNT_LOCKED');
        }
        return { user, profile, isNewUser: false };
    }

    // 새 사용자 → 프로필 등록이 필요함
    return { user, profile: null, isNewUser: true };
}

/** 로그아웃 */
export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

// ============================================================
// 비밀번호 관리
// ============================================================

/** 비밀번호 재설정 이메일 발송 */
export async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
}

/** 비밀번호 변경 (현재 비밀번호 재인증 후) */
export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw new Error('로그인된 사용자가 없습니다.');
    }

    // 재인증
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // 비밀번호 변경
    await updatePassword(user, newPassword);
}

// ============================================================
// 프로필 조회
// ============================================================

/** UID로 사용자 프로필 조회 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (!docSnap.exists()) return null;

    const profile = docSnap.data() as UserProfile;

    // 학부모 로그인 시 선생님이 나중에 가입했을 경우를 대비해 매칭 자동 갱신
    if (profile.role === 'parent' && profile.schoolCode) {
        const parentProfile = profile as ParentProfile;
        if (!parentProfile.matchedTeacherId) {
            const tid = await matchTeacher(profile.schoolCode, profile.grade, profile.classNum);
            if (tid) {
                await updateDoc(doc(db, 'users', uid), { matchedTeacherId: tid });
                parentProfile.matchedTeacherId = tid;
            }
        }
    }

    return profile;
}

/** 이메일로 사용자 프로필 조회 */
async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as UserProfile;
}

// ============================================================
// 계정 잠금 관리
// ============================================================

const MAX_FAILED_ATTEMPTS = 10;

/** 로그인 실패 횟수 증가 (10회 시 잠금) */
export async function incrementFailedAttempts(uid: string): Promise<boolean> {
    const profile = await getUserProfile(uid);
    if (!profile) return false;

    const newCount = (profile.failedLoginAttempts || 0) + 1;
    const isLocked = newCount >= MAX_FAILED_ATTEMPTS;

    await updateDoc(doc(db, 'users', uid), {
        failedLoginAttempts: newCount,
        isLocked,
        updatedAt: serverTimestamp(),
    });

    return isLocked;
}

/** 관리자 → 계정 잠금 해제 */
export async function unlockAccount(uid: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        isLocked: false,
        failedLoginAttempts: 0,
        updatedAt: serverTimestamp(),
    });
}

/** 잠긴 계정 목록 조회 (관리자용) */
export async function getLockedAccounts(): Promise<UserProfile[]> {
    const q = query(collection(db, 'users'), where('isLocked', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as UserProfile);
}

// ============================================================
// 교사-학부모 매칭
// ============================================================

/** 학교코드 + 학년 + 반으로 교사 찾기 */
export async function checkTeacherDuplicate(
    schoolCode: string,
    grade: number,
    classNum: number
): Promise<boolean> {
    if (!schoolCode) return false;

    const q = query(
        collection(db, 'users'),
        where('role', 'in', ['teacher', 'admin']),
        where('schoolCode', '==', schoolCode),
        where('grade', '==', grade),
        where('classNum', '==', classNum)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

/** 학교코드 + 학년 + 반으로 교사 찾기 */
export async function matchTeacher(
    schoolCode: string,
    grade: number,
    classNum: number
): Promise<string | null> {
    if (!schoolCode) return null;

    const q = query(
        collection(db, 'users'),
        where('role', 'in', ['teacher', 'admin']),
        where('schoolCode', '==', schoolCode),
        where('grade', '==', grade),
        where('classNum', '==', classNum)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return (snapshot.docs[0].data() as { uid: string }).uid;
}

/** 교사에 매칭된 학부모 목록 조회 */
export async function getMatchedParents(teacherUid: string): Promise<ParentProfile[]> {
    const q = query(
        collection(db, 'users'),
        where('role', '==', 'parent'),
        where('matchedTeacherId', '==', teacherUid)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as ParentProfile);
}

// ============================================================
// 회원 탈퇴
// ============================================================

/** 회원 탈퇴 (Firebase Auth 사용자 삭제 + Firestore 프로필 삭제) */
export async function deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('로그인된 사용자가 없습니다.');
    }

    const uid = user.uid;

    // 백업: deleteUser가 실패할 경우를 대비
    const profileSnap = await getDoc(doc(db, 'users', uid));
    const profileData = profileSnap.data();

    // Firestore 프로필 문서 임시 삭제
    try {
        await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
        console.error('Firestore 프로필 삭제 오류:', error);
        throw error;
    }

    try {
        // Firebase Auth 사용자 삭제
        await deleteUser(user);
    } catch (error: unknown) {
        // 복구 시도
        if (profileData) {
            await setDoc(doc(db, 'users', uid), profileData);
        }
        console.error('Firebase Auth 사용자 삭제 오류 (복구됨):', error);
        throw error;
    }
}
