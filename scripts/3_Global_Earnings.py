# coding=utf-8
"""
================================================================================
3_Global_Earnings.py
================================================================================
해외 기업 실적 데이터 수집 스크립트

[데이터 소스 선정]
- yfinance 선택
  장점:
    1. API 키 불필요 (무료)
    2. 실적 발표일, 매출액, EPS 모두 제공
    3. 이미 프로젝트에서 사용 중
    4. 홍콩(HK), 일본(JP), 독일(GR) 등 해외 거래소 지원
  단점:
    1. 비공식 API라 안정성 이슈 가능
    2. 실시간 데이터 아님

  vs FMP: API 키 필요, 무료 티어 250회/일 제한
  vs AlphaVantage: API 키 필요, 분당 5회 제한

[기능]
- 섹터별 고정 티커 그룹 실적 수집
- 실적 발표일, 매출액, EPS 조회
- 캐싱으로 API 호출 최소화
- 엑셀 저장

[환경변수]
- (없음 - yfinance는 API 키 불필요)

[출력]
- output/global_earnings.xlsx
- output/cache/earnings_cache.json

[실행 방법]
$ python scripts/3_Global_Earnings.py

================================================================================
"""

import os
import sys
import json
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import time

import pandas as pd
import numpy as np
import yfinance as yf
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

