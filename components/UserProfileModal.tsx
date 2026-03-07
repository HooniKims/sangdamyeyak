'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { UserProfile } from '@/types/auth';
import { Timestamp } from 'firebase/firestore';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onDeleteAccount: () => Promise<void>;
}

type ModalStep = 'profile' | 'confirm' | 'complete';

function getErrorDetails(error: unknown) {
    if (typeof error !== 'object' || error === null) {
        return { code: '', message: '' };
    }

    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';

    return { code, message };
}

export default function UserProfileModal({
    isOpen,
    onClose,
    profile,
    onDeleteAccount,
}: UserProfileModalProps) {
    const [step, setStep] = useState<ModalStep>('profile');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { t } = useLanguage();

    if (!isOpen) return null;

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp || !timestamp.toDate) return t('noInfo');
        const date = timestamp.toDate();
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const handleDeleteClick = () => {
        setStep('confirm');
        setError(''); // Clear any previous errors
    };

    const handleConfirmDelete = async () => {
        setLoading(true);
        setError('');
        try {
            await onDeleteAccount();
            setStep('complete');
        } catch (error: unknown) {
            const { code, message } = getErrorDetails(error);
            console.error(t('deleteAccountError'), error);
            if (code === 'auth/requires-recent-login' || message.includes('requires-recent-login')) {
                setError(t('reloginRequired'));
            } else {
                setError(t('deleteFailed2'));
            }
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (step === 'complete') {
            // 탈퇴 완료 후 닫으면 페이지 새로고침
            window.location.href = '/';
            return;
        }
        setStep('profile');
        setLoading(false);
        setError('');
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* 프로필 정보 단계 */}
                {step === 'profile' && (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">{t('myInfo')}</h2>
                            <button
                                onClick={handleClose}
                                className="text-white/40 hover:text-white/80 transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-xs text-white/40 uppercase tracking-wider">{t('userId')}</span>
                                <p className="text-white font-medium mt-1">{profile.email}</p>
                            </div>
                            <div>
                                <span className="text-xs text-white/40 uppercase tracking-wider">{t('joinDate')}</span>
                                <p className="text-white font-medium mt-1">{formatDate(profile.createdAt)}</p>
                            </div>
                            <div>
                                <span className="text-xs text-white/40 uppercase tracking-wider">{t('role')}</span>
                                <p className="text-white font-medium mt-1">
                                    {profile.role === 'teacher' ? t('teacher') : profile.role === 'admin' ? t('admin') : t('parent')}
                                </p>
                            </div>
                            {profile.schoolName && (
                                <div>
                                    <span className="text-xs text-white/40 uppercase tracking-wider">{t('school')}</span>
                                    <p className="text-white font-medium mt-1">
                                        {t('schoolInfo', {
                                            school: profile.schoolName,
                                            grade: profile.grade,
                                            class: profile.classNum
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={handleDeleteClick}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-all duration-200"
                            >
                                <User className="w-4 h-4" />
                                {t('deleteAccount')}
                            </button>
                        </div>
                    </>
                )}

                {/* 탈퇴 확인 단계 */}
                {step === 'confirm' && (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">{t('confirmDeleteTitle')}</h3>
                            <button
                                onClick={handleClose}
                                className="text-white/40 hover:text-white/80 transition-colors p-1"
                                disabled={loading}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>
                            <p className="text-white font-medium mb-2">{t('confirmDeleteMessage')}</p>
                            <p className="text-white/50 text-sm leading-relaxed">
                                {t('confirmDeleteDesc')}<br />
                                {t('confirmDeleteDesc2')}
                            </p>
                            {error && (
                                <p className="text-red-400 text-sm mt-4">{error}</p>
                            )}
                        </div>
                        <div className="flex gap-3 p-4 border-t border-white/10">
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl text-sm font-medium transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={loading}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    t('deleteConfirmButton')
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* 탈퇴 완료 단계 */}
                {step === 'complete' && (
                    <>
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{t('deleteCompleted')}</h3>
                            <p className="text-white/50 text-sm leading-relaxed">
                                {t('deleteCompletedDesc')}<br />
                                {t('deleteCompletedDesc2')}
                            </p>
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                            >
                                확인
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
