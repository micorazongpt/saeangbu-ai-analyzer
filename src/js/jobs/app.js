import { NCS_FIELDS, REGIONS, HIRE_TYPES } from './codes.js';
import { scorePosting, recommend } from './recommend.js';
import { buildTemplateResume } from './resume.js';
import { renderMarkdown, escapeHtml as esc } from './markdown.js';

const PROFILE_KEY = 'publicJobs.profile.v1';
const RESUME_KEY = 'publicJobs.resumes.v1';
const $ = (s) => document.querySelector(s);

const state = { postings: [], profile: loadProfile(), current: null, markdown: '' };

// ---------- 저장소 (실패해도 앱은 동작) ----------
function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 사생활 보호 모드 등 */
  }
}
function loadProfile() {
  return loadJSON(PROFILE_KEY, {});
}
const hasProfile = (p) => Boolean(p.ncs?.length || p.major || p.skills || p.certifications || p.experiences);

// ---------- 탭 ----------
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'recommend') renderRecommend();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-goto]');
  if (go) {
    e.preventDefault();
    showTab(go.dataset.goto);
  }
});

// ---------- 프로필 폼 ----------
function renderChips(el, options, selected = []) {
  el.innerHTML = options
    .map((o) => `<label class="chip"><input type="checkbox" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''}><span>${esc(o.replace(/\./g, '·'))}</span></label>`)
    .join('');
}
function fillProfileForm(p) {
  const form = $('#profileForm');
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') el.checked = Boolean(p[el.name]);
    else el.value = p[el.name] ?? (el.name === 'careerYears' ? 0 : '');
  }
  renderChips($('#ncsChips'), NCS_FIELDS, p.ncs);
  renderChips($('#regionChips'), REGIONS, p.regions);
  renderChips($('#hireChips'), HIRE_TYPES, p.hireTypes);
}
function readProfileForm() {
  const form = $('#profileForm');
  const p = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    p[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  }
  form.querySelectorAll('.chips').forEach((box) => {
    p[box.dataset.name] = [...box.querySelectorAll('input:checked')].map((i) => i.value);
  });
  return p;
}
$('#profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = readProfileForm();
  saveJSON(PROFILE_KEY, state.profile);
  renderResults();
  showTab('recommend');
});
$('#resetProfile').addEventListener('click', () => {
  if (!confirm('입력한 프로필을 모두 지울까요?')) return;
  state.profile = {};
  saveJSON(PROFILE_KEY, {});
  fillProfileForm({});
});

// ---------- 공고 불러오기 ----------
function fillSelect(sel, options) {
  sel.insertAdjacentHTML('beforeend', options.map((o) => `<option value="${esc(o)}">${esc(o.replace(/\./g, '·'))}</option>`).join(''));
}

