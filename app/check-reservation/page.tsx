'use client';

import { useEffect, useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { Search, X, Calendar, Clock, User, MessageSquare } from 'lucide-react';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { useLanguage } from '@/lib/i18n';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import SchoolSearch from '@/components/SchoolSearch';
import { useAuth } from '@/components/AuthContext';
import { Reservation } from '@/types';
import { SchoolInfo } from '@/types/auth';
import { formatDateI18n } from '@/lib/utils';
import {
  formatStudentLookupLabel,
  searchReservationsByStudentInfo,
} from '@/lib/reservation-firebase';

export default function CheckReservationPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const parentStudentName =
    profile?.role === 'parent'
      ? ((profile as import('@/types/auth').ParentProfile).studentName || '').trim()
      : '';
  const shouldLockStudentName = profile?.role === 'parent' && Boolean(parentStudentName);

  useEffect(() => {
    if (profile?.role !== 'parent') return;

    const parentProfile = profile as import('@/types/auth').ParentProfile;
    setSchoolName(parentProfile.schoolName);
    setSchoolCode(parentProfile.schoolCode);
    setGrade(parentProfile.grade);
    setClassNum(parentProfile.classNum);
    setStudentName((parentProfile.studentName || '').trim());
  }, [profile]);

  const handleSchoolSelect = (school: SchoolInfo) => {
    setSchoolName(school.schoolName);
    setSchoolCode(school.schoolCode);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      alert(t('selectSchool'));
      return;
    }

    if (!schoolCode) {
      alert(t('selectSchoolFromSearch'));
      return;
    }

    if (!studentName.trim()) {
      alert(t('enterStudentInfo'));
      return;
    }

    setLoading(true);

    try {
      const foundReservations = await searchReservationsByStudentInfo({
        studentName,
        grade,
        classNum,
        schoolCode,
      });

      setReservations(foundReservations);
      setStep(2);
    } catch (error) {
      console.error('예약 조회 오류:', error);
      alert(t('searchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    if (!window.confirm(t('confirmCancelReservation'))) return;

    try {
      const reservationRef = doc(db, 'reservations', reservation.id);
      const slotRef = doc(db, 'availableSlots', reservation.slotId);

      await runTransaction(db, async (transaction) => {
        transaction.delete(reservationRef);
        transaction.update(slotRef, { status: 'available' });
      });

      setReservations(prev => prev.filter((item) => item.id !== reservation.id));

      alert(t('reservationCanceled'));
    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert(t('cancelError'));
    }
  };

  const handleReset = () => {
    setStep(1);
    if (profile?.role === 'parent') {
      const parentProfile = profile as import('@/types/auth').ParentProfile;
      setSchoolName(parentProfile.schoolName);
      setSchoolCode(parentProfile.schoolCode);
      setGrade(parentProfile.grade);
      setClassNum(parentProfile.classNum);
      setStudentName(parentProfile.studentName || '');
    } else {
      setSchoolName('');
      setSchoolCode('');
      setGrade(1);
      setClassNum(1);
      setStudentName('');
    }
    setReservations([]);
  };

  if (step === 1) {
    return (
      <Layout
        title={t('checkReservationTitle')}
        description={t('checkReservationDescription')}
      >
        <form onSubmit={handleSearch} className="p-6 sm:p-8">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                {t('school')}
              </label>
              {profile?.role === 'parent' ? (
                <input
                  type="text"
                  value={schoolName}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              ) : (
                <SchoolSearch
                  value={schoolName}
                  onSelect={handleSchoolSelect}
                  variant="solid"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  {t('grade')}
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6].map((gradeOption) => (
                    <option key={gradeOption} value={gradeOption}>
                      {gradeOption}{t('gradeUnit')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  {t('classNum')}
                </label>
                <select
                  value={classNum}
                  onChange={(e) => setClassNum(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((classOption) => (
                    <option key={classOption} value={classOption}>
                      {classOption}{t('classUnit')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                {t('studentNameField')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={t('studentNameFieldPlaceholder')}
                readOnly={shouldLockStudentName}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-100 read-only:text-gray-600"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('searching')}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  {t('searchReservation')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Layout>
    );
  }

  return (
    <Layout
      title={t('checkReservationTitle')}
      description={t('reservationHistoryFor', { studentName })}
    >
      <div className="p-6 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">
                {t('schoolInfo', { school: schoolName, grade, class: classNum })}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {formatStudentLookupLabel({ grade, classNum, studentName }, language)}
              </div>
            </div>
            <Button onClick={handleReset} variant="ghost" size="sm">
              {t('searchAgain')}
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner text={t('searching')} />
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-2">{t('noReservations')}</p>
              <p className="text-sm text-gray-500">
                {t('noReservationsDetail')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                {t('totalReservations', { count: reservations.length })}
              </div>

              {reservations.map((reservation) => {
                const isPast = new Date(reservation.date) < new Date(new Date().toDateString());

                return (
                  <div
                    key={reservation.id}
                    className={`p-5 rounded-lg border-2 ${
                      isPast
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            {formatDateI18n(reservation.date, language)}
                          </span>
                          {isPast && (
                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              {t('pastReservation')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {t('periodLabel', { number: reservation.period })} ({reservation.startTime} - {reservation.endTime})
                          </span>
                        </div>
                      </div>

                      {!isPast && (
                        <Button
                          onClick={() => handleCancelReservation(reservation)}
                          variant="ghost"
                          size="sm"
                          className="mt-2 sm:mt-0 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t('cancelReservation')}
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="font-medium text-gray-700">{t('topic')}:</span>{' '}
                          <span className="text-gray-600">{t(reservation.topic)}</span>
                        </div>
                      </div>

                      <div className="pl-6">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('content')}:</span>
                          <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                            {reservation.content}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 pl-6 pt-1">
                        {t('reservationDate')}: {new Date(reservation.createdAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
