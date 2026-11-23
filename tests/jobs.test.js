import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePosting, filterPostings, handleJobsRequest } from '../api/_lib/alio.js';
import { SAMPLE_POSTINGS } from '../api/_lib/samples.js';
import { scorePosting, recommend } from '../src/js/jobs/recommend.js';
import { buildTemplateResume, blindCheck } from '../src/js/jobs/resume.js';
import { renderMarkdown } from '../src/js/jobs/markdown.js';
import { handleResumeRequest } from '../api/_lib/resume-ai.js';

const raw = {
  recrutPblntSn: 123, instNm: '한국테스트공단', recrutPbancTtl: '신입 채용',
  ncsCdNmLst: '경영.회계.사무,정보통신', hireTypeNmLst: '정규직', workRgnNmLst: '서울,대전',
  recrutSeNm: '신입', acbgCondNmLst: '학력무관', recrutNope: '12',
  pbancBgngYmd: '20261101', pbancEndYmd: '20991231', aplyQlfcCn: '제한 없음', prefCn: '정보처리기사 우대',
  srcUrl: 'https://example.org/1', ongoingYn: 'Y', replmprYn: 'N',
};

test('normalizePosting maps upstream fields', () => {
  const p = normalizePosting(raw);
  assert.equal(p.id, '123');
  assert.deepEqual(p.ncs, ['경영.회계.사무', '정보통신']);
  assert.deepEqual(p.regions, ['서울', '대전']);
  assert.equal(p.endDate, '2099-12-31');
  assert.equal(p.headcount, 12);
  assert.equal(p.url, 'https://example.org/1');
});

test('filterPostings applies keyword / ncs / region / closed filters', () => {
  const p = normalizePosting(raw);
  const closed = { ...p, id: 'x', endDate: '2000-01-01' };
  assert.equal(filterPostings([p, closed]).length, 1);
  assert.equal(filterPostings([p], { ncs: '정보통신' }).length, 1);
  assert.equal(filterPostings([p], { ncs: '건설' }).length, 0);
  assert.equal(filterPostings([p], { region: '부산' }).length, 0);
  assert.equal(filterPostings([p], { keyword: '테스트 신입' }).length, 1);
  assert.equal(filterPostings([p], { keyword: '없는단어' }).length, 0);
});

test('without API key, handler serves sample data', async () => {
  delete process.env.DATA_GO_KR_API_KEY;
  const { body } = await handleJobsRequest({});
  assert.equal(body.source, 'sample');
  assert.equal(body.total, SAMPLE_POSTINGS.length);
});

const profile = {
  education: '대졸(4년)', major: '컴퓨터공학', careerYears: '0',
  ncs: ['정보통신'], regions: ['서울'], hireTypes: ['정규직'],
  certifications: '정보처리기사', skills: 'Python, 데이터 분석',
  experiences: '2025.01~2025.06 | 서울대학교 연구실 | 연구보조 | 데이터 수집 자동화',
};

test('scorePosting rewards matching profile and explains why', () => {
  const p = normalizePosting(raw);
  const r = scorePosting(p, profile);
  assert.ok(r.score >= 75, `score ${r.score}`);
  assert.ok(r.reasons.some((x) => x.includes('정보통신')));
  assert.ok(r.reasons.some((x) => x.includes('정보처리기사')));
});

test('education shortfall caps score', () => {
  const p = { ...normalizePosting(raw), education: ['석사', '박사'] };
  const r = scorePosting(p, { ...profile, education: '고졸' });
  assert.ok(r.score <= 40);
  assert.ok(r.warnings.some((w) => w.includes('학력')));
});

test('recommend ranks IT posting first for IT profile', () => {
  const top = recommend(SAMPLE_POSTINGS, profile, 3);
  assert.equal(top.length, 3);
  assert.ok(top[0].posting.ncs.includes('정보통신'));
});

test('template resume masks school names and flags gaps', () => {
  const md = buildTemplateResume(profile, normalizePosting(raw));
  assert.ok(md.startsWith('# 입사지원서 — 한국테스트공단'));
  assert.ok(!md.includes('서울대학교 연구실'), 'school name should be masked in body');
  assert.ok(md.includes('OO대학교'));
  assert.ok(md.includes('[보완 필요'));
  assert.ok(blindCheck(profile).some((x) => x.includes('학교명')));
});

test('markdown renderer escapes HTML and renders tables', () => {
  const html = renderMarkdown('# 제목\n\n| a | b |\n|---|---|\n| <script> | **x** |\n\n- 항목');
  assert.ok(html.includes('<h1>제목</h1>'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<strong>x</strong>'));
  assert.ok(html.includes('<ul><li>항목</li></ul>'));
});

test('AI resume handler reports missing key', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = await handleResumeRequest({ profile, posting: normalizePosting(raw) });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'NO_API_KEY');
});
