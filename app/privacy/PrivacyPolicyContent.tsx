'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Language } from '@/lib/i18n';
import { useLanguage } from '@/lib/i18n';

type DataCategory = {
  title: string;
  fields: string;
  purpose: string;
  retention: string;
};

type ExternalService = {
  name: string;
  purpose: string;
  items: string;
  transfer: string;
};

type ContactEntry = {
  label: string;
  value: string;
};

type PolicyContent = {
  serviceName: string;
  effectiveDate: string;
  effectiveDateLabel: string;
  heroDescription: string;
  sectionTitles: {
    dataCategories: string;
    collectionMethods: string;
    thirdPartySharing: string;
    externalServices: string;
    destruction: string;
    rights: string;
    security: string;
    children: string;
    automaticCollection: string;
    contact: string;
    remedies: string;
    changes: string;
  };
  labels: {
    fields: string;
    purpose: string;
    retention: string;
    usagePurpose: string;
    items: string;
    transfer: string;
  };
  dataIntro: string[];
  thirdPartySharing: string[];
  externalServicesIntro: string[];
  destructionIntro: string[];
  childrenIntro: string[];
  automaticCollectionIntro: string[];
  changesIntro: string[];
  dataCategories: DataCategory[];
  collectionMethods: string[];
  rights: string[];
  securityMeasures: string[];
  remedies: string[];
  externalServices: ExternalService[];
  contactEntries: ContactEntry[];
};

