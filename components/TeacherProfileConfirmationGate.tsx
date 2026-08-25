'use client';

import { useAuth } from '@/components/AuthContext';
import UserProfileModal from '@/components/UserProfileModal';

export default function TeacherProfileConfirmationGate() {
    const { profile, loading, refreshProfile, requiresProfileConfirmation } = useAuth();

    if (loading || !profile || !requiresProfileConfirmation) {
        return null;
    }

    return (
        <UserProfileModal
            isOpen
            onClose={() => {}}
            profile={profile}
            onDeleteAccount={async () => {}}
            onProfileUpdated={refreshProfile}
            forceProfileConfirmation
        />
    );
}
