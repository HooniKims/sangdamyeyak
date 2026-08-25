import type { UserProfile } from '@/types/auth';

export const TEACHER_PROFILE_CONFIRMATION_INTERVAL_DAYS = 30;

type TeacherProfileConfirmationProfile = Pick<
  UserProfile,
  'role' | 'profileConfirmedAt'
>;

export function requiresTeacherProfileConfirmation(
  profile: TeacherProfileConfirmationProfile | null,
  date = new Date(),
): boolean {
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    return false;
  }

  if (!profile.profileConfirmedAt) {
    return true;
  }

  const confirmedAt = profile.profileConfirmedAt.toDate();
  const intervalMs =
    TEACHER_PROFILE_CONFIRMATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

  return date.getTime() - confirmedAt.getTime() >= intervalMs;
}