const POLICY_CONTENT: Record<Language, PolicyContent> = {
  ko: {
    serviceName: '상담 예약 도우미',
    effectiveDate: '2026년 3월 15일',
    effectiveDateLabel: '시행일',
    heroDescription:
      '본 방침은 현재 프로젝트의 실제 기능과 데이터 흐름을 기준으로 작성되었습니다. 현재 서비스는 상담 예약 전용 플랫폼이며, 교사/관리자 계정 인증과 학부모 공개 예약·조회 기능을 중심으로 운영됩니다.',
    sectionTitles: {
      dataCategories: '처리하는 개인정보 항목, 목적 및 보유기간',
      collectionMethods: '개인정보의 수집 방법',
      thirdPartySharing: '개인정보의 제3자 제공',
      externalServices: '외부 서비스 이용, 처리위탁 및 국외 이전',
      destruction: '개인정보의 파기절차 및 파기방법',
      rights: '정보주체의 권리·의무 및 행사방법',
      security: '개인정보의 안전성 확보조치',
      children: '만 14세 미만 아동의 개인정보 처리',
      automaticCollection: '자동으로 수집하는 장치의 설치·운영 및 거부',
      contact: '개인정보 보호책임자 및 문의처',
      remedies: '권익침해 구제방법',
      changes: '개인정보처리방침의 변경',
    },
    labels: {
      fields: '처리 항목',
      purpose: '처리 목적',
      retention: '보유기간',
      usagePurpose: '이용 목적',
      items: '처리 항목',
      transfer: '국외 이전 여부',
    },
    dataIntro: [
      '상담 예약 도우미(이하 "서비스")는 「개인정보 보호법」 등 관계 법령을 준수하며, 서비스 운영에 필요한 최소한의 개인정보만 처리합니다. 서비스는 비밀번호 원문을 별도로 저장하지 않으며 인증 서비스에서 처리합니다.',
      '또한 서비스는 원칙적으로 주민등록번호 등 고유식별정보를 수집하지 않습니다. 다만 상담 내용, 기타 방식 입력란 등 자유 입력 영역에 이용자가 직접 개인정보를 기재할 수 있으므로, 불필요하거나 민감한 개인정보 입력은 자제해 주시기 바랍니다.',
    ],
    thirdPartySharing: [
      '서비스는 이용자의 개인정보를 원칙적으로 외부 제3자에게 제공하지 않습니다. 다만 이용자가 사전에 동의한 경우, 법령에 특별한 규정이 있는 경우, 또는 법령상 의무를 준수하기 위해 불가피한 경우에는 예외적으로 제공할 수 있습니다.',
    ],
    externalServicesIntro: [
      '현재 서비스는 Firebase Authentication, Cloud Firestore, NEIS Open API를 이용합니다. 이 중 Firebase 계열 서비스는 Google Cloud 기반으로 운영되므로 국외 서버에서 개인정보가 저장 또는 처리될 수 있습니다.',
      '이용자가 위 국외 이전을 원하지 않는 경우 회원가입 및 로그인 등 핵심 기능 이용이 제한될 수 있습니다. 학부모 공개 예약/조회 기능은 계정 로그인 없이 이용할 수 있으나, 예약 데이터 자체는 Firestore에 저장됩니다.',
    ],
    destructionIntro: [
      '서비스는 개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구 또는 재생이 어려운 방법으로 삭제하며, 종이 문서 형태의 정보가 있는 경우 분쇄 또는 소각 등의 방법으로 파기합니다.',
      '다만 현재 서비스의 상담 예약 및 시간표 데이터는 자동 일괄 삭제 정책이 구현되어 있지 않아, 이용자 취소 또는 관리자 정리 전까지 보관될 수 있습니다.',
    ],
    childrenIntro: [
      '서비스는 교사, 관리자, 학부모/보호자의 상담 예약 이용을 전제로 하며, 만 14세 미만 아동의 직접 회원가입을 예정하지 않습니다. 다만 학부모 또는 보호자가 예약을 위해 학생 이름, 학년, 반 등의 정보를 입력할 수 있으며, 해당 정보는 상담 예약 및 조회 목적 범위 내에서만 처리됩니다.',
    ],
    automaticCollectionIntro: [
      '서비스는 광고 또는 행태분석 목적의 자체 쿠키를 운영하지 않습니다. 다만 표시 언어 유지를 위해 브라우저 저장소(localStorage)를 사용할 수 있습니다.',
      '이용자는 브라우저 설정을 통해 저장소 데이터를 삭제하거나 저장 기능을 제한할 수 있습니다. 제한 시 일부 사용자 경험이 저하될 수 있습니다.',
    ],
    changesIntro: [
      '본 방침은 2026년 3월 15일부터 적용됩니다.',
      '내용의 추가, 삭제 또는 수정이 있는 경우 서비스 화면 또는 별도 안내를 통해 사전에 고지합니다. 이용자 권리에 중대한 변경이 있는 경우에는 최소 30일 전에 고지합니다.',
    ],
    dataCategories: [
      {
        title: '교사 계정 가입 및 로그인',
        fields:
          '이메일, 비밀번호(인증 서비스 처리), 이름, 역할(교사/관리자), 학교명, 학교코드, 학년, 반, 사용자 식별값(uid), 생성일시, 수정일시',
        purpose:
          '교사 계정 식별, 로그인, 비밀번호 재설정, 학급 기반 상담 예약 기능 제공, 사용자 프로필 관리',
        retention:
          '회원 탈퇴 또는 계정 삭제 시까지. 다만 관련 법령 또는 분쟁 대응을 위해 보존이 필요한 경우 해당 기간까지',
      },
      {
        title: '계정보호 및 보안 관리',
        fields: '로그인 실패 횟수, 계정 잠금 여부, 최근 갱신 시각',
        purpose: '비정상 로그인 시도 탐지, 계정 잠금 처리, 관리자 계정 보안 관리',
        retention: '잠금 해제, 계정 삭제 또는 서비스 운영상 필요성이 해소될 때까지',
      },
      {
        title: '교사 학급 정보 및 학년/반 갱신',
        fields: '학교명, 학교코드, 학년, 반, 학년/반 확인 연도 정보',
        purpose: '담임 학급 식별, 공개 예약 페이지 연결, 학년 변경 시 데이터 정합성 유지',
        retention: '계정 삭제 시까지 또는 사용자가 직접 수정할 때까지',
      },
      {
        title: '상담 가능 시간 관리',
        fields: '교사 식별자, 상담 가능 일자, 교시, 시작 시간, 종료 시간, 예약 상태, 생성 시각',
        purpose: '학부모 공개 예약을 위한 상담 가능 시간 등록 및 운영',
        retention: '교사가 직접 삭제할 때까지 또는 서비스 운영상 필요 기간 동안',
      },
      {
        title: '학부모 공개 예약 및 예약 조회',
        fields:
          '학교명, 학교코드, 학년, 반, 학생 이름, 예약 일자, 교시, 시작/종료 시간, 상담 주제, 상담 내용, 상담 방식(대면/전화/기타), 기타 방식 입력값, 생성 시각',
        purpose: '교사 매칭, 상담 예약 생성, 예약 조회 및 취소, 예약 이력 관리',
        retention:
          '예약 취소, 관리자 또는 운영자 삭제, 서비스 운영 종료 등으로 삭제될 때까지. 현재 서비스는 학년도 종료에 따른 자동 파기를 별도로 구현하고 있지 않습니다.',
      },
      {
        title: '서비스 환경 설정',
        fields: '표시 언어 설정값(localStorage)',
        purpose: '서비스 화면 언어 유지',
        retention: '이용자가 브라우저 저장소를 삭제할 때까지',
      },
    ],
    collectionMethods: [
      '교사 회원가입, 로그인, 프로필 수정, 비밀번호 재설정 과정에서 이용자가 직접 입력',
      '교사가 상담 가능 시간을 등록하거나 수정할 때 직접 입력',
      '학부모/보호자가 공개 예약 및 예약 조회 화면에서 학교, 학년, 반, 학생 이름, 상담 정보를 직접 입력',
      '교사 로그인 및 계정보호 기능 과정에서 인증 서비스와 서버 API가 보안 관련 정보를 생성',
      '브라우저 저장소(localStorage)를 통한 언어 설정 저장',
    ],
    rights: [
      '이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지 및 동의 철회를 요구할 수 있습니다.',
      '교사는 서비스 내 기능을 통해 본인 계정 정보, 학년/반, 상담 가능 시간 등을 직접 수정할 수 있습니다.',
      '학부모/보호자는 공개 예약 화면 또는 예약 조회 화면을 통해 본인이 입력한 예약 정보를 확인하고 취소할 수 있습니다.',
      '법정대리인 또는 위임받은 대리인을 통한 권리 행사도 가능하며, 필요한 경우 관련 서류 제출을 요청할 수 있습니다.',
      '법령에서 정한 일부 경우에는 열람, 정정, 삭제 또는 처리정지 요구가 제한될 수 있습니다.',
    ],
    securityMeasures: [
      '교사/관리자와 공개 이용자 간 역할 분리 및 접근 범위 제한',
      'Firebase Authentication 기반 인증 및 접근 통제 적용',
      '로그인 실패 누적 시 계정 잠금 기능 적용',
      'HTTPS 기반 전송 구간 보호',
      '개인정보 접근 권한 최소화 및 Firestore 문서 단위 저장',
    ],
    remedies: [
      '개인정보분쟁조정위원회: 1833-6972 / www.kopico.go.kr',
      '개인정보침해신고센터: 118 / privacy.kisa.or.kr',
      '경찰청 사이버범죄 신고시스템: 182 / ecrm.police.go.kr',
    ],
    externalServices: [
      {
        name: 'Firebase Authentication',
        purpose: '교사/관리자 회원가입, 로그인, Google 로그인, 비밀번호 재설정, 인증 세션 처리',
        items: '이메일, 사용자 식별값(uid), 인증 관련 식별정보',
        transfer: 'Google Cloud 기반 인프라를 통해 국외 서버에서 처리될 수 있습니다.',
      },
      {
        name: 'Cloud Firestore',
        purpose: '사용자 프로필, 상담 가능 시간, 예약 데이터 저장',
        items: 'users, availableSlots, reservations 컬렉션에 저장되는 사용자 정보와 예약 정보',
        transfer: 'Google Cloud 기반 인프라를 통해 국외 서버에 저장 또는 처리될 수 있습니다.',
      },
      {
        name: 'NEIS Open API',
        purpose: '학교 검색 결과 조회',
        items: '사용자가 입력한 학교 검색어',
        transfer: '국외 이전 대상은 아니며, 대한민국 교육행정정보 공공 API 조회에 이용됩니다.',
      },
    ],
    contactEntries: [
      { label: '개인정보 보호책임자', value: '김형훈' },
      { label: '직책', value: '등촌중학교 교사' },
      { label: '이메일', value: 'greenguyhh@gmail.com' },
      { label: '연락처', value: '070-7005-8012' },
      { label: '권리행사 접수처', value: '상기 이메일 또는 연락처' },
    ],
  },
  en: {
    serviceName: 'Counseling Booking Assistant',
    effectiveDate: 'March 15, 2026',
    effectiveDateLabel: 'Effective date',
    heroDescription:
      'This policy reflects the current project’s actual features and data flow. The service is a counseling-booking platform focused on teacher or admin authentication and public parent booking and lookup features.',
    sectionTitles: {
      dataCategories: 'Items of Personal Information Processed, Purpose, and Retention Period',
      collectionMethods: 'How Personal Information Is Collected',
      thirdPartySharing: 'Provision of Personal Information to Third Parties',
      externalServices: 'External Services, Processing Delegation, and Overseas Transfer',
      destruction: 'Destruction Procedures and Methods',
      rights: 'Data Subject Rights and How to Exercise Them',
      security: 'Security Measures',
      children: 'Processing of Children’s Personal Information',
      automaticCollection: 'Automatic Collection Devices, Operation, and Refusal',
      contact: 'Privacy Officer and Contact Information',
      remedies: 'Remedies for Rights Infringement',
      changes: 'Changes to This Privacy Policy',
    },
    labels: {
      fields: 'Items processed',
      purpose: 'Purpose',
      retention: 'Retention period',
      usagePurpose: 'Purpose of use',
      items: 'Items processed',
      transfer: 'Overseas transfer',
    },
    dataIntro: [
      'Counseling Booking Assistant (the "Service") complies with applicable privacy laws and processes only the minimum personal information required to operate the service. Plain-text passwords are not stored separately and are handled by the authentication provider.',
      'The Service does not collect unique identifiers such as resident registration numbers. However, users may enter personal information directly into free-text fields such as counseling content or the "other method" field, so unnecessary or sensitive information should not be entered.',
    ],
    thirdPartySharing: [
      'The Service does not provide personal information to outside third parties as a rule. Exceptions may apply where the user has given prior consent, where laws require it, or where disclosure is unavoidable to comply with legal obligations.',
    ],
    externalServicesIntro: [
      'The Service currently uses Firebase Authentication, Cloud Firestore, and the NEIS Open API. Firebase services run on Google Cloud infrastructure, so personal information may be stored or processed on servers outside Korea.',
      'If a user does not wish to allow such overseas processing, access to core functions such as sign-up and login may be limited. Parent booking and reservation lookup can be used without an account login, but reservation data itself is still stored in Firestore.',
    ],
    destructionIntro: [
      'The Service destroys personal information without delay when the retention period expires or the purpose of processing has been achieved. Electronic files are deleted in a way that makes recovery difficult, and paper records, if any, are destroyed by shredding or incineration.',
      'However, the Service does not currently implement an automatic bulk-deletion policy for reservation and schedule data, so such data may remain until a user cancels it or an administrator removes it.',
    ],
    childrenIntro: [
      'The Service is intended for teachers, administrators, and parents or guardians using counseling booking features and does not support direct sign-up by children under the age of 14. A parent or guardian may enter a student name, grade, and class for booking purposes, and that information is processed only within the scope necessary for reservation and lookup.',
    ],
    automaticCollectionIntro: [
      'The Service does not operate its own cookies for advertising or behavioral analytics. It may use browser storage (`localStorage`) to keep the selected display language.',
      'Users may delete stored data or restrict storage through browser settings. Doing so may degrade some parts of the user experience.',
    ],
    changesIntro: [
      'This policy takes effect on March 15, 2026.',
      'If any content is added, deleted, or revised, notice will be provided in advance through the service screen or by separate announcement. If a change materially affects user rights, notice will be provided at least 30 days in advance.',
    ],
    dataCategories: [
      {
        title: 'Teacher account sign-up and login',
        fields:
          'Email address, password (handled by authentication service), name, role (teacher/admin), school name, school code, grade, class, user identifier (uid), created timestamp, updated timestamp',
        purpose:
          'Teacher account identification, login, password reset, class-based counseling booking features, and user profile management',
        retention:
          'Until membership withdrawal or account deletion. Information may be retained longer where required by law or necessary for dispute handling.',
      },
      {
        title: 'Account protection and security management',
        fields: 'Number of failed login attempts, account lock status, latest update time',
        purpose: 'Detection of abnormal login attempts, account lock handling, and administrator account security',
        retention: 'Until the lock is released, the account is deleted, or the operational need ends',
      },
      {
        title: 'Teacher class information and grade/class updates',
        fields: 'School name, school code, grade, class, and annual grade/class confirmation data',
        purpose: 'Homeroom class identification, public booking page linkage, and data consistency when grade/class changes',
        retention: 'Until account deletion or until the user directly updates it',
      },
      {
        title: 'Available counseling time management',
        fields: 'Teacher identifier, available date, period, start time, end time, reservation status, created time',
        purpose: 'Registering and operating counseling slots for public parent booking',
        retention: 'Until deleted by the teacher or as long as needed for service operation',
      },
      {
        title: 'Public parent booking and reservation lookup',
        fields:
          'School name, school code, grade, class, student name, reservation date, period, start/end time, counseling topic, counseling content, counseling method (in-person/phone/other), custom method value, created time',
        purpose: 'Teacher matching, reservation creation, reservation lookup and cancellation, and reservation history management',
        retention:
          'Until deleted due to reservation cancellation, administrator/operator removal, or service termination. The Service does not currently implement automatic deletion at the end of a school year.',
      },
      {
        title: 'Service preferences',
        fields: 'Display language setting value (`localStorage`)',
        purpose: 'Keeping the selected service language',
        retention: 'Until the user clears browser storage',
      },
    ],
    collectionMethods: [
      'Entered directly by teachers during sign-up, login, profile updates, and password reset',
      'Entered directly by teachers when creating or editing available counseling time slots',
      'Entered directly by parents or guardians on public booking and reservation lookup screens, including school, grade, class, student name, and counseling details',
      'Generated by the authentication service and server APIs for security-related purposes during teacher login and account protection flows',
      'Stored as a language preference in browser storage (`localStorage`)',
    ],
    rights: [
      'Users may request access to, correction of, deletion of, suspension of processing for, or withdrawal of consent for their personal information at any time.',
      'Teachers may directly update their account information, grade/class, and available counseling times through service features.',
      'Parents or guardians may review and cancel reservation information they entered through the public booking or lookup screens.',
      'Rights may also be exercised through a legal representative or an authorized agent, and supporting documents may be requested if necessary.',
      'Some requests for access, correction, deletion, or suspension may be restricted where permitted by law.',
    ],
    securityMeasures: [
      'Role separation and access-scope restriction between teachers/admins and public users',
      'Authentication and access control based on Firebase Authentication',
      'Account locking after repeated failed login attempts',
      'Protection of transmitted data through HTTPS',
      'Minimization of access privileges and document-level storage in Firestore',
    ],
    remedies: [
      'Personal Information Dispute Mediation Committee: 1833-6972 / www.kopico.go.kr',
      'Personal Information Infringement Report Center: 118 / privacy.kisa.or.kr',
      'Korean National Police Agency Cybercrime Reporting System: 182 / ecrm.police.go.kr',
    ],
    externalServices: [
      {
        name: 'Firebase Authentication',
        purpose: 'Teacher/admin sign-up, login, Google login, password reset, and authentication session handling',
        items: 'Email address, user identifier (uid), and authentication-related identifiers',
        transfer: 'Processed on overseas servers through Google Cloud infrastructure.',
      },
      {
        name: 'Cloud Firestore',
        purpose: 'Storage of user profiles, available counseling slots, and reservation data',
        items: 'User information and reservation information stored in the `users`, `availableSlots`, and `reservations` collections',
        transfer: 'Stored or processed on overseas servers through Google Cloud infrastructure.',
      },
      {
        name: 'NEIS Open API',
        purpose: 'School search result lookup',
        items: 'School search keywords entered by the user',
        transfer: 'Not an overseas transfer target; used to query the public education administration API in Korea.',
      },
    ],
    contactEntries: [
      { label: 'Privacy officer', value: 'Kim Hyung-hoon' },
      { label: 'Position', value: 'Teacher, Deungchon Middle School' },
      { label: 'Email', value: 'greenguyhh@gmail.com' },
      { label: 'Phone', value: '070-7005-8012' },
      { label: 'Channel for rights requests', value: 'Email address or phone number listed above' },
    ],
  },
};

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-sm font-bold text-cyan-900">
          {number}
        </div>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-7 text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyContent() {
  const { language, t } = useLanguage();
  const content = POLICY_CONTENT[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToMain')}
            </Link>
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-100/70 px-4 py-2 text-sm font-medium text-cyan-900">
              <ShieldCheck className="h-4 w-4" />
              {t('privacyPolicy')}
            </div>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-cyan-900/5 backdrop-blur">
          <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/80">
              {content.serviceName}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t('privacyPolicy')}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
              {content.heroDescription}
            </p>
            <div className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-cyan-100">
              {content.effectiveDateLabel}: {content.effectiveDate}
            </div>
          </div>

          <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Section number={1} title={content.sectionTitles.dataCategories}>
              {content.dataIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <div className="grid gap-4">
                {content.dataCategories.map((category) => (
                  <article
                    key={category.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900">{category.title}</h3>
                    <dl className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-[140px_1fr]">
                      <dt className="font-medium text-slate-600">{content.labels.fields}</dt>
                      <dd>{category.fields}</dd>
                      <dt className="font-medium text-slate-600">{content.labels.purpose}</dt>
                      <dd>{category.purpose}</dd>
                      <dt className="font-medium text-slate-600">{content.labels.retention}</dt>
                      <dd>{category.retention}</dd>
                    </dl>
                  </article>
                ))}
              </div>
            </Section>

            <Section number={2} title={content.sectionTitles.collectionMethods}>
              <ul className="space-y-3">
                {content.collectionMethods.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section number={3} title={content.sectionTitles.thirdPartySharing}>
              {content.thirdPartySharing.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>

            <Section number={4} title={content.sectionTitles.externalServices}>
              {content.externalServicesIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <div className="grid gap-4">
                {content.externalServices.map((service) => (
                  <article
                    key={service.name}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                    <dl className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-[140px_1fr]">
                      <dt className="font-medium text-slate-600">{content.labels.usagePurpose}</dt>
                      <dd>{service.purpose}</dd>
                      <dt className="font-medium text-slate-600">{content.labels.items}</dt>
                      <dd>{service.items}</dd>
                      <dt className="font-medium text-slate-600">{content.labels.transfer}</dt>
                      <dd>{service.transfer}</dd>
                    </dl>
                  </article>
                ))}
              </div>
            </Section>

            <Section number={5} title={content.sectionTitles.destruction}>
              {content.destructionIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>

            <Section number={6} title={content.sectionTitles.rights}>
              <ul className="space-y-3">
                {content.rights.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section number={7} title={content.sectionTitles.security}>
              <ul className="space-y-3">
                {content.securityMeasures.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section number={8} title={content.sectionTitles.children}>
              {content.childrenIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>

            <Section number={9} title={content.sectionTitles.automaticCollection}>
              {content.automaticCollectionIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>

            <Section number={10} title={content.sectionTitles.contact}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <dl className="grid gap-3 text-sm leading-6 sm:grid-cols-[180px_1fr]">
                  {content.contactEntries.map((entry) => (
                    <div key={entry.label} className="contents">
                      <dt className="font-medium text-slate-600">{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Section>

            <Section number={11} title={content.sectionTitles.remedies}>
              <ul className="space-y-3">
                {content.remedies.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section number={12} title={content.sectionTitles.changes}>
              {content.changesIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>
          </div>
        </section>
      </div>
    </div>
  );
}
