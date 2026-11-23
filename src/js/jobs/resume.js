// AI 없이도 쓸 수 있는 NCS 블라인드 양식 입사지원서 템플릿 생성기.
// 프로필에 없는 사실은 만들지 않고 [보완 필요] 표시로 남긴다.

import { splitTags } from './recommend.js';

const NEED = (what) => `[보완 필요: ${what}]`;

/** "기간 | 조직 | 역할 | 내용" 형식의 여러 줄을 파싱 */
export function parseLines(text, keys) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((s) => s.trim());
      return Object.fromEntries(keys.map((k, i) => [k, parts[i] || '']));
    });
}

const cell = (s) => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ') || '-';

// 블라인드 위반 가능성이 있는 표현
const BLIND_PATTERNS = [
  [/[가-힣]{2,}(대학교|대학|고등학교|고교)/g, '학교명'],
  [/(19|20)\d{2}년\s*\d{1,2}월\s*\d{1,2}일생|생년월일/g, '생년월일'],
  [/(아버지|어머니|부친|모친|가족관계)/g, '가족관계'],
  [/(남성|여성|남자|여자)\b/g, '성별'],
];

export function blindCheck(profile) {
  const text = Object.values(profile).filter((v) => typeof v === 'string').join('\n');
  const found = [];
  for (const [re, label] of BLIND_PATTERNS) {
    const m = text.match(re);
    if (m) found.push(`${label} 노출 가능: "${[...new Set(m)].slice(0, 3).join('", "')}"`);
  }
  return found;
}

const mask = (s) => String(s || '').replace(/[가-힣]{2,}(대학교|대학|고등학교|고교)/g, 'OO$1');

