'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, Users, AlertCircle, BookOpen } from 'lucide-react';
import { signUpWithEmail, createUserProfile, signInWithGoogle, checkTeacherDuplicate } from '@/lib/auth-firebase';
import { auth } from '@/lib/firebase';
import SchoolSearch from '@/components/SchoolSearch';
import { SchoolInfo, UserRole } from '@/types/auth';
import { useLanguage } from '@/lib/i18n';

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const isGoogleSignUp = searchParams.get('google') === 'true';
    const googleEmail = searchParams.get('email') || '';
    const googleName = searchParams.get('name') || '';

    const [step, setStep] = useState<'role' | 'info'>(isGoogleSignUp ? 'info' : 'role');
    const [role, setRole] = useState<UserRole>('teacher');

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

    const [studentName, setStudentName] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSchoolSelect = (school: SchoolInfo) => {
        setSchoolName(school.schoolName);
        setSchoolCode(school.schoolCode);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isGoogleSignUp) {
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

        if (role === 'parent' && !studentName.trim()) {
            setError(t('enterStudentName'));
            return;
        }

        setLoading(true);

        try {
            // 교사 중복 가입 검사
            if (role === 'teacher' && schoolCode) {
                const isDuplicate = await checkTeacherDuplicate(schoolCode, grade, classNum);
                if (isDuplicate) {
                    setError(t('duplicateTeacher'));
                    setLoading(false);
                    return;
                }
            }

            let uid: string;

            if (isGoogleSignUp) {
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
                email: isGoogleSignUp ? googleEmail : email,
                role,
                name,
                schoolName,
                schoolCode,
                grade,
                classNum,
                ...(role === 'parent' ? { studentName } : {}),
            });

            router.push('/');
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/email-already-in-use') {
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

    const handleGoogleSignUp = async () => {
        setError('');
        setLoading(true);
        try {
            const result = await signInWithGoogle();
            if (result.isNewUser) {
                setEmail(result.user.email || '');
                setName(result.user.displayName || '');
                setStep('info');
            } else {
                router.push('/');
            }
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/popup-closed-by-user' || firebaseError.code === 'auth/cancelled-popup-request') {
                // ignore
            } else if (firebaseError.code === 'auth/operation-not-allowed') {
                setError(t('googleLoginDisabled'));
            } else if (firebaseError.code === 'auth/popup-blocked') {
                setError(t('popupBlocked'));
            } else {
                setError(`${t('googleLoginFailed')} (${firebaseError.code || ''})`);
            }
        } finally {
            setLoading(false);
        }
    };

    if (step === 'role') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative w-full max-w-md mx-auto px-4">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                                {t('schoolholic')}
                            </h1>
                        </Link>
                        <p className="text-blue-200/60 text-sm mt-2">{t('signupTitle')}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                        <h2 className="text-lg font-bold text-center text-white mb-6">{t('selectRole')}</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={() => { setRole('teacher'); setStep('info'); }}
                                className="group p-6 bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-400/40 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <GraduationCap className="w-10 h-10 text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="font-bold text-white">{t('teacher')}</h3>
                                <p className="text-xs text-white/50 mt-1">{t('teacherDesc')}</p>
                            </button>

                            <button
                                onClick={() => { setRole('parent'); setStep('info'); }}
                                className="group p-6 bg-white/5 hover:bg-blue-500/15 border border-white/10 hover:border-blue-400/40 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <Users className="w-10 h-10 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="font-bold text-white">{t('parent')}</h3>
                                <p className="text-xs text-white/50 mt-1">{t('parentDesc')}</p>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 my-5">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-white/40">{t('orDivider')}</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        <button
                            onClick={handleGoogleSignUp}
                            disabled={loading}
                            className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77a7.15 7.15 0 0 1-10.6-3.75H1.46v2.86A11.99 11.99 0 0 0 12 23z" />
                                <path fill="#FBBC05" d="M5.12 13.82a7.18 7.18 0 0 1 0-3.64V7.32H1.46a11.99 11.99 0 0 0 0 9.36l3.66-2.86z" />
                                <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11.94 11.94 0 0 0 12 1 11.99 11.99 0 0 0 1.46 7.32l3.66 2.86A7.14 7.14 0 0 1 12 4.75z" />
                            </svg>
                            {t('startWithGoogle')}
                        </button>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl mt-4">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        <p className="text-center text-sm text-white/50 mt-6">
                            {t('alreadyHaveAccount')}{' '}
                            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                                {t('login')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

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
                    <p className="text-blue-200/60 text-sm mt-2">
                        {role === 'teacher' ? t('teacherSignup') : t('parentSignup')}
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                            {role === 'teacher' ? (
                                <GraduationCap className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <Users className="w-5 h-5 text-blue-400" />
                            )}
                            <span className="text-sm font-medium text-white">
                                {t('signupAs', { role: role === 'teacher' ? t('teacher') : t('parent') })}
                            </span>
                            {!isGoogleSignUp && (
                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className="ml-auto text-xs text-cyan-400/70 hover:text-cyan-400"
                                >
                                    {t('change')}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {!isGoogleSignUp && (
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

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('grade')}</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(Number(e.target.value))}
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
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    {role === 'teacher' ? t('homeroom') : t('classNum')}
                                </label>
                                <select
                                    value={classNum}
                                    onChange={(e) => setClassNum(Number(e.target.value))}
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

                        {role === 'parent' && (
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('studentName')}</label>
                                <div className="relative">
                                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    <input
                                        type="text"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                        placeholder={t('studentNamePlaceholder')}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-white/40 mt-1.5">
                                    {t('studentNameHint')}
                                </p>
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
