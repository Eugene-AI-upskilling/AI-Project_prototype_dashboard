/* ══════════════════════════════════════════════════════════════════════
   events-data.js — 행사(Events) 공용 데이터. conferences.html과 home.html이 같이 쓴다.
   source: 'roster'  = 2026 리서치센터 행사내역(사내 엑셀) — 날짜·애널리스트·행사명 원본 그대로
           'notice'  = 행사 안내문 기준 상세
           'pattern' = 반복 일정에서 나온 예정(일정 미확정)
           없음      = 시연용 예시 일정
   ※ 종목 이벤트(공시·기업 액션, events.html)와는 다른 데이터다.
   ══════════════════════════════════════════════════════════════════════ */
const TODAY=new Date(Date.now()+9*36e5).toISOString().slice(0,10);   // KST 기준일

const CATS=[
  {id:'corp',    label:'Corporate Day', ko:'콥데이',      cover:'#0b2e6b', ed:'QUARTERLY · IR',     mk:'Q.',  foot:'CORPORATE ACCESS',
   desc:'분기마다 열리는 기업 IR. 날짜별 A/B 세션으로 상장사 경영진을 소규모로 만나요.'},
  {id:'ipo',     label:'IPO',           ko:'IPO·비상장 투자',  cover:'#1b74e4', ed:'PRIMARY MARKET',     mk:'I.',  foot:'ROADSHOW',
   desc:'공모 기업 설명회·딜 로드쇼와 비상장기업 투자 · M&A 동향 설명회. IPO와 비상장 투자 시장을 함께 다뤄요.'},
  {id:'earnings',label:'Earnings Call', ko:'실적 콜',     cover:'#9e2f3b', ed:'QUARTERLY RESULTS',  mk:'E.',  foot:'EARNINGS',
   desc:'분기 실적 발표 직후 담당 애널리스트의 리뷰 콜과 어닝 시즌 결산.'},
  {id:'ndr',     label:'NDR',           ko:'NDR',         cover:'#eef3fa', text:'#0b2e6b', light:1, ed:'NON-DEAL ROADSHOW', mk:'N.', foot:'BY INVITATION',
   desc:'기업 IR팀이 기관을 직접 찾아가는 1:1·소그룹 미팅. 초청 기반이며 참여는 담당자 문의로 진행해요.'},
  {id:'ai',      label:'AI Conference', ko:'AI 컨퍼런스', cover:'#17181b', ed:'INDUSTRY OUTLOOK',   mk:'AI',  foot:'CONFERENCE',
   desc:'AI 밸류체인과 다음 해 산업 전망을 다루는 리서치센터 대형 컨퍼런스.'},
  {id:'wm',      label:'WM Seminar',    ko:'WM 세미나',   cover:'#cfe6fb', text:'#0b2e6b', light:1, ed:'WEALTH MANAGEMENT', mk:'W.', foot:'BRANCH · ONLINE',
   desc:'자산배분·절세·연금 전략을 다루는 WM 고객 대상 투자 세미나.'},
];
const DOT={corp:'#0b2e6b',ipo:'#1b74e4',earnings:'#9e2f3b',ndr:'#5d7290',ai:'#17181b',wm:'#3a9be8'};
const ELIG={inst:'기관투자자',corp:'법인 고객',wm:'WM 고객'};

