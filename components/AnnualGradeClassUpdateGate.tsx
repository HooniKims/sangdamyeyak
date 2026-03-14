'use client';

import { useAuth } from '@/components/AuthContext';
import UserProfileModal from '@/components/UserProfileModal';

export default function AnnualGradeClassUpdateGate() {
    const { profile, loading, refreshProfile, requiresGradeClassUpdate } = useAuth();

    if (loading || !profile || !requiresGradeClassUpdate) {
        return null;
    }

    return (
        <UserProfileModal
            isOpen
            onClose={() => {}}
            profile={profile}
            onDeleteAccount={async () => {}}
            onProfileUpdated={refreshProfile}
            forceGradeClassUpdate
        />
    );
}
