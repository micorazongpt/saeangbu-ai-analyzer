#!/usr/bin/env node
// 경기도교육청 구인구직(goe.go.kr/recruit) 채용공고 중 "한문" 공고가 새로 올라오면 텔레그램으로 알린다.
//
// - 공고명 검색(sj)과 과목명 검색(subject)을 모두 확인한다. (제목에 '한문'이 없어도 과목이 한문인 공고가 있음)
// - 이미 알린 공고 번호는 STATE_FILE 에 저장해 같은 공고를 두 번 알리지 않는다.
// - 첫 실행 때는 기존 공고를 모두 "본 것"으로 기록하고, 현재 접수 중인 공고만 요약해서 한 번 보낸다.
//
// 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (없으면 전송 대신 콘솔 출력)
//           KEYWORD(기본 '한문'), STATE_FILE(기본 data/goe-hanmun-seen.json), DRY_RUN=1

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'https://www.goe.go.kr';
const LIST_URL = `${BASE}/recruit/ad/func/pb/hnfpPbancList.do`;
const MI = '10500';
const KEYWORD = process.env.KEYWORD || '한문';
const STATE_FILE = process.env.STATE_FILE || 'data/goe-hanmun-seen.json';
const MAX_SEEN = 3000;

export const detailUrl = (sn) => `${BASE}/recruit/ad/func/pb/hnfpPbancInfoView.do?mi=${MI}&pbancSn=${encodeURIComponent(sn)}`;

const text = (html) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const field = (chunk, label) => {
  const m = chunk.match(new RegExp(`<em class="btm_tit">${label}</em>([\\s\\S]*?)</p>`));
  return m ? text(m[1]) : '';
};

/** 목록 HTML → 공고 배열 */
export function parseList(html) {
  return String(html)
    .split("javascript:goView('")
    .slice(1)
    .map((chunk) => {
      const sn = chunk.slice(0, chunk.indexOf("'"));
      const top = [...(chunk.match(/class="cont_top">([\s\S]*?)<\/div>/)?.[1] ?? '').matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
      const titleHtml = chunk.match(/class="cont_tit">([\s\S]*?)<\/p>/)?.[1] ?? '';
      const title = text(titleHtml.replace(/<span[^>]*krds-badge[^>]*>[\s\S]*?<\/span>/g, ''));
      const info = field(chunk, '모집정보');
      return {
        sn,
        school: top[0] || '',
        registered: (top.find((t) => t.startsWith('등록일')) || '').replace(/등록일\s*:\s*/, ''),
        title,
        region: info.includes('|') ? info.split('|').pop().trim() : '',
        terms: info.split('|')[0].trim(),
        headcount: field(chunk, '채용인원'),
        applyPeriod: field(chunk, '접수기간'),
        workPeriod: field(chunk, '채용기간'),
        duty: field(chunk, '직무분야'),
        url: detailUrl(sn),
      };
    })
    .filter((p) => /^\d+$/.test(p.sn) && p.title);
}

async function fetchList(searchType, retries = 2) {
  const body = new URLSearchParams({
    mi: MI,
    currPage: '1',
    pageIndex: '50',
    srchEcptDl: 'N', // 마감 포함 (방금 올라와 곧 마감되는 공고도 놓치지 않도록)
    searchType,
    searchValue: KEYWORD,
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(LIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (compatible; hanmun-job-alert/1.0)',
        },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseList(await res.text());
    } catch (err) {
      if (attempt >= retries) throw new Error(`경기도교육청 목록 조회 실패(${searchType}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

/** "2026/11/24 ~ 2026/12/01" → 접수 마감 전인지 */
export function isOpen(applyPeriod, today = new Date()) {
  const end = applyPeriod.split('~')[1]?.trim().replace(/\//g, '-');
  if (!end) return true;
  const kst = new Date(today.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return end >= kst;
}

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function formatPosting(p) {
  return [
    `📢 <b>새 ${esc(KEYWORD)} 채용 공고</b>`,
    `<b>${esc(p.school)}</b>${p.region ? ` (${esc(p.region)})` : ''}`,
    esc(p.title),
    p.terms && `• 조건: ${esc(p.terms)}`,
    p.headcount && `• 채용인원: ${esc(p.headcount)}`,
    p.applyPeriod && `• 접수기간: ${esc(p.applyPeriod)}`,
    p.workPeriod && `• 채용기간: ${esc(p.workPeriod)}`,
    `• 등록일: ${esc(p.registered)}`,
    `<a href="${esc(p.url)}">공고 상세 보기</a>`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatSummary(open) {
  const head = `✅ <b>경기도교육청 ${esc(KEYWORD)} 공고 알림을 시작합니다.</b>\n앞으로 새 공고가 올라오면 바로 알려드려요.`;
  if (!open.length) return `${head}\n\n현재 접수 중인 ${esc(KEYWORD)} 공고는 없습니다.`;
  const lines = open.map((p) => `• <a href="${esc(p.url)}">${esc(p.school)}</a> ${esc(p.title)} (~${esc(p.applyPeriod.split('~')[1]?.trim() || '')})`);
  return `${head}\n\n<b>현재 접수 중인 공고 ${open.length}건</b>\n${lines.join('\n')}`;
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (process.env.DRY_RUN === '1' || !token || !chatId) {
    console.log(`--- (전송 생략: ${!token || !chatId ? '텔레그램 설정 없음' : 'DRY_RUN'}) ---\n${message}\n`);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  // 토큰이 오류 메시지에 섞여 로그에 남지 않도록 description 만 출력
  if (!data.ok) throw new Error(`텔레그램 전송 실패: ${data.description || res.status}`);
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

export async function run() {
  if (process.argv.includes('--test-message')) {
    await sendTelegram(`🔔 테스트 메시지입니다. 경기도교육청 ${esc(KEYWORD)} 공고 알림이 이 채팅으로 옵니다.`);
    console.log('테스트 메시지를 보냈습니다.');
    return;
  }

  const [byTitle, bySubject] = await Promise.all([fetchList('sj'), fetchList('subject')]);
  const all = new Map();
  for (const p of [...byTitle, ...bySubject]) all.set(p.sn, p);
  const postings = [...all.values()].sort((a, b) => Number(a.sn) - Number(b.sn));
  console.log(`조회: 공고명 ${byTitle.length}건, 과목명 ${bySubject.length}건, 합계 ${postings.length}건`);

  const state = loadState();
  if (!state) {
    const open = postings.filter((p) => isOpen(p.applyPeriod));
    await sendTelegram(formatSummary(open));
    saveState({ keyword: KEYWORD, seen: postings.map((p) => p.sn).slice(-MAX_SEEN) });
    console.log(`첫 실행: ${postings.length}건을 기록하고 접수 중 ${open.length}건을 요약해 보냈습니다.`);
    return;
  }

  const seen = new Set(state.seen);
  const fresh = postings.filter((p) => !seen.has(p.sn));
  for (const p of fresh) {
    await sendTelegram(formatPosting(p));
    seen.add(p.sn);
    // 보낸 직후마다 저장해, 중간에 실패해도 이미 보낸 공고를 다시 보내지 않는다.
    saveState({ ...state, seen: [...seen].slice(-MAX_SEEN) });
  }
  console.log(fresh.length ? `새 공고 ${fresh.length}건 알림 완료` : '새 공고 없음');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
