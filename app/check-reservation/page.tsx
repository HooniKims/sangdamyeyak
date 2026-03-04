'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Reservation, Period, DEFAULT_PERIODS } from '@/types';
import { formatDateI18n } from '@/lib/utils';
import { Search, X, Calendar, Clock, User, MessageSquare, ArrowLeft } from 'lucide-react';

export default function CheckReservationPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [periods] = useState<Period[]>(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const router = useRouter();
  const { t, language } = useLanguage();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentNumber.trim() || !studentName.trim()) {
      alert(t('enterStudentInfo'));
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const q = query(
        collection(db, 'reservations'),
        where('studentNumber', '==', studentNumber.trim()),
        where('studentName', '==', studentName.trim())
      );

      const querySnapshot = await getDocs(q);
      const foundReservations: Reservation[] = [];

      querySnapshot.forEach((doc) => {
        foundReservations.push({ id: doc.id, ...doc.data() } as Reservation);
      });

      // 날짜순 정렬
      foundReservations.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);

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
      // 예약 삭제
      await deleteDoc(doc(db, 'reservations', reservation.id));

      // 슬롯 상태를 available로 변경
      const slotRef = doc(db, 'availableSlots', reservation.slotId);
      await updateDoc(slotRef, { status: 'available' });

      // 목록에서 제거
      setReservations(reservations.filter((r) => r.id !== reservation.id));

      alert(t('reservationCanceled'));
    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert(t('cancelError'));
    }
  };

  const handleReset = () => {
    setStep(1);
    setStudentNumber('');
    setStudentName('');
    setReservations([]);
    setSearched(false);
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
                {t('studentNumber')}
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder={t('studentNumberPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                {t('studentName')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={t('studentNameFieldPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

  // Step 2: 예약 목록 표시
  return (
    <Layout
      title={t('checkReservationTitle')}
      description={t('reservationHistoryFor', { studentName })}
    >
      <div className="p-6 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{studentNumber}</span> - {studentName}
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
                const period = periods.find((p) => p.number === reservation.period);
                const isPast = new Date(reservation.date) < new Date(new Date().toDateString());

                return (
                  <div
                    key={reservation.id}
                    className={`p-5 rounded-lg border-2 ${isPast
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
