'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  History,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlock,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import SchoolSearch from '@/components/SchoolSearch';
import { useAuth } from '@/components/AuthContext';
import type { SchoolInfo } from '@/types/auth';

type Tab = 'overview' | 'users' | 'reservations' | 'audit';
type FormMode = 'create' | 'edit' | 'repair' | 'repairAuth';

type ManagedUser = {
  uid: string;
  email: string;
  name: string;
  role: 'teacher' | 'admin' | null;
  schoolName: string;
  schoolCode: string;
  grade: number | null;
  classNum: number | null;
  isLocked: boolean;
  failedLoginAttempts: number;
  authDisabled: boolean;
  status: 'linked' | 'auth-only' | 'profile-only';
  createdAt: string | null;
  lastSignInAt: string | null;
};

type ReservationRow = {
  id: string;
  type: 'homeroom' | 'nonHomeroom';
  teacherName: string;
  studentName?: string;
  schoolName?: string;
  grade?: number;
  classNum?: number;
  date?: string;
  preferredDate?: string;
  startTime?: string;
  preferredTime?: string;
  topic?: string;
  content?: string;
  isCompleted?: boolean;
};

type AuditLog = {
  id: string;
  actorEmail?: string;
  action?: string;
  targetEmail?: string;
  summary?: string;
  createdAt?: string;
};

type ClassIssue = {
  schoolCode: string;
  schoolName: string;
  grade: number;
  classNum: number;
};

type DashboardData = {
  users: ManagedUser[];
  reservations: ReservationRow[];
  auditLogs: AuditLog[];
  issues: {
    authOnly: number;
    profileOnly: number;
    duplicates: Array<
      ClassIssue & {
        teachers: Array<{ uid: string; name?: string; email?: string }>;
      }
    >;
    missingClasses: ClassIssue[];
  };
  stats: {
    authUsers: number;
    profiles: number;
    teachers: number;
    admins: number;
    locked: number;
    disabled: number;
    reservations: number;
    nonHomeroomRequests: number;
  };
};

type ProfileForm = {
  email: string;
  password: string;
  name: string;
  role: 'teacher' | 'admin';
  schoolName: string;
  schoolCode: string;
  grade: number;
  classNum: number;
  isNonHomeroom: boolean;
};

const EMPTY_FORM: ProfileForm = {
  email: '',
  password: '',
  name: '',
  role: 'teacher',
  schoolName: '',
  schoolCode: '',
  grade: 1,
  classNum: 1,
  isNonHomeroom: false,
};

const STATUS_LABELS: Record<ManagedUser['status'], string> = {
  linked: '정상 연결',
  'auth-only': '프로필 누락',
  'profile-only': '인증 계정 누락',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR');
}

