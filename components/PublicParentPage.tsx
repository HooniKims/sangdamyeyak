'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  User,
  X,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import SchoolSearch from '@/components/SchoolSearch';
import { AvailableSlot, COUNSELING_TOPICS, CounselingTopic, Reservation } from '@/types';
import { SchoolInfo } from '@/types/auth';
import { formatDate, formatDateI18n } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/lib/i18n';
import { matchTeacher } from '@/lib/auth-firebase';
import {
  formatReservationStudentLabel,
  formatStudentLookupLabel,
  searchReservationsByStudentInfo,
} from '@/lib/reservation-firebase';

type Tab = 'book' | 'check';
type BookingStep = 1 | 2 | 3;

const SLOT_ALREADY_RESERVED_ERROR = 'slot-already-reserved';

function getClassSummary(
  schoolName: string,
  grade: number,
  classNum: number,
  gradeUnit: string,
  classUnit: string,
) {
  if (!schoolName.trim()) {
    return `${grade}${gradeUnit} ${classNum}${classUnit}`;
  }

  return `${schoolName} ${grade}${gradeUnit} ${classNum}${classUnit}`;
}

function getNoMatchedTeacherMessage(language: 'ko' | 'en') {
  return language === 'ko'
    ? '입력한 학교, 학년, 반에 맞는 담임 교사를 찾을 수 없습니다.'
    : 'No homeroom teacher was found for the selected school, grade, and class.';
}

