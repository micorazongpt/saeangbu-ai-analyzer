// 공공데이터포털 "기획재정부_공공기관 채용정보 조회서비스"(잡알리오) 연동.
// 서비스키는 서버 환경변수 DATA_GO_KR_API_KEY 로만 읽고, 브라우저에는 절대 내려보내지 않는다.

import { SAMPLE_POSTINGS } from './samples.js';

const API_URL = process.env.ALIO_API_URL || 'https://apis.data.go.kr/1051000/recruitment/list';
const PAGE_SIZE = 100;
const MAX_PAGES = Number(process.env.ALIO_MAX_PAGES || 5);
const CACHE_MS = 10 * 60 * 1000;

let cache = { at: 0, items: null };

const splitList = (v) =>
  String(v ?? '')
    .split(/[,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toDate = (v) => {
  const s = String(v ?? '').replace(/\D/g, '');
  return s.length >= 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '';
};

const clean = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim();

/** 상류 응답 한 건을 앱 내부 형식으로 정규화 */
export function normalizePosting(r) {
  const id = String(r.recrutPblntSn ?? r.sn ?? r.id ?? '');
  return {
    id,
    institution: clean(r.instNm),
    title: clean(r.recrutPbancTtl ?? r.title),
    ncs: splitList(r.ncsCdNmLst),
    hireTypes: splitList(r.hireTypeNmLst),
    regions: splitList(r.workRgnNmLst),
    recruitType: clean(r.recrutSeNm),
    education: splitList(r.acbgCondNmLst),
    headcount: Number(r.recrutNope) || null,
    startDate: toDate(r.pbancBgngYmd),
    endDate: toDate(r.pbancEndYmd),
    url: clean(r.srcUrl) || (id ? `https://job.alio.go.kr/recruitview.do?idx=${encodeURIComponent(id)}` : 'https://job.alio.go.kr'),
    qualification: clean(r.aplyQlfcCn),
    preference: clean(r.prefCn ?? r.prefCondCn),
    disqualification: clean(r.disqlfcRsn),
    process: clean(r.scrnprcdrMthdExpln),
    replacement: r.replmprYn === 'Y',
    ongoing: r.ongoingYn ? r.ongoingYn === 'Y' : true,
  };
}

function extractItems(json) {
  if (Array.isArray(json?.result)) return json.result;
  const item = json?.response?.body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item) return [item];
  return [];
}

async function fetchPage(apiKey, pageNo) {
  // 포털에서 받은 키가 이미 URL 인코딩된 형태(%포함)면 그대로 쓴다.
  const key = apiKey.includes('%') ? apiKey : encodeURIComponent(apiKey);
  const url = `${API_URL}?serviceKey=${key}&resultType=json&ongoingYn=Y&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 키 오류 등은 XML(OpenAPI_ServiceResponse)로 오는 경우가 많다.
    const msg = text.match(/<returnAuthMsg>([^<]+)/)?.[1] || text.slice(0, 200);
    throw new Error(`공공데이터 API 응답 오류: ${msg}`);
  }
  const code = String(json.resultCode ?? json?.response?.header?.resultCode ?? '200');
  if (!['200', '00', '0'].includes(code)) {
    throw new Error(`공공데이터 API 오류(${code}): ${json.resultMsg ?? json?.response?.header?.resultMsg ?? ''}`);
  }
  const total = Number(json.totalCount ?? json?.response?.body?.totalCount ?? 0);
  return { items: extractItems(json), total };
}

/** 진행 중인 공고 전체(최대 MAX_PAGES*100건)를 가져온다. 10분 메모리 캐시. */
export async function loadPostings() {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    return {
      source: 'sample',
      notice: 'DATA_GO_KR_API_KEY가 설정되지 않아 샘플 데이터를 보여줍니다. 실제 공고를 보려면 공공데이터포털에서 키를 발급받아 환경변수에 넣어주세요.',
      items: SAMPLE_POSTINGS,
    };
  }
  if (cache.items && Date.now() - cache.at < CACHE_MS) {
    return { source: 'live', items: cache.items, fetchedAt: new Date(cache.at).toISOString() };
  }
  const first = await fetchPage(apiKey, 1);
  const pages = Math.min(MAX_PAGES, Math.ceil(first.total / PAGE_SIZE) || 1);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => fetchPage(apiKey, i + 2).catch(() => ({ items: [] }))),
  );
  const raw = [first, ...rest].flatMap((p) => p.items);
  const seen = new Set();
  const items = raw
    .map(normalizePosting)
    .filter((p) => p.title && !seen.has(p.id) && seen.add(p.id));
  cache = { at: Date.now(), items };
  return { source: 'live', items, fetchedAt: new Date(cache.at).toISOString() };
}

const any = (list, wanted) => !wanted.length || list.some((v) => wanted.some((w) => v.includes(w)));

/** 검색 조건으로 걸러낸다. (q: keyword, ncs, region, hireType, recruitType — 쉼표 구분 다중값) */
export function filterPostings(items, q = {}) {
  const multi = (k) => splitList(q[k]);
  const ncs = multi('ncs');
  const region = multi('region');
  const hireType = multi('hireType');
  const recruitType = multi('recruitType');
  const words = String(q.keyword ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);

  return items.filter((p) => {
    if (q.includeClosed !== 'true' && p.endDate && p.endDate < today) return false;
    if (!any(p.ncs, ncs)) return false;
    if (!any(p.regions, region)) return false;
    if (!any(p.hireTypes, hireType)) return false;
    if (recruitType.length && !recruitType.some((t) => p.recruitType.includes(t))) return false;
    if (words.length) {
      const hay = `${p.institution} ${p.title} ${p.ncs.join(' ')} ${p.qualification} ${p.preference}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** 프레임워크 독립 핸들러: { status, body } 반환 */
export async function handleJobsRequest(query) {
  try {
    const { items, ...meta } = await loadPostings();
    const filtered = filterPostings(items, query);
    filtered.sort((a, b) => (a.endDate || '9999').localeCompare(b.endDate || '9999'));
    return { status: 200, body: { ...meta, total: filtered.length, items: filtered } };
  } catch (err) {
    // 실서버 장애 시에도 화면이 비지 않도록 샘플로 대체하되 원인을 알린다.
    const filtered = filterPostings(SAMPLE_POSTINGS, query);
    return {
      status: 200,
      body: {
        source: 'sample',
        notice: `실시간 공고를 불러오지 못해 샘플 데이터를 보여줍니다. (${err.message})`,
        total: filtered.length,
        items: filtered,
      },
    };
  }
}
