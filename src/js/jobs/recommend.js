// 프로필과 공고의 적합도(0~100점)와 그 근거를 계산한다. 브라우저에서만 실행되어 프로필이 서버로 가지 않는다.

import { EDUCATION_LEVELS } from './codes.js';

const WEIGHTS = { ncs: 30, keyword: 25, region: 15, hireType: 10, recruitType: 10, education: 10 };

const dot = (s) => s.replace(/\./g, '·');

const rankOf = (name) => EDUCATION_LEVELS.find((e) => name.includes(e.name))?.rank;

export const splitTags = (s) =>
  String(s ?? '')
    .split(/[,\n·]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T23:59:59`);
  return Math.ceil((end - new Date()) / 86400000);
}

/** 학력 요건 충족 여부: true / false / null(판단 불가) */
function educationEligible(posting, profile) {
  const ranks = posting.education.map(rankOf).filter((r) => r != null);
  if (!ranks.length || ranks.includes(0)) return true;
  const mine = rankOf(profile.education || '');
  if (mine == null) return null;
  return mine >= Math.min(...ranks);
}

export function scorePosting(posting, profile) {
  const reasons = [];
  const warnings = [];
  let score = 0;

  // 1) NCS 직무분야
  const wantNcs = profile.ncs || [];
  const ncsHit = posting.ncs.filter((n) => wantNcs.includes(n));
  if (!wantNcs.length) score += WEIGHTS.ncs * 0.5;
  else if (ncsHit.length) {
    // 공고의 직무분야 중 내 희망분야 비중이 클수록 가산 (여러 분야 통합채용보다 전문 공고 우대)
    score += WEIGHTS.ncs * (0.75 + 0.25 * (ncsHit.length / posting.ncs.length));
    reasons.push(`희망 직무분야 일치: ${ncsHit.map(dot).join(', ')}`);
  }

  // 2) 키워드(전공·보유기술·자격증)가 공고 본문에 등장하는지
  const hay = `${posting.title} ${posting.ncs.join(' ')} ${posting.qualification} ${posting.preference}`;
  const tags = [...new Set([...splitTags(profile.major), ...splitTags(profile.skills), ...splitTags(profile.certifications)])];
  const tagHit = tags.filter((t) => hay.includes(t));
  if (tags.length) {
    score += Math.min(1, tagHit.length / 3) * WEIGHTS.keyword;
    if (tagHit.length) reasons.push(`공고에 언급된 내 역량: ${tagHit.slice(0, 5).join(', ')}`);
  } else score += WEIGHTS.keyword * 0.3;

  const certHit = splitTags(profile.certifications).filter((c) => posting.preference.includes(c) || posting.qualification.includes(c));
  if (certHit.length) reasons.push(`자격증 가점/요건 해당: ${certHit.join(', ')}`);

  // 3) 근무지역
  const wantRegion = profile.regions || [];
  const regionHit = posting.regions.filter((r) => wantRegion.includes(r));
  if (!wantRegion.length) score += WEIGHTS.region * 0.7;
  else if (regionHit.length) {
    score += WEIGHTS.region;
    if (regionHit.length) reasons.push(`희망 근무지: ${regionHit.join(', ')}`);
  }

  // 4) 고용형태
  const wantHire = profile.hireTypes || [];
  if (!wantHire.length) score += WEIGHTS.hireType * 0.7;
  else if (posting.hireTypes.some((h) => wantHire.some((w) => h.includes(w)))) {
    score += WEIGHTS.hireType;
  } else warnings.push(`고용형태(${posting.hireTypes.join(', ')})가 희망과 다름`);

  // 5) 신입/경력
  const years = Number(profile.careerYears) || 0;
  const rt = posting.recruitType || '';
  const isNewOk = rt.includes('신입');
  const isCareerOk = rt.includes('경력');
  if (!rt || (isNewOk && years < 3) || (isCareerOk && years > 0)) score += WEIGHTS.recruitType;
  else if (isCareerOk && years === 0) warnings.push('경력직 공고 — 관련 경력 요건 확인 필요');
  else score += WEIGHTS.recruitType * 0.5;

  // 6) 학력
  const edu = educationEligible(posting, profile);
  if (edu === true) {
    score += WEIGHTS.education;
    if (posting.education.includes('학력무관')) reasons.push('학력 제한 없음');
  } else if (edu === false) {
    warnings.push(`학력 요건(${posting.education.join(', ')}) 미충족 가능`);
  } else score += WEIGHTS.education * 0.5;

  // 우대 대상 가점
  const pref = posting.preference + posting.qualification;
  const bonuses = [
    [profile.veteran, '취업지원대상자', '보훈'],
    [profile.disabled, '장애인', '장애'],
    [profile.localTalent, '지역인재', '지역인재'],
  ].filter(([on, , kw]) => on && pref.includes(kw));
  if (bonuses.length) {
    score += 5;
    reasons.push(`우대 대상: ${bonuses.map((b) => b[1]).join(', ')}`);
  }

  const left = daysLeft(posting.endDate);
  if (left != null && left <= 3 && left >= 0) warnings.push(`마감 임박 (D-${left})`);

  // 학력 미달이면 추천 상위에 오르지 않도록 상한
  if (edu === false) score = Math.min(score, 40);

  return { score: Math.round(Math.min(100, score)), reasons, warnings, daysLeft: left };
}

export function recommend(postings, profile, limit = 10) {
  return postings
    .map((p) => ({ posting: p, ...scorePosting(p, profile) }))
    .filter((r) => r.daysLeft == null || r.daysLeft >= 0)
    .sort((a, b) => b.score - a.score || (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    .slice(0, limit);
}