export function buildTemplateResume(profile, posting) {
  const exps = parseLines(profile.experiences, ['period', 'org', 'role', 'detail']);
  const trainings = parseLines(profile.trainings, ['name', 'org', 'period', 'detail']);
  const certs = splitTags(profile.certifications);
  const skills = splitTags(profile.skills);
  const field = posting.ncs.join(', ') || '해당 직무';
  const prefCerts = certs.filter((c) => posting.preference.includes(c) || posting.qualification.includes(c));
  const top = exps.slice(0, 3);

  const out = [];
  out.push(`# 입사지원서 — ${posting.institution} / ${posting.title.replace(/^\[샘플\]\s*/, '')}`);
  out.push('');
  out.push(`> 지원 분야: ${field} · 고용형태: ${posting.hireTypes.join(', ') || '-'} · 근무지: ${posting.regions.join(', ') || '-'} · 마감: ${posting.endDate || '-'}`);
  out.push('');

  out.push('## 1. 인적사항 (블라인드)');
  out.push(`- 성명: ${profile.name || NEED('성명')}`);
  out.push(`- 연락처: ${profile.phone || NEED('휴대전화')}`);
  out.push(`- 이메일: ${profile.email || NEED('이메일')}`);
  out.push('- 사진·생년월일·출신학교·출신지역·가족관계는 기재하지 않습니다.');
  out.push('');

  out.push('## 2. 교육사항');
  out.push(`- 최종학력 구분: ${profile.education || NEED('학력 구분')} / 전공(계열): ${profile.major || NEED('전공')}`);
  if (trainings.length) {
    out.push('', '| 교육명 | 교육기관 | 기간 | 주요 내용 |', '|---|---|---|---|');
    trainings.forEach((t) => out.push(`| ${cell(t.name)} | ${cell(mask(t.org))} | ${cell(t.period)} | ${cell(t.detail)} |`));
  } else {
    out.push(`- 직무 관련 교육: ${NEED(`${field} 관련 수강 과목·직업훈련·온라인 강의`)}`);
  }
  out.push('');

  out.push('## 3. 자격사항');
  out.push('| 자격증명 | 발급기관 | 취득일 | 공고 가점/요건 |', '|---|---|---|---|');
  if (certs.length) certs.forEach((c) => out.push(`| ${c} | ${NEED('발급기관')} | ${NEED('취득일')} | ${prefCerts.includes(c) ? '해당' : '-'} |`));
  else out.push(`| ${NEED('보유 자격증')} | | | |`);
  if (profile.languages) out.push('', `- 어학: ${profile.languages}`);
  out.push('');

  out.push('## 4. 경험·경력 사항');
  if (exps.length) {
    out.push('| 기간 | 기관/조직 | 역할 | 주요 내용 |', '|---|---|---|---|');
    exps.forEach((e) => out.push(`| ${cell(e.period)} | ${cell(mask(e.org))} | ${cell(e.role)} | ${cell(e.detail)} |`));
  } else out.push(NEED('직무 관련 경력(급여 받은 일)·경험(동아리, 프로젝트, 봉사 등)'));
  out.push('');

  out.push('## 5. 경력·경험 기술서');
  if (top.length) {
    top.forEach((e, i) => {
      out.push(`### ${i + 1}) ${e.role || '역할'} — ${mask(e.org) || '기관'} (${e.period || '기간'})`);
      out.push(`- **상황(S)**: ${mask(e.org) || '해당 조직'}에서 ${e.role || '담당 업무'}를 맡았습니다. ${NEED('당시 어떤 문제·목표가 있었는지')}`);
      out.push(`- **과제(T)**: ${NEED('내가 해결해야 했던 구체적 과제')}`);
      out.push(`- **행동(A)**: ${e.detail || NEED('직접 수행한 행동')}`);
      out.push(`- **결과(R)**: ${NEED('수치로 표현한 성과(예: 처리기간 20% 단축)')}`);
      out.push(`- **직무 연관성**: 이 경험은 ${posting.institution}의 ${field} 직무에서 요구하는 역량과 연결됩니다.`);
      out.push('');
    });
  } else out.push(NEED('핵심 경험 2~3개를 STAR(상황-과제-행동-결과) 구조로'), '');

  out.push('## 6. 자기소개서');
  out.push('### ① 지원동기');
  out.push(
    `${posting.institution}의 ${field} 분야에 지원하는 이유는 ${profile.motivation || NEED('기관의 사업·가치와 내 관심사가 맞닿는 지점')}입니다. ` +
      `${profile.major ? `${profile.major}을(를) 공부하며 쌓은 기반` : '그동안 쌓은 경험'}을 공공 서비스 현장에서 실천하고 싶습니다. ${NEED('기관의 최근 사업·보도자료 1가지를 언급')}`,
  );
  out.push('', '### ② 직무역량');
  out.push(
    `${skills.length ? `저의 강점은 ${skills.slice(0, 4).join(', ')}입니다. ` : ''}` +
      `${certs.length ? `${certs.join(', ')} 자격을 갖추었고, ` : ''}` +
      `${top[0] ? `${mask(top[0].org)}에서 ${top[0].role}로 일하며 ${top[0].detail || '실무를 경험'}했습니다. ` : ''}` +
      `이 역량으로 공고의 "${(posting.qualification || posting.preference).slice(0, 60)}…" 요건에 부합할 수 있습니다. ${NEED('NCS 직무기술서의 능력단위 1~2개와 연결')}`,
  );
  out.push('', '### ③ 협업·갈등해결');
  out.push(NEED('의견이 달랐던 상황 → 내가 한 조율 행동 → 결과와 배운 점 (500자 내외)'));
  out.push('', '### ④ 입사 후 포부');
  out.push(
    `입사 후 1년 차에는 ${field} 업무 절차를 빠르게 익혀 담당 업무를 안정적으로 수행하고, 3년 차에는 ${skills[0] || '전문성'}을 살려 업무 개선 과제를 제안하겠습니다. ${NEED('기관 비전·중장기 목표와 연결한 구체적 목표')}`,
  );
  out.push('');

  out.push('## 7. 공고 적합도 메모');
  out.push(`- 지원자격: ${posting.qualification || '-'}`);
  out.push(`- 우대사항: ${posting.preference || '-'}`);
  out.push(`- 우대 충족: ${prefCerts.length ? prefCerts.join(', ') : '해당 자격증 없음 — 취득 가능 여부 검토'}`);
  out.push(`- 전형절차: ${posting.process || '-'}`);
  out.push('');

  out.push('## 8. 블라인드 점검');
  const issues = blindCheck(profile);
  if (issues.length) issues.forEach((i) => out.push(`- ⚠️ ${i} → 제출 전 삭제/가림 처리`));
  else out.push('- 입력한 프로필에서 블라인드 위반 표현이 발견되지 않았습니다.');

  return out.join('\n');
}
