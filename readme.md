# 🎓 생기부 분석 전문가

AI 기반 학생부종합전형 분석 시스템

## 🚀 개발 서버 실행

```bash
npm install
npm run dev
```

---

# 🏛️ 공공기관 채용 탐색기 (`/jobs.html`)

공공기관 채용공고를 검색하고, 내 프로필 기준으로 추천받고, 공고에 맞춘 **NCS 블라인드 양식 입사지원서·자기소개서**를 작성합니다.

| 기능 | 설명 |
|---|---|
| 채용 검색 | 잡알리오(공공데이터포털) 진행 중 공고를 키워드·NCS 직무·지역·고용형태·신입/경력으로 검색 |
| 맞춤 추천 | 직무 30 · 역량키워드 25 · 지역 15 · 고용형태 10 · 신입/경력 10 · 학력 10 (+우대 5)점으로 적합도 계산, 근거·주의사항 표시 |
| 이력서 작성 | **AI로 작성**(Claude, 선택) 또는 **템플릿으로 작성**(키 없이 동작). 학교명 자동 가림, `[보완 필요]` 표시, 복사·.md 저장·인쇄/PDF |

프로필은 브라우저(localStorage)에만 저장되며, “AI로 작성”을 누를 때만 서버로 전송됩니다.

## 설정

1. [공공데이터포털](https://www.data.go.kr)에서 **「기획재정부_공공기관 채용정보 조회서비스」** 활용신청 → 일반 인증키 발급
2. 환경변수 설정 (로컬은 `.env.example`을 `.env`로 복사, Vercel은 Project Settings → Environment Variables)
   - `DATA_GO_KR_API_KEY` — 없으면 `[샘플]` 데이터로 동작
   - `ANTHROPIC_API_KEY` — (선택) AI 이력서 작성. 없으면 템플릿으로 작성
3. `npm run dev` → http://localhost:3000/jobs.html

## 구조

```
api/jobs.js            GET  /api/jobs    — 공고 조회(10분 캐시)·필터
api/resume.js          POST /api/resume  — Claude 기반 입사지원서 생성
api/_lib/              공통 로직(alio.js, resume-ai.js, samples.js) — vite 개발서버도 같은 코드 사용
src/jobs.html          화면
src/js/jobs/           app.js(UI), recommend.js(적합도), resume.js(템플릿), markdown.js
tests/                 npm test
```
