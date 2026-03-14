'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth-firebase';
import { useLanguage } from '@/lib/i18n';

export default function LoginPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmail(email, password);
            router.push('/');
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };

            if (firebaseError.message === 'ACCOUNT_LOCKED') {
                setError(t('accountLocked'));
            } else if (firebaseError.message === 'PARENT_LOGIN_REMOVED') {
                setError(
                    language === 'ko'
                        ? '학부모 로그인은 종료되었습니다. 학부모용 페이지에서 학교, 학년, 반을 입력해 바로 예약해 주세요.'
                        : 'Parent login has been removed. Please use the parent page directly with school, grade, and class information.',
                );
            } else if (firebaseError.message === 'PROFILE_NOT_FOUND') {
                setError(t('profileNotFound'));
            } else if (
                firebaseError.code === 'auth/invalid-credential' ||
                firebaseError.code === 'auth/wrong-password'
            ) {
                setError(t('invalidCredential'));
            } else if (firebaseError.code === 'auth/user-not-found') {
                setError(t('userNotFound'));
            } else if (firebaseError.code === 'auth/too-many-requests') {
                setError(t('tooManyRequests'));
            } else {
                setError(t('loginFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await signInWithGoogle();

            if (result.isNewUser) {
                router.push(`/signup?google=true&email=${result.user.email}&name=${result.user.displayName || ''}`);
            } else if (result.profile) {
                router.push('/');
            }
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };

            if (firebaseError.message === 'ACCOUNT_LOCKED') {
                setError(t('accountLocked'));
            } else if (firebaseError.message === 'PARENT_LOGIN_REMOVED') {
                setError(
                    language === 'ko'
                        ? '학부모 로그인은 종료되었습니다. 학부모용 페이지에서 학교, 학년, 반을 입력해 바로 예약해 주세요.'
                        : 'Parent login has been removed. Please use the parent page directly with school, grade, and class information.',
                );
            } else if (firebaseError.code === 'auth/popup-closed-by-user' || firebaseError.code === 'auth/cancelled-popup-request') {
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
                    <p className="text-blue-200/60 text-sm mt-2">{t('loginSubtitle')}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    <form onSubmit={handleEmailLogin} className="space-y-5">
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

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
                                    placeholder={t('passwordPlaceholder')}
                                    required
                                    className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="text-right">
                            <Link href="/forgot-password" className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors">
                                {t('forgotPassword')}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {t('loggingIn')}
                                </span>
                            ) : (
                                t('login')
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-white/40">{t('orDivider')}</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77a7.15 7.15 0 0 1-10.6-3.75H1.46v2.86A11.99 11.99 0 0 0 12 23z" />
                            <path fill="#FBBC05" d="M5.12 13.82a7.18 7.18 0 0 1 0-3.64V7.32H1.46a11.99 11.99 0 0 0 0 9.36l3.66-2.86z" />
                            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11.94 11.94 0 0 0 12 1 11.99 11.99 0 0 0 1.46 7.32l3.66 2.86A7.14 7.14 0 0 1 12 4.75z" />
                        </svg>
                        {t('loginWithGoogle')}
                    </button>

                    <p className="text-center text-sm text-white/50 mt-6">
                        {t('noAccountYet')}{' '}
                        <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                            {t('signup')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
