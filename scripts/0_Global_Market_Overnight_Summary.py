# coding=utf-8
"""
================================================================================
0_Global_Market_Overnight_Summary.py
================================================================================
전일 해외 시황 요약 스크립트

[기능]
- yfinance 기반으로 미국 주요 지수, 섹터 ETF, 주요 지표 수집
- 전일 대비 등락률(%) 계산
- 엑셀 파일로 저장 (4개 시트)
- LLM 기반 시황 요약 생성 (OpenAI GPT)

[수집 범위]
A) 미국 주요 지수: Dow, S&P500, Nasdaq, Russell2000, SOX, NBI, VIX
B) S&P500 섹터: 11개 섹터 ETF
C) Key Indices: WTI, Gold, EUR/USD, 10Y, DXY, USDKRW

[출력]
- output/global_market_summary_YYYYMMDD.xlsx
  - Sheet1: US_Indices
  - Sheet2: SP500_Sectors
  - Sheet3: Key_Indices
  - Sheet4: Narrative (규칙 기반)
  - Sheet5: LLM_Summary (LLM 기반)

[환경변수]
- OPENAI_API_KEY: OpenAI API 키 (.env 파일에 설정)

[실행 방법]
$ python scripts/0_Global_Market_Overnight_Summary.py

[필요 패키지]
- yfinance, pandas, openpyxl, requests, urllib3, openai, python-dotenv

================================================================================
"""

import os
import sys
import ssl
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

import pandas as pd
import yfinance as yf
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

# 환경변수 로드 (프로젝트 루트의 .env 파일)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_script_dir)
_env_path = os.path.join(_project_dir, '.env')
load_dotenv(dotenv_path=_env_path)

# 경고 무시
warnings.filterwarnings('ignore')

# =============================================================================
# SSL 및 네트워크 안정화 설정
# =============================================================================

class SSLAdapter(HTTPAdapter):
    """SSL 어댑터 - 네트워크 안정성 향상"""
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.set_ciphers('DEFAULT@SECLEVEL=1')
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)


def create_session() -> requests.Session:
    """재시도 정책이 적용된 requests 세션 생성"""
    session = requests.Session()

    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )

    adapter = SSLAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    return session


# =============================================================================
# 상수 정의
# =============================================================================

# 미국 주요 지수
US_INDICES = {
    '^DJI': 'Dow Jones',
    '^GSPC': 'S&P 500',
    '^IXIC': 'Nasdaq',
    '^RUT': 'Russell 2000',
    '^SOX': 'SOX (Semiconductor)',
    '^NBI': 'Nasdaq Biotechnology',
    '^VIX': 'VIX',
}

# S&P500 섹터 ETF 매핑
SECTOR_ETF_MAP = {
    'XLK': 'Technology',
    'XLF': 'Financials',
    'XLV': 'Health Care',
    'XLY': 'Consumer Discretionary',
    'XLP': 'Consumer Staples',
    'XLE': 'Energy',
    'XLI': 'Industrials',
    'XLB': 'Materials',
    'XLU': 'Utilities',
    'XLRE': 'Real Estate',
    'XLC': 'Communication Services',
}

# 주요 지표
KEY_INDICES = {
    'CL=F': 'WTI Crude Oil',
    'GC=F': 'Gold',
    'SI=F': 'Silver',
    'EURUSD=X': 'EUR/USD',
    '^TNX': '10Y Treasury Yield',
    'DX-Y.NYB': 'DXY (Dollar Index)',
    'KRW=X': 'USD/KRW',
    'BTC-USD': 'Bitcoin',
}


# =============================================================================
# 데이터 수집 함수
# =============================================================================

