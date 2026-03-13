// ===== 로컬 LLM (Ollama) 설정 =====
const OLLAMA_API_URL = "https://api.alluser.site";
const OLLAMA_API_KEY = process.env.NEXT_PUBLIC_OLLAMA_API_KEY || "";

export const AVAILABLE_MODELS = [
    { id: "gemma3:4b-it-q4_K_M", name: "Gemma 3 4B (추천)", description: "가장 빠른 응답 · 3.3GB · 간단한 알림장에 최적" },
    { id: "qwen3:8b", name: "Qwen 3 8B (균형)", description: "속도와 품질의 균형 · 8B 파라미터 · 한국어 우수" },
    { id: "glm4:9b-chat-q8_0", name: "GLM-4 9B Q8 (다국어 강점)", description: "다국어·한국어 강점 · 9B 최고 양자화 · Qwen 3 8B급 성능에 중·한 특화" },

    { id: "gemma3:12b-it-q8_0", name: "Gemma 3 12B Q8 (최고 품질)", description: "최고 품질 · 13GB · 12B 최고 양자화 · 긴 글도 안정적" },
    { id: "gemma3:12b-it-q4_K_M", name: "Gemma 3 12B Q4 (고품질)", description: "고품질 · 8GB · 12B 경량 양자화 · Q8 대비 빠름" },
    { id: "qwen3:4b", name: "Qwen 3 4B (경량)", description: "초경량 빠른 응답 · Gemma 4B와 유사 · 중국어권 강점" },
    { id: "llama3.1:8b", name: "Llama 3.1 8B (범용)", description: "Meta 범용 모델 · 영어 최적화 · 한국어는 Qwen/GLM 대비 약함" },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

type NoticeCategoryKey =
    | 'notice'
    | 'guide'
    | 'submission'
    | 'learning'
    | 'schoolLife'
    | 'payment'
    | 'other';

type NoticeCategory = {
    key: NoticeCategoryKey;
    title: string;
    icon: string;
    promptDescription: string;
    aliases: string[];
    keywords: string[];
    patterns: RegExp[];
};

const NOTICE_CATEGORIES: NoticeCategory[] = [
    {
        key: 'notice',
        title: '공지',
        icon: '📢',
        promptDescription: '중요 공지, 필수 확인 사항, 학급 운영 공지',
        aliases: ['공지', '공지사항', '알림', '필독', '중요 공지'],
        keywords: ['공지', '필독', '협조', '변경', '안내장', '가정통신문'],
        patterns: [/공지사항/, /필수 확인/, /확인 부탁/, /읽어 주세요/],
    },
    {
        key: 'guide',
        title: '안내',
        icon: '📅',
        promptDescription: '행사, 체험학습, 신청, 일정, 장소, 시간 안내',
        aliases: ['안내', '일정 안내', '행사 안내', '신청 안내'],
        keywords: ['일정', '행사', '체험학습', '현장학습', '현장체험학습', '견학', '공연', '대회', '설명회', '공개수업', '참석', '참여', '집합', '출발', '도착', '장소', '예정', '실시', '신청'],
        patterns: [/예정되어/, /신청해/, /참여해/, /집합/, /장소:/],
    },
    {
        key: 'submission',
        title: '제출',
        icon: '📝',
        promptDescription: '과제, 독서록, 서류, 동의서, 신청서 제출',
        aliases: ['제출', '제출 안내', '과제 제출', '서류 제출'],
        keywords: ['제출', '회신', '동의서', '신청서', '독서록', '서류', '사인', '서명', '확인서'],
        patterns: [/제출해/, /제출해 주세요/, /회신해/, /동의서를/, /신청서를/],
    },
    {
        key: 'learning',
        title: '학습 안내',
        icon: '📚',
        promptDescription: '수업, 숙제, 시험, 평가, 복습, 학습 준비',
        aliases: ['학습 안내', '학습', '수업 안내'],
        keywords: ['수업', '숙제', '복습', '예습', '평가', '시험', '단원평가', '받아쓰기', '학습', '교과서', '학습지', '문제집', '국어', '수학', '영어', '과학', '사회'],
        patterns: [/복습해/, /시험이/, /평가가/, /숙제를/, /학습지를/],
    },
    {
        key: 'schoolLife',
        title: '학교 생활',
        icon: '🏫',
        promptDescription: '준비물, 복장, 급식, 생활 지도, 안전, 규칙',
        aliases: ['학교 생활', '학교생활', '생활 안내', '복장/생활', '준비물', '급식/간식'],
        keywords: ['준비물', '챙겨', '가져오', '복장', '체육복', '실내화', '급식', '간식', '생활', '규칙', '안전', '위생', '마스크', '등교', '하교', '우산', '물통', '학용품', '청소'],
        patterns: [/챙겨 주세요/, /입고 와/, /가져와/, /급식/, /안전/],
    },
    {
        key: 'payment',
        title: '납부',
        icon: '💳',
        promptDescription: '참가비, 준비물비, 현장학습비, 계좌이체 등 실제 금전 납부',
        aliases: ['납부', '납부 안내', '수납', '납부/제출'],
        keywords: ['납부', '입금', '수납', '참가비', '비용', '계좌', '이체', '현금', '금액', '원비', '회비', '스쿨뱅킹', 'cms', '자동이체'],
        patterns: [/\d[\d,]*\s*원/, /납부해/, /입금해/, /계좌로/, /참가비/],
    },
    {
        key: 'other',
        title: '기타 안내',
        icon: '📌',
        promptDescription: '위 분류에 딱 맞지 않는 기타 전달 사항',
        aliases: ['기타 안내', '기타', '참고'],
        keywords: [],
        patterns: [],
    },
];

type ParsedNoticeItem = {
    text: string;
    sectionHint: NoticeCategoryKey | null;
};

const CATEGORY_ORDER = NOTICE_CATEGORIES.map(category => category.key);
const CATEGORY_MAP = Object.fromEntries(
    NOTICE_CATEGORIES.map(category => [category.key, category] as const)
) as Record<NoticeCategoryKey, NoticeCategory>;
const CATEGORY_LIST_TEXT = NOTICE_CATEGORIES
    .map(category => `${category.icon} ${category.title} — ${category.promptDescription}`)
    .join('\n');

function stripBulletPrefix(text: string): string {
    return text.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
}

function getCanonicalHeading(categoryKey: NoticeCategoryKey): string {
    const category = CATEGORY_MAP[categoryKey];
    return `## ${category.icon} ${category.title}`;
}

function normalizeHeadingText(heading: string): string {
    return heading
        .replace(/^##+\s*/, '')
        .replace(/[📢📅📝📚🏫💳📌]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectHeadingCategory(heading: string): NoticeCategoryKey | null {
    const normalized = normalizeHeadingText(heading);

    for (const category of NOTICE_CATEGORIES) {
        if (normalized === category.title || category.aliases.includes(normalized)) {
            return category.key;
        }
    }

    for (const category of NOTICE_CATEGORIES) {
        if (normalized.includes(category.title) || category.aliases.some(alias => normalized.includes(alias))) {
            return category.key;
        }
    }

    return null;
}

function parseNoticeItems(text: string): { header: string | null; items: ParsedNoticeItem[] } {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const items: ParsedNoticeItem[] = [];
    let header: string | null = null;
    let sectionHint: NoticeCategoryKey | null = null;
    let currentItemIndex = -1;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            currentItemIndex = -1;
            continue;
        }

        if (trimmed.startsWith('# ')) {
            if (!header) {
                header = trimmed;
            }
            currentItemIndex = -1;
            continue;
        }

        if (trimmed.startsWith('## ')) {
            sectionHint = detectHeadingCategory(trimmed);
            currentItemIndex = -1;
            continue;
        }

        if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
            items.push({ text: stripBulletPrefix(trimmed), sectionHint });
            currentItemIndex = items.length - 1;
            continue;
        }

        if (currentItemIndex >= 0) {
            items[currentItemIndex].text += `\n${trimmed}`;
            continue;
        }

        items.push({ text: trimmed, sectionHint });
        currentItemIndex = items.length - 1;
    }

    return { header, items };
}

function hasAnyMatch(text: string, category: NoticeCategory): boolean {
    const lowered = text.toLowerCase();
    return category.patterns.some(pattern => pattern.test(text)) || category.keywords.some(keyword => lowered.includes(keyword.toLowerCase()));
}

function classifyNoticeItem(text: string, sectionHint: NoticeCategoryKey | null): NoticeCategoryKey {
    const trimmed = text.trim();
    if (!trimmed) {
        return 'other';
    }

    if (hasAnyMatch(trimmed, CATEGORY_MAP.payment)) {
        return 'payment';
    }

    if (hasAnyMatch(trimmed, CATEGORY_MAP.submission)) {
        return 'submission';
    }

    let bestCategory: NoticeCategoryKey = sectionHint && sectionHint !== 'payment' && sectionHint !== 'submission'
        ? sectionHint
        : 'other';
    let bestScore = bestCategory === 'other' ? 0 : 1;

    for (const categoryKey of CATEGORY_ORDER) {
        if (categoryKey === 'submission' || categoryKey === 'payment' || categoryKey === 'other') {
            continue;
        }

        const category = CATEGORY_MAP[categoryKey];
        let score = sectionHint === categoryKey ? 1 : 0;

        for (const pattern of category.patterns) {
            if (pattern.test(trimmed)) {
                score += 2;
            }
        }

        for (const keyword of category.keywords) {
            if (trimmed.toLowerCase().includes(keyword.toLowerCase())) {
                score += 1;
            }
        }

        if (score > bestScore) {
            bestCategory = categoryKey;
            bestScore = score;
        }
    }

    if (bestScore === 0 && sectionHint) {
        return sectionHint;
    }

    return bestCategory;
}

function formatBullet(text: string): string {
    const [firstLine, ...restLines] = stripBulletPrefix(text).split('\n').map(line => line.trim()).filter(Boolean);
    if (!firstLine) {
        return '';
    }

    if (restLines.length === 0) {
        return `- ${firstLine}`;
    }

    return `- ${firstLine}\n${restLines.map(line => `  ${line}`).join('\n')}`;
}

function normalizeNoticeSummary(text: string, defaultHeader: string): string {
    const { header, items } = parseNoticeItems(text);
    const groupedItems: Record<NoticeCategoryKey, string[]> = {
        notice: [],
        guide: [],
        submission: [],
        learning: [],
        schoolLife: [],
        payment: [],
        other: [],
    };

    for (const item of items) {
        const categoryKey = classifyNoticeItem(item.text, item.sectionHint);
        const formatted = formatBullet(item.text);
        if (formatted) {
            groupedItems[categoryKey].push(formatted);
        }
    }

    if (Object.values(groupedItems).every(group => group.length === 0)) {
        return text.trim() || defaultHeader;
    }

    const sections: string[] = [header || defaultHeader];

    for (const categoryKey of CATEGORY_ORDER) {
        const entries = groupedItems[categoryKey];
        if (entries.length === 0) {
            continue;
        }

        sections.push('', getCanonicalHeading(categoryKey), ...entries);
    }

    return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ===== 핵심 API 호출 함수 =====

/**
 * Ollama API 1회 호출 (OpenAI 호환 엔드포인트)
 * 브라우저에서 직접 api.alluser.site로 호출
 */
async function callOllamaAPI(
    systemMessage: string,
    userPrompt: string,
    model?: string,
    options: { temperature?: number; stream?: boolean } = {}
): Promise<string> {
    const { temperature = 0.7, stream = false } = options;

    const res = await fetch(`${OLLAMA_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": OLLAMA_API_KEY,
        },
        body: JSON.stringify({
            model: model || DEFAULT_MODEL,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userPrompt },
            ],
            temperature,
            stream,
        }),
    });

    if (!res.ok) {
        let errorMessage = `서버 오류 (${res.status})`;
        try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            // 무시
        }
        throw new Error(errorMessage);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

// ===== 텍스트 후처리 유틸 =====

/**
 * AI 출력에서 메타 정보(글자수, 분석 내용 등) 제거
 */
function cleanMetaInfo(text: string): string {
    if (!text) return text;

    // 괄호 안의 메타 정보: (약 500자), (글자수: 330) 등
    let cleaned = text.replace(/\s*\([^)]*\d+자[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*글자[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*자세한[^)]*\)/g, '');
    cleaned = cleaned.replace(/\s*\([^)]*내용\s*포함[^)]*\)/g, '');

    // 끝부분: "--- 330자" 또는 "[330자]"
    cleaned = cleaned.replace(/\s*[-─]+\s*\d+자\s*$/g, '');
    cleaned = cleaned.replace(/\s*\[\d+자\]\s*$/g, '');
    cleaned = cleaned.replace(/\s*\d+자\s*$/g, '');

    // 분석/검증 관련 문구 제거
    cleaned = cleaned.replace(/\s*\[분석[^\]]*\]/g, '');
    cleaned = cleaned.replace(/\s*\[검증[^\]]*\]/g, '');

    return cleaned.trim();
}

/**
 * 텍스트가 완전한 한국어 문장으로 끝나는지 확인
 */
function endsWithCompleteSentence(text: string): boolean {
    if (!text || !text.trim()) return false;
    const trimmed = text.trim();
    return /[함음임됨봄옴줌춤움늠름다요까니][.!?]\s*$/.test(trimmed);
}

// ===== 고수준 API 함수 =====

/**
 * Sandwich 기법 적용 — 추가 지침을 시스템/사용자 프롬프트 앞뒤에 삽입
 */
async function generateWithInstructions({
    systemMessage,
    prompt,
    additionalInstructions,
    model,
    temperature,
}: {
    systemMessage: string;
    prompt: string;
    additionalInstructions?: string;
    model?: string;
    temperature?: number;
}): Promise<string> {
    // 추가 지침 → 시스템 메시지에 추가
    let finalSystemMessage = systemMessage;
    if (additionalInstructions) {
        finalSystemMessage += `\n\n사용자 추가 규칙 (최우선 준수):\n${additionalInstructions}`;
    }

    // 추가 지침 → 사용자 프롬프트 앞뒤에 감싸기 (Sandwich 기법)
    let finalPrompt = prompt;
    if (additionalInstructions && additionalInstructions.trim()) {
        const prefix = `[최우선 규칙] 다음 규칙을 반드시 지켜서 작성하라: ${additionalInstructions}\n\n`;
        const suffix = `\n\n[다시 한번 강조] 위 본문 작성 시 반드시 적용할 규칙: ${additionalInstructions}`;
        finalPrompt = prefix + prompt + suffix;
    }

    return callOllamaAPI(finalSystemMessage, finalPrompt, model, { temperature });
}

/**
 * 자동 재시도 포함 API 호출
 * 문장이 불완전하게 끝나면 최대 2회 재시도
 */
async function generateWithRetry(params: {
    systemMessage: string;
    prompt: string;
    additionalInstructions?: string;
    model?: string;
    temperature?: number;
}): Promise<string> {
    let content = await generateWithInstructions(params);

    if (!content.trim()) {
        throw new Error("AI 응답이 비어있습니다.");
    }

    const MAX_RETRIES = 2;
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        if (endsWithCompleteSentence(content)) break;

        console.log(`[재시도 ${retry + 1}/${MAX_RETRIES}] 문장 불완전: "...${content.slice(-30)}"`);

        const retryPrompt = `다음 텍스트는 문장이 중간에 끊겼습니다. 같은 내용을 완전한 문장으로 끝나도록 다시 작성하세요. 반드시 종결어미와 마침표로 끝내세요. 오직 본문만 출력하세요.\n\n불완전한 텍스트:\n${content}`;

        const retryContent = await callOllamaAPI(params.systemMessage, retryPrompt, params.model, {
            temperature: params.temperature,
        });

        if (retryContent.trim() && endsWithCompleteSentence(retryContent)) {
            content = retryContent;
            console.log(`[재시도 성공] 완전한 문장으로 수정됨`);
            break;
        } else if (retryContent.trim()) {
            content = retryContent;
        }
    }

    return content;
}

// ===== 알림장 요약 메인 함수 =====

/**
 * 교사의 알림장 메모를 AI로 정리하는 메인 함수
 * 
 * @param text - 교사가 작성한 메모 원문
 * @param dateObj - 알림장 날짜
 * @param model - 사용할 모델 (선택, 기본값: DEFAULT_MODEL)
 * @returns 정리된 알림장 텍스트
 */
export async function summarizeNote(
    text: string,
    dateObj: Date,
    model?: string
): Promise<string> {
    if (!text) return "";

    if (!OLLAMA_API_KEY) {
        throw new Error(
            "Ollama API 키가 설정되지 않았습니다. .env.local 파일에서 NEXT_PUBLIC_OLLAMA_API_KEY를 설정해주세요."
        );
    }

    // 날짜 포맷팅
    const d = new Date(dateObj);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;

    const defaultHeader = `# ${formattedDate} 알림장 📋`;

    const systemMessage = `당신은 초등학교 담임선생님의 알림장 작성을 돕는 전문 비서입니다.
교사의 메모를 학부모와 학생 모두가 읽기 편한 알림장으로 정리합니다.

<문체 규칙>
- 친절하고 편안한 존댓말을 사용합니다 (~해요, ~합니다, ~드려요, ~주세요)
- 딱딱한 공문체를 사용하지 않습니다
- 학부모와 학생 모두에게 말하듯 따뜻하게 작성합니다
</문체 규칙>

<서식 규칙>
- 마크다운 서식을 적극 활용합니다
- 중요한 날짜, 시간, 장소, 준비물은 반드시 **굵게** 표시합니다
- 각 카테고리 아래에 불릿(-)을 사용하여 항목을 나열합니다
- 오직 정리된 알림장 본문만 출력합니다 (메타 정보, 글자수, 분석 내용은 출력하지 않습니다)
</서식 규칙>

<카테고리 고정 규칙>
- 카테고리는 반드시 아래 7개만 사용합니다: 공지, 안내, 제출, 학습 안내, 학교 생활, 납부, 기타 안내
- 섹션 제목은 반드시 "## 아이콘 카테고리명" 형식으로 작성합니다
- "납부/제출", "준비물", "복장/생활", "급식/간식"처럼 별도 카테고리를 새로 만들지 않습니다
- "제출"은 과제, 독서록, 서류, 동의서, 신청서, 회신처럼 무언가를 내는 경우입니다
- "납부"는 실제 금액, 참가비, 계좌이체, 현금, 비용처럼 돈을 내는 경우에만 사용합니다
- 제출과 납부는 절대로 같은 카테고리로 묶지 않습니다
- 준비물, 복장, 급식, 생활 지도, 안전, 규칙은 "학교 생활"에 넣습니다
- 일정, 행사, 체험학습, 신청, 장소, 시간 안내는 "안내"에 넣습니다
- 수업, 숙제, 평가, 시험, 복습은 "학습 안내"에 넣습니다
</카테고리 고정 규칙>`;

    const prompt = `교사가 작성한 메모를 아래 형식에 맞춰 알림장으로 정리해주세요.

<출력 형식>
${defaultHeader}

## 아이콘 카테고리명
- 불릿으로 항목 나열
- **중요 정보**는 굵게 표시
</출력 형식>

<사용 가능한 카테고리>
${CATEGORY_LIST_TEXT}
</사용 가능한 카테고리>

<카테고리 분류 기준>
- 공지: 꼭 확인해야 할 학급 공지나 전달 사항
- 안내: 행사, 신청, 일정, 장소, 시간, 운영 안내
- 제출: 과제, 독서록, 서류, 동의서, 신청서, 회신 제출
- 학습 안내: 수업, 숙제, 평가, 시험, 복습, 학습 준비
- 학교 생활: 준비물, 복장, 급식, 생활 지도, 안전, 규칙
- 납부: 실제 돈을 내는 경우만 사용
- 기타 안내: 위 분류에 딱 맞지 않는 내용
</카테고리 분류 기준>

<중요 제약>
- "제출" 관련 내용은 반드시 "## 📝 제출" 아래에 정리합니다
- 금전 표현이 없으면 "## 💳 납부"를 사용하지 않습니다
- "납부/제출"처럼 두 카테고리를 합친 제목은 금지합니다
- 원문 항목이 여러 주제를 섞고 있으면 의미 단위로 나눠 각각 가장 맞는 카테고리에 배치합니다
</중요 제약>

<좋은 예시>
# 2026년 3월 5일(수) 알림장 📋

## 📢 공지
- 오늘 배부한 **가정통신문**을 꼭 확인해 주세요.

## 📅 안내
- **3월 10일(월)** 봄 현장체험학습이 예정되어 있어요.
- 장소는 **서울숲**이며, 오전 **9시까지** 교실로 와주세요.

## 📝 제출
- 독서록은 **금요일까지** 제출해 주세요.
- 체험학습 **동의서**도 함께 보내 주세요.

## 📚 학습 안내
- 내일 **수학 단원평가**가 있어요. 3단원까지 꼭 복습해 주세요.

## 🏫 학교 생활
- **미술 도구**와 물통을 꼭 챙겨 주세요.
- 체육복은 **화요일, 목요일**에 입고 와주세요.

## 💳 납부
- 현장체험학습 **참가비 5,000원**은 **수요일까지** 납부해 주세요.
</좋은 예시>

<작성 시 주의>
- 첫 줄은 반드시 "${defaultHeader}"로 시작합니다
- "학부모님께", "안녕하세요" 같은 인사말은 넣지 않습니다
- 내용이 1~2개뿐이라면 필요한 카테고리만 사용해도 됩니다
- 원본 메모에 없는 내용을 임의로 추가하지 않습니다
</작성 시 주의>

**교사 메모 원문:**
${text}`;

    try {
        const rawResult = await generateWithRetry({
            systemMessage,
            prompt,
            model: model || DEFAULT_MODEL,
            temperature: 0.35,
        });

        // 후처리: 메타 정보 제거 + 고정 카테고리 재정렬
        const processed = normalizeNoticeSummary(cleanMetaInfo(rawResult), defaultHeader);

        return processed;
    } catch (error) {
        console.error("Local LLM API Error:", error);
        throw error;
    }
}
