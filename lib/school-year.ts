import type { UserProfile } from '@/types/auth';

const SCHOOL_YEAR_BOUNDARY_MONTH = 3;
const SCHOOL_YEAR_BOUNDARY_DAY = 1;
const SCHOOL_YEAR_TIME_ZONE = 'Asia/Seoul';

type SchoolYearProfile = Pick<UserProfile, 'role' | 'gradeClassConfirmedSchoolYear'>;

function getKoreanDateParts(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: SCHOOL_YEAR_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = formatter.formatToParts(date);

    return {
        year: Number(parts.find((part) => part.type === 'year')?.value),
        month: Number(parts.find((part) => part.type === 'month')?.value),
        day: Number(parts.find((part) => part.type === 'day')?.value),
    };
}

export function getCurrentSchoolYear(date = new Date()): number {
    const { year, month, day } = getKoreanDateParts(date);

    if (
        month > SCHOOL_YEAR_BOUNDARY_MONTH ||
        (month === SCHOOL_YEAR_BOUNDARY_MONTH && day >= SCHOOL_YEAR_BOUNDARY_DAY)
    ) {
        return year;
    }

    return year - 1;
}

export function requiresAnnualGradeClassUpdate(
    profile: SchoolYearProfile | null,
    date = new Date()
): boolean {
    if (!profile) {
        return false;
    }

    if (
        profile.role !== 'teacher' &&
        profile.role !== 'parent' &&
        profile.role !== 'admin'
    ) {
        return false;
    }

    return (
        typeof profile.gradeClassConfirmedSchoolYear !== 'number' ||
        profile.gradeClassConfirmedSchoolYear < getCurrentSchoolYear(date)
    );
}
