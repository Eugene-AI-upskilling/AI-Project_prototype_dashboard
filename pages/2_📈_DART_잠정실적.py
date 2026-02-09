# coding=utf-8
"""
페이지 2: DART 잠정실적
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime, timedelta

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

    # 실행 버튼
    if st.button("🔍 잠정실적 조회", type="primary", use_container_width=True):
        st.info(f"조회 중: {target_date.strftime('%Y년 %m월 %d일')}")

        with st.spinner("KIND에서 공시 수집 중..."):
            try:
                # 스크립트 임포트
                scripts_dir = os.path.join(PROJECT_DIR, 'scripts')
                sys.path.insert(0, scripts_dir)

                from _2_DART_Prelim_Earnings import (
                    search_kind_disclosures,
                    get_disclosure_document,
                    parse_earnings_table,
                    normalize_table
                )

                # 공시 검색
                disclosures = search_kind_disclosures(date_str)

                if disclosures:
                    st.success(f"✅ {len(disclosures)}건의 잠정실적 공시 발견")

                    # 진행바
                    progress_bar = st.progress(0)
                    results = []

                    for i, disc in enumerate(disclosures):
                        progress_bar.progress((i + 1) / len(disclosures))

                        try:
                            # 문서 가져오기
                            doc_html = get_disclosure_document(disc['acptno'])
                            if doc_html:
                                # 테이블 파싱
                                tables = parse_earnings_table(doc_html)
                                if tables:
                                    normalized = normalize_table(tables[0], disc['company'])
                                    if normalized:
                                        results.append({
                                            'company': disc['company'],
                                            'title': disc['title'],
                                            'date': disc['date'],
                                            'data': normalized
                                        })
                        except Exception as e:
                            st.warning(f"⚠️ {disc['company']} 처리 실패: {e}")

                    progress_bar.progress(1.0)

                    # 결과 표시
                    if results:
                        st.markdown("### 📊 수집 결과")

                        for r in results:
                            with st.expander(f"📌 {r['company']} - {r['title'][:30]}..."):
                                if isinstance(r['data'], pd.DataFrame):
                                    st.dataframe(r['data'], use_container_width=True)
                                else:
                                    st.json(r['data'])

                        # 텔레그램 발송
                        if send_telegram:
                            st.info("텔레그램 발송 기능은 CLI에서 사용해주세요.")

                    else:
                        st.warning("정규화된 데이터가 없습니다.")

                else:
                    st.warning(f"해당 날짜에 잠정실적 공시가 없습니다.")

            except ImportError as e:
                st.error(f"모듈 로드 실패: {e}")
                st.code(f"python scripts/2_DART_Prelim_Earnings.py --date={date_str}")

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
                    df = pd.read_excel(filepath)
                    st.dataframe(df, use_container_width=True)
                except Exception as e:
                    st.error(f"파일 읽기 실패: {e}")
        else:
            st.info("저장된 잠정실적 파일이 없습니다.")
    else:
        st.info("output 폴더가 없습니다.")

    # CLI 명령어 안내
    st.markdown("---")
    st.subheader("💻 CLI 명령어")
    st.code(f"""
# 특정 날짜 조회
python scripts/2_DART_Prelim_Earnings.py --date={date_str}

# 오늘 날짜 + 텔레그램 발송
python scripts/2_DART_Prelim_Earnings.py --telegram

# 실시간 모니터링 모드
python scripts/2_DART_Prelim_Earnings.py --monitor --interval=5
    """, language="bash")


if __name__ == "__main__":
    main()
