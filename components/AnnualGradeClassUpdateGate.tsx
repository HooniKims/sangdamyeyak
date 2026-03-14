'use client';

import type { ComponentType } from 'react';
import { useAuth } from '@/components/AuthContext';
import UserProfileModal from '@/components/UserProfileModal';
import type { UserProfile } from '@/types/auth';

type AnnualGateAuth = ReturnType<typeof useAuth> & {
    requiresGradeClassUpdate?: boolean;
};

type AnnualGateModalProps = {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onDeleteAccount: () => Promise<void>;
    onProfileUpdated?: () => Promise<void>;
    forceGradeClassUpdate?: boolean;
};

export default function AnnualGradeClassUpdateGate() {
    const auth = useAuth() as AnnualGateAuth;
    const { profile, loading, refreshProfile } = auth;
    const UserProfileModalCompat = UserProfileModal as ComponentType<AnnualGateModalProps>;

    if (loading || !profile || !auth.requiresGradeClassUpdate) {
        return null;
    }

    return (
        <UserProfileModalCompat
            isOpen
            onClose={() => {}}
            profile={profile}
            onDeleteAccount={async () => {}}
            onProfileUpdated={refreshProfile}
            forceGradeClassUpdate
        />
    );
}
