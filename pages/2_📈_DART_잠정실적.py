# coding=utf-8
"""
페이지 2: DART 잠정실적
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="DART 잠정실적", page_icon="📈", layout="wide")


def main():
    st.title("📈 DART 잠정실적 공시")
    st.markdown("KIND에서 잠정실적 공시 수집 → 정규화 → 텔레그램 발송")

    st.markdown("---")

    # 설정
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📅 조회 설정")
        target_date = st.date_input(
            "조회 날짜",
            value=datetime.now().date()
        )
        date_str = target_date.strftime('%Y%m%d')

    with col2:
        st.subheader("⚙️ 옵션")
        send_telegram = st.checkbox("텔레그램 발송", value=False)
        save_excel = st.checkbox("엑셀 저장", value=True)

    st.markdown("---")

    # CLI 명령어 안내
    st.subheader("💻 CLI 실행 방법")
    st.code(f"""
# 특정 날짜 조회
python scripts/2_DART_Prelim_Earnings.py --date={date_str}

# 오늘 날짜 + 텔레그램 발송
python scripts/2_DART_Prelim_Earnings.py --telegram

# 실시간 모니터링 모드
python scripts/2_DART_Prelim_Earnings.py --monitor --interval=5
    """, language="bash")

    st.info("💡 잠정실적 수집은 CLI에서 실행해주세요. 웹 대시보드에서는 결과 조회만 지원합니다.")

    st.markdown("---")

    # 최근 결과
    st.subheader("📁 최근 수집 결과")

    output_dir = os.path.join(PROJECT_DIR, 'output')

    if os.path.exists(output_dir):
        dart_files = [f for f in os.listdir(output_dir)
                      if 'prelim' in f.lower() and f.endswith('.xlsx')]

        if dart_files:
            dart_files.sort(reverse=True)
            selected_file = st.selectbox("파일 선택", dart_files[:10])

            if selected_file:
                filepath = os.path.join(output_dir, selected_file)
                try:
                    # 시트 목록 확인
                    xl = pd.ExcelFile(filepath)
                    sheet_names = xl.sheet_names

                    if len(sheet_names) > 1:
                        selected_sheet = st.selectbox("시트 선택", sheet_names)
                        df = pd.read_excel(filepath, sheet_name=selected_sheet)
                    else:
                        df = pd.read_excel(filepath)

                    st.dataframe(df, use_container_width=True)

                    # 통계
                    st.markdown("**📊 요약**")
                    col1, col2 = st.columns(2)
                    with col1:
                        st.metric("총 공시 수", len(df))
                    with col2:
                        if 'company' in df.columns:
                            st.metric("기업 수", df['company'].nunique())

                except Exception as e:
                    st.error(f"파일 읽기 실패: {e}")
        else:
            st.info("저장된 잠정실적 파일이 없습니다.")
    else:
        st.info("output 폴더가 없습니다.")


if __name__ == "__main__":
    main()
