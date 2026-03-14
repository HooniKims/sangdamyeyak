import { Timestamp } from 'firebase/firestore';

// 사용자 역할
export type UserRole = 'teacher' | 'parent' | 'admin';

// 기본 사용자 프로필
export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    name: string;
    schoolName: string;
    schoolCode: string;
    grade: number;
    classNum: number;
    isLocked: boolean;
    failedLoginAttempts: number;
    gradeClassConfirmedSchoolYear?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// 교사 프로필
export interface TeacherProfile extends UserProfile {
    role: 'teacher';
}

// 학부모 프로필
export interface ParentProfile extends UserProfile {
    role: 'parent';
    studentName: string;
    matchedTeacherId: string | null;
}

// 회원가입 폼 데이터
export interface SignUpFormData {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: UserRole;
    schoolName: string;
    schoolCode: string;
    grade: number;
    classNum: number;
    studentName?: string; // 학부모만
}

// 학교 검색 결과
export interface SchoolInfo {
    schoolName: string;
    schoolCode: string;
    address: string;
    schoolType: string; // 초등학교, 중학교, 고등학교
    eduOfficeCode: string; // 시도교육청코드
}
