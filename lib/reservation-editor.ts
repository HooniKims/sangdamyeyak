export type EditableConsultationType = 'face' | 'phone' | 'etc';

export interface EditableReservation {
  id: string;
  teacherId: string;
  slotId: string;
  studentName: string;
  grade?: number;
  classNum?: number;
  schoolCode?: string;
  schoolName?: string;
  date: string;
  period: number;
  startTime: string;
  endTime: string;
  topic: string;
  content: string;
  consultationType: EditableConsultationType;
  consultationTypeEtc?: string;
  createdAt: number;
  isCompleted?: boolean;
  completedAt?: number | null;
  updatedAt?: number;
}

export interface EditableReservationSlot {
  id: string;
  teacherId: string;
  date: string;
  period: number;
  startTime: string;
  endTime: string;
  status?: 'available' | 'reserved';
}

export interface EditableReservationDraft {
  studentName: string;
  grade?: number;
  classNum?: number;
  topic: string;
  content: string;
  consultationType: EditableConsultationType;
  consultationTypeEtc?: string;
}

export interface ReservationMutationPlanInput {
  currentReservation: EditableReservation;
  selectedSlot: EditableReservationSlot;
  draft: EditableReservationDraft;
  now: number;
}

export interface ReservationMutationPlan {
  mode: 'update' | 'recreate';
  nextReservationId: string;
  releasedSlotId: string | null;
  reservedSlotId: string | null;
  nextReservation: Omit<EditableReservation, 'id'>;
}

function normalizeOptionalNumber(value: number | undefined) {
  return typeof value === 'number' ? value : undefined;
}

export function buildReservationCompletionPatch(isCompleted: boolean, now: number) {
  return {
    isCompleted,
    completedAt: isCompleted ? now : null,
    updatedAt: now,
  };
}

export function buildSelectableReservationSlots(
  currentReservation: EditableReservation,
  availableSlots: EditableReservationSlot[],
) {
  const slotMap = new Map<string, EditableReservationSlot>();

  slotMap.set(currentReservation.slotId, {
    id: currentReservation.slotId,
    teacherId: currentReservation.teacherId,
    date: currentReservation.date,
    period: currentReservation.period,
    startTime: currentReservation.startTime,
    endTime: currentReservation.endTime,
    status: 'reserved',
  });

  availableSlots.forEach((slot) => {
    if (slot.teacherId !== currentReservation.teacherId) {
      return;
    }

    if (slot.status === 'available' || slot.id === currentReservation.slotId) {
      slotMap.set(slot.id, slot);
    }
  });

  return [...slotMap.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.period - b.period || a.startTime.localeCompare(b.startTime),
  );
}

export function buildReservationMutationPlan({
  currentReservation,
  selectedSlot,
  draft,
  now,
}: ReservationMutationPlanInput): ReservationMutationPlan {
  const consultationTypeEtc =
    draft.consultationType === 'etc' ? draft.consultationTypeEtc?.trim() || '' : '';
  const slotChanged = currentReservation.slotId !== selectedSlot.id;

  const nextReservation: Omit<EditableReservation, 'id'> = {
    teacherId: currentReservation.teacherId,
    slotId: selectedSlot.id,
    studentName: draft.studentName.trim(),
    date: selectedSlot.date,
    period: selectedSlot.period,
    startTime: selectedSlot.startTime,
    endTime: selectedSlot.endTime,
    topic: draft.topic,
    content: draft.content.trim(),
    consultationType: draft.consultationType,
    consultationTypeEtc,
    createdAt: currentReservation.createdAt,
    isCompleted: Boolean(currentReservation.isCompleted),
    completedAt: currentReservation.isCompleted ? currentReservation.completedAt ?? null : null,
    updatedAt: now,
  };

  const normalizedGrade = normalizeOptionalNumber(draft.grade);
  const normalizedClassNum = normalizeOptionalNumber(draft.classNum);

  if (typeof normalizedGrade === 'number') {
    nextReservation.grade = normalizedGrade;
  }

  if (typeof normalizedClassNum === 'number') {
    nextReservation.classNum = normalizedClassNum;
  }

  if (typeof currentReservation.schoolCode === 'string') {
    nextReservation.schoolCode = currentReservation.schoolCode;
  }

  if (typeof currentReservation.schoolName === 'string') {
    nextReservation.schoolName = currentReservation.schoolName;
  }

  return {
    mode: slotChanged ? 'recreate' : 'update',
    nextReservationId: slotChanged ? selectedSlot.id : currentReservation.id,
    releasedSlotId: slotChanged ? currentReservation.slotId : null,
    reservedSlotId: slotChanged ? selectedSlot.id : null,
    nextReservation,
  };
}