# 고정 티커 그룹
TICKER_GROUPS: Dict[str, List[str]] = {
    "빅테크 7": ["AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "TSLA", "META"],
    "반도체 관련주": ["AVGO", "INTC", "LRCX", "QCOM", "MU", "AMD"],
    "친환경차량관련주": ["9868.HK", "1810.HK", "LCID", "TSLA", "NIO", "LI", "1211.HK"],
    "리튬 관련주": ["PILBF", "SQM", "ALB", "SGML"],
    "AI 관련주": ["SNPS", "CDNS", "ANET", "NOW", "ADI"],
    "소셜미디어": ["PINS", "SPOT", "SNAP", "MTCH", "NFLX"],
    "게임": ["TTWO", "U", "NTDOY", "NTES", "EA"],
    "코인": ["MSTR", "COIN", "RIOT", "MARA", "APLD"],
    "인프라": ["ETN", "TT", "FAST", "PH", "URI"],
    "원전": ["GEV", "SO", "DUK", "NGG"],
    "로봇": ["ROK", "ISRG", "ZBRA", "TER", "PATH"],
    "방산": ["BA", "LMT", "NOC", "RTX"],
    "수소": ["PLUG", "LIN", "APD"],
    "클린에너지": ["FSLR", "ENPH", "SEDG", "ORA", "BE"],
    "우주항공": ["AVAV", "KTOS", "TRMB", "IRDM", "LHX"],
    "비만치료제": ["NVO", "LLY", "AMGN", "PFE", "VKTX"],
    "소비재 관련주": ["AMZN", "CPNG", "WMT", "COST", "9983.T", "NKE", "ADS.DE", "EL", "ULTA", "ELF"],
    "자동차 관련주": ["7203.T", "7267.T", "GM", "F", "TSLA", "VOW3.DE", "BMW.DE", "MBG.DE"]
}

# 캐시 설정
CACHE_DIR = os.path.join(_project_dir, 'output', 'cache')
CACHE_FILE = os.path.join(CACHE_DIR, 'earnings_cache.json')
CACHE_EXPIRY_HOURS = 24  # 캐시 유효 시간


# =============================================================================
# 티커 변환 (사용자 입력 → yfinance 형식)
# =============================================================================

def normalize_ticker(ticker: str) -> str:
    """
    티커를 yfinance 형식으로 변환

    Args:
        ticker: 원본 티커 (예: "9868 HK", "TSLA US", "7203 JT")

    Returns:
        yfinance 형식 티커 (예: "9868.HK", "TSLA", "7203.T")
    """
    ticker = ticker.strip().upper()

    # 이미 yfinance 형식이면 그대로 반환
    if '.' in ticker:
        return ticker

    # "TICKER EXCHANGE" 형식 처리
    if ' ' in ticker:
        parts = ticker.split()
        symbol = parts[0]
        exchange = parts[1] if len(parts) > 1 else ''

        # 거래소 코드 매핑
        exchange_map = {
            'US': '',  # 미국은 접미사 없음
            'HK': '.HK',
            'JP': '.T',
            'JT': '.T',
            'GR': '.DE',
            'DE': '.DE',
            'LN': '.L',
            'SS': '.SS',
            'SZ': '.SZ'
        }

        suffix = exchange_map.get(exchange, '')
        return f"{symbol}{suffix}"

    return ticker


# =============================================================================
# 캐시 관리
# =============================================================================

def load_cache() -> Dict[str, Any]:
    """캐시 로드"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {'data': {}, 'updated': None}


def save_cache(cache: Dict[str, Any]):
    """캐시 저장"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache['updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def is_cache_valid(cache: Dict[str, Any]) -> bool:
    """캐시 유효성 확인"""
    if not cache.get('updated'):
        return False

    try:
        updated = datetime.strptime(cache['updated'], '%Y-%m-%d %H:%M:%S')
        return datetime.now() - updated < timedelta(hours=CACHE_EXPIRY_HOURS)
    except:
        return False


def get_cached_data(ticker: str, cache: Dict[str, Any]) -> Optional[Dict]:
    """캐시에서 데이터 조회"""
    if not is_cache_valid(cache):
        return None
    return cache.get('data', {}).get(ticker)


def set_cached_data(ticker: str, data: Dict, cache: Dict[str, Any]):
    """캐시에 데이터 저장"""
    if 'data' not in cache:
        cache['data'] = {}
    cache['data'][ticker] = data


# =============================================================================
# 실적 데이터 수집
# =============================================================================

def get_earnings_data(ticker: str) -> Dict[str, Any]:
    """
    개별 종목 실적 데이터 조회

    Args:
        ticker: yfinance 형식 티커

    Returns:
        실적 데이터 딕셔너리
    """
    result = {
        'ticker': ticker,
        'name': None,
        'next_earnings_date': None,
        'last_earnings_date': None,
        'revenue': None,
        'eps': None,
        'eps_estimate': None,
        'eps_surprise': None,
        'source': 'yfinance'
    }

    try:
        stock = yf.Ticker(ticker)

        # 기업명
        info = stock.info
        result['name'] = info.get('shortName') or info.get('longName') or ticker

        # 실적 발표일 (get_earnings_dates 사용)
        try:
            earnings_dates = stock.get_earnings_dates()
            if earnings_dates is not None and not earnings_dates.empty:
                # timezone-aware 날짜를 timezone-naive로 변환 (비교를 위해)
                earnings_dates.index = earnings_dates.index.tz_localize(None)
                today = datetime.now()

                # 다음 실적 발표일 (미래)
                future_dates = earnings_dates[earnings_dates.index > today]
                if not future_dates.empty:
                    # 데이터는 내림차순으로 정렬됨 (최신이 먼저)
                    # 미래 날짜 중 가장 가까운 것은 마지막 요소
                    next_date = future_dates.index[-1]
                    result['next_earnings_date'] = next_date.strftime('%Y-%m-%d')

                    # EPS 추정치 (가장 가까운 미래의 추정치)
                    if 'EPS Estimate' in future_dates.columns:
                        est = future_dates['EPS Estimate'].iloc[-1]
                        if pd.notna(est):
                            result['eps_estimate'] = float(est)

                # 최근 실적 발표일 (과거)
                past_dates = earnings_dates[earnings_dates.index <= today]
                if not past_dates.empty:
                    # 과거 날짜 중 가장 최근은 첫 번째 요소
                    last_date = past_dates.index[0]
                    result['last_earnings_date'] = last_date.strftime('%Y-%m-%d')

                    # 실제 EPS
                    if 'Reported EPS' in past_dates.columns:
                        eps = past_dates['Reported EPS'].iloc[0]
                        if pd.notna(eps):
                            result['eps'] = float(eps)

                    # 서프라이즈
                    if 'Surprise(%)' in past_dates.columns:
                        surprise = past_dates['Surprise(%)'].iloc[0]
                        if pd.notna(surprise):
                            result['eps_surprise'] = float(surprise)
        except Exception as e:
            # 디버그용: 에러 발생시 출력
            pass

        # 최근 분기 실적 (매출액)
        try:
            financials = stock.quarterly_financials
            if financials is not None and not financials.empty:
                # Total Revenue 찾기
                revenue_rows = [r for r in financials.index if 'revenue' in r.lower()]
                if revenue_rows:
                    latest_revenue = financials.loc[revenue_rows[0]].iloc[0]
                    if pd.notna(latest_revenue):
                        result['revenue'] = float(latest_revenue)
        except:
            pass

        # EPS 백업 (earnings_dates에서 못 가져온 경우)
        if result['eps'] is None:
            try:
                earnings = stock.earnings_history
                if earnings is not None and not earnings.empty:
                    if 'epsActual' in earnings.columns:
                        latest_eps = earnings['epsActual'].iloc[-1]
                        if pd.notna(latest_eps):
                            result['eps'] = float(latest_eps)
            except:
                pass

    except Exception as e:
        print(f"    [경고] {ticker} 조회 실패: {e}")

    return result


def collect_all_earnings(use_cache: bool = True) -> pd.DataFrame:
    """
    모든 섹터의 실적 데이터 수집

    Args:
        use_cache: 캐시 사용 여부

    Returns:
        실적 데이터 DataFrame
    """
    # 캐시 로드
    cache = load_cache() if use_cache else {'data': {}, 'updated': None}

    all_data = []
    total_tickers = sum(len(tickers) for tickers in TICKER_GROUPS.values())
    processed = 0

    for sector, tickers in TICKER_GROUPS.items():
        print(f"\n  [{sector}] ({len(tickers)}종목)")

        for ticker_raw in tickers:
            ticker = normalize_ticker(ticker_raw)
            processed += 1

            # 캐시 확인
            cached = get_cached_data(ticker, cache) if use_cache else None

            if cached:
                print(f"    {ticker} (캐시)")
                data = cached
            else:
                print(f"    {ticker}...")
                data = get_earnings_data(ticker)
                set_cached_data(ticker, data, cache)
                time.sleep(0.3)  # API 호출 간격

            # 섹터 정보 추가
            data['sector'] = sector
            all_data.append(data)

            # 진행률
            if processed % 10 == 0:
                print(f"    -> 진행: {processed}/{total_tickers}")

    # 캐시 저장
    save_cache(cache)

    # DataFrame 생성
    df = pd.DataFrame(all_data)

    # 컬럼 순서 정리
    columns = ['sector', 'ticker', 'name', 'next_earnings_date', 'last_earnings_date',
               'revenue', 'eps', 'eps_estimate', 'eps_surprise', 'source']
    df = df[[c for c in columns if c in df.columns]]

    return df


# =============================================================================
# 엑셀 저장
# =============================================================================

def save_to_excel(df: pd.DataFrame, output_dir: Optional[str] = None) -> str:
    """
    실적 데이터를 엑셀로 저장

    Args:
        df: 실적 DataFrame
        output_dir: 출력 디렉토리

    Returns:
        저장된 파일 경로
    """
    if output_dir is None:
        output_dir = os.path.join(_project_dir, 'output')

    os.makedirs(output_dir, exist_ok=True)

    filepath = os.path.join(output_dir, 'global_earnings.xlsx')

    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # 전체 데이터
        df.to_excel(writer, sheet_name='All', index=False)

        # 섹터별 시트
        for sector in df['sector'].unique():
            df_sector = df[df['sector'] == sector]
            # 시트명 정리 (31자 제한, 특수문자 제거)
            sheet_name = sector[:31].replace('/', '_').replace('\\', '_')
            df_sector.to_excel(writer, sheet_name=sheet_name, index=False)

        # 실적 발표 예정 (가까운 순)
        df_upcoming = df[df['next_earnings_date'].notna()].copy()
        if not df_upcoming.empty:
            df_upcoming['next_earnings_date'] = pd.to_datetime(df_upcoming['next_earnings_date'])
            df_upcoming = df_upcoming.sort_values('next_earnings_date')
            df_upcoming['next_earnings_date'] = df_upcoming['next_earnings_date'].dt.strftime('%Y-%m-%d')
            df_upcoming.to_excel(writer, sheet_name='Upcoming', index=False)

    print(f"[저장 완료] {filepath}")
    return filepath


# =============================================================================
# 요약 출력
# =============================================================================

def print_summary(df: pd.DataFrame):
    """실적 요약 출력"""
    print("\n" + "=" * 60)
    print("[섹터별 요약]")
    print("=" * 60)

    for sector in df['sector'].unique():
        df_sector = df[df['sector'] == sector]
        with_next = df_sector['next_earnings_date'].notna().sum()
        with_revenue = df_sector['revenue'].notna().sum()
        with_eps = df_sector['eps'].notna().sum()

        print(f"\n[{sector}]")
        print(f"  - 종목 수: {len(df_sector)}")
        print(f"  - 다음 실적발표일: {with_next}/{len(df_sector)}")
        print(f"  - 매출액 데이터: {with_revenue}/{len(df_sector)}")
        print(f"  - EPS 데이터: {with_eps}/{len(df_sector)}")

    # 다가오는 실적 발표
    print("\n" + "=" * 60)
    print("[다가오는 실적 발표 (15건)]")
    print("=" * 60)

    df_upcoming = df[df['next_earnings_date'].notna()].copy()
    if not df_upcoming.empty:
        df_upcoming['next_earnings_date'] = pd.to_datetime(df_upcoming['next_earnings_date'])
        df_upcoming = df_upcoming.sort_values('next_earnings_date').head(15)

        for _, row in df_upcoming.iterrows():
            date_str = row['next_earnings_date'].strftime('%Y-%m-%d')
            name = row['name'][:25] if row['name'] else 'N/A'
            est = f"(Est: {row['eps_estimate']:.2f})" if pd.notna(row.get('eps_estimate')) else ""
            print(f"  {date_str} | {row['ticker']:8} | {name:25} {est}")
    else:
        print("  (데이터 없음)")


# =============================================================================
# 메인 실행
# =============================================================================

def main(use_cache: bool = True):
    """메인 실행 함수"""
    print("=" * 60)
    print("  해외 기업 실적 데이터 수집")
    print(f"  실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  데이터 소스: yfinance")
    print(f"  캐시 사용: {'예' if use_cache else '아니오'}")
    print("=" * 60)

    total_tickers = sum(len(tickers) for tickers in TICKER_GROUPS.values())
    print(f"\n총 {len(TICKER_GROUPS)}개 섹터, {total_tickers}개 종목")

    # 데이터 수집
    print("\n[1/2] 실적 데이터 수집 중...")
    df = collect_all_earnings(use_cache=use_cache)

    print(f"\n  -> 총 {len(df)}개 종목 수집 완료")

    # 엑셀 저장
    print("\n[2/2] 엑셀 저장 중...")
    filepath = save_to_excel(df)

    # 요약 출력
    print_summary(df)

    print("\n" + "=" * 60)
    print("[완료] 모든 작업이 완료되었습니다.")
    print("=" * 60)

    return df


if __name__ == "__main__":
    # 캐시 무시 옵션
    no_cache = '--no-cache' in sys.argv

    main(use_cache=not no_cache)
