# coding=utf-8
"""
페이지 3: 해외 기업 실적 - 웹에서 직접 수집
"""

import streamlit as st
import pandas as pd
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from io import BytesIO

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="해외 실적", page_icon="🌍", layout="wide")


# =============================================================================
# 섹터별 티커 그룹 (기본값)
# =============================================================================

DEFAULT_TICKER_GROUPS = {
    "빅테크 7": ["AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "TSLA", "META"],
    "반도체 관련주": ["AVGO", "INTC", "LRCX", "QCOM", "MU", "AMD"],
    "AI 관련주": ["SNPS", "CDNS", "ANET", "NOW", "ADI"],
    "소셜미디어": ["PINS", "SPOT", "SNAP", "MTCH", "NFLX"],
    "게임": ["TTWO", "U", "NTDOY", "NTES", "EA"],
    "코인": ["MSTR", "COIN", "RIOT", "MARA", "APLD"],
    "방산": ["BA", "LMT", "NOC", "RTX"],
    "비만치료제": ["NVO", "LLY", "AMGN", "PFE", "VKTX"],
}


def get_ticker_groups() -> Dict[str, List[str]]:
    """세션에서 티커 그룹 가져오기 (없으면 기본값 사용)"""
    if 'ticker_groups' not in st.session_state:
        st.session_state['ticker_groups'] = DEFAULT_TICKER_GROUPS.copy()
    return st.session_state['ticker_groups']


# =============================================================================
# 실적 데이터 수집
# =============================================================================

def get_earnings_data(ticker: str) -> Dict[str, Any]:
    """yfinance로 실적 데이터 수집"""
    import yfinance as yf

    result = {
        'ticker': ticker,
        'name': None,
        'next_earnings_date': None,
        'last_earnings_date': None,
        'eps': None,
        'eps_estimate': None,
        'revenue': None,
    }

    try:
        stock = yf.Ticker(ticker)

        # 기업명
        info = stock.info
        result['name'] = info.get('shortName') or info.get('longName') or ticker

        # 실적 발표일
        try:
            earnings_dates = stock.get_earnings_dates()
            if earnings_dates is not None and not earnings_dates.empty:
                # timezone 제거
                earnings_dates.index = earnings_dates.index.tz_localize(None)
                today = datetime.now()

                # 다음 실적 발표일
                future_dates = earnings_dates[earnings_dates.index > today]
                if not future_dates.empty:
                    next_date = future_dates.index[-1]
                    result['next_earnings_date'] = next_date.strftime('%Y-%m-%d')

                    if 'EPS Estimate' in future_dates.columns:
                        est = future_dates['EPS Estimate'].iloc[-1]
                        if pd.notna(est):
                            result['eps_estimate'] = float(est)

                # 최근 실적 발표일
                past_dates = earnings_dates[earnings_dates.index <= today]
                if not past_dates.empty:
                    last_date = past_dates.index[0]
                    result['last_earnings_date'] = last_date.strftime('%Y-%m-%d')

                    if 'Reported EPS' in past_dates.columns:
                        eps = past_dates['Reported EPS'].iloc[0]
                        if pd.notna(eps):
                            result['eps'] = float(eps)
        except:
            pass

        # 매출액
        try:
            financials = stock.quarterly_financials
            if financials is not None and not financials.empty:
                revenue_rows = [r for r in financials.index if 'revenue' in r.lower()]
                if revenue_rows:
                    latest_revenue = financials.loc[revenue_rows[0]].iloc[0]
                    if pd.notna(latest_revenue):
                        result['revenue'] = float(latest_revenue)
        except:
            pass

    except Exception as e:
        pass

    return result


# =============================================================================
# 메인 앱
# =============================================================================

def main():
    st.title("🌍 해외 기업 실적")
    st.markdown("글로벌 종목 실적 발표일 및 EPS 추적 (yfinance)")

    st.markdown("---")

    # 탭 구성
    tab1, tab2, tab3 = st.tabs(["📊 데이터 수집", "📅 다가오는 실적", "⚙️ 섹터 설정"])

    with tab1:
        st.subheader("📊 실적 데이터 수집")

        # 티커 그룹 가져오기
        ticker_groups = get_ticker_groups()

        # 섹터 선택
        selected_sectors = st.multiselect(
            "수집할 섹터 선택",
            list(ticker_groups.keys()),
            default=[s for s in ["빅테크 7", "반도체 관련주"] if s in ticker_groups]
        )

        if not selected_sectors:
            st.warning("섹터를 선택해주세요.")
            return

        # 선택된 티커 수
        total_tickers = sum(len(ticker_groups[s]) for s in selected_sectors)
        st.info(f"선택된 섹터: {len(selected_sectors)}개, 총 {total_tickers}개 종목")

        # 수집 버튼
        if st.button("🔍 실적 데이터 수집", type="primary", use_container_width=True):

            all_data = []
            progress_bar = st.progress(0)
            status_text = st.empty()

            processed = 0

            for sector in selected_sectors:
                tickers = ticker_groups[sector]

                for ticker in tickers:
                    status_text.text(f"수집 중: {ticker} ({sector})")
                    processed += 1
                    progress_bar.progress(processed / total_tickers)

                    data = get_earnings_data(ticker)
                    data['sector'] = sector
                    all_data.append(data)

                    time.sleep(0.3)

            progress_bar.progress(1.0)
            status_text.text("완료!")

            # 결과 저장
            df = pd.DataFrame(all_data)
            st.session_state['earnings_data'] = df

            st.success(f"✅ {len(df)}개 종목 수집 완료")

        # 결과 표시
        if 'earnings_data' in st.session_state:
            df = st.session_state['earnings_data']

            st.markdown("---")
            st.subheader("📋 수집 결과")

            # 섹터 필터
            sectors = df['sector'].unique().tolist()
            selected_filter = st.selectbox("섹터 필터", ["전체"] + sectors)

            if selected_filter == "전체":
                filtered_df = df
            else:
                filtered_df = df[df['sector'] == selected_filter]

            # 테이블 표시
            display_cols = ['sector', 'ticker', 'name', 'next_earnings_date', 'eps', 'eps_estimate']
            display_df = filtered_df[display_cols].copy()
            display_df.columns = ['섹터', '티커', '기업명', '다음 실적발표', 'EPS', 'EPS 추정']

            st.dataframe(display_df, use_container_width=True)

            # 통계
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("총 종목", len(filtered_df))
            with col2:
                with_date = filtered_df['next_earnings_date'].notna().sum()
                st.metric("실적발표일 있음", with_date)
            with col3:
                with_eps = filtered_df['eps'].notna().sum()
                st.metric("EPS 데이터 있음", with_eps)

            # 엑셀 다운로드
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='All', index=False)

                # 섹터별 시트
                for sector in df['sector'].unique():
                    df_sector = df[df['sector'] == sector]
                    sheet_name = sector[:31].replace('/', '_')
                    df_sector.to_excel(writer, sheet_name=sheet_name, index=False)

            output.seek(0)

            st.download_button(
                label="📥 엑셀 다운로드",
                data=output,
                file_name=f"global_earnings_{datetime.now().strftime('%Y%m%d')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )

    with tab2:
        st.subheader("📅 다가오는 실적 발표")

        if 'earnings_data' in st.session_state:
            df = st.session_state['earnings_data']

            # 다가오는 실적
            df_upcoming = df[df['next_earnings_date'].notna()].copy()

            if not df_upcoming.empty:
                df_upcoming['next_earnings_date'] = pd.to_datetime(df_upcoming['next_earnings_date'])
                df_upcoming = df_upcoming.sort_values('next_earnings_date')

                # 기간 필터
                days_ahead = st.slider("앞으로 며칠", 7, 60, 30)
                cutoff = datetime.now() + timedelta(days=days_ahead)
                df_filtered = df_upcoming[df_upcoming['next_earnings_date'] <= cutoff]

                if not df_filtered.empty:
                    st.markdown("### 📆 실적 발표 일정")

                    for _, row in df_filtered.iterrows():
                        date_str = row['next_earnings_date'].strftime('%Y-%m-%d')
                        eps_est = f"(Est: {row['eps_estimate']:.2f})" if pd.notna(row.get('eps_estimate')) else ""
                        name = row['name'][:30] if row['name'] else row['ticker']

                        st.markdown(f"- **{date_str}** | `{row['ticker']}` {name} {eps_est}")
                else:
                    st.info("해당 기간에 실적 발표가 없습니다.")
            else:
                st.info("실적 발표일 데이터가 없습니다.")
        else:
            st.info("먼저 '데이터 수집' 탭에서 데이터를 수집해주세요.")

    with tab3:
        st.subheader("⚙️ 섹터별 종목 설정")
        st.caption("티커를 쉼표(,)로 구분하여 입력하세요. 변경 후 '저장' 버튼을 눌러주세요.")

        ticker_groups = get_ticker_groups()

        # 섹터별 편집
        updated_groups = {}
        sectors_to_delete = []

        for sector in list(ticker_groups.keys()):
            tickers = ticker_groups[sector]

            with st.expander(f"**{sector}** ({len(tickers)}종목)", expanded=False):
                col1, col2 = st.columns([5, 1])

                with col1:
                    ticker_input = st.text_area(
                        f"{sector} 티커 목록",
                        value=", ".join(tickers),
                        height=80,
                        key=f"ticker_{sector}",
                        label_visibility="collapsed"
                    )
                    # 파싱
                    new_tickers = [t.strip().upper() for t in ticker_input.split(",") if t.strip()]
                    updated_groups[sector] = new_tickers

                with col2:
                    if st.button("🗑️", key=f"del_{sector}", help=f"{sector} 섹터 삭제"):
                        sectors_to_delete.append(sector)

        # 삭제 처리
        for sector in sectors_to_delete:
            if sector in updated_groups:
                del updated_groups[sector]

        st.markdown("---")

        # 새 섹터 추가
        st.markdown("### ➕ 새 섹터 추가")
        col1, col2 = st.columns(2)

        with col1:
            new_sector_name = st.text_input("섹터명", placeholder="예: 전기차")

        with col2:
            new_sector_tickers = st.text_input("티커 (쉼표 구분)", placeholder="예: TSLA, RIVN, LCID")

        if st.button("➕ 섹터 추가", use_container_width=True):
            if new_sector_name and new_sector_tickers:
                new_tickers = [t.strip().upper() for t in new_sector_tickers.split(",") if t.strip()]
                if new_tickers:
                    updated_groups[new_sector_name] = new_tickers
                    st.session_state['ticker_groups'] = updated_groups
                    st.success(f"✅ '{new_sector_name}' 섹터 추가됨 ({len(new_tickers)}종목)")
                    st.rerun()
            else:
                st.warning("섹터명과 티커를 모두 입력해주세요.")

        st.markdown("---")

        # 저장/초기화 버튼
        col1, col2 = st.columns(2)

        with col1:
            if st.button("💾 변경사항 저장", type="primary", use_container_width=True):
                st.session_state['ticker_groups'] = updated_groups
                total = sum(len(v) for v in updated_groups.values())
                st.success(f"✅ 저장 완료! ({len(updated_groups)}개 섹터, {total}개 종목)")

        with col2:
            if st.button("🔄 기본값으로 초기화", use_container_width=True):
                st.session_state['ticker_groups'] = DEFAULT_TICKER_GROUPS.copy()
                st.success("✅ 기본값으로 초기화되었습니다.")
                st.rerun()

        # 현재 상태 요약
        st.markdown("---")
        total_sectors = len(updated_groups)
        total_tickers = sum(len(v) for v in updated_groups.values())
        st.info(f"📊 현재 설정: **{total_sectors}개 섹터**, **{total_tickers}개 종목**")


if __name__ == "__main__":
    main()
