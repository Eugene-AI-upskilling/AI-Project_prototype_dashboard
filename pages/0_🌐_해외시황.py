# coding=utf-8
"""
페이지 0: 해외시황 요약
전일 해외 시황 수집 및 GPT 요약
"""

import streamlit as st
import pandas as pd
import os
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from io import BytesIO

import yfinance as yf

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="해외시황", page_icon="🌐", layout="wide")


# =============================================================================
# 상수 정의
# =============================================================================

US_INDICES = {
    '^DJI': 'Dow Jones',
    '^GSPC': 'S&P 500',
    '^IXIC': 'Nasdaq',
    '^RUT': 'Russell 2000',
    '^SOX': 'SOX (Semiconductor)',
    '^NBI': 'Nasdaq Biotechnology',
    '^VIX': 'VIX',
}

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
# 헬퍼 함수
# =============================================================================

def get_secret(key, default=None):
    """Streamlit secrets 또는 환경변수에서 값 가져오기"""
    try:
        value = st.secrets.get(key)
        if value:
            return value
    except Exception:
        pass

    value = os.environ.get(key)
    if value:
        return value

    return default


def get_last_two_close(ticker: str) -> Tuple[Optional[float], Optional[float]]:
    """최근 2개 거래일의 종가 조회"""
    try:
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

        last_close = df['Close'].iloc[-1]
        prev_close = df['Close'].iloc[-2]

        if hasattr(last_close, 'iloc'):
            last_close = last_close.iloc[0]
        if hasattr(prev_close, 'iloc'):
            prev_close = prev_close.iloc[0]

        return float(last_close), float(prev_close)

    except Exception:
        return None, None


def calculate_pct_change(last: Optional[float], prev: Optional[float]) -> Optional[float]:
    """전일 대비 변동률(%) 계산"""
    if last is None or prev is None or prev == 0:
        return None
    return round((last - prev) / prev * 100, 2)


def get_us_indices_data(progress_callback=None) -> pd.DataFrame:
    """미국 주요 지수 수집"""
    records = []
    today = datetime.now().strftime('%Y-%m-%d')
    total = len(US_INDICES)

    for i, (ticker, name) in enumerate(US_INDICES.items()):
        if progress_callback:
            progress_callback(i / total, f"수집 중: {name}")

        last, prev = get_last_two_close(ticker)
        pct = calculate_pct_change(last, prev)

        if last is not None:
            last = round(last, 2)

        records.append({
            'date': today,
            'name': name,
            'ticker': ticker,
            'last': last,
            'pct': pct
        })

        time.sleep(0.2)

    return pd.DataFrame(records)


def get_sector_data(progress_callback=None) -> pd.DataFrame:
    """S&P500 섹터 성과 수집"""
    records = []
    today = datetime.now().strftime('%Y-%m-%d')
    total = len(SECTOR_ETF_MAP)

    for i, (etf, sector) in enumerate(SECTOR_ETF_MAP.items()):
        if progress_callback:
            progress_callback(i / total, f"수집 중: {sector}")

        last, prev = get_last_two_close(etf)
        pct = calculate_pct_change(last, prev)

        records.append({
            'date': today,
            'sector': sector,
            'etf': etf,
            'pct': pct
        })

        time.sleep(0.2)

    return pd.DataFrame(records)


def get_key_indices_data(progress_callback=None) -> pd.DataFrame:
    """주요 지표 수집"""
    records = []
    today = datetime.now().strftime('%Y-%m-%d')
    total = len(KEY_INDICES)

    for i, (ticker, name) in enumerate(KEY_INDICES.items()):
        if progress_callback:
            progress_callback(i / total, f"수집 중: {name}")

        last, prev = get_last_two_close(ticker)
        pct = calculate_pct_change(last, prev)

        # 10Y Treasury 스케일 보정
        if ticker == '^TNX' and last is not None:
            if last > 20:
                last = last / 100
                if prev is not None:
                    prev = prev / 100
                pct = calculate_pct_change(last, prev)

        if last is not None:
            last = round(last, 2)

        records.append({
            'date': today,
            'name': name,
            'ticker': ticker,
            'last': last,
            'pct': pct
        })

        time.sleep(0.2)

    return pd.DataFrame(records)


