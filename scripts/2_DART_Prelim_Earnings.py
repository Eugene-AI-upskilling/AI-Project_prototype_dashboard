# coding=utf-8
"""
================================================================================
2_DART_Prelim_Earnings.py
================================================================================
KIND(한국거래소) 잠정실적 공시 수집 및 분석 스크립트

[기능]
- KIND에서 당일 잠정실적 공시 검색
- 공시 HTML에서 실적 테이블 추출 (pandas.read_html)
- 데이터 정규화 및 엑셀 저장 (3개 시트)
- 텔레그램 전송
- 실시간 모니터링 모드 (스케줄링)

[엑셀 시트 구성]
Sheet1: raw_table - 원본 테이블 (검증용)
Sheet2: normalized_long - 정규화된 Long 포맷 (분석/DB용)
Sheet3: wide_summary - Wide 포맷 (리포트용)

[환경변수] (.env 파일에 설정)
- BOT_TOKEN: 텔레그램 봇 토큰
- CHAT_ID: 텔레그램 채팅 ID

[출력]
- output/prelim_earnings_{date}.xlsx
- output/sent_log.json (전송 기록)

[실행 방법]
# 1회 실행
$ python scripts/2_DART_Prelim_Earnings.py --telegram

# 실시간 모니터링 (5분 간격)
$ python scripts/2_DART_Prelim_Earnings.py --monitor

# 특정 날짜 조회
$ python scripts/2_DART_Prelim_Earnings.py --date=20260206 --telegram

[스케줄링 - Windows Task Scheduler]
run_prelim_monitor.bat 파일을 Task Scheduler에 등록
- 트리거: 매일 08:00 ~ 18:00, 5분 간격
- 또는 --monitor 모드로 계속 실행

================================================================================
"""

import os
import re
import sys
import json
import warnings
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any, Set
from io import StringIO
import time

import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# 환경변수 로드 (프로젝트 루트의 .env 파일)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_script_dir)
_env_path = os.path.join(_project_dir, '.env')
load_dotenv(dotenv_path=_env_path)

# 경고 무시
warnings.filterwarnings('ignore')


# =============================================================================
# 상수 정의
# =============================================================================

# KIND URLs
KIND_TODAY_URL = "https://kind.krx.co.kr/disclosure/todaydisclosure.do"
KIND_VIEWER_URL = "https://kind.krx.co.kr/common/disclsviewer.do"
KIND_DOCUMENT_URL = "https://kind.krx.co.kr/common/disclsviewer.do"

# HTTP 헤더
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}

# 지표 정렬 순서
METRIC_ORDER = ['매출액', '영업이익', '법인세비용차감전계속사업이익', '당기순이익']
SCOPE_ORDER = ['당해실적', '누계실적']

# 전송 로그 파일
SENT_LOG_FILE = os.path.join(_project_dir, 'output', 'sent_log.json')


# =============================================================================
# 전송 로그 관리
# =============================================================================

def load_sent_log() -> Set[str]:
    """전송 완료된 공시 목록 로드"""
    if os.path.exists(SENT_LOG_FILE):
        try:
            with open(SENT_LOG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get('sent_acptno', []))
        except:
            pass
    return set()


def save_sent_log(sent_set: Set[str]):
    """전송 완료된 공시 목록 저장"""
    os.makedirs(os.path.dirname(SENT_LOG_FILE), exist_ok=True)
    with open(SENT_LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'sent_acptno': list(sent_set)
        }, f, ensure_ascii=False, indent=2)


def add_to_sent_log(acptno: str):
    """전송 완료된 공시 추가"""
    sent_set = load_sent_log()
    sent_set.add(acptno)
    save_sent_log(sent_set)


def clear_old_sent_log():
    """오래된 전송 로그 정리 (오늘 날짜 것만 유지)"""
    sent_set = load_sent_log()
    today = datetime.now().strftime('%Y%m%d')
    # acptno 앞 8자리가 날짜
    new_set = {a for a in sent_set if a.startswith(today)}
    save_sent_log(new_set)


# =============================================================================
# KIND 공시 검색
# =============================================================================

