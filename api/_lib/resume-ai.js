// Claude로 공고 맞춤형 입사지원서(NCS 블라인드 양식) + 자기소개서 초안 생성.
// ANTHROPIC_API_KEY 가 없으면 503을 돌려주고, 프런트엔드는 내장 템플릿 생성기로 대체한다.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.RESUME_MODEL || 'claude-opus-5-5';
const MAX_INPUT_CHARS = 40000;

const SYSTEM_PROMPT = `당신은 한국 공공기관 채용(NCS 기반 블라인드 채용)에 정통한 취업 컨설턴트입니다.
지원자 프로필과 채용 공고를 받아, 그 공고에 바로 제출할 수 있는 수준의 입사지원서 초안을 한국어 마크다운으로 작성합니다.

반드시 지킬 것:
- 블라인드 채용 원칙: 출신학교명, 출신지역, 가족관계, 사진, 생년월일, 성별 등 편견을 줄 수 있는 정보는 쓰지 않습니다. 프로필에 학교명이 있어도 "OO대학교"처럼 가리고, 문서 끝 "블라인드 점검" 항목에서 지원자에게 알립니다.
- 사실만 사용: 프로필에 없는 경력·수치·자격증·수상을 지어내지 않습니다. 내용이 부족한 곳은 [보완 필요: 무엇을 적으면 좋은지] 형태로 남깁니다.
- 공고의 NCS 직무분야, 지원자격, 우대사항, 전형절차에 쓰인 표현을 근거로 지원자의 경험을 연결합니다.

출력 구성(이 순서, ## 제목 사용):
## 1. 인적사항 (블라인드)
## 2. 교육사항 (직무 관련 교육·전공 과목)
## 3. 자격사항 (표: 자격증명 | 발급기관 | 취득일 — 모르는 칸은 [보완 필요])
## 4. 경험·경력 사항 (표: 구분 | 기관/조직 | 기간 | 역할 | 주요 내용)
## 5. 경력·경험 기술서 (핵심 경험 2~3개를 STAR 구조로, 공고 직무와의 연관성 명시)
## 6. 자기소개서 (① 지원동기 ② 직무역량 ③ 협업·갈등해결 ④ 입사 후 포부 — 각 500~700자)
## 7. 공고 적합도 요약 (강점 3개, 보완점 3개, 우대사항 충족 여부)
## 8. 블라인드 점검

첫 줄은 "# 입사지원서 — {기관명} / {공고명}" 형식으로 시작합니다. 서두나 맺음말 없이 문서만 출력합니다.`;

let client;

function pickPosting(p) {
  const keys = ['institution', 'title', 'ncs', 'hireTypes', 'regions', 'recruitType', 'education',
    'headcount', 'startDate', 'endDate', 'qualification', 'preference', 'process'];
  return Object.fromEntries(keys.filter((k) => p[k] != null).map((k) => [k, p[k]]));
}

export async function handleResumeRequest(body) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: 'NO_API_KEY', message: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. 기본 템플릿으로 작성합니다.' } };
  }
  const { profile, posting } = body || {};
  if (!profile || typeof profile !== 'object' || !posting || typeof posting !== 'object' || !posting.title) {
    return { status: 400, body: { error: 'BAD_REQUEST', message: 'profile과 posting이 필요합니다.' } };
  }
  const payload = JSON.stringify({ 지원자_프로필: profile, 채용공고: pickPosting(posting) }, null, 2);
  if (payload.length > MAX_INPUT_CHARS) {
    return { status: 413, body: { error: 'TOO_LARGE', message: '프로필 내용이 너무 깁니다. 경험 항목을 줄여주세요.' } };
  }

  client ??= new Anthropic();
  try {
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `아래 JSON의 지원자 프로필과 채용 공고로 입사지원서 초안을 작성해 주세요.\n\n${payload}`,
          },
        ],
      })
      .finalMessage();

    if (message.stop_reason === 'refusal') {
      return { status: 422, body: { error: 'REFUSED', message: 'AI가 이 요청을 처리하지 못했습니다. 기본 템플릿으로 작성합니다.' } };
    }
    const markdown = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!markdown) {
      return { status: 502, body: { error: 'EMPTY', message: 'AI 응답이 비어 있습니다.' } };
    }
    return { status: 200, body: { markdown, truncated: message.stop_reason === 'max_tokens' } };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { status: 502, body: { error: 'AUTH', message: 'ANTHROPIC_API_KEY가 올바르지 않습니다.' } };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { status: 429, body: { error: 'RATE_LIMIT', message: '요청이 많습니다. 잠시 후 다시 시도해주세요.' } };
    }
    if (err instanceof Anthropic.APIError) {
      return { status: 502, body: { error: 'API', message: `AI 서버 오류(${err.status ?? '연결'})` } };
    }
    throw err;
  }
}