def generate_rule_based_summary(df_indices: pd.DataFrame, df_sectors: pd.DataFrame, df_key: pd.DataFrame) -> str:
    """규칙 기반 요약 생성"""
    lines = []

    # 주요 지수 분석
    df_main = df_indices[~df_indices['name'].str.contains('VIX')].dropna(subset=['pct'])
    if not df_main.empty:
        best = df_main.loc[df_main['pct'].idxmax()]
        worst = df_main.loc[df_main['pct'].idxmin()]

        if best['pct'] > 0:
            lines.append(f"- 미국 증시: {best['name']} {best['pct']:+.2f}%로 상승 마감")
        else:
            lines.append(f"- 미국 증시: {worst['name']} {worst['pct']:+.2f}%로 하락 마감")

        # VIX
        vix = df_indices[df_indices['name'].str.contains('VIX')]
        if not vix.empty and vix['last'].notna().any():
            vix_val = vix['last'].values[0]
            vix_pct = vix['pct'].values[0]
            if vix_pct is not None:
                lines.append(f"- VIX: {vix_val:.2f} ({vix_pct:+.2f}%)")

    # 섹터 분석
    df_sec = df_sectors.dropna(subset=['pct'])
    if not df_sec.empty:
        best_sec = df_sec.loc[df_sec['pct'].idxmax()]
        worst_sec = df_sec.loc[df_sec['pct'].idxmin()]
        lines.append(f"- 섹터: {best_sec['sector']} {best_sec['pct']:+.2f}% 강세, {worst_sec['sector']} {worst_sec['pct']:+.2f}% 약세")

    # 주요 지표
    df_k = df_key.dropna(subset=['pct'])
    if not df_k.empty:
        df_k = df_k.copy()
        df_k['abs_pct'] = df_k['pct'].abs()
        top_movers = df_k.nlargest(2, 'abs_pct')
        mover_texts = [f"{row['name']} {row['pct']:+.2f}%" for _, row in top_movers.iterrows()]
        if mover_texts:
            lines.append(f"- 주요 지표: {', '.join(mover_texts)}")

    # USD/KRW
    krw = df_key[df_key['ticker'] == 'KRW=X']
    if not krw.empty and krw['last'].notna().any():
        krw_val = krw['last'].values[0]
        krw_pct = krw['pct'].values[0]
        if krw_pct is not None:
            direction = "원화 약세" if krw_pct > 0 else "원화 강세"
            lines.append(f"- USD/KRW: {krw_val:.2f}원 ({krw_pct:+.2f}%, {direction})")

    return '\n'.join(lines) if lines else "데이터 부족으로 요약 생성 불가"


def generate_llm_summary(df_indices: pd.DataFrame, df_sectors: pd.DataFrame, df_key: pd.DataFrame) -> str:
    """LLM 기반 시황 요약 생성"""
    api_key = get_secret('OPENAI_API') or get_secret('OPENAI_API_KEY')

    if not api_key:
        return "OpenAI API 키가 설정되지 않았습니다."

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
    except ImportError:
        return "openai 패키지가 설치되지 않았습니다."

    # 데이터 요약 텍스트
    data_summary = []

    data_summary.append("=== 미국 주요 지수 ===")
    for _, row in df_indices.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['name']}: {row['last']} ({row['pct']:+.2f}%)")

    data_summary.append("\n=== S&P500 섹터 성과 ===")
    for _, row in df_sectors.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['sector']}: {row['pct']:+.2f}%")

    data_summary.append("\n=== 주요 지표 ===")
    for _, row in df_key.iterrows():
        if pd.notna(row['pct']):
            data_summary.append(f"{row['name']}: {row['last']} ({row['pct']:+.2f}%)")

    data_text = '\n'.join(data_summary)

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

        return response.choices[0].message.content.strip()

    except Exception as e:
        return f"LLM 요약 생성 실패: {str(e)}"


# =============================================================================
# 메인 앱
# =============================================================================