def search_prelim_earnings_kind(search_date: Optional[str] = None) -> pd.DataFrame:
    """
    KIND에서 잠정실적 공시 검색 (모든 페이지)

    Args:
        search_date: 검색 날짜 (YYYYMMDD, 기본: 오늘)

    Returns:
        공시 목록 DataFrame
    """
    if search_date is None:
        search_date = datetime.now().strftime('%Y%m%d')

    print(f"  검색 날짜: {search_date}")

    headers = HEADERS.copy()
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    headers['X-Requested-With'] = 'XMLHttpRequest'

    disclosures = []
    page = 1
    max_pages = 10  # 최대 10페이지 (5000건)

    try:
        while page <= max_pages:
            data = {
                'method': 'searchTodayDisclosureSub',
                'currentPageSize': '500',
                'pageIndex': str(page),
                'orderMode': '0',
                'orderStat': 'D',
                'forward': 'todaydisclosure_sub',
                'marketType': '',
                'disclosureType': '',
                'fromDate': search_date,
                'toDate': search_date
            }

            response = requests.post(KIND_TODAY_URL, headers=headers, data=data, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            rows = soup.select('tbody tr')

            if len(rows) == 0:
                break

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 4:
                    continue

                # 공시 제목에서 잠정실적 필터링
                title_elem = cols[2].find('a')
                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)

                # "잠정" 포함 여부
                if '잠정' not in title:
                    continue

                # onclick에서 acptno 추출
                onclick = title_elem.get('onclick', '')
                acptno_match = re.search(r"openDisclsViewer\('(\d+)'", onclick)
                if not acptno_match:
                    continue

                acptno = acptno_match.group(1)

                # 중복 체크
                if any(d['acptno'] == acptno for d in disclosures):
                    continue

                # 회사명 추출
                company_elem = cols[1].find('a', id='companysum')
                corp_name = company_elem.get_text(strip=True) if company_elem else ''

                # 종목코드 추출 (onclick에서)
                corp_onclick = company_elem.get('onclick', '') if company_elem else ''
                code_match = re.search(r"companysummary_open\('(\d+)'", corp_onclick)
                stock_code = code_match.group(1).zfill(6) if code_match else ''

                # 시간
                time_str = cols[0].get_text(strip=True)

                # 제출인
                submitter = cols[3].get_text(strip=True) if len(cols) > 3 else ''

                disclosures.append({
                    'time': time_str,
                    'stock_code': stock_code,
                    'corp_name': corp_name,
                    'title': title,
                    'acptno': acptno,
                    'submitter': submitter,
                    'date': search_date
                })

            # 500건 미만이면 마지막 페이지
            if len(rows) < 500:
                break

            page += 1
            time.sleep(0.3)

        df = pd.DataFrame(disclosures)
        print(f"  -> 잠정실적 공시 {len(df)}건 발견 (중복 제거)")
        return df

    except Exception as e:
        print(f"[오류] KIND 검색 실패: {e}")
        return pd.DataFrame()


# =============================================================================
# 공시 상세 내용 크롤링
# =============================================================================