def get_last_two_adj_close(ticker: str) -> Tuple[Optional[float], Optional[float]]:
    """
    최근 2개 거래일의 Adjusted Close 가격 조회

    Args:
        ticker: 종목 티커

    Returns:
        (최근 종가, 전일 종가) 튜플. 데이터 없으면 (None, None)
    """
    try:
        # 최근 10일치 데이터 요청 (휴장일 고려)
        df = yf.download(
            ticker,
            period='10d',
            interval='1d',
            auto_adjust=True,
            threads=False,
            progress=False
        )

        if df.empty or len(df) < 2:
            return None, None

        # 최근 2개 종가
        last_close = df['Close'].iloc[-1]
        prev_close = df['Close'].iloc[-2]

        # Series인 경우 값 추출
        if hasattr(last_close, 'iloc'):
            last_close = last_close.iloc[0]
        if hasattr(prev_close, 'iloc'):
            prev_close = prev_close.iloc[0]

        return float(last_close), float(prev_close)

    except Exception as e:
        print(f"  [경고] {ticker} 데이터 조회 실패: {e}")
        return None, None


def calculate_pct_change(last: Optional[float], prev: Optional[float]) -> Optional[float]:
    """전일 대비 변동률(%) 계산"""
    if last is None or prev is None or prev == 0:
        return None
    return round((last - prev) / prev * 100, 2)


def get_us_indices_summary() -> pd.DataFrame:
    """
    미국 주요 지수 수집

    Returns:
        DataFrame (columns: date, name, ticker, last, pct)
    """
    print("[1/4] 미국 주요 지수 수집 중...")

    records = []
    today = datetime.now().strftime('%Y-%m-%d')

    for ticker, name in US_INDICES.items():
        print(f"  - {name} ({ticker})")

        last, prev = get_last_two_adj_close(ticker)
        pct = calculate_pct_change(last, prev)

        # 값 반올림
        if last is not None:
            last = round(last, 2)

        records.append({
            'date': today,
            'name': name,
            'ticker': ticker,
            'last': last,
            'pct': pct
        })

    df = pd.DataFrame(records)
    print(f"  -> {len(df)}개 지수 수집 완료")
    return df


def get_sp500_sector_performance() -> pd.DataFrame:
    """
    S&P500 섹터별 성과 수집 (ETF 기반)

    Returns:
        DataFrame (columns: date, sector, etf, pct)
    """
    print("[2/4] S&P500 섹터 성과 수집 중...")

    records = []
    today = datetime.now().strftime('%Y-%m-%d')

    for etf, sector in SECTOR_ETF_MAP.items():
        print(f"  - {sector} ({etf})")

        last, prev = get_last_two_adj_close(etf)
        pct = calculate_pct_change(last, prev)

        records.append({
            'date': today,
            'sector': sector,
            'etf': etf,
            'pct': pct
        })

    df = pd.DataFrame(records)
    print(f"  -> {len(df)}개 섹터 수집 완료")
    return df


def get_key_indices() -> pd.DataFrame:
    """
    주요 지표 수집 (WTI, Gold, Silver, EUR/USD, 10Y, DXY, USDKRW, Bitcoin)

    Returns:
        DataFrame (columns: date, name, ticker, last, pct)
    """
    print("[3/4] 주요 지표 수집 중...")

    records = []
    today = datetime.now().strftime('%Y-%m-%d')

    for ticker, name in KEY_INDICES.items():
        print(f"  - {name} ({ticker})")

        last, prev = get_last_two_adj_close(ticker)
        pct = calculate_pct_change(last, prev)

        # 10Y Treasury (^TNX) 스케일 보정
        if ticker == '^TNX' and last is not None:
            if last > 20:  # 100배된 경우
                last = last / 100
                if prev is not None:
                    prev = prev / 100
                pct = calculate_pct_change(last, prev)

        # 값 반올림
        if last is not None:
            last = round(last, 2)

        records.append({
            'date': today,
            'name': name,
            'ticker': ticker,
            'last': last,
            'pct': pct
        })

    df = pd.DataFrame(records)
    print(f"  -> {len(df)}개 지표 수집 완료")
    return df


# =============================================================================
# 요약 텍스트 생성 (규칙 기반)
# =============================================================================

