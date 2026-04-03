# Reservation Completion And Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add teacher-side reservation completion and inline reservation editing without breaking existing Firestore data or parent lookup flows.

**Architecture:** Keep the current `reservations` collection as the source of truth. Add optional completion metadata to reservation documents, update non-slot fields in place, and when a teacher changes the booked slot recreate the reservation under the new slot ID inside a transaction so slot status and existing security-rule assumptions stay consistent.

**Tech Stack:** Next.js App Router, React, TypeScript, Firebase Firestore, Node test runner, ESLint

---

### Task 1: Safety Logic For Reservation Mutation

**Files:**
- Create: `lib/reservation-editor.ts`
- Create: `lib/reservation-editor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReservationCompletionPatch,
  buildReservationMutationPlan,
} from './reservation-editor';

test('creates a completion patch with completed timestamp', () => {
  assert.deepEqual(buildReservationCompletionPatch(true, 100), {
    isCompleted: true,
    completedAt: 100,
    updatedAt: 100,
  });
});

test('recreates reservation when slot id changes and preserves completion state', () => {
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
      content: '기존',
      consultationType: 'face',
      consultationTypeEtc: '',
      createdAt: 10,
      isCompleted: true,
      completedAt: 20,
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
      studentName: '학생',
      grade: 3,
      classNum: 2,
      topic: '진로',
      content: '변경',
      consultationType: 'phone',
      consultationTypeEtc: '',
    },
    now: 200,
  });

  assert.equal(plan.mode, 'recreate');
  assert.equal(plan.nextReservationId, 'slot-b');
  assert.equal(plan.nextReservation.slotId, 'slot-b');
  assert.equal(plan.nextReservation.isCompleted, true);
  assert.equal(plan.nextReservation.completedAt, 20);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/reservation-editor.test.ts`
Expected: `FAIL` because `./reservation-editor` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildReservationCompletionPatch(isCompleted: boolean, now: number) {
  return {
    isCompleted,
    completedAt: isCompleted ? now : null,
    updatedAt: now,
  };
}

export function buildReservationMutationPlan(input: any) {
  const slotChanged = input.currentReservation.slotId !== input.selectedSlot.id;
  const nextReservation = {
    ...input.currentReservation,
    ...input.draft,
    slotId: input.selectedSlot.id,
    date: input.selectedSlot.date,
    period: input.selectedSlot.period,
    startTime: input.selectedSlot.startTime,
    endTime: input.selectedSlot.endTime,
    updatedAt: input.now,
  };

  return {
    mode: slotChanged ? 'recreate' : 'update',
    nextReservationId: slotChanged ? input.selectedSlot.id : input.currentReservation.id,
    nextReservation,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/reservation-editor.test.ts`
Expected: `PASS`

### Task 2: Reservation Schema And Security Rules

**Files:**
- Modify: `types/index.ts`
- Modify: `firestore.rules`

- [ ] **Step 1: Extend reservation type with optional completion/update fields**

Add optional `schoolCode`, `schoolName`, `isCompleted`, `completedAt`, and `updatedAt` to `Reservation`.

- [ ] **Step 2: Allow optional completion metadata in Firestore rules**

Update `validReservationShape` so existing documents remain valid and new optional fields are accepted.

- [ ] **Step 3: Allow teacher-managed reservation updates only for same-slot edits**

Add a rule helper that allows teachers/admins to update `studentName`, `grade`, `classNum`, `topic`, `content`, `consultationType`, `consultationTypeEtc`, `isCompleted`, `completedAt`, and `updatedAt` while keeping `teacherId` and `slotId` fixed.

### Task 3: Teacher Reservation Completion And Editing UI

**Files:**
- Modify: `app/teacher/page.tsx`

- [ ] **Step 1: Add local edit state and helper wiring**

Track the currently opened reservation editor, draft form data, and saving state.

- [ ] **Step 2: Add bulk completion action**

Next to the existing bulk delete button, add a green `예약 완료` action that updates all selected reservations with completion metadata and keeps existing delete behavior unchanged.

- [ ] **Step 3: Add per-card completion toggle and inline edit form**

Add `상담 완료` / `완료 해제` and `예약 변경` buttons to each reservation card. Open an inline editor below the selected card and reuse current UI tokens and spacing.

- [ ] **Step 4: Save edits safely**

For same-slot edits use `updateDoc` on the current reservation.
For slot changes use one transaction:
1. set old slot to `available`
2. set new slot to `reserved`
3. delete old reservation doc
4. create new reservation doc with the new slot ID

### Task 4: Parent Lookup Reflection

**Files:**
- Modify: `components/PublicCheckReservationPage.tsx`
- Modify: `components/PublicParentPage.tsx`
- Modify: `lib/reservation-firebase.ts`

- [ ] **Step 1: Surface completion state in lookup records**

Keep lookup queries unchanged but let them carry optional completion metadata through typed reservation records.

- [ ] **Step 2: Display completed badge**

Show a green completed badge on homeroom reservation cards when `isCompleted` is true.

- [ ] **Step 3: Render edited values naturally**

Because lookup already reads the reservation document, no alternate data source is needed. Ensure the UI uses the latest `date`, `period`, `time`, `topic`, `method`, and `content`.

### Task 5: Verification

**Files:**
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Add all required i18n labels**

Add Korean and English strings for completion, completed badge, edit, save, edit cancel, save errors, slot selection, and edit success.

- [ ] **Step 2: Run focused tests**

Run: `node --test lib/reservation-editor.test.ts`
Expected: `PASS`

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: exit code `0`

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: exit code `0`
