'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { changePassword } from '@/lib/auth-firebase';
import { useAuth } from '@/components/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { useLanguage } from '@/lib/i18n';

function ChangePasswordContent() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (newPassword.length < 6) {
            setError(t('passwordTooShort'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                setError(t('wrongCurrentPassword'));
            } else {
                setError(t('changePasswordFailed'));
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
                    <p className="text-blue-200/60 text-sm mt-2">{t('changePasswordTitle')}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    {success ? (
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                            <h2 className="text-xl font-bold text-white">{t('passwordChanged')}</h2>
                            <p className="text-blue-200/70 text-sm">{t('passwordChangedDesc')}</p>
                            <Link
                                href="/"
                                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                                {t('backToMain')}
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <p className="text-blue-200/70 text-sm text-center mb-2">
                                현재 로그인: <strong className="text-white">{user?.email}</strong>
                            </p>

                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-400/30 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('currentPassword')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder={t('currentPasswordPlaceholder')}
                                        required
                                        className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                                    >
                                        {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('newPassword')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder={t('passwordMinLength')}
                                        required
                                        minLength={6}
                                        className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                                    >
                                        {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('confirmNewPassword')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={t('confirmNewPasswordPlaceholder')}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {t('changing')}
                                    </span>
                                ) : (
                                    t('changePasswordButton')
                                )}
                            </button>

                            <p className="text-center text-sm text-white/50 mt-4">
                                <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                    ← {t('backToMain')}
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChangePasswordPage() {
    return (
        <AuthGuard>
            <ChangePasswordContent />
        </AuthGuard>
    );
}
