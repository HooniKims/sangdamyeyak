'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, signOutUser } from '@/lib/auth-firebase';
import { requiresAnnualGradeClassUpdate } from '@/lib/school-year';
import { UserProfile } from '@/types/auth';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    requiresGradeClassUpdate: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    logout: async () => { },
    refreshProfile: async () => { },
    requiresGradeClassUpdate: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Firebase Auth 상태 리스너
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setProfile(userProfile);
                } catch (error) {
                    console.error('프로필 로드 오류:', error);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOutUser();
        setUser(null);
        setProfile(null);
    };

    const refreshProfile = async () => {
        if (user) {
            const userProfile = await getUserProfile(user.uid);
            setProfile(userProfile);
        }
    };

    const requiresGradeClassUpdate = requiresAnnualGradeClassUpdate(profile);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                logout,
                refreshProfile,
                requiresGradeClassUpdate,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth는 AuthProvider 내에서만 사용할 수 있습니다.');
    }
    return context;
}
