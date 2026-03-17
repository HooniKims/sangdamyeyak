import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { BookingRecord, NonHomeroomBookingRecord, NonHomeroomRequest, Reservation } from '@/types';

type TeacherClassInfo = {
  schoolCode: string;
  grade: number;
  classNum: number;
};

type SearchReservationsParams = {
  studentName: string;
  grade: number;
  classNum: number;
  schoolCode?: string | null;
  teacherId?: string | null;
};

function normalizeStudentName(name: string): string {
  return name.trim();
}

async function getTeacherClassInfoMap(teacherIds: string[]): Promise<Map<string, TeacherClassInfo | null>> {
  const uniqueTeacherIds = [...new Set(teacherIds.filter(Boolean))];

  const entries = await Promise.all(
    uniqueTeacherIds.map(async (teacherId) => {
      const teacherSnap = await getDoc(doc(db, 'users', teacherId));

      if (!teacherSnap.exists()) {
        return [teacherId, null] as const;
      }

      const teacherData = teacherSnap.data() as Partial<TeacherClassInfo>;

      if (
        !teacherData.schoolCode ||
        typeof teacherData.grade !== 'number' ||
        typeof teacherData.classNum !== 'number'
      ) {
        return [teacherId, null] as const;
      }

      return [
        teacherId,
        {
          schoolCode: teacherData.schoolCode,
          grade: teacherData.grade,
          classNum: teacherData.classNum,
        },
      ] as const;
    }),
  );

  return new Map(entries);
}

function withResolvedClassInfo(
  reservation: Reservation,
  teacherClassInfoMap: Map<string, TeacherClassInfo | null>,
): Reservation {
  if (typeof reservation.grade === 'number' && typeof reservation.classNum === 'number') {
    return reservation;
  }

  const teacherClassInfo = teacherClassInfoMap.get(reservation.teacherId);
  if (!teacherClassInfo) {
    return reservation;
  }

  return {
    ...reservation,
    grade: reservation.grade ?? teacherClassInfo.grade,
    classNum: reservation.classNum ?? teacherClassInfo.classNum,
  };
}

export function isNonHomeroomBookingRecord(
  record: BookingRecord,
): record is NonHomeroomBookingRecord {
  return record.requestType === 'nonHomeroom';
}

export function getBookingRecordDate(record: BookingRecord): string {
  return isNonHomeroomBookingRecord(record) ? record.preferredDate : record.date;
}

export function getBookingRecordTime(record: BookingRecord): string {
  return isNonHomeroomBookingRecord(record) ? record.preferredTime : record.startTime;
}

function getBookingRecordSortKey(record: BookingRecord): string {
  return `${getBookingRecordDate(record)}T${getBookingRecordTime(record)}`;
}

export async function searchReservationsByStudentInfo({
  studentName,
  grade,
  classNum,
  schoolCode,
  teacherId,
}: SearchReservationsParams): Promise<Reservation[]> {
  const trimmedStudentName = normalizeStudentName(studentName);
  const trimmedSchoolCode = schoolCode?.trim() || null;

  const reservationsQuery = teacherId
    ? query(collection(db, 'reservations'), where('teacherId', '==', teacherId))
    : query(
        collection(db, 'reservations'),
        where('studentName', '==', trimmedStudentName),
        limit(20),
      );

  const snapshot = await getDocs(reservationsQuery);
  const reservations: Reservation[] = [];

  snapshot.forEach((docSnap) => {
    reservations.push({ id: docSnap.id, ...(docSnap.data() as Omit<Reservation, 'id'>) });
  });

  const teacherClassInfoMap = await getTeacherClassInfoMap(
    reservations
      .filter(
        (reservation) =>
          (!teacherId && Boolean(trimmedSchoolCode)) ||
          typeof reservation.grade !== 'number' ||
          typeof reservation.classNum !== 'number',
      )
      .map((reservation) => reservation.teacherId),
  );

  return reservations
    .map((reservation) => withResolvedClassInfo(reservation, teacherClassInfoMap))
    .filter((reservation) => {
      if (normalizeStudentName(reservation.studentName) !== trimmedStudentName) {
        return false;
      }

      if (reservation.grade !== grade || reservation.classNum !== classNum) {
        return false;
      }

      if (!trimmedSchoolCode || teacherId) {
        return true;
      }

      return teacherClassInfoMap.get(reservation.teacherId)?.schoolCode === trimmedSchoolCode;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
}

export async function searchBookingRecordsByStudentInfo({
  studentName,
  grade,
  classNum,
  schoolCode,
  teacherId,
}: SearchReservationsParams): Promise<BookingRecord[]> {
  const trimmedStudentName = normalizeStudentName(studentName);
  const trimmedSchoolCode = schoolCode?.trim() || null;

  const [reservations, nonHomeroomRequestSnapshot] = await Promise.all([
    searchReservationsByStudentInfo({
      studentName: trimmedStudentName,
      grade,
      classNum,
      schoolCode: trimmedSchoolCode,
      teacherId,
    }),
    getDocs(
      query(
        collection(db, 'nonHomeroomRequests'),
        where('studentName', '==', trimmedStudentName),
        limit(20),
      ),
    ),
  ]);

  const nonHomeroomRequests: NonHomeroomRequest[] = [];

  nonHomeroomRequestSnapshot.forEach((docSnap) => {
    nonHomeroomRequests.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<NonHomeroomRequest, 'id'>),
    });
  });

  const filteredRequests = nonHomeroomRequests.filter((request) => {
    if (normalizeStudentName(request.studentName) !== trimmedStudentName) {
      return false;
    }

    if (request.grade !== grade || request.classNum !== classNum) {
      return false;
    }

    if (!trimmedSchoolCode) {
      return true;
    }

    return request.schoolCode === trimmedSchoolCode;
  });

  return [
    ...reservations.map((reservation) => ({
      ...reservation,
      requestType: 'homeroom' as const,
    })),
    ...filteredRequests.map((request) => ({
      ...request,
      requestType: 'nonHomeroom' as const,
    })),
  ].sort((a, b) => getBookingRecordSortKey(a).localeCompare(getBookingRecordSortKey(b)));
}

export function formatStudentLookupLabel(
  studentInfo: {
    grade: number;
    classNum: number;
    studentName: string;
  },
  language: 'ko' | 'en',
): string {
  const name = studentInfo.studentName.trim();

  if (language === 'en') {
    return `Grade ${studentInfo.grade}, Class ${studentInfo.classNum} ${name}`;
  }

  return `${studentInfo.grade}학년 ${studentInfo.classNum}반 ${name}`;
}

export function formatReservationStudentLabel(
  reservation: Pick<Reservation, 'studentNumber' | 'studentName' | 'grade' | 'classNum'>,
  language: 'ko' | 'en',
): string {
  const studentNumber = reservation.studentNumber?.trim();
  const studentName = reservation.studentName.trim();

  if (typeof reservation.grade === 'number' && typeof reservation.classNum === 'number') {
    return formatStudentLookupLabel(
      {
        grade: reservation.grade,
        classNum: reservation.classNum,
        studentName,
      },
      language,
    );
  }

  if (studentNumber) {
    return `${studentNumber} - ${studentName}`;
  }

  return studentName;
}

export function formatBookingRecordStudentLabel(
  record: BookingRecord,
  language: 'ko' | 'en',
): string {
  if (isNonHomeroomBookingRecord(record)) {
    return formatStudentLookupLabel(
      {
        grade: record.grade,
        classNum: record.classNum,
        studentName: record.studentName,
      },
      language,
    );
  }

  return formatReservationStudentLabel(record, language);
}
