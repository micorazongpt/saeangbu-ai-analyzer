// API 키가 없거나 상류 장애일 때 보여주는 "샘플" 공고.
// 실제 공고가 아니며 화면에도 [샘플]로 표시된다. 마감일은 오늘 기준으로 계산해 항상 진행 중으로 보이게 한다.

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const base = (o) => ({
  headcount: null,
  replacement: false,
  ongoing: true,
  disqualification: '국가공무원법 제33조 결격사유 해당자, 공공기관 부정채용 관련 합격취소자 등',
  process: '서류전형 → 필기전형(NCS 직업기초능력 + 직무수행능력) → 면접전형 → 신원조회 및 신체검사 → 최종합격',
  url: 'https://job.alio.go.kr/recruit.do',
  ...o,
  title: `[샘플] ${o.title}`,
});

export const SAMPLE_POSTINGS = [
  base({
    id: 'sample-01', institution: '한국전력공사', title: '2026년 하반기 대졸수준 신입사원(사무·전기·ICT) 채용',
    ncs: ['경영.회계.사무', '전기.전자', '정보통신'], hireTypes: ['정규직'], regions: ['전남', '서울', '경기'],
    recruitType: '신입', education: ['학력무관'], headcount: 450, startDate: day(-5), endDate: day(9),
    qualification: '학력·전공·연령 제한 없음. 영어 공인성적(TOEIC 700점 이상 등) 보유자. 전기 분야는 전기 관련 기사 이상 자격 보유자.',
    preference: '취업지원대상자, 장애인, 비수도권 지역인재, 전기기사·정보처리기사 등 직무관련 자격증 보유자 가점',
  }),
  base({
    id: 'sample-02', institution: '국민건강보험공단', title: '6급 행정직 신규직원 공개채용',
    ncs: ['경영.회계.사무', '보건.의료', '사회복지.종교'], hireTypes: ['정규직'], regions: ['강원', '서울', '부산', '대구', '광주', '대전'],
    recruitType: '신입', education: ['학력무관'], headcount: 380, startDate: day(-3), endDate: day(6),
    qualification: '학력·연령 제한 없음. 공인어학성적 보유자. 지역 지원 시 해당 지역 거주 요건.',
    preference: '사회복지사, 컴퓨터활용능력, 한국사능력검정 등 자격증 가점. 취업지원대상자·장애인 가점',
  }),
  base({
    id: 'sample-03', institution: '한국토지주택공사(LH)', title: '5급(대졸수준) 신입직원 채용 – 사무·토목·건축',
    ncs: ['경영.회계.사무', '건설'], hireTypes: ['정규직'], regions: ['경남', '서울', '경기', '세종'],
    recruitType: '신입', education: ['학력무관'], headcount: 200, startDate: day(-1), endDate: day(14),
    qualification: '학력·전공 제한 없음. 토목/건축 분야는 해당 기사 자격증 보유자.',
    preference: '토목기사, 건축기사, 도시계획기사, 공인중개사, 감정평가사 보유자 우대',
  }),
  base({
    id: 'sample-04', institution: '한국인터넷진흥원', title: '정보보호·디지털플랫폼 분야 경력직 채용',
    ncs: ['정보통신'], hireTypes: ['정규직'], regions: ['전남', '서울'],
    recruitType: '경력', education: ['대졸(4년)', '석사', '박사'], headcount: 15, startDate: day(-7), endDate: day(4),
    qualification: '정보보호 또는 SW개발 분야 3년 이상 경력. 4년제 학사 이상.',
    preference: '정보보안기사, 정보처리기사, CISSP, CISA 보유자 및 클라우드·AI 보안 실무경험자 우대',
  }),
  base({
    id: 'sample-05', institution: '한국철도공사(코레일)', title: '신입사원 공개채용 – 사무영업·운전·차량·토목·전기통신',
    ncs: ['운전.운송', '영업판매', '기계', '전기.전자', '건설'], hireTypes: ['정규직'], regions: ['대전', '서울', '부산', '광주', '대구'],
    recruitType: '신입', education: ['학력무관'], headcount: 1200, startDate: day(-2), endDate: day(11),
    qualification: '학력·연령 제한 없음. 운전 분야는 철도차량운전면허 소지자. 기술 분야는 산업기사 이상 자격.',
    preference: '철도 관련 자격증, 한국사능력검정, 컴퓨터활용능력 보유자 가점',
  }),
  base({
    id: 'sample-06', institution: '한국보건산업진흥원', title: '연구직(보건의료 빅데이터 분석) 채용',
    ncs: ['연구', '보건.의료', '정보통신'], hireTypes: ['정규직'], regions: ['충북'],
    recruitType: '신입+경력', education: ['석사', '박사'], headcount: 3, startDate: day(-4), endDate: day(7),
    qualification: '보건·통계·데이터 관련 석사 이상 학위 소지자.',
    preference: 'Python/R 기반 데이터 분석 경험, 빅데이터분석기사, 사회조사분석사 보유자 우대',
  }),
  base({
    id: 'sample-07', institution: '한국사회보장정보원', title: '체험형 청년인턴(행정·전산) 모집',
    ncs: ['경영.회계.사무', '정보통신'], hireTypes: ['청년인턴'], regions: ['서울'],
    recruitType: '신입', education: ['학력무관'], headcount: 30, startDate: day(-6), endDate: day(3),
    qualification: '만 34세 이하 미취업 청년. 근무 기간 5개월.',
    preference: '사회복지 전공자, 컴퓨터활용능력·정보처리기능사 보유자 우대',
  }),
  base({
    id: 'sample-08', institution: '한국수자원공사', title: '대졸수준 신입사원(행정·토목·기계·전기·환경) 채용',
    ncs: ['경영.회계.사무', '건설', '기계', '전기.전자', '환경.에너지.안전'], hireTypes: ['정규직'], regions: ['대전', '세종', '충남', '경북', '전북'],
    recruitType: '신입', education: ['학력무관'], headcount: 180, startDate: day(0), endDate: day(15),
    qualification: '학력·연령·전공 제한 없음. 공인어학성적 보유자.',
    preference: '수질환경기사, 대기환경기사, 토목기사, 전기기사 보유자 가점. 이전지역 인재 우대',
  }),
  base({
    id: 'sample-09', institution: '한국관광공사', title: '관광마케팅·홍보 분야 무기계약직 채용',
    ncs: ['문화.예술.디자인.방송', '이용.숙박.여행.오락.스포츠', '영업판매'], hireTypes: ['무기계약직'], regions: ['강원', '서울'],
    recruitType: '경력', education: ['대졸(4년)'], headcount: 5, startDate: day(-8), endDate: day(2),
    qualification: '마케팅·홍보 분야 2년 이상 경력. 외국어 능통자.',
    preference: '관광통역안내사, SNS 콘텐츠 기획·운영 경험자, 영어·중국어·일본어 우수자 우대',
  }),
  base({
    id: 'sample-10', institution: '국민연금공단', title: '6급 일반직(사무·전산) 신규직원 채용',
    ncs: ['경영.회계.사무', '금융.보험', '정보통신'], hireTypes: ['정규직'], regions: ['전북', '서울', '경기', '부산'],
    recruitType: '신입', education: ['학력무관'], headcount: 250, startDate: day(-2), endDate: day(10),
    qualification: '학력·연령 제한 없음. 전산직은 정보처리기사 이상 자격 보유자.',
    preference: '투자자산운용사, 재무위험관리사, 정보처리기사, 사회조사분석사 보유자 가점',
  }),
  base({
    id: 'sample-11', institution: '한국산업안전보건공단', title: '안전·보건 전문직 신입 및 경력 채용',
    ncs: ['환경.에너지.안전', '보건.의료'], hireTypes: ['정규직'], regions: ['울산', '경기', '경남', '부산'],
    recruitType: '신입+경력', education: ['학력무관'], headcount: 90, startDate: day(-1), endDate: day(12),
    qualification: '산업안전기사·건설안전기사·산업위생관리기사 중 1개 이상 보유자.',
    preference: '산업안전지도사, 간호사 면허 소지자, 안전관리 실무 경력자 우대',
  }),
  base({
    id: 'sample-12', institution: '한국농어촌공사', title: '5급 신입사원(행정·농업토목·IT) 채용',
    ncs: ['경영.회계.사무', '건설', '농림어업', '정보통신'], hireTypes: ['정규직'], regions: ['전남', '전북', '충남', '경북'],
    recruitType: '신입', education: ['학력무관'], headcount: 160, startDate: day(-3), endDate: day(8),
    qualification: '학력·연령 제한 없음. 지역별 구분모집.',
    preference: '농업토목기사, 측량및지형공간정보기사, 정보처리기사 보유자 가점. 지역인재 우대',
  }),
  base({
    id: 'sample-13', institution: '서울교통공사', title: '신규 공개채용(사무·승무·차량·전기)',
    ncs: ['경영.회계.사무', '운전.운송', '기계', '전기.전자'], hireTypes: ['정규직'], regions: ['서울'],
    recruitType: '신입', education: ['학력무관'], headcount: 600, startDate: day(-4), endDate: day(5),
    qualification: '학력·연령 제한 없음. 승무 분야는 전기동차 운전면허 소지자.',
    preference: '전기산업기사, 철도신호기사, 정보처리기사 보유자 가점',
  }),
  base({
    id: 'sample-14', institution: '한국장학재단', title: '고졸 인재 채용(행정 6급)',
    ncs: ['경영.회계.사무', '교육.자연.사회과학'], hireTypes: ['정규직'], regions: ['대구'],
    recruitType: '신입', education: ['고졸'], headcount: 10, startDate: day(-2), endDate: day(9),
    qualification: '최종학력 고등학교 졸업(예정)자.',
    preference: '전산회계, 워드프로세서, 컴퓨터활용능력 보유자 우대. 대구·경북 지역인재 우대',
  }),
  base({
    id: 'sample-15', institution: '한국에너지공단', title: '에너지 효율·신재생 분야 계약직 연구원 채용',
    ncs: ['환경.에너지.안전', '연구'], hireTypes: ['계약직'], regions: ['울산'],
    recruitType: '경력', education: ['대졸(4년)', '석사'], headcount: 4, startDate: day(-9), endDate: day(1),
    qualification: '에너지 관련 분야 1년 이상 경력 또는 석사 학위.',
    preference: '에너지관리기사, 신재생에너지발전설비기사 보유자 우대',
  }),
  base({
    id: 'sample-16', institution: '한국지능정보사회진흥원', title: 'AI·데이터 정책 전문위원(경력) 채용',
    ncs: ['정보통신', '사업관리'], hireTypes: ['정규직'], regions: ['대구', '서울'],
    recruitType: '경력', education: ['대졸(4년)', '석사', '박사'], headcount: 6, startDate: day(-5), endDate: day(13),
    qualification: 'AI·데이터·디지털정부 분야 5년 이상 경력.',
    preference: 'PMP, 정보관리기술사, 정보처리기사, 데이터 분석·공공 정보화 사업관리 경험자 우대',
  }),
];
