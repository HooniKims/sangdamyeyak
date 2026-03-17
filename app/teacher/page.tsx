'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot, updateDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Calendar from '@/components/Calendar';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import { Period, AvailableSlot, Reservation, DEFAULT_PERIODS, NonHomeroomRequest } from '@/types';
import { formatDate, formatDateI18n } from '@/lib/utils';
import { Clock, Trash2, Settings, Calendar as CalendarIcon, Download, X, Home, CheckSquare, Square, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { formatReservationStudentLabel } from '@/lib/reservation-firebase';

const BULK_DELETE_BATCH_SIZE = 400;

function NonHomeroomRequestTable({
  title,
  description,
  requests,
  language,
  t,
}: {
  title: string;
  description?: string;
  requests: NonHomeroomRequest[];
  language: 'ko' | 'en';
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="h-5 w-5 text-emerald-600" />
          {title}
        </h3>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          {t('noNonHomeroomRequests')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t('desiredDateTime')}</th>
                <th className="px-4 py-3 font-medium">{t('desiredTeacher')}</th>
                <th className="px-4 py-3 font-medium">{t('grade')}</th>
                <th className="px-4 py-3 font-medium">{t('classNum')}</th>
                <th className="px-4 py-3 font-medium">{t('studentNameField')}</th>
                <th className="px-4 py-3 font-medium">{t('content')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateI18n(request.preferredDate, language)} {request.preferredTime}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{request.targetTeacherName}</td>
                  <td className="px-4 py-3 text-gray-700">{request.grade}</td>
                  <td className="px-4 py-3 text-gray-700">{request.classNum}</td>
                  <td className="px-4 py-3 text-gray-900">{request.studentName}</td>
                  <td className="min-w-[280px] px-4 py-3 whitespace-pre-wrap text-gray-700">
                    {request.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TeacherPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();

  // 로그인한 교사의 ID 사용
  const teacherId = user?.uid;

  const [periods, setPeriods] = useState<Period[]>(DEFAULT_PERIODS);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<{ [date: string]: number[] }>({});
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [directNonHomeroomRequests, setDirectNonHomeroomRequests] = useState<NonHomeroomRequest[]>([]);
  const [classNonHomeroomRequests, setClassNonHomeroomRequests] = useState<NonHomeroomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmText: undefined as string | undefined,
    cancelText: undefined as string | null | undefined,
  });
  const isNonHomeroomTeacher =
    Boolean(profile) &&
    (profile?.role === 'teacher' || profile?.role === 'admin') &&
    profile.grade === 0 &&
    profile.classNum === 0;

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
    if (!teacherId || isNonHomeroomTeacher) {
      return;
    }

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
  }, [teacherId, isNonHomeroomTeacher]);

  useEffect(() => {
    if (!teacherId || !isNonHomeroomTeacher) {
      return;
    }

    const requestsQuery = query(
      collection(db, 'nonHomeroomRequests'),
      where('targetTeacherId', '==', teacherId)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests: NonHomeroomRequest[] = [];

      snapshot.forEach((docSnap) => {
        requests.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<NonHomeroomRequest, 'id'>),
        });
      });

      setDirectNonHomeroomRequests(
        requests.sort((a, b) => a.preferredDateTime.localeCompare(b.preferredDateTime))
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teacherId, isNonHomeroomTeacher]);

  useEffect(() => {
    if (!teacherId || isNonHomeroomTeacher) {
      return;
    }

    const requestsQuery = query(
      collection(db, 'nonHomeroomRequests'),
      where('homeroomTeacherId', '==', teacherId)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests: NonHomeroomRequest[] = [];

      snapshot.forEach((docSnap) => {
        requests.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<NonHomeroomRequest, 'id'>),
        });
      });

      setClassNonHomeroomRequests(
        requests.sort((a, b) => a.preferredDateTime.localeCompare(b.preferredDateTime))
      );
    });

    return () => unsubscribe();
  }, [teacherId, isNonHomeroomTeacher]);

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

      Object.entries(selectedPeriods).forEach(([date, selectedPeriodNumbers]) => {
        selectedPeriodNumbers.forEach((periodNum) => {
          const period = periods.find((p) => p.number === periodNum);
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
      confirmText: t('delete'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'availableSlots', slotId));
          setSelectedSlotIds(prev => {
            if (!prev.has(slotId)) {
              return prev;
            }

            const next = new Set(prev);
            next.delete(slotId);
            return next;
          });
        } catch (error) {
          console.error('삭제 오류:', error);
          alert(t('deleteFailed'));
        }
      },
    });
  };

  // 예약 취소 (교사)
  const handleCancelReservation = (reservation: Reservation) => {
    const studentLabel = formatReservationStudentLabel(reservation, language);

    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: t('cancelReservationMessage', { student: studentLabel }),
      confirmText: t('cancelReservation'),
      cancelText: t('cancel'),
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

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };

  const toggleSelectAllSlots = () => {
    const deletableSlotIds = availableSlots
      .filter(slot => slot.status === 'available')
      .map(slot => slot.id);

    if (deletableSlotIds.length === 0) {
      return;
    }

    const areAllSelected = deletableSlotIds.every(slotId => selectedSlotIds.has(slotId));

    if (areAllSelected) {
      setSelectedSlotIds(new Set());
      return;
    }

    setSelectedSlotIds(new Set(deletableSlotIds));
  };

  const handleBulkDeleteSlots = () => {
    const slotIdsToDelete = availableSlots
      .filter(slot => slot.status === 'available' && selectedSlotIds.has(slot.id))
      .map(slot => slot.id);

    if (slotIdsToDelete.length === 0) {
      alert(t('selectToDelete'));
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: t('deleteSlotTitle'),
      message: t('confirmBulkDeleteSlots', { count: slotIdsToDelete.length }),
      confirmText: t('deleteSelected'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          for (let index = 0; index < slotIdsToDelete.length; index += BULK_DELETE_BATCH_SIZE) {
            const batch = writeBatch(db);

            slotIdsToDelete
              .slice(index, index + BULK_DELETE_BATCH_SIZE)
              .forEach(slotId => {
                batch.delete(doc(db, 'availableSlots', slotId));
              });

            await batch.commit();
          }

          setSelectedSlotIds(new Set());
          alert(t('deleted'));
        } catch (error) {
          console.error('Bulk delete error:', error);
          alert(t('bulkDeleteError'));
        }
      },
    });
  };

  // 예약 개별 선택 토글
  const toggleReservationSelection = (reservationId: string) => {
    setSelectedReservationIds(prev => {
      const next = new Set(prev);
      if (next.has(reservationId)) {
        next.delete(reservationId);
      } else {
        next.add(reservationId);
      }
      return next;
    });
  };

  // 예약 전체 선택 토글
  const toggleSelectAllReservations = () => {
    const allIds = reservations.map(r => r.id);
    if (allIds.length === 0) return;

    const areAllSelected = allIds.every(id => selectedReservationIds.has(id));
    if (areAllSelected) {
      setSelectedReservationIds(new Set());
    } else {
      setSelectedReservationIds(new Set(allIds));
    }
  };

  // 예약 벌크 취소
  const handleBulkCancelReservations = () => {
    const reservationsToCancel = reservations.filter(r => selectedReservationIds.has(r.id));

    if (reservationsToCancel.length === 0) {
      alert(t('selectToDelete'));
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: t('cancelReservationTitle'),
      message: t('confirmBulkCancelReservations', { count: reservationsToCancel.length }),
      confirmText: t('cancelReservation'),
      cancelText: t('cancel'),
      onConfirm: async () => {
        try {
          for (const reservation of reservationsToCancel) {
            const reservationRef = doc(db, 'reservations', reservation.id);
            const slotRef = doc(db, 'availableSlots', reservation.slotId);

            await runTransaction(db, async (transaction) => {
              transaction.delete(reservationRef);
              transaction.update(slotRef, { status: 'available' });
            });
          }

          setSelectedReservationIds(new Set());
          alert(t('reservationsCanceled'));
        } catch (error) {
          console.error('Bulk cancel error:', error);
          alert(t('bulkCancelError'));
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
      let consultationTypeStr = '';
      if (reservation.consultationType === 'face') consultationTypeStr = t('faceToFace');
      else if (reservation.consultationType === 'phone') consultationTypeStr = t('phoneCounseling');
      else if (reservation.consultationType === 'etc') consultationTypeStr = `${t('other')} (${reservation.consultationTypeEtc || ''})`;

      return {
        [t('grade')]: reservation.grade ?? '',
        [t('classNum')]: reservation.classNum ?? '',
        [t('studentNumber')]: reservation.studentNumber ?? '',
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

  if (authLoading || !user || !profile) {
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

  const sortedAvailableSlots = [...availableSlots]
    .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
  const deletableSlots = sortedAvailableSlots.filter(slot => slot.status === 'available');
  const selectedDeletableSlotIds = new Set(
    deletableSlots
      .filter(slot => selectedSlotIds.has(slot.id))
      .map(slot => slot.id),
  );
  const selectedSlotCount = selectedDeletableSlotIds.size;
  const isAllSlotsSelected =
    deletableSlots.length > 0 && deletableSlots.every(slot => selectedDeletableSlotIds.has(slot.id));

  return (
    <Layout
      title={t('counselingManage')}
      description={isNonHomeroomTeacher ? t('nonHomeroomDashboardDesc') : t('counselingManageDesc')}
    >
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            size="sm"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('backToMain')}
          </Button>
          {!isNonHomeroomTeacher && (
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="secondary"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('periodSettings')}
            </Button>
          )}
        </div>

        {isNonHomeroomTeacher ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              {t('nonHomeroomTeacherPageHint')}
            </div>
            <NonHomeroomRequestTable
              title={t('nonHomeroomRequests')}
              description={t('nonHomeroomRequestsDesc')}
              requests={directNonHomeroomRequests}
              language={language}
              t={t}
            />
          </div>
        ) : (
          <>
            {showSettings && (
              <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
                <h3 className="mb-4 text-lg font-semibold">{t('periodTimeSettings')}</h3>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {periods.map((period, index) => (
                    <div key={period.number} className="flex items-center gap-2">
                      <span className="w-16 text-sm font-medium">{period.label}</span>
                      <input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => {
                          const newPeriods = [...periods];
                          newPeriods[index].startTime = e.target.value;
                          setPeriods(newPeriods);
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
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
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={savePeriods} size="sm">
                  {t('saveTime')}
                </Button>
              </div>
            )}

            <div className="mb-8">
              <h3 className="mb-4 flex items-center text-lg font-semibold">
                <CalendarIcon className="w-5 h-5 mr-2" />
                {t('selectCounselingDate')}
              </h3>
              <Calendar selectedDates={selectedDates} onDateSelect={handleDateSelect} />
            </div>

            {selectedDates.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 flex items-center text-lg font-semibold">
                  <Clock className="w-5 h-5 mr-2" />
                  {t('selectPeriod')}
                </h3>
                <div className="space-y-4">
                  {selectedDates.map((date) => (
                    <div key={date} className="rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-3 font-medium text-gray-900">
                        {formatDateI18n(date, language)}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {periods.map((period) => {
                          const isSelected = selectedPeriods[date]?.includes(period.number);
                          return (
                            <button
                              key={period.number}
                              onClick={() => handlePeriodToggle(date, period.number)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                              }`}
                            >
                              {period.label}
                              <div className="mt-1 text-xs opacity-90">
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

            {availableSlots.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold">{t('setAvailableTimes')}</h3>
                  {deletableSlots.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllSlots}
                        className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {isAllSlotsSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                        {t('selectAll')} ({selectedSlotCount}/{deletableSlots.length})
                      </button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="sm:min-w-[132px]"
                        disabled={selectedSlotCount === 0}
                        onClick={handleBulkDeleteSlots}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('deleteSelected')}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {sortedAvailableSlots.map((slot) => {
                    const isSelected = selectedDeletableSlotIds.has(slot.id);

                    return (
                      <div
                        key={slot.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          slot.status === 'reserved'
                            ? 'border-gray-300 bg-gray-100'
                            : isSelected
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {slot.status === 'available' && (
                            <button
                              type="button"
                              onClick={() => toggleSlotSelection(slot.id)}
                              className="shrink-0 text-gray-400 transition-colors hover:text-blue-600"
                              aria-label={isSelected ? t('cancel') : t('selectAll')}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          )}
                          <div className="flex-1">
                            <span className="font-medium">{formatDateI18n(slot.date, language)}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span className="text-gray-700">
                              {t('periodLabel', { number: slot.period })} ({slot.startTime}-{slot.endTime})
                            </span>
                            {slot.status === 'reserved' && (
                              <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                {t('reserved')}
                              </span>
                            )}
                          </div>
                        </div>
                        {slot.status === 'available' && (
                          <Button
                            onClick={() => handleDeleteSlot(slot.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reservations.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold">
                    {t('reservationStatus')} ({reservations.length}{t('reservationCount', { count: '' })})
                  </h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllReservations}
                        className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {reservations.length > 0 && reservations.every(r => selectedReservationIds.has(r.id)) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                        {t('selectAllReservations')} ({selectedReservationIds.size}/{reservations.length})
                      </button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="sm:min-w-[132px]"
                        disabled={selectedReservationIds.size === 0}
                        onClick={handleBulkCancelReservations}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('deleteSelected')}
                      </Button>
                    </div>
                    <Button
                      onClick={handleExportToExcel}
                      variant="secondary"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('exportExcel')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {reservations.map((reservation) => {
                    const isReservationSelected = selectedReservationIds.has(reservation.id);
                    return (
                      <div
                        key={reservation.id}
                        className={`rounded-lg border p-4 ${
                          isReservationSelected
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
                        }`}
                      >
                        <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleReservationSelection(reservation.id)}
                              className="mt-1 shrink-0 text-gray-400 transition-colors hover:text-blue-600"
                            >
                              {isReservationSelected ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="mb-1 font-semibold text-gray-900">
                                {formatReservationStudentLabel(reservation, language)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDateI18n(reservation.date, language)} {t('periodLabel', { number: reservation.period })}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCancelReservation(reservation)}
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-600 hover:bg-red-50 sm:mt-0"
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('cancel')}
                          </Button>
                        </div>
                        <div className="mb-1 text-sm text-gray-700 sm:ml-8">
                          <span className="font-medium">{t('time')}:</span> {reservation.startTime} - {reservation.endTime}
                        </div>
                        <div className="mb-1 text-sm text-gray-700 sm:ml-8">
                          <span className="font-medium">{t('topic')}:</span> {t(reservation.topic)}
                        </div>
                        <div className="mb-1 text-sm text-gray-700 sm:ml-8">
                          <span className="font-medium">{t('method')}:</span>{' '}
                          {reservation.consultationType === 'face'
                            ? t('faceToFace')
                            : reservation.consultationType === 'phone'
                              ? t('phoneCounseling')
                              : `${t('other')} (${reservation.consultationTypeEtc || ''})`}
                        </div>
                        <div className="text-sm text-gray-700 sm:ml-8">
                          <span className="font-medium">{t('content')}:</span> {reservation.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-8">
              <NonHomeroomRequestTable
                title={t('classNonHomeroomRequests')}
                description={t('classNonHomeroomRequestsDesc')}
                requests={classNonHomeroomRequests}
                language={language}
                t={t}
              />
            </div>

            {availableSlots.length === 0 &&
              reservations.length === 0 &&
              classNonHomeroomRequests.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <CalendarIcon className="mx-auto mb-3 w-12 h-12 opacity-50" />
                  <p>{t('noSetTimes')}</p>
                  <p className="text-sm">{t('noSetTimesHint')}</p>
                </div>
              )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={true}
        confirmText={confirmModal.confirmText ?? t('delete')}
        cancelText={confirmModal.cancelText}
      />
    </Layout>
  );
}
