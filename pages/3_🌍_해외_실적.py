# coding=utf-8
"""
페이지 3: 해외 기업 실적
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="해외 실적", page_icon="🌍", layout="wide")

# 섹터 정의
TICKER_GROUPS = {
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


def main():
    st.title("🌍 해외 기업 실적")
    st.markdown("글로벌 98개 종목 실적 발표일 및 EPS 추적")

    st.markdown("---")

    # 탭 구성
    tab1, tab2, tab3 = st.tabs(["📊 실적 데이터", "📅 다가오는 실적", "⚙️ 설정"])

    with tab1:
        st.subheader("📊 섹터별 실적 데이터")

        # 엑셀 파일 로드
        output_dir = os.path.join(PROJECT_DIR, 'output')
        excel_path = os.path.join(output_dir, 'global_earnings.xlsx')

        if os.path.exists(excel_path):
            try:
                df = pd.read_excel(excel_path, sheet_name='All')

                # 섹터 필터
                sectors = df['sector'].unique().tolist()
                selected_sectors = st.multiselect(
                    "섹터 선택",
                    sectors,
                    default=sectors[:3]
                )

                if selected_sectors:
                    filtered_df = df[df['sector'].isin(selected_sectors)]
                    st.dataframe(filtered_df, use_container_width=True)

                    # 통계
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("총 종목 수", len(filtered_df))
                    with col2:
                        with_earnings = filtered_df['next_earnings_date'].notna().sum()
                        st.metric("실적발표일 있음", with_earnings)
                    with col3:
                        with_eps = filtered_df['eps'].notna().sum()
                        st.metric("EPS 데이터 있음", with_eps)

            except Exception as e:
                st.error(f"파일 로드 실패: {e}")
        else:
            st.warning("데이터 파일이 없습니다. 먼저 수집을 실행해주세요.")
            if st.button("🔄 데이터 수집 실행"):
                st.code("python scripts/3_Global_Earnings.py", language="bash")

    with tab2:
        st.subheader("📅 다가오는 실적 발표")

        if os.path.exists(excel_path):
            try:
                df_upcoming = pd.read_excel(excel_path, sheet_name='Upcoming')

                if not df_upcoming.empty:
                    # 날짜 필터
                    days_ahead = st.slider("앞으로 며칠", 7, 90, 30)

                    df_upcoming['next_earnings_date'] = pd.to_datetime(df_upcoming['next_earnings_date'])
                    cutoff = datetime.now() + pd.Timedelta(days=days_ahead)
                    df_filtered = df_upcoming[df_upcoming['next_earnings_date'] <= cutoff]

                    st.dataframe(df_filtered, use_container_width=True)

                    # 달력 뷰
                    st.markdown("### 📆 실적 발표 일정")
                    for _, row in df_filtered.head(15).iterrows():
                        date_str = row['next_earnings_date'].strftime('%Y-%m-%d')
                        eps_est = f"(Est: {row['eps_estimate']:.2f})" if pd.notna(row.get('eps_estimate')) else ""
                        st.markdown(f"- **{date_str}** | `{row['ticker']}` {row.get('name', '')} {eps_est}")

                else:
                    st.info("다가오는 실적 발표 데이터가 없습니다.")

            except Exception as e:
                st.error(f"파일 로드 실패: {e}")
        else:
            st.warning("데이터 파일이 없습니다.")

    with tab3:
        st.subheader("⚙️ 섹터 및 종목 설정")

        st.markdown("### 현재 추적 중인 섹터")

        for sector, tickers in TICKER_GROUPS.items():
            with st.expander(f"{sector} ({len(tickers)}종목)"):
                st.write(", ".join(tickers))

        st.markdown("---")

        st.markdown("### 💻 CLI 명령어")
        st.code("""
# 전체 수집 (캐시 사용)
python scripts/3_Global_Earnings.py

# 캐시 무시하고 새로 수집
python scripts/3_Global_Earnings.py --no-cache
        """, language="bash")

        # 수집 버튼
        if st.button("🔄 새로 수집하기", type="primary"):
            st.info("CLI에서 실행해주세요:")
            st.code("python scripts/3_Global_Earnings.py --no-cache", language="bash")


if __name__ == "__main__":
    main()