def generate_narrative_rule_based(
    df_indices: pd.DataFrame,
    df_sectors: pd.DataFrame,
    df_key: pd.DataFrame
) -> str:
    """
    규칙 기반 요약 텍스트 생성 (LLM 미사용)
    """
    lines = []

    # 1. 주요 지수 분석
    df_main = df_indices[~df_indices['name'].str.contains('VIX')].dropna(subset=['pct'])
    if not df_main.empty:
        best = df_main.loc[df_main['pct'].idxmax()]
        worst = df_main.loc[df_main['pct'].idxmin()]

        if best['pct'] > 0:
            lines.append(f"- 미국 증시: {best['name']} {best['pct']:+.2f}%로 상승 마감")
        else:
            lines.append(f"- 미국 증시: {worst['name']} {worst['pct']:+.2f}%로 하락 마감")

        # VIX 언급
        vix = df_indices[df_indices['name'].str.contains('VIX')]
        if not vix.empty and vix['last'].notna().any():
            vix_val = vix['last'].values[0]
            vix_pct = vix['pct'].values[0]
            if vix_pct is not None:
                lines.append(f"- VIX: {vix_val:.2f} ({vix_pct:+.2f}%)")

    # 2. 섹터 분석
    df_sec = df_sectors.dropna(subset=['pct'])
    if not df_sec.empty:
        best_sec = df_sec.loc[df_sec['pct'].idxmax()]
        worst_sec = df_sec.loc[df_sec['pct'].idxmin()]
        lines.append(f"- 섹터: {best_sec['sector']} {best_sec['pct']:+.2f}% 강세, {worst_sec['sector']} {worst_sec['pct']:+.2f}% 약세")

    # 3. 주요 지표 분석
    df_k = df_key.dropna(subset=['pct'])
    if not df_k.empty:
        df_k = df_k.copy()
        df_k['abs_pct'] = df_k['pct'].abs()
        top_movers = df_k.nlargest(2, 'abs_pct')
        mover_texts = [f"{row['name']} {row['pct']:+.2f}%" for _, row in top_movers.iterrows()]
        if mover_texts:
            lines.append(f"- 주요 지표: {', '.join(mover_texts)}")

    # 4. USD/KRW 별도 언급
    krw = df_key[df_key['ticker'] == 'KRW=X']
    if not krw.empty and krw['last'].notna().any():
        krw_val = krw['last'].values[0]
        krw_pct = krw['pct'].values[0]
        if krw_pct is not None:
            direction = "상승(원화 약세)" if krw_pct > 0 else "하락(원화 강세)"
            lines.append(f"- USD/KRW: {krw_val:.2f}원 ({krw_pct:+.2f}%, {direction})")

    return '\n'.join(lines) if lines else "데이터 부족으로 요약 생성 불가"


# =============================================================================
# LLM 기반 시황 요약 생성
# =============================================================================

