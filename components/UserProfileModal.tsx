'use client';

import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { updateUserGradeClass } from '@/lib/auth-firebase';
import { useLanguage } from '@/lib/i18n';
import { UserProfile } from '@/types/auth';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onDeleteAccount: () => Promise<void>;
    onProfileUpdated: () => Promise<void>;
    forceGradeClassUpdate?: boolean;
}

type ModalStep = 'profile' | 'edit' | 'confirm' | 'complete';

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
    onProfileUpdated,
    forceGradeClassUpdate = false,
}: UserProfileModalProps) {
    const [step, setStep] = useState<ModalStep>('profile');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [grade, setGrade] = useState(profile.grade || 1);
    const [classNum, setClassNum] = useState(profile.classNum || 1);
    const [isNonHomeroom, setIsNonHomeroom] = useState(profile.grade === 0 && profile.classNum === 0);
    const { t, language } = useLanguage();
    const supportsGradeClassEdit =
        profile.role === 'teacher' || profile.role === 'parent' || profile.role === 'admin';
    const isTeacherOrAdmin = profile.role === 'teacher' || profile.role === 'admin';
    const isForcedGradeClassUpdate = forceGradeClassUpdate && supportsGradeClassEdit;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setStep(isForcedGradeClassUpdate ? 'edit' : 'profile');
        setLoading(false);
        setSaving(false);
        setError('');
        setStatusMessage('');
        setGrade(profile.grade || 1);
        setClassNum(profile.classNum || 1);
        setIsNonHomeroom(profile.grade === 0 && profile.classNum === 0);
    }, [isOpen, isForcedGradeClassUpdate, profile.grade, profile.classNum]);

    if (!isOpen) {
        return null;
    }

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp || !timestamp.toDate) {
            return t('noInfo');
        }

        return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ko-KR').format(
            timestamp.toDate()
        );
    };

    const handleDeleteClick = () => {
        if (isForcedGradeClassUpdate) {
            return;
        }

        setStep('confirm');
        setError('');
        setStatusMessage('');
    };

    const handleConfirmDelete = async () => {
        setLoading(true);
        setError('');

        try {
            await onDeleteAccount();
            setStep('complete');
        } catch (deleteError: unknown) {
            const { code, message } = getErrorDetails(deleteError);
            console.error(t('deleteAccountError'), deleteError);

            if (code === 'auth/requires-recent-login' || message.includes('requires-recent-login')) {
                setError(t('reloginRequired'));
            } else {
                setError(t('deleteFailed2'));
            }

            setLoading(false);
        }
    };

    const handleEditClick = () => {
        setGrade(profile.grade || 1);
        setClassNum(profile.classNum || 1);
        setIsNonHomeroom(profile.grade === 0 && profile.classNum === 0);
        setError('');
        setStatusMessage('');
        setStep('edit');
    };

    const handleSaveGradeClass = async () => {
        setSaving(true);
        setError('');

        const saveGrade = isNonHomeroom ? 0 : grade;
        const saveClassNum = isNonHomeroom ? 0 : classNum;

        try {
            const result = await updateUserGradeClass(profile.uid, saveGrade, saveClassNum);
            await onProfileUpdated();

            if (isForcedGradeClassUpdate) {
                setError('');
                setStatusMessage('');
                onClose();
                return;
            }

            if (profile.role === 'parent') {
                setStatusMessage(
                    result.matchedTeacherId
                        ? t('gradeClassUpdatedMatched')
                        : t('gradeClassUpdatedPendingMatch')
                );
            } else {
                setStatusMessage(t('gradeClassUpdated'));
            }

            setStep('profile');
        } catch (saveError: unknown) {
            const { message } = getErrorDetails(saveError);

            if (message === 'DUPLICATE_TEACHER_CLASS') {
                setError(t('duplicateTeacher'));
            } else {
                setError(t('saveFailed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (isForcedGradeClassUpdate && step !== 'complete') {
            return;
        }

        if (step === 'complete') {
            window.location.href = '/';
            return;
        }

        setStep('profile');
        setLoading(false);
        setSaving(false);
        setError('');
        setStatusMessage('');
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-800/95 shadow-2xl backdrop-blur-lg"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {step === 'profile' && (
                    <>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h2 className="text-xl font-bold text-white">{t('myInfo')}</h2>
                            <button
                                onClick={handleClose}
                                className="p-1 text-white/40 transition-colors hover:text-white/80"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            {statusMessage && (
                                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                    {statusMessage}
                                </div>
                            )}
                            <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">{t('userId')}</span>
                                <p className="mt-1 font-medium text-white">{profile.email}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">{t('joinDate')}</span>
                                <p className="mt-1 font-medium text-white">{formatDate(profile.createdAt)}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">{t('role')}</span>
                                <p className="mt-1 font-medium text-white">
                                    {profile.role === 'teacher'
                                        ? t('teacher')
                                        : profile.role === 'admin'
                                            ? t('admin')
                                            : t('parent')}
                                </p>
                            </div>
                            {profile.schoolName && (
                                <div>
                                    <span className="text-xs uppercase tracking-wider text-white/40">{t('school')}</span>
                                    <p className="mt-1 font-medium text-white">
                                        {profile.grade === 0 && profile.classNum === 0
                                            ? t('nonHomeroom')
                                            : t('schoolInfo', {
                                                school: profile.schoolName,
                                                grade: profile.grade,
                                                class: profile.classNum,
                                            })}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-white/10 p-4">
                            {supportsGradeClassEdit && (
                                <button
                                    onClick={handleEditClick}
                                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-medium text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200"
                                >
                                    <User className="h-4 w-4" />
                                    {t('editGradeClass')}
                                </button>
                            )}
                            <button
                                onClick={handleDeleteClick}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300"
                            >
                                <User className="h-4 w-4" />
                                {t('deleteAccount')}
                            </button>
                        </div>
                    </>
                )}

                {step === 'edit' && (
                    <>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h3 className="text-lg font-semibold text-white">
                                {isForcedGradeClassUpdate
                                    ? t('annualGradeClassUpdateTitle')
                                    : t('editGradeClass')}
                            </h3>
                            {!isForcedGradeClassUpdate && (
                                <button
                                    onClick={handleClose}
                                    className="p-1 text-white/40 transition-colors hover:text-white/80"
                                    disabled={saving}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-4 p-6">
                            {isForcedGradeClassUpdate && (
                                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
                                    {t('annualGradeClassUpdateNotice')}
                                </div>
                            )}
                            <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">{t('school')}</span>
                                <p className="mt-1 font-medium text-white">{profile.schoolName}</p>
                            </div>
                            {isTeacherOrAdmin && (
                                <div className="flex items-center gap-3">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isNonHomeroom}
                                            onChange={(e) => {
                                                setIsNonHomeroom(e.target.checked);
                                                if (!e.target.checked) {
                                                    setGrade(profile.grade || 1);
                                                    setClassNum(profile.classNum || 1);
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-400/30"
                                        />
                                        <span className="text-sm font-medium text-white/80">{t('nonHomeroom')}</span>
                                    </label>
                                </div>
                            )}
                            {isNonHomeroom && isTeacherOrAdmin && (
                                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                                    {t('nonHomeroomHint')}
                                </div>
                            )}
                            <div className={`grid grid-cols-2 gap-3 ${isNonHomeroom ? 'pointer-events-none opacity-40' : ''}`}>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-white/70">{t('grade')}</label>
                                    <select
                                        value={grade}
                                        onChange={(event) => setGrade(Number(event.target.value))}
                                        disabled={isNonHomeroom}
                                        className="w-full cursor-pointer appearance-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map((gradeOption) => (
                                            <option
                                                key={gradeOption}
                                                value={gradeOption}
                                                className="bg-slate-800 text-white"
                                            >
                                                {gradeOption}
                                                {t('gradeUnit')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-white/70">
                                        {isTeacherOrAdmin
                                            ? t('homeroom')
                                            : t('classNum')}
                                    </label>
                                    <select
                                        value={classNum}
                                        onChange={(event) => setClassNum(Number(event.target.value))}
                                        disabled={isNonHomeroom}
                                        className="w-full cursor-pointer appearance-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                                    >
                                        {Array.from({ length: 15 }, (_, index) => index + 1).map((classOption) => (
                                            <option
                                                key={classOption}
                                                value={classOption}
                                                className="bg-slate-800 text-white"
                                            >
                                                {classOption}
                                                {t('classUnit')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <p className="text-sm leading-relaxed text-white/55">
                                {profile.role === 'parent'
                                    ? t('gradeClassUpdateHintParent')
                                    : t('gradeClassUpdateHintTeacher')}
                            </p>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                        <div className="flex gap-3 border-t border-white/10 p-4">
                            {!isForcedGradeClassUpdate && (
                                <button
                                    onClick={() => {
                                        setStep('profile');
                                        setError('');
                                    }}
                                    disabled={saving}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                                >
                                    {t('cancel')}
                                </button>
                            )}
                            <button
                                onClick={handleSaveGradeClass}
                                disabled={saving}
                                className={`flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 disabled:bg-cyan-600/50 ${isForcedGradeClassUpdate ? 'w-full' : 'flex-1'}`}
                            >
                                {saving ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    t('save')
                                )}
                            </button>
                        </div>
                    </>
                )}

                {step === 'confirm' && (
                    <>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h3 className="text-lg font-semibold text-white">{t('confirmDeleteTitle')}</h3>
                            <button
                                onClick={handleClose}
                                className="p-1 text-white/40 transition-colors hover:text-white/80"
                                disabled={loading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                                <AlertTriangle className="h-7 w-7 text-red-400" />
                            </div>
                            <p className="mb-2 font-medium text-white">{t('confirmDeleteMessage')}</p>
                            <p className="text-sm leading-relaxed text-white/50">
                                {t('confirmDeleteDesc')}
                                <br />
                                {t('confirmDeleteDesc2')}
                            </p>
                            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                        </div>
                        <div className="flex gap-3 border-t border-white/10 p-4">
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={loading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-500 disabled:bg-red-600/50"
                            >
                                {loading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    t('deleteConfirmButton')
                                )}
                            </button>
                        </div>
                    </>
                )}

                {step === 'complete' && (
                    <>
                        <div className="p-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                                <CheckCircle className="h-8 w-8 text-emerald-400" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-white">{t('deleteCompleted')}</h3>
                            <p className="text-sm leading-relaxed text-white/50">
                                {t('deleteCompletedDesc')}
                                <br />
                                {t('deleteCompletedDesc2')}
                            </p>
                        </div>
                        <div className="border-t border-white/10 p-4">
                            <button
                                onClick={handleClose}
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
