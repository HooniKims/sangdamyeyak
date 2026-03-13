# 스쿨홀릭 (Schoolholic) - 통합 학교 커뮤니케이션 플랫폼

## 프로젝트 개요
- **프레임워크**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **배포 대상**: Vercel
- **Firebase**: Firestore (알림장 & 상담 예약 데이터) + Authentication (이메일/비밀번호 + Google 로그인)
  - 기존 데이터베이스 구조와 문서를 그대로 유지 (데이터 손실 없음)
  - 알림장(`notes`), 교사정보(`teachers`), 상담슬롯(`availableSlots`), 예약정보(`reservations`), 사용자(`users`) 컬렉션 공존
- **AI**: 로컬 LLM (Ollama via api.alluser.site 프록시, 브라우저 직접 호출)
- **디자인/UI**: 
  - 기본 폰트: 가독성을 높인 **Pretendard** 적용
  - 다크 테마 기반 글래스모피즘(Glassmorphism)
  - 직관적인 이모지 타이틀 및 인터랙티브 호버 애니메이션(Hover Glow & Translate) 적용
  - **PWA 지원** (manifest.json + Service Worker + 오프라인 캐싱)

## 라우트 구조
| 경로 | 설명 |
|------|------|
| `/` | 메인 랜딩 페이지 |
| `/login` | 로그인 (이메일/비밀번호 + Google) |
| `/signup` | 회원가입 (교사/학부모 역할 선택) |
| `/forgot-password` | 비밀번호 찾기 (이메일 재설정) |
| `/change-password` | 비밀번호 변경 |
| `/admin` | 관리자 페이지 (계정 잠금 해제) |
| `/notice/teacher` | 알림장 - 교사용 (작성/AI정리/저장/삭제) |
| `/notice/parents` | 알림장 - 학부모용 (날짜별 조회) |
| `/teacher` | 상담 예약 - 교사용 (시간 설정/예약 관리) |
| `/parent` | 상담 예약 - 학부모용 (예약/조회/취소) |
| `/booking/[teacherId]` | 상담 예약 - 교사 링크 직접 접근 |
| `/check-reservation` | 상담 예약 조회 및 취소 |
| `/api/auth/check-lock` | 서버 사이드 로그인 잠금 검증 API |

## 완료된 작업
- [x] 깃허브 레포지토리 복제 (schoolalarm, counseling-reservation)
- [x] Next.js 기반 통합 프로젝트 구조 설정
- [x] 알림장(schoolalarm) 기능을 Vite→Next.js로 마이그레이션
  - [x] TeacherPage → `/notice/teacher` (TSX 변환)
  - [x] ParentPage → `/notice/parents` (TSX 변환)
  - [x] 서비스 파일 마이그레이션 (notice-firebase.ts, notice-ai.ts)
  - [x] 환경변수 VITE_ → NEXT_PUBLIC_ 전환 (기존 DB 구조 완벽 보존)
- [x] 상담예약(counseling-reservation) 기능 루트로 이동
- [x] 통합 메인 페이지 생성 (app/page.tsx)
- [x] package.json 통합 (모든 의존성 병합)
- [x] .env.local.example 통합 (Firebase + Upstage API 키)
- [x] 불필요한 원본 폴더 삭제 (schoolalarm/, counseling-reservation/)
- [x] UI/UX 개선
  - [x] 전역 기본 폰트를 Pretendard로 변경하여 가독성 개선
  - [x] 메인 페이지 설명 문구 줄바꿈 및 강조 텍스트 적용 ("학급에서 전하는 안내사항을")
  - [x] 메인 페이지 푸터 텍스트 변경 ("Powered by HooniKim")
  - [x] 버튼 호버 시 3D 상승 효과 및 테마별 네온 글로우 섀도우 추가
  - [x] 메인 기능 설명 아이콘을 직관적인 이모지(📋, 🗓️)로 교체 및 애니메이션 추가
  - [x] 파비콘(`icon.svg`)을 모던한 학사모 형태로 변경
