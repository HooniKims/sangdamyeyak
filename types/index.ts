// 교시 정보 타입
export interface Period {
  number: number;
  startTime: string;
  endTime: string;
  label: string;
}

// 상담 가능 시간대 타입
export interface AvailableSlot {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  period: number;
  startTime: string;
  endTime: string;
  status: 'available' | 'reserved';
  createdAt: number;
}

// 상담 주제 타입
export type CounselingTopic = '학업(성적)' | '진로' | '교우 관계' | '기타';

// 상담 예약 타입
export interface Reservation {
  id: string;
  teacherId: string;
  slotId: string;
  studentNumber?: string;
  studentName: string;
  grade?: number;
  classNum?: number;
  date: string;
  period: number;
  startTime: string;
  endTime: string;
  topic: string;
  content: string;
  consultationType: 'face' | 'phone' | 'etc';
  consultationTypeEtc?: string;
  createdAt: number;
}

// 교사 정보 타입
export interface Teacher {
  id: string;
  name: string;
  periods: Period[];
  createdAt: number;
}

// 기본 교시 시간표
export const DEFAULT_PERIODS: Period[] = [
  { number: 1, startTime: '09:00', endTime: '09:45', label: '1교시' },
  { number: 2, startTime: '09:55', endTime: '10:40', label: '2교시' },
  { number: 3, startTime: '10:50', endTime: '11:35', label: '3교시' },
  { number: 4, startTime: '11:45', endTime: '12:30', label: '4교시' },
  { number: 5, startTime: '13:20', endTime: '14:05', label: '5교시' },
  { number: 6, startTime: '14:15', endTime: '15:00', label: '6교시' },
  { number: 7, startTime: '15:10', endTime: '15:55', label: '7교시' },
];

// 상담 주제 목록
export const COUNSELING_TOPICS: CounselingTopic[] = [
  '학업(성적)',
  '진로',
  '교우 관계',
  '기타',
];