function AdminContent() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [reservationSearch, setReservationSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [resetLink, setResetLink] = useState('');

  const adminRequest = useCallback(
    async (body?: Record<string, unknown>) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin', {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || '관리자 요청에 실패했습니다.');
      return result;
    },
    [currentUser],
  );

  const loadDashboard = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      setData((await adminRequest()) as DashboardData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : '관리 정보를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, [adminRequest, currentUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const schools = useMemo(
    () =>
      [
        ...new Set(
          (data?.users || []).map((item) => item.schoolName).filter(Boolean),
        ),
      ].sort(),
    [data],
  );

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (data?.users || []).filter((item) => {
      const matchesSearch =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.email.toLowerCase().includes(normalized) ||
        item.schoolName.toLowerCase().includes(normalized);
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'problem'
          ? item.status !== 'linked'
          : item.role === roleFilter);
      return (
        matchesSearch &&
        matchesRole &&
        (schoolFilter === 'all' || item.schoolName === schoolFilter)
      );
    });
  }, [data, roleFilter, schoolFilter, search]);

  const filteredReservations = useMemo(() => {
    const normalized = reservationSearch.trim().toLowerCase();
    return (data?.reservations || [])
      .filter(
        (item) =>
          !normalized ||
          [
            item.studentName,
            item.teacherName,
            item.schoolName,
            item.topic,
            item.content,
          ].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(normalized),
          ),
      )
      .sort((a, b) =>
        String(b.date || b.preferredDate || '').localeCompare(
          String(a.date || a.preferredDate || ''),
        ),
      );
  }, [data, reservationSearch]);

  const openForm = (mode: FormMode, managedUser?: ManagedUser) => {
    setFormMode(mode);
    setSelectedUser(managedUser || null);
    setError('');
    setForm(
      managedUser
        ? {
            email: managedUser.email,
            password: '',
            name: managedUser.name,
            role: managedUser.role || 'teacher',
            schoolName: managedUser.schoolName,
            schoolCode: managedUser.schoolCode,
            grade: managedUser.grade || 1,
            classNum: managedUser.classNum || 1,
            isNonHomeroom:
              managedUser.grade === 0 && managedUser.classNum === 0,
          }
        : EMPTY_FORM,
    );
  };

  const closeForm = () => {
    if (working) return;
    setFormMode(null);
    setSelectedUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSchoolSelect = (school: SchoolInfo) =>
    setForm((current) => ({
      ...current,
      schoolName: school.schoolName,
      schoolCode: school.schoolCode,
    }));

  const runAction = async (
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const result = await adminRequest(payload);
      setMessage(successMessage);
      await loadDashboard();
      return result;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : '작업에 실패했습니다.',
      );
      return null;
    } finally {
      setWorking(false);
    }
  };

  const submitForm = async () => {
    if (!formMode) return;
    const profile = {
      name: form.name,
      role: form.role,
      schoolName: form.schoolName,
      schoolCode: form.schoolCode,
      grade: form.isNonHomeroom ? 0 : form.grade,
      classNum: form.isNonHomeroom ? 0 : form.classNum,
    };
    const action =
      formMode === 'create'
        ? 'createUser'
        : formMode === 'repair'
          ? 'repairProfile'
          : formMode === 'repairAuth'
            ? 'repairAuth'
            : 'updateUser';
    const result = await runAction(
      {
        action,
        uid: selectedUser?.uid,
        email: form.email,
        password: form.password,
        profile,
      },
      formMode === 'create'
        ? '계정을 생성했습니다.'
        : formMode === 'repair'
          ? '프로필을 복구했습니다.'
          : formMode === 'repairAuth'
            ? '인증 계정을 복구했습니다.'
            : '사용자 정보를 수정했습니다.',
    );
    if (result) closeForm();
  };

  const toggleDisabled = async (managedUser: ManagedUser) => {
    const disabled = !(managedUser.authDisabled || managedUser.isLocked);
    if (
      !window.confirm(
        `${managedUser.name || managedUser.email} 계정을 ${disabled ? '비활성화' : '활성화'}하시겠습니까?`,
      )
    )
      return;
    await runAction(
      { action: 'setDisabled', uid: managedUser.uid, disabled },
      `계정을 ${disabled ? '비활성화' : '활성화'}했습니다.`,
    );
  };

  const deleteUser = async (managedUser: ManagedUser) => {
    if (
      !window.confirm(
        `${managedUser.name || managedUser.email} 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      )
    )
      return;
    await runAction(
      { action: 'deleteUser', uid: managedUser.uid, email: managedUser.email },
      '계정을 삭제했습니다.',
    );
  };

  const createResetLink = async (managedUser: ManagedUser) => {
    const result = await runAction(
      { action: 'passwordResetLink', email: managedUser.email },
      '비밀번호 재설정 링크를 생성했습니다.',
    );
    if (result?.link) setResetLink(result.link);
  };

  if (loading && !data) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold">
              <Shield className="h-7 w-7 text-amber-400" /> 운영 관리자
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              계정, 교사 배정, 예약 및 변경 이력을 관리합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/10"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
            >
              홈으로
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && <Notice tone="error" text={error} />}
        {message && <Notice tone="success" text={message} />}
        {resetLink && (
          <div className="mb-5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <div className="mb-2 flex items-center justify-between">
              <strong>비밀번호 재설정 링크</strong>
              <button onClick={() => setResetLink('')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={resetLink}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              />
              <button
                onClick={() => navigator.clipboard.writeText(resetLink)}
                className="rounded-lg bg-cyan-600 px-4 py-2 font-medium"
              >
                복사
              </button>
            </div>
          </div>
        )}
        <nav className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1 md:grid-cols-4">
          <TabButton
            active={tab === 'overview'}
            onClick={() => setTab('overview')}
            icon={<Shield />}
            label="현황"
          />
          <TabButton
            active={tab === 'users'}
            onClick={() => setTab('users')}
            icon={<Users />}
            label="계정·교사"
          />
          <TabButton
            active={tab === 'reservations'}
            onClick={() => setTab('reservations')}
            icon={<CalendarDays />}
            label="전체 예약"
          />
          <TabButton
            active={tab === 'audit'}
            onClick={() => setTab('audit')}
            icon={<History />}
            label="변경 이력"
          />
        </nav>
        {tab === 'overview' && data && (
          <Overview
            data={data}
            onShowProblems={() => {
              setRoleFilter('problem');
              setTab('users');
            }}
          />
        )}
        {tab === 'users' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="이름, 이메일, 학교 검색"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5"
              >
                <option value="all">모든 상태</option>
                <option value="teacher">교사</option>
                <option value="admin">관리자</option>
                <option value="problem">연결 문제</option>
              </select>
              <select
                value={schoolFilter}
                onChange={(event) => setSchoolFilter(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5"
              >
                <option value="all">모든 학교</option>
                {schools.map((school) => (
                  <option key={school}>{school}</option>
                ))}
              </select>
              <button
                onClick={() => openForm('create')}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold hover:bg-cyan-500"
              >
                <Plus className="h-4 w-4" /> 계정 생성
              </button>
            </div>
            <UserTable
              users={filteredUsers}
              onEdit={(item) =>
                openForm(
                  item.status === 'auth-only'
                    ? 'repair'
                    : item.status === 'profile-only'
                      ? 'repairAuth'
                      : 'edit',
                  item,
                )
              }
              onToggle={toggleDisabled}
              onDelete={deleteUser}
              onReset={createResetLink}
              working={working}
              currentUid={currentUser?.uid || ''}
            />
          </section>
        )}
        {tab === 'reservations' && (
          <section className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={reservationSearch}
                onChange={(event) => setReservationSearch(event.target.value)}
                placeholder="학생, 교사, 학교, 상담 내용 검색"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 outline-none focus:border-cyan-500"
              />
            </div>
            <ReservationTable rows={filteredReservations} />
          </section>
        )}
        {tab === 'audit' && <AuditTable rows={data?.auditLogs || []} />}
      </main>
      {formMode && (
        <ProfileModal
          mode={formMode}
          form={form}
          setForm={setForm}
          error={error}
          onSchoolSelect={handleSchoolSelect}
          onClose={closeForm}
          onSubmit={submitForm}
          working={working}
        />
      )}
    </div>
  );
}

function Overview({
  data,
  onShowProblems,
}: {
  data: DashboardData;
  onShowProblems: () => void;
}) {
  const cards = [
    ['인증 계정', data.stats.authUsers, Users],
    ['교사', data.stats.teachers, UserCog],
    ['관리자', data.stats.admins, Shield],
    [
      '전체 예약',
      data.stats.reservations + data.stats.nonHomeroomRequests,
      CalendarDays,
    ],
  ] as const;
  const problemCount =
    data.issues.authOnly +
    data.issues.profileOnly +
    data.issues.duplicates.length;
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <Icon className="mb-3 h-6 w-6 text-cyan-400" />
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> 점검 필요
          </h2>
          <div className="space-y-3 text-sm">
            <Issue
              label="인증만 있고 프로필 없음"
              value={data.issues.authOnly}
            />
            <Issue
              label="프로필만 있고 인증 없음"
              value={data.issues.profileOnly}
            />
            <Issue
              label="중복 담임 배정"
              value={data.issues.duplicates.length}
            />
            <Issue label="잠긴 계정" value={data.stats.locked} />
          </div>
          {problemCount > 0 && (
            <button
              onClick={onShowProblems}
              className="mt-5 w-full rounded-xl bg-amber-500/15 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/25"
            >
              문제 계정 확인
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Building2 className="h-5 w-5 text-emerald-400" /> 현재 등록 범위의
            빈 반
          </h2>
          {data.issues.missingClasses.length === 0 ? (
            <p className="text-sm text-slate-400">발견된 빈 반이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.issues.missingClasses.map((issue) => (
                <span
                  key={`${issue.schoolCode}-${issue.grade}-${issue.classNum}`}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300"
                >
                  {issue.schoolName} {issue.grade}-{issue.classNum}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {data.issues.duplicates.length > 0 && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-6">
          <h2 className="mb-3 font-bold text-red-300">중복 담임 배정</h2>
          {data.issues.duplicates.map((issue) => (
            <p
              key={`${issue.schoolCode}-${issue.grade}-${issue.classNum}`}
              className="text-sm text-red-200/80"
            >
              {issue.schoolName} {issue.grade}학년 {issue.classNum}반:{' '}
              {issue.teachers.map((teacher) => teacher.name).join(', ')}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function UserTable({
  users,
  onEdit,
  onToggle,
  onDelete,
  onReset,
  working,
  currentUid,
}: {
  users: ManagedUser[];
  onEdit: (user: ManagedUser) => void;
  onToggle: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
  onReset: (user: ManagedUser) => void;
  working: boolean;
  currentUid: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">사용자</th>
            <th className="px-4 py-3">역할·상태</th>
            <th className="px-4 py-3">학교·담당</th>
            <th className="px-4 py-3">최근 로그인</th>
            <th className="px-4 py-3 text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((item) => (
            <tr key={item.uid} className="hover:bg-white/[0.03]">
              <td className="px-4 py-3">
                <div className="font-medium">
                  {item.name || '이름 없음'}{' '}
                  {item.uid === currentUid && (
                    <span className="text-xs text-cyan-400">(나)</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{item.email}</div>
              </td>
              <td className="px-4 py-3">
                <div>
                  {item.role === 'admin'
                    ? '관리자'
                    : item.role === 'teacher'
                      ? '교사'
                      : '프로필 없음'}
                </div>
                <span
                  className={`text-xs ${item.status === 'linked' ? 'text-emerald-400' : 'text-amber-400'}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
                {(item.isLocked || item.authDisabled) && (
                  <div className="text-xs text-red-400">비활성/잠금</div>
                )}
              </td>
              <td className="px-4 py-3">
                <div>{item.schoolName || '-'}</div>
                <div className="text-xs text-slate-500">
                  {item.grade === 0 && item.classNum === 0
                    ? '비담임'
                    : item.grade
                      ? `${item.grade}학년 ${item.classNum}반`
                      : '-'}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {formatDate(item.lastSignInAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <ActionButton
                    title={
                      item.status === 'auth-only'
                        ? '프로필 복구'
                        : item.status === 'profile-only'
                          ? '인증 복구'
                          : '수정'
                    }
                    onClick={() => onEdit(item)}
                    icon={<Pencil />}
                    disabled={working}
                  />
                  <ActionButton
                    title="비밀번호 재설정"
                    onClick={() => onReset(item)}
                    icon={<KeyRound />}
                    disabled={working || item.status !== 'linked'}
                  />
                  <ActionButton
                    title={
                      item.authDisabled || item.isLocked ? '활성화' : '비활성화'
                    }
                    onClick={() => onToggle(item)}
                    icon={
                      item.authDisabled || item.isLocked ? <Unlock /> : <Lock />
                    }
                    disabled={
                      working ||
                      item.status !== 'linked' ||
                      item.uid === currentUid
                    }
                  />
                  <ActionButton
                    title="삭제"
                    onClick={() => onDelete(item)}
                    icon={<Trash2 />}
                    danger
                    disabled={working || item.uid === currentUid}
                  />
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                조건에 맞는 계정이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReservationTable({ rows }: { rows: ReservationRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">일시</th>
            <th className="px-4 py-3">학생</th>
            <th className="px-4 py-3">교사</th>
            <th className="px-4 py-3">학교·학급</th>
            <th className="px-4 py-3">구분·상태</th>
            <th className="px-4 py-3">상담 내용</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((item) => (
            <tr key={`${item.type}-${item.id}`}>
              <td className="whitespace-nowrap px-4 py-3">
                {item.date || item.preferredDate || '-'}
                <div className="text-xs text-slate-500">
                  {item.startTime || item.preferredTime || ''}
                </div>
              </td>
              <td className="px-4 py-3 font-medium">
                {item.studentName || '-'}
              </td>
              <td className="px-4 py-3">{item.teacherName}</td>
              <td className="px-4 py-3">
                {item.schoolName || '-'}
                <div className="text-xs text-slate-500">
                  {item.grade ? `${item.grade}학년 ${item.classNum}반` : ''}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-cyan-300">
                  {item.type === 'homeroom' ? '담임 예약' : '비담임 요청'}
                </span>
                <div
                  className={`text-xs ${item.isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}
                >
                  {item.isCompleted ? '상담 완료' : '진행 전'}
                </div>
              </td>
              <td className="max-w-xs px-4 py-3">
                <div className="truncate">
                  {item.topic || item.content || '-'}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                예약 내역이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows }: { rows: AuditLog[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="divide-y divide-white/5">
        {rows.map((item) => (
          <div
            key={item.id}
            className="grid gap-1 px-5 py-4 md:grid-cols-[180px_1fr_220px]"
          >
            <span className="text-xs text-slate-500">
              {formatDate(item.createdAt)}
            </span>
            <span className="text-sm">{item.summary || item.action}</span>
            <span className="text-xs text-slate-400 md:text-right">
              {item.actorEmail}
              {item.targetEmail ? ` → ${item.targetEmail}` : ''}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            아직 기록된 관리자 작업이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileModal({
  mode,
  form,
  setForm,
  error,
  onSchoolSelect,
  onClose,
  onSubmit,
  working,
}: {
  mode: FormMode;
  form: ProfileForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  error: string;
  onSchoolSelect: (school: SchoolInfo) => void;
  onClose: () => void;
  onSubmit: () => void;
  working: boolean;
}) {
  const isAuthRepair = mode === 'repairAuth';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-lg font-bold">
            {mode === 'create'
              ? '교사 계정 생성'
              : mode === 'repair'
                ? '누락 프로필 복구'
                : mode === 'repairAuth'
                  ? '누락 인증 계정 복구'
                  : '교사 정보 수정'}
          </h2>
          <button onClick={onClose} disabled={working}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {(mode === 'create' || mode === 'repair' || isAuthRepair) && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">
                이메일
              </span>
              <input
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={mode !== 'create'}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 disabled:opacity-60"
              />
            </label>
          )}
          {(mode === 'create' || isAuthRepair) && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">
                임시 비밀번호
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              />
            </label>
          )}
          {!isAuthRepair && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm text-slate-300">
                  이름
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-slate-300">
                  역할
                </span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as ProfileForm['role'],
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5"
                >
                  <option value="teacher">교사</option>
                  <option value="admin">관리자 겸 교사</option>
                </select>
              </label>
              <div>
                <span className="mb-1.5 block text-sm text-slate-300">
                  학교
                </span>
                <SchoolSearch
                  value={form.schoolName}
                  onSelect={onSchoolSelect}
                  confirmed={Boolean(form.schoolCode)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isNonHomeroom}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isNonHomeroom: event.target.checked,
                    }))
                  }
                />{' '}
                비담임 교사
              </label>
              {!form.isNonHomeroom && (
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-sm text-slate-300">
                      학년
                    </span>
                    <select
                      value={form.grade}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          grade: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5"
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>
                          {value}학년
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm text-slate-300">
                      반
                    </span>
                    <select
                      value={form.classNum}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          classNum: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5"
                    >
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}반
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 border-t border-white/10 p-5">
          <button
            onClick={onClose}
            disabled={working}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-slate-300"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={working}
            className="flex-1 rounded-xl bg-cyan-600 py-2.5 font-semibold hover:bg-cyan-500 disabled:opacity-50"
          >
            {working
              ? '처리 중...'
              : mode === 'create'
                ? '계정 생성'
                : mode === 'repairAuth'
                  ? '인증 복구'
                  : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function ActionButton({
  title,
  onClick,
  icon,
  danger = false,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactElement;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 disabled:opacity-30 ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
    </button>
  );
}

function Issue({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <strong className={value ? 'text-amber-300' : 'text-emerald-400'}>
        {value}
      </strong>
    </div>
  );
}

function Notice({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  return (
    <div
      className={`mb-5 flex items-center gap-2 rounded-xl border p-3 text-sm ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-300' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'}`}
    >
      {tone === 'error' ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      {text}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">관리 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminContent />
    </AuthGuard>
  );
}