- [x] 통합 프로젝트 깃허브 업로드 (HooniKims/schoolholic)
- [x] 알림장 AI를 Upstage Solar Mini → 로컬 LLM (Ollama) 으로 전환
  - [x] notice-ai.ts: OpenAI SDK → 브라우저 직접 fetch (api.alluser.site 프록시)
  - [x] 자동 재시도 로직, 텍스트 후처리, Sandwich 기법 적용
  - [x] 교사 페이지에 AI 모델 선택 드롭다운 UI 추가 (Gemma 3 4B 기본값, Qwen, Llama 등 모델별 특징 표기)
  - [x] 환경변수 NEXT_PUBLIC_UPSTAGE_API_KEY → NEXT_PUBLIC_OLLAMA_API_KEY 변경
- [x] 로그인/인증 시스템 구현
  - [x] Firebase Authentication 설정 (이메일/비밀번호 + Google 소셜 로그인)
  - [x] Firestore 사용자 프로필 스키마 (교사/학부모/관리자 역할)
  - [x] 인증 서비스 레이어 (auth-firebase.ts)
  - [x] NEIS 학교 검색 API 연동 (school-api.ts)
  - [x] 인증 Context + AuthGuard 컴포넌트
  - [x] 로그인/회원가입/비밀번호 찾기·변경 페이지
  - [x] 관리자 페이지 (계정 잠금 해제)
  - [x] 로그인 10회 실패 시 계정 잠금 기능
  - [x] 메인 페이지에 로그인/로그아웃 UI 통합
  - [x] 기존 하드코딩 비밀번호 인증 제거 → Firebase Auth로 통합
  - [x] 비로그인 시 보호 페이지(`/notice/teacher`, `/notice/parents`, `/teacher`, `/parent`) 접근 차단 → `/login`으로 리다이렉트
  - [x] Firebase 빌드 타임 초기화 오류 해결 (try-catch 방식)
- [x] 상담 예약 시스템 교사별 개별 시간표 분리 기능 연동 수정 (하드코딩 제거 및 UID 연동)
- [x] 학부모 예약 페이지 해당 담임 교사 시간표 자동 매칭 연동 적용
- [x] `feature/auth-system` 브랜치로 깃허브 업로드 및 Netlify 브랜치 배포
- [x] `feature/auth-system` 브랜치를 `main`으로 병합(Merge) 및 테스트 브랜치 삭제 완료
- [x] 통합 테스트 (알림장 + 상담 예약 동시 기능 연동 확인)
  - [x] 알림장 데이터 교사별 분리 (`notice-firebase.ts` → 문서 ID: `{teacherUid}_{dateStr}`)
  - [x] 학부모 알림장 조회 시 `matchedTeacherId` 기반 교사 알림장만 표시
  - [x] 교사 미매칭 학부모에게 안내 메시지 표시
- [x] 로그인 잠금 로직 서버 사이드 검증(Next API)으로 강화
  - [x] `/api/auth/check-lock` API Route 생성 (Firestore REST API 기반)
  - [x] `auth-firebase.ts`에서 잠금 확인/실패 횟수 관리를 서버 API 호출로 전환
- [x] 알림장 전체 목록 조회 시 복합 인덱스 오류(Firestore Index Error) 해결 (클라이언트 단 정렬로 우회)
- [x] ~~다크 모드 지원~~ → 삭제 완료 (기본 다크 테마 유지, 토글 기능 제거)
- [x] 회원 탈퇴 기능
  - [x] `UserProfileModal.tsx` 컴포넌트 (아이디, 가입일 표시 + 3단계 탈퇴 확인 플로우)
  - [x] `auth-firebase.ts`에 `deleteAccount()` 함수 (Firebase Auth + Firestore 프로필 삭제)
  - [x] 탈퇴 실패 시 Firestore 프로필 문서 복구(Rollback) 및 재로그인 안내 로직 보강
  - [x] 메인 페이지 사람 아이콘 클릭 → 프로필 팝업 연동
- [x] 모바일 반응형 최적화
  - [x] `Layout.tsx` 모바일 반응형 패딩/폰트 사이즈 개선
  - [x] 터치 타겟 최소 44px 보장 (CSS)
  - [x] iOS 줌 방지 (input 16px 고정)
  - [x] Safe Area Inset 지원 (노치 디바이스)
  - [x] 캘린더 모바일 최적화