export default function PublicParentPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('book');

  return (
    <Layout title={t('parentPage')} description={t('parentPageDesc')}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex gap-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 rounded-md px-6 py-3 font-medium transition-all ${
              activeTab === 'book'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarPlus className="mr-2 inline-block h-5 w-5" />
            {t('bookReservation')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('check')}
            className={`flex-1 rounded-md px-6 py-3 font-medium transition-all ${
              activeTab === 'check'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="mr-2 inline-block h-5 w-5" />
            {t('checkCancel')}
          </button>
        </div>

        {activeTab === 'book' ? <BookingTab /> : <CheckTab />}
      </div>
    </Layout>
  );
}

function BookingTab() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<BookingStep>(1);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [topic, setTopic] = useState<CounselingTopic>(COUNSELING_TOPICS[0]);
  const [content, setContent] = useState('');
  const [consultationType, setConsultationType] = useState<'face' | 'phone' | 'etc'>('face');
  const [consultationTypeEtc, setConsultationTypeEtc] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [matchingTeacher, setMatchingTeacher] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [matchError, setMatchError] = useState('');
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
    setMatchError('');
  };

  useEffect(() => {
    if (!teacherId) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);

    const slotsQuery = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId),
    );

    const unsubscribe = onSnapshot(slotsQuery, snapshot => {
      const today = formatDate(new Date());
      const slots: AvailableSlot[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<AvailableSlot, 'id'>;
        if (data.date >= today) {
          slots.push({ id: docSnap.id, ...data });
        }
      });

      setAvailableSlots(
        slots.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period),
      );
      setLoadingSlots(false);
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

  const handleClassLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      alert(t('selectSchool'));
      return;
    }

    if (!schoolCode) {
      alert(t('selectSchoolFromSearch'));
      return;
    }

    setMatchingTeacher(true);
    setMatchError('');

    try {
      const matchedTeacherId = await matchTeacher(schoolCode, grade, classNum);

      if (!matchedTeacherId) {
        setTeacherId('');
        setAvailableSlots([]);
        setSelectedSlot(null);
        setStep(1);
        setMatchError(getNoMatchedTeacherMessage(language));
        return;
      }

      setTeacherId(matchedTeacherId);
      setSelectedSlot(null);
      setStudentName('');
      setStep(2);
    } catch (error) {
      console.error('Teacher lookup error:', error);
      setTeacherId('');
      setAvailableSlots([]);
      setMatchError(t('searchError'));
    } finally {
      setMatchingTeacher(false);
    }
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

    const trimmedStudentName = studentName.trim();

    if (!trimmedStudentName) {
      alert(t('enterStudentName'));
      return;
    }

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

    setLoadingSlots(true);

    try {
      const slotRef = doc(db, 'availableSlots', selectedSlot.id);
      const reservationRef = collection(db, 'reservations');

      await runTransaction(db, async transaction => {
        const slotDoc = await transaction.get(slotRef);

        if (!slotDoc.exists() || slotDoc.data().status !== 'available') {
          throw new Error(SLOT_ALREADY_RESERVED_ERROR);
        }

        transaction.update(slotRef, { status: 'reserved' });
        transaction.set(doc(reservationRef), {
          teacherId: selectedSlot.teacherId,
          slotId: selectedSlot.id,
          studentNumber: '',
          studentName: trimmedStudentName,
          grade,
          classNum,
          schoolCode,
          schoolName,
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

      setStudentName(trimmedStudentName);
      setConfirmModal({
        isOpen: true,
        title: t('bookingCompleted'),
        message: t('bookingCompletedMsg'),
        cancelText: null,
        onConfirm: () => {
          setStep(2);
          setSelectedSlot(null);
          setStudentName('');
          setTopic(COUNSELING_TOPICS[0]);
          setContent('');
          setConsultationType('face');
          setConsultationTypeEtc('');
        },
      });
    } catch (error) {
      console.error('Booking error:', error);
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
          setStep(2);
        },
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  if (step === 1) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleClassLookupSubmit} className="space-y-6">
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

          {matchError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {matchError}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={matchingTeacher}>
            {matchingTeacher ? t('searching') : t('next')}
          </Button>
        </form>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600">
              {getClassSummary(schoolName, grade, classNum, t('gradeUnit'), t('classUnit'))}
            </div>
            <Button onClick={() => setStep(1)} variant="ghost" size="sm">
              {t('editInfo')}
            </Button>
          </div>
        </div>

        <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('selectTimeSlot')}</h3>
        <p className="mb-4 text-sm text-gray-500">{t('reservedSlotHint')}</p>

        {loadingSlots ? (
          <div className="py-8">
            <LoadingSpinner />
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="rounded-lg bg-gray-50 py-12 text-center">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-400" />
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
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
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
                    <Calendar className={`h-5 w-5 ${isReserved ? 'text-gray-400' : 'text-blue-500'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 text-sm font-medium text-gray-600">
        {getClassSummary(schoolName, grade, classNum, t('gradeUnit'), t('classUnit'))}
      </div>

      {selectedSlot && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-lg border p-4 ${
            selectedSlot.status === 'available'
              ? 'border-blue-200 bg-blue-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <Clock
            className={`mt-0.5 h-5 w-5 ${
              selectedSlot.status === 'available' ? 'text-blue-600' : 'text-amber-600'
            }`}
          />
          <div>
            <div className="mb-1 font-medium text-gray-900">
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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t('counselingTopic')}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COUNSELING_TOPICS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  topic === item
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                }`}
              >
                {t(item)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t('counselingMethod')}
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="consultationType"
                value="face"
                checked={consultationType === 'face'}
                onChange={e => setConsultationType(e.target.value as 'face')}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('faceToFace')}</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="consultationType"
                value="phone"
                checked={consultationType === 'phone'}
                onChange={e => setConsultationType(e.target.value as 'phone')}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('phoneCounseling')}</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="consultationType"
                value="etc"
                checked={consultationType === 'etc'}
                onChange={e => setConsultationType(e.target.value as 'etc')}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('other')}</span>
            </label>
          </div>

          {consultationType === 'etc' && (
            <div className="mt-2">
              <input
                type="text"
                value={consultationTypeEtc}
                onChange={e => setConsultationTypeEtc(e.target.value)}
                placeholder={t('otherMethodPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t('counselingContent')}
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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

        <div className="flex gap-3">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={() => setStep(2)}
          >
            {t('previous')}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={loadingSlots || selectedSlot?.status !== 'available'}
          >
            {loadingSlots ? t('processingBooking') : t('completeBooking')}
          </Button>
        </div>
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

    try {
      setLoading(true);

      const result = await searchReservationsByStudentInfo({
        studentName,
        grade,
        classNum,
        schoolCode,
      });

      setReservations(result);
      setSearched(true);
    } catch (error) {
      console.error('Reservation lookup error:', error);
      alert(t('searchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: formatReservationStudentLabel(reservation, language),
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
        className="space-y-4 rounded-lg bg-white p-6 shadow-md"
      >
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

          <div className="sm:col-span-2">
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
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? t('searching') : t('searchReservation')}
        </Button>
      </form>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
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
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!loading && searched && reservations.length === 0 && (
          <p className="text-sm text-gray-600">{t('noReservationFound')}</p>
        )}

        {!loading && reservations.length > 0 && (
          <div className="space-y-3">
            {reservations.map(reservation => (
              <div
                key={reservation.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">
                    <div className="mb-2 flex gap-2">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        {formatDateI18n(reservation.date, language)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {t('periodLabel', { number: reservation.period })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-gray-500" />
                    {reservation.startTime} ~ {reservation.endTime}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">{t('topicLabel')}</span>{' '}
                    <span className="text-gray-600">{t(reservation.topic)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="h-4 w-4 text-gray-500" />
                    {t('counselingMethodLabel')}{' '}
                    {reservation.consultationType === 'face'
                      ? t('faceToFace')
                      : reservation.consultationType === 'phone'
                        ? t('phoneCounseling')
                        : t('other')}
                    {reservation.consultationType === 'etc' && reservation.consultationTypeEtc
                      ? ` (${reservation.consultationTypeEtc})`
                      : ''}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleCancel(reservation)}
                >
                  <X className="h-4 w-4" />
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
    </div>
  );
}