async function loadPostings(params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  $('#results').innerHTML = '<div class="card empty"><i class="fas fa-spinner fa-spin"></i> 공고를 불러오는 중…</div>';
  try {
    const res = await fetch(`/api/jobs${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.postings = data.items || [];
    setSource(data);
  } catch (err) {
    // API 서버가 없는 정적 호스팅에서도 쓸 수 있게 브라우저 내장 샘플로 대체
    const { SAMPLE_POSTINGS } = await import('../../../api/_lib/samples.js');
    state.postings = SAMPLE_POSTINGS;
    setSource({ source: 'sample', notice: `채용 API에 연결하지 못해 샘플 데이터를 보여줍니다. (${err.message})` });
  }
  renderResults();
  if ($('#tab-recommend').classList.contains('active')) renderRecommend();
}

function setSource({ source, notice, fetchedAt }) {
  const badge = $('#sourceBadge');
  badge.className = `badge ${source === 'live' ? 'live' : 'sample'}`;
  badge.textContent = source === 'live' ? `실시간 · ${fetchedAt ? new Date(fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}` : '샘플 데이터';
  const box = $('#notice');
  box.hidden = !notice;
  box.textContent = notice || '';
}

$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const params = Object.fromEntries([...f.entries()].filter(([k]) => k !== 'sort'));
  loadPostings(params);
});
$('#sortSelect').addEventListener('change', renderResults);

// ---------- 목록 렌더 ----------
const dBadge = (left) => {
  if (left == null) return '';
  const cls = left <= 3 ? 'urgent' : left <= 7 ? 'soon' : '';
  return `<span class="dday ${cls}">${left === 0 ? 'D-DAY' : `D-${left}`}</span>`;
};
const scoreClass = (s) => (s >= 75 ? 'high' : s >= 50 ? 'mid' : 'low');

function cardHtml(p, r, withReasons = false) {
  const tags = [...p.ncs.slice(0, 3), ...p.hireTypes.slice(0, 1), p.recruitType].filter(Boolean);
  return `
    <article class="card job" data-id="${esc(p.id)}" tabindex="0">
      <div class="job-main">
        <div class="muted">${esc(p.institution)} ${dBadge(r.daysLeft)}</div>
        <h3>${esc(p.title)}</h3>
        <div class="tags">${tags.map((t) => `<span class="tag">${esc(t.replace(/\./g, '·'))}</span>`).join('')}
          <span class="tag loc"><i class="fas fa-location-dot"></i> ${esc(p.regions.slice(0, 3).join(', ') || '-')}</span>
          ${p.headcount ? `<span class="tag">${p.headcount}명</span>` : ''}</div>
        ${withReasons ? `<ul class="reasons">${r.reasons.map((x) => `<li class="ok">${esc(x)}</li>`).join('')}${r.warnings.map((x) => `<li class="warn">${esc(x)}</li>`).join('')}</ul>` : ''}
      </div>
      ${hasProfile(state.profile) ? `<div class="score ${scoreClass(r.score)}"><b>${r.score}</b><small>적합도</small></div>` : ''}
    </article>`;
}

function renderResults() {
  const scored = state.postings.map((p) => ({ p, r: scorePosting(p, state.profile) }));
  if ($('#sortSelect').value === 'score') scored.sort((a, b) => b.r.score - a.r.score);
  $('#resultCount').textContent = `진행 중인 공고 ${scored.length}건`;
  $('#results').innerHTML = scored.length
    ? scored.map(({ p, r }) => cardHtml(p, r)).join('')
    : '<div class="card empty">조건에 맞는 공고가 없습니다. 조건을 넓혀보세요.</div>';
}

function renderRecommend() {
  const ok = hasProfile(state.profile);
  $('#recommendEmpty').hidden = ok;
  if (!ok) {
    $('#recommendList').innerHTML = '';
    return;
  }
  const top = recommend(state.postings, state.profile, 10);
  $('#recommendList').innerHTML =
    `<p class="count">프로필 기준 추천 TOP ${top.length} <small class="muted">(직무 30 · 역량키워드 25 · 지역 15 · 고용형태 10 · 신입/경력 10 · 학력 10 · 우대 +5)</small></p>` +
    top.map((r) => cardHtml(r.posting, r, true)).join('');
}

// ---------- 상세 모달 ----------
function openDetail(id) {
  const p = state.postings.find((x) => x.id === id);
  if (!p) return;
  const r = scorePosting(p, state.profile);
  const row = (k, v) => (v ? `<tr><th>${k}</th><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>` : '');
  $('#detailBody').innerHTML = `
    <div class="muted">${esc(p.institution)} ${dBadge(r.daysLeft)}</div>
    <h2>${esc(p.title)}</h2>
    ${hasProfile(state.profile) ? `<div class="score-inline ${scoreClass(r.score)}">적합도 <b>${r.score}</b>점</div>
      <ul class="reasons">${r.reasons.map((x) => `<li class="ok">${esc(x)}</li>`).join('')}${r.warnings.map((x) => `<li class="warn">${esc(x)}</li>`).join('')}</ul>` : ''}
    <table class="kv">
      ${row('공고기간', `${p.startDate} ~ ${p.endDate}`)}
      ${row('직무분야', p.ncs.join(', '))}
      ${row('고용형태', p.hireTypes.join(', '))}
      ${row('채용구분', p.recruitType)}
      ${row('학력', p.education.join(', '))}
      ${row('근무지', p.regions.join(', '))}
      ${row('채용인원', p.headcount ? `${p.headcount}명` : '')}
      ${row('지원자격', p.qualification)}
      ${row('우대사항', p.preference)}
      ${row('결격사유', p.disqualification)}
      ${row('전형절차', p.process)}
    </table>
    <div class="actions">
      <a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> 원문 공고</a>
      <button class="btn primary" id="writeResume"><i class="fas fa-file-pen"></i> 이 공고로 이력서 작성</button>
    </div>`;
  $('#writeResume').addEventListener('click', () => {
    $('#detail').close();
    startResume(p);
  });
  $('#detail').showModal();
}
document.addEventListener('click', (e) => {
  const card = e.target.closest('.job');
  if (card) openDetail(card.dataset.id);
});
document.addEventListener('keydown', (e) => {
  const card = e.target.closest?.('.job');
  if (card && e.key === 'Enter') openDetail(card.dataset.id);
});

// ---------- 이력서 ----------
function startResume(p) {
  state.current = p;
  $('#resumeEmpty').hidden = true;
  $('#resumeArea').hidden = false;
  $('#resumeInst').textContent = p.institution;
  $('#resumeTitle').textContent = p.title;
  const saved = loadJSON(RESUME_KEY, {})[p.id];
  setResume(saved || '', saved ? '저장된 초안을 불러왔습니다.' : '');
  if (!saved) {
    $('#resumePreview').innerHTML = `<p class="muted">${hasProfile(state.profile) ? '“AI로 작성” 또는 “템플릿으로 작성”을 눌러주세요.' : '프로필을 먼저 입력하면 더 정확한 이력서가 만들어집니다.'}</p>`;
  }
  showTab('resume');
}

function setResume(md, status = '') {
  state.markdown = md;
  $('#resumeEditor').value = md;
  if (md) $('#resumePreview').innerHTML = renderMarkdown(md);
  $('#resumeStatus').textContent = status;
  if (md && state.current) {
    const all = loadJSON(RESUME_KEY, {});
    all[state.current.id] = md;
    saveJSON(RESUME_KEY, all);
  }
}

$('#genTemplate').addEventListener('click', () => {
  if (!state.current) return;
  setResume(buildTemplateResume(state.profile, state.current), '템플릿 초안 — [보완 필요] 부분을 채워주세요.');
});

$('#genAi').addEventListener('click', async () => {
  if (!state.current) return;
  const btn = $('#genAi');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 작성 중… (최대 1~2분)';
  try {
    const res = await fetch('/api/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: state.profile, posting: state.current }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.markdown) {
      setResume(data.markdown, data.truncated ? 'AI 초안(길이 제한으로 일부 잘림)' : 'AI 초안 — 사실관계를 꼭 확인하세요.');
    } else {
      setResume(buildTemplateResume(state.profile, state.current), `${data.message || 'AI 작성 실패'} → 템플릿으로 작성했습니다.`);
    }
  } catch {
    setResume(buildTemplateResume(state.profile, state.current), 'AI 서버에 연결하지 못해 템플릿으로 작성했습니다.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> AI로 작성';
  }
});

$('#toggleEdit').addEventListener('click', () => {
  const ed = $('#resumeEditor');
  const editing = ed.hidden;
  ed.hidden = !editing;
  $('#resumePreview').hidden = editing;
  $('#toggleEdit').innerHTML = editing ? '<i class="fas fa-eye"></i> 미리보기' : '<i class="fas fa-pen"></i> 직접 수정';
  if (!editing) setResume(ed.value, '수정 내용을 저장했습니다.');
});

$('#copyResume').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.markdown);
    $('#resumeStatus').textContent = '클립보드에 복사했습니다.';
  } catch {
    $('#resumeStatus').textContent = '복사에 실패했습니다. 직접 수정 화면에서 선택해 복사하세요.';
  }
});

$('#downloadResume').addEventListener('click', () => {
  if (!state.markdown) return;
  const blob = new Blob([state.markdown], { type: 'text/markdown;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `입사지원서_${(state.current?.institution || '공고').replace(/[\\/:*?"<>|\s]/g, '_')}.md`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#printResume').addEventListener('click', () => window.print());

// ---------- 시작 ----------
fillProfileForm(state.profile);
fillSelect($('#searchNcs'), NCS_FIELDS);
fillSelect($('#searchRegion'), REGIONS);
fillSelect($('#searchHire'), HIRE_TYPES);
loadPostings();
if (!hasProfile(state.profile)) showTab('profile');