def main():
    st.title("🌐 해외시황 요약")
    st.markdown("전일 해외 시황 수집 → 분석 → GPT 요약")

    st.markdown("---")

    # 수집 버튼
    if st.button("🔍 해외시황 수집", type="primary", use_container_width=True):

        progress_bar = st.progress(0)
        status_text = st.empty()

        # 1단계: 미국 주요 지수
        status_text.text("1/3 미국 주요 지수 수집 중...")
        df_indices = get_us_indices_data(
            lambda p, t: (progress_bar.progress(p * 0.33), status_text.text(t))
        )
        progress_bar.progress(0.33)

        # 2단계: S&P500 섹터
        status_text.text("2/3 S&P500 섹터 수집 중...")
        df_sectors = get_sector_data(
            lambda p, t: (progress_bar.progress(0.33 + p * 0.33), status_text.text(t))
        )
        progress_bar.progress(0.66)

        # 3단계: 주요 지표
        status_text.text("3/3 주요 지표 수집 중...")
        df_key = get_key_indices_data(
            lambda p, t: (progress_bar.progress(0.66 + p * 0.34), status_text.text(t))
        )
        progress_bar.progress(1.0)
        status_text.text("완료!")

        # 세션에 저장
        st.session_state['market_indices'] = df_indices
        st.session_state['market_sectors'] = df_sectors
        st.session_state['market_key'] = df_key

        st.success("✅ 데이터 수집 완료!")

    # 결과 표시
    if 'market_indices' in st.session_state:
        df_indices = st.session_state['market_indices']
        df_sectors = st.session_state['market_sectors']
        df_key = st.session_state['market_key']

        st.markdown("---")

        # 탭으로 구분
        tab1, tab2, tab3, tab4 = st.tabs(["📊 주요 지수", "📈 섹터 성과", "💹 주요 지표", "📝 시황 요약"])

        with tab1:
            st.subheader("미국 주요 지수")

            # 테이블 표시
            df_display = df_indices[['name', 'ticker', 'last', 'pct']].copy()
            df_display.columns = ['지수명', '티커', '종가', '등락률(%)']

            # 색상 표시를 위한 스타일링
            def color_pct(val):
                if pd.isna(val):
                    return ''
                color = 'red' if val < 0 else 'green' if val > 0 else 'black'
                return f'color: {color}'

            st.dataframe(
                df_display.style.applymap(color_pct, subset=['등락률(%)']),
                use_container_width=True
            )

            # 차트
            df_chart = df_indices[df_indices['pct'].notna()].copy()
            if not df_chart.empty:
                st.bar_chart(df_chart.set_index('name')['pct'])

        with tab2:
            st.subheader("S&P500 섹터 성과")

            df_display = df_sectors[['sector', 'etf', 'pct']].copy()
            df_display.columns = ['섹터', 'ETF', '등락률(%)']

            st.dataframe(
                df_display.style.applymap(color_pct, subset=['등락률(%)']),
                use_container_width=True
            )

            # 차트 (정렬)
            df_chart = df_sectors[df_sectors['pct'].notna()].copy()
            if not df_chart.empty:
                df_chart = df_chart.sort_values('pct', ascending=True)
                st.bar_chart(df_chart.set_index('sector')['pct'])

        with tab3:
            st.subheader("주요 지표")

            df_display = df_key[['name', 'ticker', 'last', 'pct']].copy()
            df_display.columns = ['지표명', '티커', '현재가', '등락률(%)']

            st.dataframe(
                df_display.style.applymap(color_pct, subset=['등락률(%)']),
                use_container_width=True
            )

        with tab4:
            st.subheader("📝 시황 요약")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("### 규칙 기반 요약")
                rule_summary = generate_rule_based_summary(df_indices, df_sectors, df_key)
                st.markdown(rule_summary)

            with col2:
                st.markdown("### GPT 요약")
                if st.button("🤖 GPT 요약 생성", use_container_width=True):
                    with st.spinner("GPT 요약 생성 중..."):
                        llm_summary = generate_llm_summary(df_indices, df_sectors, df_key)
                        st.session_state['llm_summary'] = llm_summary

                if 'llm_summary' in st.session_state:
                    st.markdown(st.session_state['llm_summary'])

        # 엑셀 다운로드
        st.markdown("---")

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_indices.to_excel(writer, sheet_name='US_Indices', index=False)
            df_sectors.to_excel(writer, sheet_name='SP500_Sectors', index=False)
            df_key.to_excel(writer, sheet_name='Key_Indices', index=False)

            # 요약 시트
            rule_summary = generate_rule_based_summary(df_indices, df_sectors, df_key)
            df_summary = pd.DataFrame([{
                'date': datetime.now().strftime('%Y-%m-%d'),
                'rule_summary': rule_summary,
                'llm_summary': st.session_state.get('llm_summary', '')
            }])
            df_summary.to_excel(writer, sheet_name='Summary', index=False)

        output.seek(0)

        st.download_button(
            label="📥 엑셀 다운로드",
            data=output,
            file_name=f"global_market_summary_{datetime.now().strftime('%Y%m%d')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    # 안내
    st.markdown("---")
    with st.expander("ℹ️ 수집 항목 안내"):
        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown("**미국 주요 지수**")
            for ticker, name in US_INDICES.items():
                st.caption(f"• {name} ({ticker})")

        with col2:
            st.markdown("**S&P500 섹터 ETF**")
            for etf, sector in SECTOR_ETF_MAP.items():
                st.caption(f"• {sector} ({etf})")

        with col3:
            st.markdown("**주요 지표**")
            for ticker, name in KEY_INDICES.items():
                st.caption(f"• {name} ({ticker})")


if __name__ == "__main__":
    main()
