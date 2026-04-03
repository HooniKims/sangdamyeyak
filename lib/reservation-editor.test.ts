import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSelectableReservationSlots,
  buildReservationCompletionPatch,
  buildReservationMutationPlan,
} from './reservation-editor.ts';

test('buildReservationCompletionPatch adds completion timestamps', () => {
  assert.deepEqual(buildReservationCompletionPatch(true, 100), {
    isCompleted: true,
    completedAt: 100,
    updatedAt: 100,
  });
});

test('buildReservationCompletionPatch clears completion timestamp when unchecked', () => {
  assert.deepEqual(buildReservationCompletionPatch(false, 200), {
    isCompleted: false,
    completedAt: null,
    updatedAt: 200,
  });
});

test('buildReservationMutationPlan keeps same reservation id when slot is unchanged', () => {
  const plan = buildReservationMutationPlan({
    currentReservation: {
      id: 'slot-a',
      slotId: 'slot-a',
      teacherId: 'teacher-1',
      studentName: '학생',
      grade: 3,
      classNum: 2,
      date: '2026-04-10',
      period: 2,
      startTime: '10:00',
      endTime: '10:40',
      topic: '진로',
      content: '기존 내용',
      consultationType: 'face',
      consultationTypeEtc: '',
      createdAt: 10,
      isCompleted: false,
      completedAt: null,
    },
    selectedSlot: {
      id: 'slot-a',
      teacherId: 'teacher-1',
      date: '2026-04-10',
      period: 2,
      startTime: '10:00',
      endTime: '10:40',
    },
    draft: {
      studentName: '학생',
      grade: 3,
      classNum: 2,
      topic: '교우 관계',
      content: '변경된 내용',
      consultationType: 'phone',
      consultationTypeEtc: '',
    },
    now: 300,
  });

  assert.equal(plan.mode, 'update');
  assert.equal(plan.nextReservationId, 'slot-a');
  assert.equal(plan.releasedSlotId, null);
  assert.equal(plan.reservedSlotId, null);
  assert.equal(plan.nextReservation.topic, '교우 관계');
  assert.equal(plan.nextReservation.updatedAt, 300);
});

test('buildReservationMutationPlan recreates reservation when slot changes', () => {
  const plan = buildReservationMutationPlan({
    currentReservation: {
      id: 'slot-a',
      slotId: 'slot-a',
      teacherId: 'teacher-1',
      studentName: '학생',
      grade: 3,
      classNum: 2,
      date: '2026-04-10',
      period: 2,
      startTime: '10:00',
      endTime: '10:40',
      topic: '진로',
      content: '기존 내용',
      consultationType: 'face',
      consultationTypeEtc: '',
      createdAt: 10,
      isCompleted: true,
      completedAt: 25,
    },
    selectedSlot: {
      id: 'slot-b',
      teacherId: 'teacher-1',
      date: '2026-04-11',
      period: 3,
      startTime: '11:00',
      endTime: '11:40',
    },
    draft: {
      studentName: '학생 수정',
      grade: 3,
      classNum: 3,
      topic: '기타',
      content: '변경된 내용',
      consultationType: 'etc',
      consultationTypeEtc: '온라인',
    },
    now: 400,
  });

  assert.equal(plan.mode, 'recreate');
  assert.equal(plan.nextReservationId, 'slot-b');
  assert.equal(plan.releasedSlotId, 'slot-a');
  assert.equal(plan.reservedSlotId, 'slot-b');
  assert.equal(plan.nextReservation.slotId, 'slot-b');
  assert.equal(plan.nextReservation.studentName, '학생 수정');
  assert.equal(plan.nextReservation.grade, 3);
  assert.equal(plan.nextReservation.classNum, 3);
  assert.equal(plan.nextReservation.isCompleted, true);
  assert.equal(plan.nextReservation.completedAt, 25);
  assert.equal(plan.nextReservation.createdAt, 10);
  assert.equal(plan.nextReservation.updatedAt, 400);
});

test('buildSelectableReservationSlots keeps current reserved slot and available slots only', () => {
  const slots = buildSelectableReservationSlots(
    {
      id: 'slot-a',
      slotId: 'slot-a',
      teacherId: 'teacher-1',
      studentName: '학생',
      date: '2026-04-10',
      period: 2,
      startTime: '10:00',
      endTime: '10:40',
      topic: '진로',
      content: '내용',
      consultationType: 'face',
      consultationTypeEtc: '',
      createdAt: 1,
    },
    [
      {
        id: 'slot-c',
        teacherId: 'teacher-1',
        date: '2026-04-12',
        period: 4,
        startTime: '13:00',
        endTime: '13:40',
        status: 'available',
      },
      {
        id: 'slot-b',
        teacherId: 'teacher-1',
        date: '2026-04-11',
        period: 3,
        startTime: '11:00',
        endTime: '11:40',
        status: 'reserved',
      },
      {
        id: 'slot-d',
        teacherId: 'teacher-2',
        date: '2026-04-13',
        period: 1,
        startTime: '09:00',
        endTime: '09:40',
        status: 'available',
      },
    ],
  );

  assert.deepEqual(slots.map((slot) => slot.id), ['slot-a', 'slot-c']);
});
