'use client';

import { useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { Calendar, Clock, MessageSquare, Search, User, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import SchoolSearch from '@/components/SchoolSearch';
import { useLanguage } from '@/lib/i18n';
import { Reservation } from '@/types';
import { SchoolInfo } from '@/types/auth';
import { formatDateI18n } from '@/lib/utils';
import {
  formatStudentLookupLabel,
  searchReservationsByStudentInfo,
} from '@/lib/reservation-firebase';

export default function PublicCheckReservationPage() {
  const { t, language } = useLanguage();
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    cancelText: null as string | null,
  });

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
      setSearched(true);
    } catch (error) {
      console.error('Reservation lookup error:', error);
      alert(t('searchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: t('confirmCancelReservation'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          const reservationRef = doc(db, 'reservations', reservation.id);
          const slotRef = doc(db, 'availableSlots', reservation.slotId);

          await runTransaction(db, async transaction => {
            transaction.delete(reservationRef);
            transaction.update(slotRef, { status: 'available' });
          });

          setReservations(prev => prev.filter(item => item.id !== reservation.id));
          alert(t('reservationCanceled'));
        } catch (error) {
          console.error('Reservation cancel error:', error);
          alert(t('cancelError'));
        }
      },
    });
  };

  return (
    <Layout
      title={t('checkReservationTitle')}
      description={t('checkReservationDescription')}
    >
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <form onSubmit={handleSearch} className="rounded-lg bg-white p-6 shadow-md space-y-4">
            <div>
              <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                <User className="mr-2 h-4 w-4" />
                {t('school')}
              </label>
              <SchoolSearch
                value={schoolName}
                onSelect={handleSchoolSelect}
                variant="solid"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  <User className="mr-2 h-4 w-4" />
                  {t('grade')}
                </label>
                <select
                  value={grade}
                  onChange={e => setGrade(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((gradeOption) => (
                    <option key={gradeOption} value={gradeOption}>
                      {gradeOption}
                      {t('gradeUnit')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  <User className="mr-2 h-4 w-4" />
                  {t('classNum')}
                </label>
                <select
                  value={classNum}
                  onChange={e => setClassNum(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((classOption) => (
                    <option key={classOption} value={classOption}>
                      {classOption}
                      {t('classUnit')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                <User className="mr-2 h-4 w-4" />
                {t('studentNameField')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder={t('studentNameFieldPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
              {loading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  {t('searching')}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  {t('searchReservation')}
                </>
              )}
            </Button>
          </form>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calendar className="h-5 w-5 text-blue-600" />
              {t('reservationHistory')}
            </h3>

            {searched && (
              <div className="mb-4 space-y-1 text-sm text-gray-600">
                <div>{t('schoolInfo', { school: schoolName, grade, class: classNum })}</div>
                <div className="font-medium">
                  {formatStudentLookupLabel({ grade, classNum, studentName }, language)}
                </div>
              </div>
            )}

            {loading && (
              <div className="py-8">
                <LoadingSpinner text={t('searching')} />
              </div>
            )}

            {!loading && searched && reservations.length === 0 && (
              <div className="rounded-lg bg-gray-50 py-12 text-center">
                <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="text-gray-600">{t('noReservations')}</p>
                <p className="mt-2 text-sm text-gray-500">{t('noReservationsDetail')}</p>
              </div>
            )}

            {!loading && reservations.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  {t('totalReservations', { count: reservations.length })}
                </div>

                {reservations.map(reservation => {
                  const isPast = new Date(reservation.date) < new Date(new Date().toDateString());

                  return (
                    <div
                      key={reservation.id}
                      className={`rounded-lg border-2 p-5 ${
                        isPast
                          ? 'border-gray-300 bg-gray-50'
                          : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
                      }`}
                    >
                      <div className="mb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">
                              {formatDateI18n(reservation.date, language)}
                            </span>
                            {isPast && (
                              <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">
                                {t('pastReservation')}
                              </span>
                            )}
                          </div>
                          <div className="mb-1 flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="h-4 w-4" />
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
                            className="mt-2 text-red-600 hover:bg-red-50 sm:mt-0"
                          >
                            <X className="mr-1 h-4 w-4" />
                            {t('cancelReservation')}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="mt-0.5 h-4 w-4 text-gray-500" />
                          <div>
                            <span className="font-medium text-gray-700">{t('topic')}:</span>{' '}
                            <span className="text-gray-600">{t(reservation.topic)}</span>
                          </div>
                        </div>

                        <div className="pl-6">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">{t('content')}:</span>
                            <p className="mt-1 whitespace-pre-wrap text-gray-600">
                              {reservation.content}
                            </p>
                          </div>
                        </div>

                        <div className="pl-6 pt-1 text-xs text-gray-500">
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
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={true}
        confirmText={t('cancelReservation')}
        cancelText={confirmModal.cancelText}
      />
    </Layout>
  );
}
