'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useLanguage } from '@/lib/i18n';
import { UserRole } from '@/types/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

/**
 * 인증 보호 래퍼 컴포넌트
 * - 미인증 시 /login으로 리다이렉트
 * - allowedRoles 지정 시 해당 역할만 접근 허용
 */
export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const { user, profile, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
                return;
            }

            if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
                router.replace('/');
                return;
            }
        }
    }, [user, profile, loading, allowedRoles, router]);

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-white/70">{t('loadingAuth')}</p>
                </div>
            </div>
        );
    }

    // 미인증 또는 권한 없음
    if (!user || (allowedRoles && profile && !allowedRoles.includes(profile.role))) {
        return null;
    }

    return <>{children}</>;
}
