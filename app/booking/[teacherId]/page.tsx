'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import Link from 'next/link';
import { Calendar, CheckCircle2, Clock, MessageSquare, Search, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AvailableSlot, COUNSELING_TOPICS, CounselingTopic } from '@/types';
import { formatDate, formatDateI18n } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

const SLOT_ALREADY_RESERVED_ERROR = 'slot-already-reserved';

export default function BookingPage() {
  const params = useParams<{ teacherId: string }>();
  const teacherId = Array.isArray(params.teacherId) ? params.teacherId[0] : params.teacherId;
  const { t, language } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [topic, setTopic] = useState<CounselingTopic>(COUNSELING_TOPICS[0]);
  const [content, setContent] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    if (!teacherId) return;

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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedSlot) return;

    const latestSelectedSlot = availableSlots.find(slot => slot.id === selectedSlot.id);

    if (!latestSelectedSlot) {
      setSelectedSlot(null);
      setSubmissionError(t('selectedSlotReservedNotice'));
      return;
    }

    if (latestSelectedSlot !== selectedSlot) {
      setSelectedSlot(latestSelectedSlot);
    }
  }, [availableSlots, selectedSlot, t]);

  const handleStep1Submit = (e: FormEvent<HTMLFormElement>) => {
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
    setSubmissionError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedSlot || selectedSlot.status !== 'available') {
      setSubmissionError(t('alreadyReserved'));
      return;
    }

    setSubmitting(true);
    setSubmissionError('');

    try {
      const slotRef = doc(db, 'availableSlots', selectedSlot.id);
      const reservationRef = doc(collection(db, 'reservations'));

      await runTransaction(db, async transaction => {
        const slotDoc = await transaction.get(slotRef);

        if (!slotDoc.exists() || slotDoc.data().status !== 'available') {
          throw new Error(SLOT_ALREADY_RESERVED_ERROR);
        }

        transaction.update(slotRef, { status: 'reserved' });
        transaction.set(reservationRef, {
          teacherId,
          slotId: selectedSlot.id,
          studentNumber: studentNumber.trim(),
          studentName: studentName.trim(),
          date: selectedSlot.date,
          period: selectedSlot.period,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          topic,
          content: content.trim(),
          consultationType: 'face',
          consultationTypeEtc: '',
          createdAt: Date.now(),
        });
      });

      setSuccess(true);
    } catch (error) {
      console.error('예약 오류:', error);
      setSubmissionError(
        error instanceof Error && error.message === SLOT_ALREADY_RESERVED_ERROR
          ? t('alreadyReserved')
          : t('bookingFailedMsg'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title={t('bookReservation')}>
        <LoadingSpinner text={t('loading')} />
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title={t('bookingCompleted')} description={t('bookingCompletedMsg')}>
        <div className="p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('bookingCompleted')}</h2>
          </div>

          {selectedSlot && (
            <div className="mx-auto mb-6 max-w-md rounded-lg border border-blue-200 bg-blue-50 p-6 text-left">
              <h3 className="mb-3 font-semibold text-gray-900">{t('reservationHistory')}</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="font-medium">{t('studentNumber')}:</span> {studentNumber}
                </div>
                <div>
                  <span className="font-medium">{t('studentNameField')}:</span> {studentName}
                </div>
                <div>
                  <span className="font-medium">{t('date')}:</span> {formatDateI18n(selectedSlot.date, language)}
                </div>
                <div>
                  <span className="font-medium">{t('time')}:</span> {selectedSlot.startTime} ~ {selectedSlot.endTime}
                </div>
                <div>
                  <span className="font-medium">{t('topic')}:</span> {t(topic)}
                </div>
              </div>
            </div>
          )}

          <Link href="/check-reservation">
            <Button variant="secondary" size="sm">
              <Search className="mr-2 h-4 w-4" />
              {t('checkReservationTitle')}
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (step === 1) {
    return (
      <Layout title={t('bookReservation')} description={t('enterStudentInfo')}>
        <form onSubmit={handleStep1Submit} className="p-6 sm:p-8">
          <div className="mx-auto max-w-md space-y-6">
            <div>
              <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                <User className="mr-2 h-4 w-4" />
                {t('studentNumber')}
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={e => setStudentNumber(e.target.value)}
                placeholder={t('studentNumberPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
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

            <Button type="submit" size="lg" className="w-full">
              {t('next')}
            </Button>
          </div>
        </form>
      </Layout>
    );
  }

  return (
    <Layout title={t('bookReservation')} description={t('selectTimeSlot')}>
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div>
              <span className="font-medium">{studentNumber}</span> - {studentName}
            </div>
            <Button type="button" onClick={() => setStep(1)} variant="ghost" size="sm">
              {t('editInfo')}
            </Button>
          </div>

          <div>
            <h3 className="mb-2 flex items-center text-lg font-semibold text-gray-900">
              <Calendar className="mr-2 h-5 w-5" />
              {t('selectTimeSlot')}
            </h3>
            <p className="mb-4 text-sm text-gray-500">{t('reservedSlotHint')}</p>

            {availableSlots.length === 0 ? (
              <div className="rounded-lg bg-gray-50 py-12 text-center text-gray-500">
                <Clock className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>{t('noTimeSlots')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableSlots.map(slot => {
                  const isReserved = slot.status === 'reserved';
                  const isSelected = !isReserved && selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSlotSelect(slot)}
                      disabled={isReserved}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        isReserved
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                          : isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className={`font-semibold ${isReserved ? 'text-gray-500' : 'text-gray-900'}`}>
                            {formatDateI18n(slot.date, language)}
                          </div>
                          <div className={`text-sm ${isReserved ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('periodLabel', { number: slot.period })}
                          </div>
                        </div>
                        {isReserved && (
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                            {t('reserved')}
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${isReserved ? 'text-gray-400' : 'text-gray-600'}`}>
                        {slot.startTime} ~ {slot.endTime}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div
              className={`rounded-lg border p-4 ${
                selectedSlot.status === 'available'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Clock
                  className={`mt-0.5 h-5 w-5 ${
                    selectedSlot.status === 'available' ? 'text-blue-600' : 'text-amber-600'
                  }`}
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {formatDateI18n(selectedSlot.date, language)} {t('periodLabel', { number: selectedSlot.period })}
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
            </div>
          )}

          {submissionError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {submissionError}
            </div>
          )}

          <div>
            <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
              <MessageSquare className="mr-2 h-5 w-5" />
              {t('counselingTopic')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COUNSELING_TOPICS.map(topicOption => (
                <button
                  key={topicOption}
                  type="button"
                  onClick={() => setTopic(topicOption)}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    topic === topicOption
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {t(topicOption)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-gray-900">{t('counselingContent')}</label>
            <p className="mb-3 text-sm text-gray-600">{t('contentPlaceholder')}</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              className="min-h-32 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => {
                setSubmissionError('');
                setStep(1);
              }}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              {t('previous')}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={!selectedSlot || selectedSlot.status !== 'available' || submitting}
            >
              {submitting ? t('processingBooking') : t('completeBooking')}
            </Button>
          </div>

          {selectedSlot?.status === 'reserved' && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                setSelectedSlot(null);
                setSubmissionError('');
              }}
            >
              {t('chooseAnotherTime')}
            </Button>
          )}
        </div>
      </form>
    </Layout>
  );
}
