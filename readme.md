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

---

# 🔔 경기도교육청 한문 공고 텔레그램 알림

[경기도교육청 구인구직](https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do?mi=10500) 채용공고를 **10분마다** 확인해서,
공고명 또는 과목명에 **한문**이 들어간 새 공고가 올라오면 텔레그램으로 보냅니다. (GitHub Actions에서 무료로 실행)

## 설정 (한 번만)

1. **텔레그램 봇 만들기**: 텔레그램에서 `@BotFather` 검색 → `/newbot` → 이름 입력 → 받은 **토큰** 복사
2. **내 채팅 ID 확인**: 만든 봇에게 아무 메시지나 보낸 뒤, 브라우저에서
   `https://api.telegram.org/bot<토큰>/getUpdates` 를 열어 `"chat":{"id": 숫자` 의 **숫자** 복사
3. **GitHub에 등록**: 저장소 → Settings → Secrets and variables → Actions → New repository secret
   - `TELEGRAM_BOT_TOKEN` = 1번의 토큰
   - `TELEGRAM_CHAT_ID` = 2번의 숫자
4. 이 브랜치를 **main에 병합** (예약 실행은 기본 브랜치에서만 동작)
5. 확인: Actions → "경기도교육청 한문 공고 알림" → Run workflow
   - `텔레그램 테스트 메시지만 보내기` 체크 → 테스트 메시지 수신 확인
   - 체크 없이 실행 → 첫 실행 시 "알림 시작 + 현재 접수 중인 한문 공고" 요약이 옴

이미 알린 공고 번호는 `data/goe-hanmun-seen.json`에 저장되어 같은 공고는 두 번 오지 않습니다.
다른 과목도 받고 싶으면 workflow의 실행 단계에 `KEYWORD: 일본어` 같은 환경변수를 추가하세요.

로컬 시험: `DRY_RUN=1 STATE_FILE=/tmp/seen.json node scripts/goe-hanmun-alert.mjs` (전송 없이 메시지만 출력)