def generate_narrative_llm(
    df_indices: pd.DataFrame,
    df_sectors: pd.DataFrame,
    df_key: pd.DataFrame
) -> str:
    """
    LLM 기반 시황 요약 생성 (OpenAI GPT)

    Args:
        df_indices: 미국 주요 지수 DataFrame
        df_sectors: S&P500 섹터 DataFrame
        df_key: 주요 지표 DataFrame

    Returns:
        LLM이 생성한 시황 요약 (3~5줄)
    """
    print("[4/4] LLM 시황 요약 생성 중...")

    api_key = os.getenv('OPENAI_API')
    if not api_key:
        print("  [경고] OPENAI_API가 설정되지 않았습니다. LLM 요약 건너뜀.")
        return "OPENAI_API 미설정으로 LLM 요약 생성 불가"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
    except ImportError:
        print("  [경고] openai 패키지가 설치되지 않았습니다.")
        return "openai 패키지 미설치로 LLM 요약 생성 불가"

    # 데이터 요약 텍스트 생성
    data_summary = []

    # 지수 데이터
    data_summary.append("=== 미국 주요 지수 ===")
    for _, row in df_indices.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['name']}: {row['last']} ({row['pct']:+.2f}%)")

    # 섹터 데이터
    data_summary.append("\n=== S&P500 섹터 성과 ===")
    for _, row in df_sectors.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['sector']}: {row['pct']:+.2f}%")

    # 주요 지표
    data_summary.append("\n=== 주요 지표 ===")
    for _, row in df_key.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['name']}: {row['last']} ({row['pct']:+.2f}%)")

    data_text = '\n'.join(data_summary)

    # LLM 프롬프트
    prompt = f"""당신은 증권사 리서치센터의 글로벌 시황 애널리스트입니다.
아래 데이터를 바탕으로 전일 해외 시황을 요약해주세요.

[요구사항]
- 3~5줄의 bullet point 형식 (- 로 시작)
- 핵심 이슈 중심으로 간결하게
- 투자자가 알아야 할 중요한 움직임만 언급
- 수치는 반드시 포함
- 한국어로 작성

[데이터]
{data_text}

[출력 예시]
- 빅테크 매도세 속 하락 지속: 위험자산 회피 심리 가속
- 비트코인 가격도 주요 저지선인 7만 달러가 붕괴된데 이어 6.7만달러까지 하락
- 금/은 가격 급락, 안전자산 선호에도 불구하고 차익실현 매물 출회
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 증권사 글로벌 시황 애널리스트입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )

        summary = response.choices[0].message.content.strip()
        print(f"  -> LLM 요약 생성 완료")
        return summary

    except Exception as e:
        print(f"  [오류] LLM 요약 생성 실패: {e}")
        return f"LLM 요약 생성 실패: {str(e)}"


# =============================================================================
# 엑셀 저장
# =============================================================================

def save_to_excel(
    df_indices: pd.DataFrame,
    df_sectors: pd.DataFrame,
    df_key: pd.DataFrame,
    narrative_rule: str,
    narrative_llm: str,
    output_dir: str
) -> str:
    """
    수집 데이터를 엑셀 파일로 저장

    Args:
        df_indices: 미국 주요 지수
        df_sectors: S&P500 섹터
        df_key: 주요 지표
        narrative_rule: 규칙 기반 요약
        narrative_llm: LLM 기반 요약
        output_dir: 출력 디렉토리

    Returns:
        저장된 파일 경로
    """
    # 출력 폴더 생성
    os.makedirs(output_dir, exist_ok=True)

    # 파일명 생성 (KST 기준)
    today_str = datetime.now().strftime('%Y%m%d')
    filename = f"global_market_summary_{today_str}.xlsx"
    filepath = os.path.join(output_dir, filename)

    # Narrative DataFrames 생성
    today = datetime.now().strftime('%Y-%m-%d')

    df_narrative_rule = pd.DataFrame([{
        'date': today,
        'type': 'rule_based',
        'summary_text': narrative_rule
    }])

    df_narrative_llm = pd.DataFrame([{
        'date': today,
        'type': 'llm_based',
        'summary_text': narrative_llm
    }])

    # 엑셀 저장
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df_indices.to_excel(writer, sheet_name='US_Indices', index=False)
        df_sectors.to_excel(writer, sheet_name='SP500_Sectors', index=False)
        df_key.to_excel(writer, sheet_name='Key_Indices', index=False)
        df_narrative_rule.to_excel(writer, sheet_name='Narrative_Rule', index=False)
        df_narrative_llm.to_excel(writer, sheet_name='Narrative_LLM', index=False)

    print(f"\n[저장 완료] {filepath}")
    return filepath


# =============================================================================
# 메인 실행
# =============================================================================

def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("  전일 해외 시황 요약 수집")
    print(f"  실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    # 스크립트 위치 기준 output 폴더 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_dir = os.path.join(project_dir, 'output')

    # 데이터 수집
    df_indices = get_us_indices_summary()
    df_sectors = get_sp500_sector_performance()
    df_key = get_key_indices()

    # 규칙 기반 요약 생성
    print("[4-1/5] 규칙 기반 요약 생성 중...")
    narrative_rule = generate_narrative_rule_based(df_indices, df_sectors, df_key)

    # LLM 기반 요약 생성
    narrative_llm = generate_narrative_llm(df_indices, df_sectors, df_key)

    # 콘솔에 요약 출력
    print("\n" + "=" * 60)
    print("  [규칙 기반 요약]")
    print("=" * 60)
    print(narrative_rule)

    print("\n" + "=" * 60)
    print("  [LLM 기반 요약]")
    print("=" * 60)
    print(narrative_llm)
    print("=" * 60)

    # 엑셀 저장
    filepath = save_to_excel(
        df_indices, df_sectors, df_key,
        narrative_rule, narrative_llm, output_dir
    )

    print("\n[완료] 모든 작업이 완료되었습니다.")

    return filepath


if __name__ == "__main__":
    main()