- [x] PWA 지원
  - [x] `public/manifest.json` 생성 (아이콘, 테마, 시작 URL)
  - [x] `public/sw.js` Service Worker (네트워크 우선 캐싱, 오프라인 fallback, 푸시 알림 수신)
  - [x] `public/icons/` PWA 아이콘 세트 (72~512px)
  - [x] `layout.tsx`에 manifest 링크, Service Worker 등록 스크립트 추가
  - [x] `next.config.ts`에 SW 스코프 헤더 설정
- [x] 콘솔 경고(`Link preload but not used`, `Tracking Prevention`) 분석 및 원인 파악
- [x] `lib/notice-ai.ts`에서 동작이 불안정한 `GLM-4.7-Flash` 모델 제거
- [x] AI 모델 목록에 `glm4:9b-chat-q8_0` 추가 및 모델별 비교 설명 보강
- [x] 최신 변경 사항 깃허브 업로드 (`main` 브랜치)
- [x] 교사 중복 가입 방지 로직 적용 (`checkTeacherDuplicate` 함수 기반 동일 학교/학년/반 검증)
- [x] 전역 다국어(영어) 지원 (i18n) 통합 구현
  - [x] `LanguageProvider` 및 `useLanguage` 훅 기반 상태 관리
  - [x] 전체 13개 페이지/컴포넌트 한국어 텍스트 영어 번역 적용
  - [x] 캘린더 로케일(`react-calendar`), 상담 날짜 포맷팅(`formatDateI18n`), 상담 주제 동적 번역 처리
- [x] '내 정보' 내 학교 및 반 표시 오류(Nclass)를 i18n 대응 `t('schoolInfo')`로 수정
- [x] 학부모-교사 매칭 오류 수정 
  - [x] 학교 직접 입력 시 `schoolCode` 부재로 인해 발생하는 쿼리 실패 문제 해결 (이름 기반 Fallback 쿼리 제외, 대신 검색 결과 선택을 강제하여 무조건 올바른 `schoolCode` 확보)
  - [x] 컴포넌트 생명주기와 DB 쿼리가 충돌해 화면에 실시간 반영되지 않는 문제 해결 (Context Profile 연동으로 갱신)
- [x] 정보 누락 방지를 위한 UI 변경
  - [x] 회원가입 폼 제출 시 `schoolCode`가 없을 경우 '검색된 학교 목록에서 학교를 선택해주세요' 오류 메시지 출력 추가
  - [x] `components/SchoolSearch.tsx` 내 직관성을 해칠 수 있는 '직접 입력하기' 수동 입력 기능 및 버튼 제거
  - [x] 선택 완료 시 초록색 테두리 변경 및 체크 표시(CheckCircle)를 추가해 시각적 피드백 제공
  - [x] 사용자가 선택된 상태에서 학교명을 다시 텍스트 수정 시, 선택 상태와 값을 초기화해 정보 불일치를 방지
- [x] 최신 변경 사항 깃허브 업로드 (`main` 브랜치)
- [x] 모바일 콘텐츠 스크롤 및 잘림 문제 수정
  - [x] `Layout.tsx` 카드 래퍼의 `overflow-hidden` 제거 (터치 스크롤 차단 원인)
  - [x] 알림장 교사 페이지 AI 결과 미리보기 `max-h-[400px]` 제거 (콘텐츠 잘림 원인)
  - [x] 알림장 학부모 페이지 빈 상태 영역 `h-[300px]` → `min-h-[300px]` 변경
- [x] 모바일 textarea 내부 스크롤 시 페이지 전체 스크롤 방지 (`overscroll-behavior: contain` 전역 적용)
- [x] 알림장 URL 자동 하이퍼링크 처리
  - [x] `components/NoticeMarkdown.tsx` 공통 렌더러 추가
  - [x] 직접 입력/붙여넣기한 URL 및 bare domain을 저장 후 클릭 가능한 링크로 자동 변환
  - [x] 기존 마크다운 링크, 코드 블록, 이미지 등은 자동 변환 대상에서 제외
