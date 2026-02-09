# coding=utf-8
"""
페이지 1: 뉴스 → 텔레그램
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="뉴스 → 텔레그램", page_icon="📰", layout="wide")


def main():
    st.title("📰 뉴스 → 텔레그램")
    st.markdown("네이버 뉴스 검색 → GPT 요약 → 텔레그램 발송")

    st.markdown("---")

    # 설정
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🔍 검색 설정")
        keywords = st.text_area(
            "검색 키워드 (줄바꿈으로 구분)",
            value="삼성전자\nSK하이닉스\n반도체",
            height=150
        )
        max_news = st.slider("키워드당 뉴스 수", 1, 20, 5)

    with col2:
        st.subheader("⚙️ 발송 설정")
        send_telegram = st.checkbox("텔레그램 발송", value=True)
        save_excel = st.checkbox("엑셀 저장", value=True)
        use_gpt = st.checkbox("GPT 요약 사용", value=True)

    st.markdown("---")

    # CLI 명령어 안내
    st.subheader("💻 CLI 실행 방법")
    keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]
    st.code(f"""
# 뉴스 수집 실행
python scripts/1_News_to_Telegram.py

# 키워드: {', '.join(keyword_list[:3])}...
    """, language="bash")

    st.info("💡 뉴스 수집은 CLI에서 실행해주세요. 웹 대시보드에서는 결과 조회만 지원합니다.")

    st.markdown("---")

    # 최근 결과
    st.subheader("📁 최근 수집 결과")

    output_dir = os.path.join(PROJECT_DIR, 'output')
    news_files = []

    if os.path.exists(output_dir):
        for f in os.listdir(output_dir):
            if 'news' in f.lower() and f.endswith('.xlsx'):
                filepath = os.path.join(output_dir, f)
                news_files.append({
                    'name': f,
                    'path': filepath,
                    'modified': datetime.fromtimestamp(os.path.getmtime(filepath))
                })

    if news_files:
        news_files.sort(key=lambda x: x['modified'], reverse=True)

        selected = st.selectbox("파일 선택", [f['name'] for f in news_files[:10]])

        if selected:
            filepath = os.path.join(output_dir, selected)
            try:
                df = pd.read_excel(filepath)
                st.dataframe(df, use_container_width=True)
            except Exception as e:
                st.error(f"파일 읽기 실패: {e}")
    else:
        st.info("저장된 뉴스 파일이 없습니다.")


if __name__ == "__main__":
    main()
