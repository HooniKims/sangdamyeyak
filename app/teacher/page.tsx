'use client';

import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Calendar from '@/components/Calendar';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import { Period, AvailableSlot, Reservation, DEFAULT_PERIODS } from '@/types';
import { formatDate, formatDateI18n, generateId } from '@/lib/utils';
import { Clock, Trash2, Settings, Calendar as CalendarIcon, Download, X, Home } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/lib/i18n';

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();

  // 로그인한 교사의 ID 사용
  const teacherId = user?.uid;

  const [periods, setPeriods] = useState<Period[]>(DEFAULT_PERIODS);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<{ [date: string]: number[] }>({});
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // 로그인 안 된 상태면 로그인 페이지로 이동
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // 교시 시간 로드
  useEffect(() => {
    if (!teacherId) return;

    const loadPeriods = async () => {
      try {
        const periodsDoc = await getDocs(
          query(collection(db, 'teachers'), where('id', '==', teacherId))
        );

        if (!periodsDoc.empty) {
          const data = periodsDoc.docs[0].data();
          if (data.periods) {
            setPeriods(data.periods);
          }
        }
      } catch (error) {
        console.error('교시 로드 오류:', error);
      }
    };

    loadPeriods();
  }, [teacherId]);

  // 상담 가능 시간 및 예약 현황 실시간 로드
  useEffect(() => {
    if (!teacherId) return;

    const today = formatDate(new Date()); // YYYY-MM-DD 형식

    // 인덱스 없이 작동하도록 단일 where 조건만 사용하고 클라이언트에서 필터링
    const slotsQuery = query(
      collection(db, 'availableSlots'),
      where('teacherId', '==', teacherId)
    );

    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('teacherId', '==', teacherId)
    );

    const unsubscribeSlots = onSnapshot(slotsQuery, (snapshot) => {
      const slots: AvailableSlot[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AvailableSlot;
        // 클라이언트 측에서 날짜 필터링
        if (data.date >= today) {
          slots.push({ id: doc.id, ...data });
        }
      });
      setAvailableSlots(slots);
      setLoading(false);
    });

    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
      const reservs: Reservation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Reservation;
        // 클라이언트 측에서 날짜 필터링
        if (data.date >= today) {
          reservs.push({ id: doc.id, ...data });
        }
      });
      setReservations(reservs.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period));
    });

    return () => {
      unsubscribeSlots();
      unsubscribeReservations();
    };
  }, [teacherId]);

  // 교시 시간 저장
  const savePeriods = async () => {
    try {
      const teachersRef = collection(db, 'teachers');
      const q = query(teachersRef, where('id', '==', teacherId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(teachersRef, {
          id: teacherId,
          periods: periods,
          createdAt: Date.now(),
        });
      } else {
        const docRef = doc(db, 'teachers', querySnapshot.docs[0].id);
        await updateDoc(docRef, { periods });
      }

      alert(t('periodsSaved'));
      setShowSettings(false);
    } catch (error) {
      console.error('Save error:', error);
      alert(t('saveFailed'));
    }
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter((d) => d !== date));
      const newSelectedPeriods = { ...selectedPeriods };
      delete newSelectedPeriods[date];
      setSelectedPeriods(newSelectedPeriods);
    } else {
      setSelectedDates([...selectedDates, date].sort());
    }
  };

  // 교시 선택 핸들러
  const handlePeriodToggle = (date: string, periodNum: number) => {
    const currentPeriods = selectedPeriods[date] || [];
    if (currentPeriods.includes(periodNum)) {
      setSelectedPeriods({
        ...selectedPeriods,
        [date]: currentPeriods.filter((p) => p !== periodNum),
      });
    } else {
      setSelectedPeriods({
        ...selectedPeriods,
        [date]: [...currentPeriods, periodNum].sort(),
      });
    }
  };

  // 상담 시간 설정 완료


  const handleSaveSlots = async () => {
    try {
      const slotsToAdd: Partial<AvailableSlot>[] = [];

      Object.entries(selectedPeriods).forEach(([date, periods]) => {
        periods.forEach((periodNum) => {
          const period = DEFAULT_PERIODS.find((p) => p.number === periodNum);
          if (period) {
            // 이미 존재하는지 확인
            const exists = availableSlots.some(
              (slot) => slot.date === date && slot.period === periodNum
            );

            if (!exists) {
              slotsToAdd.push({
                teacherId,
                date,
                period: periodNum,
                startTime: period.startTime,
                endTime: period.endTime,
                status: 'available',
                createdAt: Date.now(),
              });
            }
          }
        });
      });

      for (const slot of slotsToAdd) {
        await addDoc(collection(db, 'availableSlots'), slot);
      }

      setSelectedDates([]);
      setSelectedPeriods({});
      alert(t('counselingTimeSet'));
    } catch (error) {
      console.error('Save error:', error);
      alert(t('saveFailed'));
    }
  };

  // 슬롯 삭제
  const handleDeleteSlot = (slotId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('deleteSlotTitle'),
      message: t('deleteSlotMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'availableSlots', slotId));
        } catch (error) {
          console.error('삭제 오류:', error);
          alert(t('deleteFailed'));
        }
      },
    });
  };

  // 예약 취소 (교사)
  const handleCancelReservation = (reservation: Reservation) => {
    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: t('cancelReservationMessage', { name: reservation.studentName, number: reservation.studentNumber }),
      onConfirm: async () => {
        try {
          const reservationRef = doc(db, 'reservations', reservation.id);
          const slotRef = doc(db, 'availableSlots', reservation.slotId);

          await runTransaction(db, async (transaction) => {
            transaction.delete(reservationRef);
            transaction.update(slotRef, { status: 'available' });
          });

          alert(t('reservationCanceled'));
        } catch (error) {
          console.error('Cancel error:', error);
          alert(t('cancelFailed'));
        }
      },
    });
  };

  // Excel 내보내기
  const handleExportToExcel = () => {
    if (reservations.length === 0) {
      alert(t('noExportData'));
      return;
    }

    // 데이터 준비
    const data = reservations.map((reservation) => {
      const period = periods.find((p) => p.number === reservation.period);
      let consultationTypeStr = '';
      if (reservation.consultationType === 'face') consultationTypeStr = t('faceToFace');
      else if (reservation.consultationType === 'phone') consultationTypeStr = t('phoneCounseling');
      else if (reservation.consultationType === 'etc') consultationTypeStr = `${t('other')} (${reservation.consultationTypeEtc || ''})`;

      return {
        [t('studentNumber')]: reservation.studentNumber,
        [t('studentNameField')]: reservation.studentName,
        [t('date') || '날짜']: formatDateI18n(reservation.date, language),
        [t('periodLabel', { number: '' }).trim() || '교시']: t('periodLabel', { number: reservation.period }),
        [t('time')]: `${reservation.startTime} - ${reservation.endTime}`,
        [t('topic')]: t(reservation.topic),
        [t('method')]: consultationTypeStr,
        [t('content')]: reservation.content,
        [t('reservationDate')]: new Date(reservation.createdAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US'),
      };
    });

    // 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '상담 예약 목록');

    // 파일 다운로드
    const fileName = `상담예약_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title={t('teacherDashboard')}>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout title={t('counselingManage')} description={t('counselingManageDesc')}>
      <div className="p-6 sm:p-8">
        {/* 상단 버튼들 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            size="sm"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('backToMain')}
          </Button>
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="secondary"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('periodSettings')}
          </Button>
        </div>

        {/* 교시 설정 패널 */}
        {showSettings && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">{t('periodTimeSettings')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {periods.map((period, index) => (
                <div key={period.number} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-16">{period.label}</span>
                  <input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => {
                      const newPeriods = [...periods];
                      newPeriods[index].startTime = e.target.value;
                      setPeriods(newPeriods);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => {
                      const newPeriods = [...periods];
                      newPeriods[index].endTime = e.target.value;
                      setPeriods(newPeriods);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <Button onClick={savePeriods} size="sm">
              {t('saveTime')}
            </Button>
          </div>
        )}

        {/* 날짜 선택 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            {t('selectCounselingDate')}
          </h3>
          <Calendar selectedDates={selectedDates} onDateSelect={handleDateSelect} />
        </div>

        {/* 선택된 날짜별 교시 선택 */}
        {selectedDates.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              {t('selectPeriod')}
            </h3>
            <div className="space-y-4">
              {selectedDates.map((date) => (
                <div key={date} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3 text-gray-900">
                    {formatDateI18n(date, language)}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {periods.map((period) => {
                      const isSelected = selectedPeriods[date]?.includes(period.number);
                      return (
                        <button
                          key={period.number}
                          onClick={() => handlePeriodToggle(date, period.number)}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                            }
                          `}
                        >
                          {period.label}
                          <div className="text-xs opacity-90 mt-1">
                            {period.startTime}-{period.endTime}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={handleSaveSlots} size="lg" className="w-full sm:w-auto">
                {t('completeCounselingSetup')}
              </Button>
            </div>
          </div>
        )}

        {/* 설정된 상담 가능 시간 목록 */}
        {availableSlots.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">{t('setAvailableTimes')}</h3>
            <div className="space-y-2">
              {availableSlots
                .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)
                .map((slot) => {
                  const period = periods.find((p) => p.number === slot.period);
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${slot.status === 'reserved'
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-white border-gray-200'
                        }`}
                    >
                      <div className="flex-1">
                        <span className="font-medium">{formatDateI18n(slot.date, language)}</span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-gray-700">
                          {t('periodLabel', { number: slot.period })} ({slot.startTime}-{slot.endTime})
                        </span>
                        {slot.status === 'reserved' && (
                          <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {t('reserved')}
                          </span>
                        )}
                      </div>
                      {slot.status === 'available' && (
                        <Button
                          onClick={() => handleDeleteSlot(slot.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 예약 현황 */}
        {reservations.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('reservationStatus')} ({reservations.length}{t('reservationCount', { count: '' })})</h3>
              <Button
                onClick={handleExportToExcel}
                variant="secondary"
                size="sm"
                className="mt-2 sm:mt-0"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('exportExcel')}
              </Button>
            </div>
            <div className="space-y-4">
              {reservations.map((reservation) => {
                const period = periods.find((p) => p.number === reservation.period);
                return (
                  <div
                    key={reservation.id}
                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {reservation.studentNumber} - {reservation.studentName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateI18n(reservation.date, language)} {t('periodLabel', { number: reservation.period })}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCancelReservation(reservation)}
                        variant="ghost"
                        size="sm"
                        className="mt-2 sm:mt-0 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t('cancel')}
                      </Button>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">{t('time')}:</span> {reservation.startTime} - {reservation.endTime}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">{t('topic')}:</span> {reservation.topic}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">{t('method')}:</span>{' '}
                      {reservation.consultationType === 'face'
                        ? t('faceToFace')
                        : reservation.consultationType === 'phone'
                          ? t('phoneCounseling')
                          : `${t('other')} (${reservation.consultationTypeEtc || ''})`}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{t('content')}:</span> {reservation.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {availableSlots.length === 0 && reservations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('noSetTimes')}</p>
            <p className="text-sm">{t('noSetTimesHint')}</p>
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
        confirmText={t('delete')}
      />
    </Layout>
  );
}