- [x] 운영 안정성 기준 lint 오류 3건 수정
  - [x] `components/UserProfileModal.tsx`, `lib/auth-firebase.ts`의 `catch (error: any)` 제거 및 안전한 에러 속성 추출 적용
  - [x] `lib/i18n.ts`의 언어 상태를 `useSyncExternalStore` 기반으로 정리해 effect 내 직접 `setState` 제거
  - [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 검증 완료
- [x] 학부모 예약 화면 슬롯 표시/선택 로직 수정
  - [x] `/parent`, `/booking/[teacherId]`에서 미래 슬롯 전체(available/reserved) 노출 및 reserved 슬롯 비활성 처리
  - [x] 학부모 공개 화면에서 reserved 상태만 표시하고 예약자 개인정보 비노출 유지
  - [x] 예약 시 슬롯 상태를 transaction으로 재검증하여 동시 예약 충돌 방지
  - [x] 예약 관련 i18n 문구(한/영) 보강 및 빌드 검증 완료
- [x] 교사용 상담 슬롯 일괄 삭제 기능 추가
  - [x] `/teacher` 상담 슬롯 목록에 다중 선택 UI 및 전체 선택/선택 삭제 액션 추가
  - [x] reserved 슬롯은 선택 대상에서 제외하고 available 슬롯만 일괄 삭제 가능하도록 제한
  - [x] 대량 삭제 시 Firestore batch commit을 분할 실행해 많은 슬롯도 처리 가능하게 구성
  - [x] 관련 확인 문구 i18n 반영 및 lint/typecheck/build 재검증 완료
- [x] 저장소 전반 lint warning 정리
  - [x] 미사용 import/state/function 제거 및 공개 API/컴포넌트 시그니처 정리
  - [x] `app/check-reservation/page.tsx`, `app/api/auth/check-lock/route.ts`, `components/SchoolSearch.tsx` 등 경고 발생 파일 정리
  - [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 재검증 완료
- [x] baseline-browser-mapping 빌드 안내 메시지 점검
  - [x] `package-lock.json`의 transitive `baseline-browser-mapping`을 `2.8.28`에서 `2.10.7`로 갱신
  - [x] `npm run build` 재검증 결과, 남은 메시지는 저장소 버전 고정 문제가 아니라 업스트림 데이터 갱신 주기 이슈임을 확인
- [x] 알림장 AI 변환 로직 점검
  - [x] `lib/notice-ai.ts` 기준으로 카테고리 분류가 후처리 규칙이 아니라 LLM 프롬프트 지시만으로 결정됨을 확인
  - [x] `💰 납부/제출`처럼 서로 성격이 다른 항목이 한 카테고리에 묶여 있어 일반적인 제출 안내도 돈주머니 이모지로 쏠릴 수 있음을 확인
- [x] 알림장 AI 카테고리 체계 개선
  - [x] `lib/notice-ai.ts`의 카테고리를 `공지, 안내, 제출, 학습 안내, 학교 생활, 납부, 기타 안내` 7개 고정 체계로 재정의
  - [x] `제출`과 `납부`를 프롬프트와 후처리 양쪽에서 분리해 `납부/제출` 혼합 섹션이 생기지 않도록 보정
  - [x] AI 출력 마크다운을 후처리로 재분류해 허용된 카테고리/아이콘만 남기도록 정규화
  - [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 검증 완료
- [x] 최신 변경 사항 깃허브 업로드 (`main` 브랜치)
## 예정된 작업
- [x] 교사와 학부모 매칭 누락 문제 해결 (가입 순서 무관 매칭 또는 로그인 시 매칭 갱신 등)
- [x] 구글 계정으로 가입/로그인 시 역할(교사/학부모) 선택 없이 가입되는 문제 해결 (가입 시 역할 선택 화면 추가)
- [x] 최신 변경 사항 깃허브 업로드 (`main` 브랜치)
- [x] AI 카테고리 체계 개선 및 린트 오류 수정 후 깃허브 업로드 (`main` 브랜치)
- [ ] Firebase Console 설정 (Authentication 활성화, Firestore 규칙)
- [ ] Vercel 배포
