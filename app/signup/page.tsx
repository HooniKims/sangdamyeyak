'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { signUpWithEmail, createUserProfile, checkTeacherDuplicate } from '@/lib/auth-firebase';
import { auth } from '@/lib/firebase';
import SchoolSearch from '@/components/SchoolSearch';
import { SchoolInfo } from '@/types/auth';
import { useLanguage } from '@/lib/i18n';

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();

    const isGoogleFlow = searchParams.get('google') === 'true';
    const googleEmail = searchParams.get('email') || '';
    const googleName = searchParams.get('name') || '';

    const [email, setEmail] = useState(googleEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState(googleName);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [schoolName, setSchoolName] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [grade, setGrade] = useState(1);
    const [classNum, setClassNum] = useState(1);
    const [isNonHomeroom, setIsNonHomeroom] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSchoolSelect = (school: SchoolInfo) => {
        setSchoolName(school.schoolName);
        setSchoolCode(school.schoolCode);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isGoogleFlow) {
            if (password.length < 6) {
                setError(t('passwordTooShort'));
                return;
            }
            if (password !== confirmPassword) {
                setError(t('passwordMismatch'));
                return;
            }
        }

        if (!name.trim()) {
            setError(t('enterName'));
            return;
        }

        if (!schoolName.trim()) {
            setError(t('selectSchool'));
            return;
        }

        if (!schoolCode) {
            setError(t('selectSchoolFromSearch'));
            return;
        }

        setLoading(true);

        try {
            const saveGrade = isNonHomeroom ? 0 : grade;
            const saveClassNum = isNonHomeroom ? 0 : classNum;
            const isDuplicate =
                !isNonHomeroom &&
                (await checkTeacherDuplicate(schoolCode, saveGrade, saveClassNum));

            if (isDuplicate) {
                setError(t('duplicateTeacher'));
                setLoading(false);
                return;
            }

            let uid: string;

            if (isGoogleFlow) {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setError(t('googleAuthNotFound'));
                    setLoading(false);
                    return;
                }
                uid = currentUser.uid;
            } else {
                const user = await signUpWithEmail(email, password);
                uid = user.uid;
            }

            await createUserProfile(uid, {
                email: isGoogleFlow ? (googleEmail || email) : email,
                role: 'teacher',
                name: name.trim(),
                schoolName,
                schoolCode,
                grade: saveGrade,
                classNum: saveClassNum,
            });

            router.push('/');
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string; name?: string };
            if (firebaseError.message === 'PARENT_LOGIN_REMOVED') {
                setError(
                    language === 'ko'
                        ? '학부모 로그인은 종료되었습니다. 학부모용 페이지를 이용해 주세요.'
                        : 'Parent login has been removed. Please use the parent page instead.',
                );
            } else if (
                firebaseError.name === 'FIREBASE_NOT_CONFIGURED' ||
                firebaseError.message?.includes('Firebase')
            ) {
                setError(t('firebaseConfigMissing'));
            } else if (firebaseError.code === 'auth/email-already-in-use') {
                setError(t('emailAlreadyInUse'));
            } else if (firebaseError.code === 'auth/weak-password') {
                setError(t('weakPassword'));
            } else {
                setError(t('signupFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                            {t('schoolholic')}
                        </h1>
                    </Link>
                    <p className="text-blue-200/60 text-sm mt-2">{t('teacherSignup')}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                            <GraduationCap className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm font-medium text-white">
                                {t('signupAs', { role: t('teacher') })}
                            </span>
                        </div>

                        {isGoogleFlow && (
                            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                {language === 'ko'
                                    ? 'Google 계정 인증이 완료되었습니다. 아래 정보를 입력해 교사 가입을 마무리하세요.'
                                    : 'Google account verification is complete. Finish the teacher sign-up below.'}
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {!isGoogleFlow && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">{t('email')}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t('emailPlaceholder')}
                                            required
                                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">{t('password')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t('passwordMinLength')}
                                            required
                                            minLength={6}
                                            className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">{t('confirmPassword')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t('confirmPasswordPlaceholder')}
                                            required
                                            className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">{t('name')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">{t('school')}</label>
                            <SchoolSearch value={schoolName} onSelect={handleSchoolSelect} />
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isNonHomeroom}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setIsNonHomeroom(checked);

                                        if (!checked) {
                                            setGrade((current) => (current === 0 ? 1 : current));
                                            setClassNum((current) => (current === 0 ? 1 : current));
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-400/30"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">{t('nonHomeroom')}</p>
                                    <p className="text-xs text-white/55">{t('signupNonHomeroomHint')}</p>
                                </div>
                            </label>
                        </div>

                        <div className={`grid grid-cols-2 gap-3 ${isNonHomeroom ? 'pointer-events-none opacity-45' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('grade')}</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(Number(e.target.value))}
                                    disabled={isNonHomeroom}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all appearance-none cursor-pointer"
                                >
                                    {[1, 2, 3, 4, 5, 6].map((g) => (
                                        <option key={g} value={g} className="bg-slate-800 text-white">
                                            {g}{t('gradeUnit')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('homeroom')}</label>
                                <select
                                    value={classNum}
                                    onChange={(e) => setClassNum(Number(e.target.value))}
                                    disabled={isNonHomeroom}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all appearance-none cursor-pointer"
                                >
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map((c) => (
                                        <option key={c} value={c} className="bg-slate-800 text-white">
                                            {c}{t('classUnit')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isNonHomeroom && (
                            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                                {t('nonHomeroomSignupNoSlotHint')}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {t('signingUp')}
                                </span>
                            ) : (
                                t('signupButton')
                            )}
                        </button>

                        <p className="text-center text-sm text-white/50 mt-4">
                            {t('alreadyHaveAccount')}{' '}
                            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                                {t('login')}
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
            </div>
        }>
            <SignUpForm />
        </Suspense>
    );
}
