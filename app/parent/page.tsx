'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { Calendar, CalendarPlus, CheckCircle2, Clock, MessageSquare, Search, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import { AvailableSlot, COUNSELING_TOPICS, CounselingTopic, Reservation } from '@/types';
import { formatDate, formatDateI18n } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/lib/i18n';

type Tab = 'book' | 'check';
const SLOT_ALREADY_RESERVED_ERROR = 'slot-already-reserved';

export default function ParentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('book');

  // 로그인 안 된 상태면 로그인 페이지로 이동
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('parentPage')} description={t('parentPageDesc')}>
      <div className="max-w-4xl mx-auto">
        {/* 탭 네비게이션 */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${activeTab === 'book'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <CalendarPlus className="w-5 h-5 inline-block mr-2" />
            {t('bookReservation')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('check')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${activeTab === 'check'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Search className="w-5 h-5 inline-block mr-2" />
            {t('checkCancel')}
          </button>
        </div>

        {activeTab === 'book' ? <BookingTab /> : <CheckTab />}
      </div>
    </Layout>
  );
}

type Step = 1 | 2 | 3;

function BookingTab() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [topic, setTopic] = useState<CounselingTopic>(COUNSELING_TOPICS[0]);
  const [content, setContent] = useState('');
  const [consultationType, setConsultationType] = useState<'face' | 'phone' | 'etc'>('face');
  const [consultationTypeEtc, setConsultationTypeEtc] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    cancelText: null as string | null,
  });

  // 로그인한 학부모 프로필에서 매칭된 교사 ID(matchedTeacherId)를 가져옵니다.
  useEffect(() => {
    if (profile?.role === 'parent') {
      const parentProfile = profile as import('@/types/auth').ParentProfile;
      if (parentProfile.matchedTeacherId) {
        setTeacherId(parentProfile.matchedTeacherId);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!teacherId) return;

    const q = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId),
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const slots: AvailableSlot[] = [];
      snapshot.forEach(docSnap => {
        slots.push({ id: docSnap.id, ...(docSnap.data() as Omit<AvailableSlot, 'id'>) });
      });

      const today = formatDate(new Date());
      const filtered = slots
        .filter(slot => slot.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);

      setAvailableSlots(filtered);
    });

    return () => unsubscribe();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedSlot) return;

    const latestSelectedSlot = availableSlots.find(slot => slot.id === selectedSlot.id);

    if (!latestSelectedSlot) {
      setSelectedSlot(null);
      if (step === 3) {
        setStep(2);
      }
      return;
    }

    if (latestSelectedSlot !== selectedSlot) {
      setSelectedSlot(latestSelectedSlot);
    }
  }, [availableSlots, selectedSlot, step]);

  const handleStudentInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !studentName.trim()) {
      alert(t('enterBothFields'));
      return;
    }
    setStep(2);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.status !== 'available') {
      return;
    }

    setSelectedSlot(slot);
    setStep(3);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || selectedSlot.status !== 'available') {
      setConfirmModal({
        isOpen: true,
        title: t('bookingFailed'),
        message: t('alreadyReserved'),
        cancelText: null,
        onConfirm: () => {
          setStep(2);
        },
      });
      return;
    }

    if (consultationType === 'etc' && !consultationTypeEtc.trim()) {
      alert(t('enterOtherMethod'));
      return;
    }

    setLoading(true);
    try {
      const slotRef = doc(db, 'availableSlots', selectedSlot.id);
      const reservationRef = collection(db, 'reservations');

      await runTransaction(db, async transaction => {
        const slotDoc = await transaction.get(slotRef);

        if (!slotDoc.exists() || slotDoc.data().status !== 'available') {
          throw new Error(SLOT_ALREADY_RESERVED_ERROR);
        }

        transaction.update(slotRef, { status: 'reserved' });

        // A new reservation document is created with a random ID
        transaction.set(doc(reservationRef), {
          teacherId: selectedSlot.teacherId,
          slotId: selectedSlot.id,
          studentNumber: studentNumber.trim(),
          studentName: studentName.trim(),
          date: selectedSlot.date,
          period: selectedSlot.period,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          topic,
          content: content.trim(),
          consultationType,
          consultationTypeEtc: consultationType === 'etc' ? consultationTypeEtc.trim() : '',
          createdAt: Date.now(),
        });
      });

      setConfirmModal({
        isOpen: true,
        title: t('bookingCompleted'),
        message: t('bookingCompletedMsg'),
        cancelText: null,
        onConfirm: () => {
          setStep(1);
          setStudentNumber('');
          setStudentName('');
          setSelectedSlot(null);
          setTopic(COUNSELING_TOPICS[0]);
          setContent('');
          setConsultationType('face');
          setConsultationTypeEtc('');
        },
      });
    } catch (error) {
      console.error('예약 오류:', error);
      const message =
        error instanceof Error && error.message === SLOT_ALREADY_RESERVED_ERROR
          ? t('alreadyReserved')
          : t('bookingFailedMsg');

      setConfirmModal({
        isOpen: true,
        title: t('bookingFailed'),
        message,
        cancelText: null,
        onConfirm: () => {
          setStep(2); // On error, return to the time selection step
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleStudentInfoSubmit} className="space-y-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              {t('studentNumber')}
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              placeholder={t('studentNumberPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
              required
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              {t('studentNameField')}
            </label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder={t('studentNameFieldPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full">
            {t('next')}
          </Button>
        </form>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{studentNumber}</span> - {studentName}
            </div>
            <Button onClick={() => setStep(1)} variant="ghost" size="sm">
              {t('editInfo')}
            </Button>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('selectTimeSlot')}
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          {t('reservedSlotHint')}
        </p>

        {availableSlots.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">{t('noTimeSlots')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableSlots.map(slot => {
              const isReserved = slot.status === 'reserved';
              const isSelected = !isReserved && selectedSlot?.id === slot.id;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotSelect(slot)}
                  disabled={isReserved}
                  className={`w-full rounded-lg border p-4 text-left flex items-center justify-between transition-all ${
                    isReserved
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div>
                    <div className={`font-medium ${isReserved ? 'text-gray-500' : 'text-gray-900'}`}>
                      {formatDateI18n(slot.date, language)}{' '}
                      {t('periodLabel', { number: slot.period })}
                    </div>
                    <div className={`text-sm ${isReserved ? 'text-gray-400' : 'text-gray-600'}`}>
                      {slot.startTime} ~ {slot.endTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isReserved && (
                      <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                        {t('reserved')}
                      </span>
                    )}
                    <Calendar className={`w-5 h-5 ${isReserved ? 'text-gray-400' : 'text-blue-500'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // step === 3
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {selectedSlot && (
        <div
          className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
            selectedSlot.status === 'available'
              ? 'border-blue-200 bg-blue-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <Clock
            className={`mt-0.5 w-5 h-5 ${
              selectedSlot.status === 'available' ? 'text-blue-600' : 'text-amber-600'
            }`}
          />
          <div>
            <div className="font-medium text-gray-900 mb-1">
              {formatDateI18n(selectedSlot.date, language)}{' '}
              {t('periodLabel', { number: selectedSlot.period })}
            </div>
            <div className="text-sm text-gray-700">
              {selectedSlot.startTime} ~ {selectedSlot.endTime}
            </div>
            {selectedSlot.status === 'reserved' && (
              <div className="mt-2 text-sm text-amber-700">
                {t('selectedSlotReservedNotice')}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleBookingSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('counselingTopic')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COUNSELING_TOPICS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`px-3 py-2 rounded-lg text-sm border ${topic === item
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
              >
                {t(item)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('counselingMethod')}
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="face"
                checked={consultationType === 'face'}
                onChange={(e) => setConsultationType(e.target.value as 'face')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('faceToFace')}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="phone"
                checked={consultationType === 'phone'}
                onChange={(e) => setConsultationType(e.target.value as 'phone')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('phoneCounseling')}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="consultationType"
                value="etc"
                checked={consultationType === 'etc'}
                onChange={(e) => setConsultationType(e.target.value as 'etc')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('other')}</span>
            </label>
          </div>
          {consultationType === 'etc' && (
            <div className="mt-2">
              <input
                type="text"
                value={consultationTypeEtc}
                onChange={(e) => setConsultationTypeEtc(e.target.value)}
                placeholder={t('otherMethodPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('counselingContent')}
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none [transform:translateZ(0)]"
            placeholder={t('contentPlaceholder')}
          />
        </div>

        {selectedSlot?.status === 'reserved' && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSelectedSlot(null);
              setStep(2);
            }}
          >
            {t('chooseAnotherTime')}
          </Button>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || selectedSlot?.status !== 'available'}
        >
          {loading ? t('processingBooking') : t('completeBooking')}
        </Button>
      </form>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
}

function CheckTab() {
  const { t, language } = useLanguage();
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    cancelText: null as string | null,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !studentName.trim()) {
      alert(t('enterBothFields'));
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'reservations'),
        where('studentNumber', '==', studentNumber.trim()),
        where('studentName', '==', studentName.trim()),
      );
      const snapshot = await getDocs(q);

      const result: Reservation[] = [];
      snapshot.forEach(docSnap => {
        result.push({ id: docSnap.id, ...(docSnap.data() as Omit<Reservation, 'id'>) });
      });

      result.sort(
        (a, b) => a.date.localeCompare(b.date) || a.period - b.period,
      );

      setReservations(result);
      setSearched(true);
    } catch (error) {
      console.error('예약 조회 오류:', error);
      alert(t('searchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: `${reservation.studentName}(${reservation.studentNumber})`,
      cancelText: '취소',
      onConfirm: async () => {
        try {
          const reservationRef = doc(db, 'reservations', reservation.id);
          const slotRef = doc(db, 'availableSlots', reservation.slotId);

          await runTransaction(db, async transaction => {
            transaction.delete(reservationRef);
            transaction.update(slotRef, { status: 'available' });
          });

          setReservations(prev => prev.filter(r => r.id !== reservation.id));
          // 예약 취소 성공 시에도 모달로 알림을 띄우는 것이 좋겠지만, 
          // 기존 로직 유지를 위해 alert 사용 또는 필요 시 변경 가능.
          // 여기서는 일단 alert 유지 (사용자 요청은 예약 완료 팝업이었음)
          alert(t('reservationCanceled'));
        } catch (error) {
          console.error('Cancel error:', error);
          alert(t('cancelError'));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-lg shadow-md p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              {t('studentNumber')}
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              placeholder={t('studentNumberPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              {t('studentNameField')}
            </label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder={t('studentNameFieldPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [transform:translateZ(0)]"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? t('searching') : t('searchReservation')}
        </Button>
      </form>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          {t('reservationHistory')}
        </h3>

        {loading && (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!loading && searched && reservations.length === 0 && (
          <p className="text-gray-600 text-sm">{t('noReservationFound')}</p>
        )}

        {!loading && reservations.length > 0 && (
          <div className="space-y-3">
            {reservations.map(reservation => (
              <div
                key={reservation.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {formatDateI18n(reservation.date, language)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {t('periodLabel', { number: reservation.period })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    {reservation.startTime} ~ {reservation.endTime}
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">{t('topicLabel')}</span>{' '}
                    <span className="text-gray-600">{t(reservation.topic)}</span>
                  </div>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    {t('counselingMethodLabel')} {reservation.consultationType === 'face' ? t('faceToFace') : reservation.consultationType === 'phone' ? t('phoneCounseling') : t('other')}
                    {reservation.consultationType === 'etc' && reservation.consultationTypeEtc && ` (${reservation.consultationTypeEtc})`}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleCancel(reservation)}
                >
                  <X className="w-4 h-4" />
                  {t('cancelReservation')}
                </Button>
              </div>
            ))}
          </div>
        )}
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
    </div >
  );
}