/* source:'notice' = 제공 안내문 기준 실데이터, 그 외는 시연용 예시 */
const Q3_DAYS=[
  {date:'2026-09-07',slots:[['09:30','티씨케이','에코프로비엠'],['10:30','현대백화점','POSCO홀딩스'],['13:30','OCI홀딩스','스튜디오드래곤']]},
  {date:'2026-09-08',slots:[['09:30','BGF리테일','DI동일'],['10:30','인텔리안테크','롯데관광개발'],['13:30','현대오토에버','로보티즈']]},
  {date:'2026-09-09',slots:[['09:30','두산퓨얼셀','성일하이텍'],['10:30','LIG D&A','신세계'],['13:30','현대제철','한국항공우주']]},
  {date:'2026-09-10',slots:[['09:30','유니드','씨아이에스'],['10:30','DL이앤씨','LG씨엔에스'],['13:30','테스','현대위아']]},
];
const MNA='비상장기업 투자와 M&A 시장 동향을 다루는 정기 설명회.';
/* 사내 행사내역 한 줄 → 행사 객체 (시트에 없는 시간·장소·정원·자격은 비워 둔다) */
function R(start,end,analysts,title,cat,intro,series,format){
  return {id:`r-${start}-${title.length}-${cat}`,cat,source:'roster',title,start,...(end?{end}:{}),analysts,series:series||'',
    time:'',place:'',format:format||'',elig:[],cond:'',mode:'roster',intro};
}
const EVENTS=[
  /* ── 2026 리서치센터 행사내역 (사내 엑셀 원본 · source:'roster') — 날짜·애널리스트·행사명은 원본 그대로 ── */
  R('2026-01-22',null,['황성현'],'포스코인터내셔널 VIP 기업설명회','corp','포스코인터내셔널 VIP 대상 기업설명회.'),
  R('2026-01-22',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-02-06',null,['김세희'],'토큰증권(STO) 오픈 세미나','wm','토큰증권(STO)을 주제로 한 오픈 세미나.'),
  R('2026-02-26',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-03-10',null,['박종선','권해순'],'AI × BIO','ai','AI와 바이오 산업을 함께 다룬 세미나.'),
  R('2026-03-16','2026-03-20',['리서치센터'],'1분기 온라인 콥데이','corp','분기 정기 온라인 Corporate Day.','corpday','온라인'),
  R('2026-03-26',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-04-23',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-05-11',null,['Jonathan Krane','백은비','양승윤','김세희'],'칸토 콜라보 세미나','ai','칸토와 공동으로 진행한 세미나.'),
  R('2026-05-28',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-06-08','2026-06-11',['리서치센터'],'2분기 온라인 콥데이','corp','분기 정기 온라인 Corporate Day.','corpday','온라인'),
  R('2026-06-25',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-07-23',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-08-27',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  /* 9/7~10 3분기 온라인 콥데이 = 아래 corp-26q3 (안내문 상세와 병합) */
  R('2026-09-17',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  R('2026-09-18',null,['안지선'],'From AI to AX: 금융권에 도입된 Agentic AI','ai','금융권에 도입된 Agentic AI 사례를 다룬 세미나.'),
  R('2026-10-22',null,['박종선'],'비상장기업 투자 및 M&A 동향 설명회','ipo',MNA,'mna'),
  {id:'corp-26q3',cat:'corp',source:'notice',roster:'3분기 온라인 콥데이',analysts:['리서치센터'],series:'corpday',title:'2026 3분기 Corporate Day',start:'2026-09-07',end:'2026-09-10',time:'09:30 / 10:30 / 13:30',place:'온라인 · Zoom',format:'온라인',
   elig:['inst','corp'],cond:'사전 예약한 기관·법인 고객 (참석기관/참석자명으로 Zoom 접속)',mode:'apply',howTo:'사전 예약 · 담당자 문의',
   intro:'기업과 투자자의 대화, 다음 분기를 바라보는 관점. 날짜별 3개 시간대에 A/B 두 기업이 동시에 IR을 진행했어요.',
   days:Q3_DAYS,notes:['사전 예약자에게 행사 당일 문자로 접속 링크와 자료 발송','Zoom 참석자명은 “참석기관/참석자명” 형식','보안을 위해 회의 내용은 문서로 제공하지 않음'],tags:Q3_DAYS.flatMap(d=>d.slots.flatMap(s=>[s[1],s[2]]))},
  /* ── 다가오는 일정: 반복 패턴에서 나온 것만 '예정(일정 미확정)'. 시간·장소·정원은 만들지 않는다 ── */
  {id:'mna-2611',cat:'ipo',source:'pattern',series:'mna',title:'비상장기업 투자 및 M&A 동향 설명회',start:'2026-11-26',analysts:['박종선'],
   time:'',place:'',format:'',elig:[],cond:'',mode:'tba',intro:MNA+' 매월 넷째 주 목요일 진행 패턴에 따른 예정 일정이며, 확정 시 안내돼요.'},
  {id:'corp-26q4',cat:'corp',source:'pattern',series:'corpday',title:'4분기 온라인 콥데이',start:'2026-12-01',tba:'12월 예정 · 일정 추후 안내',analysts:['리서치센터'],
   time:'',place:'',format:'온라인',elig:[],cond:'',mode:'tba',intro:'분기마다 열리는 온라인 Corporate Day. 일정과 참여기업은 확정 후 안내돼요.'},

  /* ── 시연용 예시 일정 (실데이터 아님 · 화면에 '예시' 표시) ── */
  {id:'ipo-1105',cat:'ipo',title:'IPO 기업설명회 · 2차전지 소재 A사',start:'2026-11-05',time:'10:00–11:30',place:'여의도 본사 대회의실',format:'오프라인',
   elig:['inst'],cond:'수요예측 참여 예정 기관투자자 (운용·리서치 담당)',mode:'apply',deadline:'2026-11-03',cap:40,seats:9,
   intro:'공모 일정 전 회사 개요·성장 전략·공모 구조를 설명하고 질의응답을 진행해요.',
   program:[['10:00','회사 소개 및 사업 현황','대표이사'],['10:40','공모 개요·자금 사용 계획','CFO'],['11:00','질의응답','']],tags:['2차전지','공모','수요예측']},
  {id:'ipo-1124',cat:'ipo',title:'IPO 딜 로드쇼 · AI 반도체 설계 B사',start:'2026-11-24',time:'15:00–16:30',place:'온라인 · Zoom',format:'온라인',
   elig:['inst'],cond:'수요예측 참여 예정 기관투자자',mode:'apply',deadline:'2026-11-20',cap:80,seats:52,
   intro:'AI 가속기 설계 기업의 기술 경쟁력과 고객사 파이프라인을 소개하는 온라인 로드쇼.',
   program:[['15:00','기술·제품 로드맵','CTO'],['15:40','실적 전망 및 공모 구조','CFO'],['16:10','질의응답','']],tags:['AI반도체','공모']},
  {id:'ai-1203',cat:'ai',title:'2027 AI 산업전망 컨퍼런스',start:'2026-12-03',time:'09:30–16:00',place:'여의도 컨퍼런스홀',format:'하이브리드',
   elig:['inst','corp'],cond:'기관투자자 및 법인 고객 · 온라인 동시 중계',mode:'apply',deadline:'2026-11-30',cap:300,seats:142,
   intro:'다음 해 AI 인프라·소프트웨어·전력 밸류체인을 점검하는 리서치센터 연례 컨퍼런스.',
   program:[['09:30','등록 및 개회','운영 안내'],['10:00','글로벌 AI 투자 사이클','투자전략 애널리스트'],['13:00','산업별 세션','반도체 · 전력기기 · 소프트웨어'],['15:00','패널 토론 및 질의응답','참여 애널리스트']],tags:['AI','반도체','전력기기','소프트웨어']},
  {id:'wm-1111',cat:'wm',title:'2027 자산배분 전략 세미나',start:'2026-11-11',time:'19:00–20:30',place:'강남 WM센터',format:'오프라인',
   elig:['wm'],cond:'WM 고객 (예탁자산 1억 원 이상 권장)',mode:'apply',deadline:'2026-11-09',cap:60,seats:8,
   intro:'금리·환율 시나리오별 2027 자산배분과 포트폴리오 리밸런싱 전략.',
   program:[['19:00','2027 매크로 시나리오','투자전략 애널리스트'],['19:40','자산배분 포트폴리오','WM 센터장'],['20:10','질의응답','']],tags:['자산배분','금리']},
  {id:'wm-1126',cat:'wm',title:'연말 절세·연금 전략 세미나',start:'2026-11-26',time:'12:00–12:50',place:'온라인 · 라이브',format:'온라인',
   elig:['wm'],cond:'WM 고객',mode:'apply',deadline:'2026-11-24',cap:150,seats:0,
   intro:'ISA·연금저축·IRP 한도 활용과 연말 절세 체크리스트.',tags:['절세','연금','ISA']},
];
