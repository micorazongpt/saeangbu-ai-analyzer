import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseList, isOpen, formatPosting, formatSummary, detailUrl } from '../scripts/goe-hanmun-alert.mjs';

const html = fs.readFileSync(new URL('./fixtures/goe-list.html', import.meta.url), 'utf8');

test('parseList extracts postings from the GOE list markup', () => {
  const items = parseList(html);
  assert.equal(items.length, 3);
  const [first] = items;
  assert.equal(first.sn, '64494');
  assert.equal(first.school, '서원고등학교');
  assert.equal(first.title, '서원고등학교 기간제교원 채용공고(2차)');
  assert.equal(first.region, '용인시');
  assert.equal(first.headcount, '1');
  assert.equal(first.applyPeriod, '2026/11/02 ~ 2026/11/30');
  assert.equal(first.registered, '2026/11/02');
  assert.equal(first.url, detailUrl('64494'));
  assert.ok(!first.title.includes('마감'), 'status badge must be stripped from title');
});

test('parseList returns nothing for unrelated HTML', () => {
  assert.deepEqual(parseList('<html><body>점검 중</body></html>'), []);
});

test('isOpen compares the application end date in KST', () => {
  const now = new Date('2026-11-30T14:00:00Z'); // KST 2026-11-30 23:00
  assert.equal(isOpen('2026/11/24 ~ 2026/11/30', now), true);
  assert.equal(isOpen('2026/11/24 ~ 2026/11/29', now), false);
  assert.equal(isOpen('', now), true);
});

test('messages escape HTML and include the detail link', () => {
  const p = { ...parseList(html)[0], title: '<한문> & 도덕' };
  const msg = formatPosting(p);
  assert.ok(msg.includes('&lt;한문&gt; &amp; 도덕'));
  assert.ok(msg.includes('pbancSn=64494'));
  assert.ok(formatSummary([]).includes('없습니다'));
  assert.ok(formatSummary([p]).includes('1건'));
});
