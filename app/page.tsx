'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, MessageCircle, CalendarPlus, LogIn, LogOut, User, Shield, Key, Globe } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import UserProfileModal from '@/components/UserProfileModal';
import { deleteAccount } from '@/lib/auth-firebase';
import { useLanguage } from '@/lib/i18n';

export default function Home() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isNonHomeroomTeacher =
    Boolean(profile) &&
    (profile?.role === 'teacher' || profile?.role === 'admin') &&
    profile.grade === 0 &&
    profile.classNum === 0;

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] border border-white/5 rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3 mb-8">
          <button
            onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-all"
            title={language === 'ko' ? 'Switch to English' : 'Switch to Korean'}
          >
            <Globe className="w-4 h-4" />
            {language === 'ko' ? t('switchToEnglish') : t('switchToKorean')}
          </button>

          {loading ? (
            <div className="w-5 h-5 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          ) : user && profile ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-0 hover:opacity-80 transition-opacity cursor-pointer"
                  title={t('myInfo')}
                >
                  <User className="w-4 h-4 text-cyan-400" />
                </button>
                <span className="text-sm text-white/80">{profile.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    profile.role === 'teacher'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : profile.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {profile.role === 'teacher' ? t('teacher') : profile.role === 'admin' ? t('admin') : t('parent')}
                </span>
              </div>
              <Link
                href="/change-password"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={t('changePassword')}
              >
                <Key className="w-4 h-4 text-white/50 hover:text-white/80" />
              </Link>
              {profile.role === 'admin' && (
                <Link
                  href="/admin"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={t('admin')}
                >
                  <Shield className="w-4 h-4 text-amber-400/70 hover:text-amber-400" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30"
            >
              <LogIn className="w-4 h-4" />
              {t('login')}
            </Link>
          )}
        </div>

        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold tracking-wider uppercase text-cyan-300 mb-6">
            {t('smartSchoolPlatform')}
          </span>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
            {t('schoolholic')}
          </h1>
          <p className="text-lg text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
            {t('mainSubtitle')}
            <br className="hidden sm:block" />
            {t('mainSubtitle2')}
          </p>
        </div>

        <div className="mb-12 max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <CalendarPlus className="w-8 h-8 text-blue-300" />
              {t('counseling')}
            </h2>
            <p className="text-blue-200/70 mb-6 text-sm leading-relaxed">
              {t('counselingDesc1')}
              <strong className="text-blue-300 font-semibold">{t('counselingDesc2')}</strong>
              {t('counselingDesc3')}
              <br />
              <strong className="text-white font-medium">{t('counselingDesc4')}</strong>
              {t('counselingDesc5')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(!profile || profile.role === 'teacher' || profile.role === 'admin') && (
                <Link
                  href="/teacher"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/40"
                >
                  <Settings className="w-4 h-4" />
                  {t('teacherUse')}
                </Link>
              )}
              <Link
                href="/parent"
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/40"
              >
                <CalendarPlus className="w-4 h-4" />
                {t('parentUse')}
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
          <MessageCircle className="w-8 h-8 text-blue-300 mx-auto mb-3 opacity-70" />
          {user && profile ? (
            <>
              <h3 className="font-semibold text-white mb-2">{t('helloUser', { name: profile.name })}</h3>
              <p className="text-sm text-blue-200/70 max-w-lg mx-auto">
                {profile.schoolName && (
                  <>
                    <strong className="text-white">{profile.schoolName}</strong>{' '}
                    {isNonHomeroomTeacher
                      ? t('nonHomeroom')
                      : `${profile.grade}${t('gradeUnit')} ${profile.classNum}${t('classUnit')}`}
                    <br />
                  </>
                )}
                {profile.role === 'teacher'
                  ? (isNonHomeroomTeacher ? t('nonHomeroomDashboardDesc') : t('teacherWelcome'))
                  : t('parentWelcome')}
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-white mb-2">{t('firstVisit')}</h3>
              <p className="text-sm text-blue-200/70 max-w-lg mx-auto">
                <strong className="text-white">{t('firstVisitTeacher')}</strong>
                {t('firstVisitTeacherDesc')}
                <br />
                <strong className="text-white">{t('firstVisitParent')}</strong>
                {t('firstVisitParentDesc')}
              </p>
            </>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-blue-300/40">{t('footer')}</p>
          <Link
            href="/privacy"
            className="mt-3 inline-block text-sm text-cyan-300/80 transition hover:text-cyan-200"
          >
            {t('privacyPolicy')}
          </Link>
        </div>
      </div>

      {profile && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={profile}
          onDeleteAccount={handleDeleteAccount}
          onProfileUpdated={refreshProfile}
        />
      )}
    </div>
  );
}