def get_disclosure_document(acptno: str) -> Optional[str]:
    """
    KIND 공시 본문 HTML 가져오기

    Args:
        acptno: 접수번호

    Returns:
        HTML 문자열
    """
    try:
        # 1. 뷰어 페이지에서 docNo 추출
        viewer_url = f"{KIND_VIEWER_URL}?method=search&acptno={acptno}"
        response = requests.get(viewer_url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # mainDoc 셀렉트에서 docNo 추출
        select = soup.find('select', id='mainDoc')
        if not select:
            return None

        docNo = None
        for opt in select.find_all('option'):
            val = opt.get('value', '')
            if '|' in val:
                docNo = val.split('|')[0]
                break

        if not docNo:
            return None

        # 2. POST 요청으로 실제 문서 URL 추출
        post_url = 'https://kind.krx.co.kr/common/disclsviewer.do'
        post_data = {
            'method': 'searchContents',
            'docNo': docNo
        }
        post_headers = HEADERS.copy()
        post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
        post_headers['Referer'] = viewer_url

        post_response = requests.post(post_url, data=post_data, headers=post_headers, timeout=30)

        # setPath 함수에서 URL 추출
        url_match = re.search(r"setPath\s*\([^,]*,\s*['\"]([^'\"]+)['\"]", post_response.text)
        if not url_match:
            return None

        doc_url = url_match.group(1)
        if not doc_url.startswith('http'):
            doc_url = 'https://kind.krx.co.kr' + doc_url

        # 3. 실제 문서 가져오기
        doc_response = requests.get(doc_url, headers=HEADERS, timeout=30)

        # UTF-8로 디코드
        try:
            html_text = doc_response.content.decode('utf-8')
        except:
            try:
                html_text = doc_response.content.decode('euc-kr')
            except:
                html_text = doc_response.content.decode('cp949', errors='ignore')

        return html_text

    except Exception as e:
        print(f"    [오류] 문서 조회 실패: {e}")
        return None


def extract_earnings_table(html_content: str) -> Optional[pd.DataFrame]:
    """
    HTML에서 실적 테이블 추출

    Args:
        html_content: HTML 문자열

    Returns:
        실적 테이블 DataFrame
    """
    if not html_content:
        return None

    try:
        # pandas read_html로 모든 테이블 추출
        tables = pd.read_html(StringIO(html_content))
    except Exception as e:
        print(f"    [오류] 테이블 파싱 실패: {e}")
        return None

    if not tables:
        return None

    # 실적 테이블 찾기
    best_table = None
    best_score = 0

    for df in tables:
        if df.empty:
            continue

        df_str = df.to_string()

        score = 0

        # 핵심 지표 포함 여부
        if '매출액' in df_str:
            score += 10
        if '영업이익' in df_str:
            score += 10
        if '당기순이익' in df_str:
            score += 10

        # 기간 키워드
        if '당기' in df_str or '당해' in df_str:
            score += 5
        if '전기' in df_str:
            score += 5
        if '전년동기' in df_str:
            score += 5

        # 적절한 크기
        if 3 <= len(df) <= 30 and 3 <= len(df.columns) <= 15:
            score += 5

        if score > best_score:
            best_score = score
            best_table = df

    return best_table


# =============================================================================
# 데이터 정규화
# =============================================================================

def clean_numeric(val: Any) -> Optional[float]:
    """숫자 값 정제"""
    if pd.isna(val) or val == '-' or val == '' or val is None:
        return None

    val_str = str(val).strip().replace(',', '').replace('%', '')

    # 괄호로 표시된 음수
    if val_str.startswith('(') and val_str.endswith(')'):
        val_str = '-' + val_str[1:-1]

    try:
        return float(val_str)
    except ValueError:
        return None


def standardize_turnaround(val: Any) -> str:
    """흑자/적자 전환 표준화"""
    if pd.isna(val) or val is None:
        return '-'

    val_str = str(val).strip()

    if '흑자' in val_str or '흑전' in val_str:
        return '흑자전환'
    if '적자' in val_str or '적전' in val_str:
        return '적자전환'

    return val_str if val_str and val_str != '-' else '-'


def normalize_earnings_table(
    df: pd.DataFrame,
    corp_name: str = '',
    stock_code: str = '',
    acptno: str = '',
    report_date: str = ''
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    실적 테이블을 정규화

    KIND 잠정실적 테이블 구조:
    - 컬럼0: 지표명 (매출액, 영업이익 등)
    - 컬럼1: 스코프 (당해실적, 누계실적)
    - 컬럼2: 당기실적
    - 컬럼3: 전기실적
    - 컬럼4: 전기대비 증감율
    - 컬럼5: 전기대비 흑자/적자전환
    - 컬럼6: 전년동기실적
    - 컬럼7: 전년동기대비 증감율
    - 컬럼8: 전년동기대비 흑자/적자전환

    Returns:
        (normalized_long, wide_summary) 튜플
    """
    if df is None or df.empty:
        return pd.DataFrame(), pd.DataFrame()

    normalized_rows = []

    for idx, row in df.iterrows():
        row_vals = list(row.values)
        if len(row_vals) < 3:
            continue

        # 첫 번째 컬럼에서 지표 확인
        col0 = str(row_vals[0]).strip() if pd.notna(row_vals[0]) else ''

        # 지표 식별
        metric = None
        for m in METRIC_ORDER:
            if m in col0:
                metric = m
                break

        if not metric:
            continue

        # 두 번째 컬럼에서 스코프 확인 (또는 첫 번째 컬럼)
        col1 = str(row_vals[1]).strip() if len(row_vals) > 1 and pd.notna(row_vals[1]) else ''

        scope = None
        if '당해' in col1 or '당해' in col0:
            scope = '당해실적'
        elif '누계' in col1 or '누계' in col0:
            scope = '누계실적'

        if not scope:
            continue

        # 값 추출 (인덱스 기반)
        # 컬럼2: 당기, 컬럼3: 전기, 컬럼4: QoQ%, 컬럼5: QoQ전환
        # 컬럼6: 전년동기, 컬럼7: YoY%, 컬럼8: YoY전환
        record = {
            'corp_name': corp_name,
            'stock_code': stock_code,
            'rcp_no': acptno,
            'report_date': report_date,
            'metric': metric,
            'scope': scope,
            'value_current': clean_numeric(row_vals[2]) if len(row_vals) > 2 else None,
            'value_prev': clean_numeric(row_vals[3]) if len(row_vals) > 3 else None,
            'qoq_change_pct': clean_numeric(row_vals[4]) if len(row_vals) > 4 else None,
            'qoq_turnaround': standardize_turnaround(row_vals[5]) if len(row_vals) > 5 else '-',
            'value_yoy': clean_numeric(row_vals[6]) if len(row_vals) > 6 else None,
            'yoy_change_pct': clean_numeric(row_vals[7]) if len(row_vals) > 7 else None,
            'yoy_turnaround': standardize_turnaround(row_vals[8]) if len(row_vals) > 8 else '-',
            'unit_value': 'KRW_million',
            'unit_pct': 'percent'
        }
        normalized_rows.append(record)

    df_long = pd.DataFrame(normalized_rows)

    # Wide summary 생성
    if not df_long.empty:
        df_wide = df_long[[
            'metric', 'scope', 'value_current', 'value_prev', 'value_yoy',
            'qoq_change_pct', 'yoy_change_pct', 'qoq_turnaround', 'yoy_turnaround'
        ]].copy()

        # 정렬
        df_wide['m_order'] = df_wide['metric'].apply(lambda x: METRIC_ORDER.index(x) if x in METRIC_ORDER else 99)
        df_wide['s_order'] = df_wide['scope'].apply(lambda x: SCOPE_ORDER.index(x) if x in SCOPE_ORDER else 99)
        df_wide = df_wide.sort_values(['m_order', 's_order']).drop(columns=['m_order', 's_order'])
    else:
        df_wide = pd.DataFrame()

    return df_long, df_wide


# =============================================================================
# 엑셀 저장
# =============================================================================

def save_all_to_excel(
    all_raw: List[Tuple[str, pd.DataFrame]],
    all_long: List[pd.DataFrame],
    output_dir: str,
    search_date: str
) -> str:
    """
    모든 공시 데이터를 엑셀로 저장

    Returns:
        저장된 파일 경로
    """
    os.makedirs(output_dir, exist_ok=True)

    filename = f"prelim_earnings_{search_date}.xlsx"
    filepath = os.path.join(output_dir, filename)

    # 모든 Long 데이터 통합
    if all_long:
        df_all_long = pd.concat(all_long, ignore_index=True)
    else:
        df_all_long = pd.DataFrame()

    # Wide summary
    if not df_all_long.empty:
        df_wide = df_all_long[[
            'corp_name', 'stock_code', 'metric', 'scope',
            'value_current', 'value_prev', 'value_yoy',
            'qoq_change_pct', 'yoy_change_pct'
        ]].copy()

        df_wide['m_order'] = df_wide['metric'].apply(lambda x: METRIC_ORDER.index(x) if x in METRIC_ORDER else 99)
        df_wide['s_order'] = df_wide['scope'].apply(lambda x: SCOPE_ORDER.index(x) if x in SCOPE_ORDER else 99)
        df_wide = df_wide.sort_values(['corp_name', 'm_order', 's_order']).drop(columns=['m_order', 's_order'])
    else:
        df_wide = pd.DataFrame()

    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # raw_table (첫 번째 공시만 예시로)
        if all_raw:
            all_raw[0][1].to_excel(writer, sheet_name='raw_table', index=False)

        # normalized_long
        if not df_all_long.empty:
            df_all_long.to_excel(writer, sheet_name='normalized_long', index=False)

        # wide_summary
        if not df_wide.empty:
            df_wide.to_excel(writer, sheet_name='wide_summary', index=False)

    print(f"[저장 완료] {filepath}")
    return filepath


# =============================================================================
# 텔레그램 전송
# =============================================================================

def format_telegram_message(
    stock_code: str,
    corp_name: str,
    df_long: pd.DataFrame,
    acptno: str
) -> str:
    """텔레그램 메시지 포맷"""
    lines = ["(단위: 백만원)", f"[{stock_code}] {corp_name}"]

    # 당해실적 기준
    df_cur = df_long[df_long['scope'] == '당해실적']

    for metric in ['매출액', '영업이익', '당기순이익']:
        row = df_cur[df_cur['metric'] == metric]
        if row.empty:
            continue

        r = row.iloc[0]
        cur = f"{r['value_current']:,.0f}" if pd.notna(r['value_current']) else "-"
        prev = f"{r['value_prev']:,.0f}" if pd.notna(r['value_prev']) else "-"
        yoy_val = f"{r['value_yoy']:,.0f}" if pd.notna(r['value_yoy']) else "-"
        qoq = f"{r['qoq_change_pct']:+.1f}%" if pd.notna(r['qoq_change_pct']) else "-"
        yoy = f"{r['yoy_change_pct']:+.1f}%" if pd.notna(r['yoy_change_pct']) else "-"

        lines.append(f"- {metric}: 당기 {cur}, 전기 {prev} (QoQ, {qoq}) 전년동기 {yoy_val}(YoY, {yoy})")

    url = f"https://kind.krx.co.kr/common/disclsviewer.do?method=search&acptno={acptno}"
    lines.append(url)

    return '\n'.join(lines)


def send_to_telegram(message: str, retry: int = 3) -> bool:
    """텔레그램 메시지 전송 (재시도 지원)"""
    bot_token = os.getenv('BOT_TOKEN', '').strip()
    chat_id = os.getenv('CHAT_ID', '').strip()

    if not bot_token or not chat_id:
        print("  [오류] BOT_TOKEN 또는 CHAT_ID 미설정")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': message,
        'disable_web_page_preview': False
    }

    for attempt in range(retry):
        try:
            response = requests.post(url, json=payload, timeout=15)
            result = response.json()
            if result.get('ok'):
                return True
            # rate limit 체크
            if result.get('error_code') == 429:
                wait = result.get('parameters', {}).get('retry_after', 5)
                time.sleep(wait)
                continue
        except Exception as e:
            if attempt < retry - 1:
                time.sleep(2)
                continue
            print(f"  [오류] 텔레그램 전송 실패: {e}")
            return False

    return False


# =============================================================================
# 메인 실행
# =============================================================================

def main(search_date: Optional[str] = None, send_telegram: bool = False, only_new: bool = False):
    """
    메인 실행 함수

    Args:
        search_date: 검색 날짜 (YYYYMMDD)
        send_telegram: 텔레그램 전송 여부
        only_new: 신규 공시만 처리 (모니터링 모드)
    """
    print("=" * 60)
    print("  KIND 잠정실적 공시 수집")
    print(f"  실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if only_new:
        print("  [모니터링 모드] 신규 공시만 전송")
    print("=" * 60)
    print()

    if search_date is None:
        search_date = datetime.now().strftime('%Y%m%d')

    output_dir = os.path.join(_project_dir, 'output')

    # 전송 로그 로드 (모니터링 모드)
    sent_log = load_sent_log() if only_new else set()

    # 1. 공시 검색
    print("[1/4] KIND에서 잠정실적 공시 검색 중...")
    df_disclosures = search_prelim_earnings_kind(search_date)

    if df_disclosures.empty:
        print("  -> 잠정실적 공시 없음")
        print("\n[완료]")
        return 0

    # 신규 공시 필터링
    if only_new:
        new_disclosures = df_disclosures[~df_disclosures['acptno'].isin(sent_log)]
        if new_disclosures.empty:
            print(f"  -> 신규 공시 없음 (기존 {len(df_disclosures)}건)")
            return 0
        print(f"  -> 신규 공시 {len(new_disclosures)}건 (기존 {len(df_disclosures) - len(new_disclosures)}건 제외)")
        df_disclosures = new_disclosures

    # 2. 각 공시 처리
    print(f"\n[2/4] 공시 상세 내용 수집 중... ({len(df_disclosures)}건)")

    all_raw = []
    all_long = []
    telegram_data = []  # (acptno, message) 튜플

    for idx, disc in df_disclosures.iterrows():
        acptno = disc['acptno']
        corp_name = disc['corp_name']
        stock_code = disc['stock_code']

        print(f"  [{stock_code}] {corp_name}...")

        # HTML 가져오기
        html = get_disclosure_document(acptno)
        if not html:
            print(f"    -> 문서 조회 실패")
            continue

        # 테이블 추출
        raw_table = extract_earnings_table(html)
        if raw_table is None or raw_table.empty:
            print(f"    -> 실적 테이블 없음")
            continue

        all_raw.append((corp_name, raw_table))

        # 정규화
        df_long, df_wide = normalize_earnings_table(
            raw_table,
            corp_name=corp_name,
            stock_code=stock_code,
            acptno=acptno,
            report_date=search_date
        )

        if not df_long.empty:
            all_long.append(df_long)
            print(f"    -> {len(df_long)}행 정규화 완료")

            # 텔레그램 메시지 준비
            msg = format_telegram_message(stock_code, corp_name, df_long, acptno)
            telegram_data.append((acptno, msg))
        else:
            print(f"    -> 정규화 실패")

        time.sleep(0.5)  # 요청 간격

    # 3. 엑셀 저장
    print(f"\n[3/4] 엑셀 저장 중...")
    if all_long:
        filepath = save_all_to_excel(all_raw, all_long, output_dir, search_date)
    else:
        print("  -> 저장할 데이터 없음")

    # 4. 텔레그램 전송
    sent_count = 0
    if send_telegram and telegram_data:
        print(f"\n[4/4] 텔레그램 전송 중... ({len(telegram_data)}건)")
        for acptno, msg in telegram_data:
            if send_to_telegram(msg):
                # 전송 로그에 추가
                add_to_sent_log(acptno)
                sent_count += 1
                # 메시지에서 종목명 추출해서 출력
                lines = msg.split('\n')
                if len(lines) > 1:
                    print(f"  -> {lines[1]} 전송 완료")
            time.sleep(1)  # 전송 간격 1초로 늘림
    else:
        print("\n[4/4] 텔레그램 전송: 건너뜀")

    # 결과 요약
    print("\n" + "=" * 60)
    print("[결과 요약]")
    print(f"  - 검색 공시: {len(df_disclosures)}건")
    print(f"  - 수집 성공: {len(all_long)}건")
    if send_telegram:
        print(f"  - 텔레그램 전송: {sent_count}건")
    if all_long:
        df_total = pd.concat(all_long)
        print(f"  - 총 데이터: {len(df_total)}행")
    print("=" * 60)

    # 콘솔에 미리보기 (전체 모드만)
    if all_long and not only_new:
        print("\n[텔레그램 메시지 미리보기]")
        print("-" * 60)
        for acptno, msg in telegram_data[:3]:
            print(msg)
            print("-" * 60)

    print("\n[완료] 모든 작업이 완료되었습니다.")
    return sent_count


def run_monitor(interval_minutes: int = 5):
    """
    실시간 모니터링 모드

    Args:
        interval_minutes: 체크 간격 (분)
    """
    print("=" * 60)
    print("  잠정실적 공시 실시간 모니터링")
    print(f"  체크 간격: {interval_minutes}분")
    print("  종료: Ctrl+C")
    print("=" * 60)
    print()

    # 오래된 로그 정리
    clear_old_sent_log()

    while True:
        try:
            now = datetime.now()
            hour = now.hour

            # 장 시간 체크 (08:00 ~ 18:00)
            if 8 <= hour < 18:
                print(f"\n[{now.strftime('%H:%M:%S')}] 공시 체크 중...")
                sent = main(send_telegram=True, only_new=True)

                if sent > 0:
                    print(f"  -> {sent}건 신규 공시 전송 완료")
                else:
                    print(f"  -> 신규 공시 없음")
            else:
                print(f"\n[{now.strftime('%H:%M:%S')}] 장외 시간 (08:00~18:00 외)")

            # 다음 체크까지 대기
            print(f"  -> 다음 체크: {interval_minutes}분 후")
            time.sleep(interval_minutes * 60)

            # 자정에 로그 정리
            if now.hour == 0 and now.minute < interval_minutes:
                clear_old_sent_log()

        except KeyboardInterrupt:
            print("\n\n[종료] 모니터링을 중단합니다.")
            break
        except Exception as e:
            print(f"\n[오류] {e}")
            print("  -> 1분 후 재시도")
            time.sleep(60)


if __name__ == "__main__":
    # 모니터링 모드
    if '--monitor' in sys.argv:
        # 간격 설정 (기본 5분)
        interval = 5
        for arg in sys.argv:
            if arg.startswith('--interval='):
                interval = int(arg.split('=')[1])
                break
        run_monitor(interval_minutes=interval)
    else:
        # 일반 실행 모드
        send_tg = '--telegram' in sys.argv

        # 날짜 인수 처리 (--date=YYYYMMDD)
        search_date = None
        for arg in sys.argv:
            if arg.startswith('--date='):
                search_date = arg.split('=')[1]
                break

        main(search_date=search_date, send_telegram=send_tg)
