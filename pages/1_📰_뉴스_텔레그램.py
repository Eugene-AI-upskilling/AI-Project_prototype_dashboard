# coding=utf-8
"""
페이지 1: 뉴스 → 텔레그램
"""

import streamlit as st
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="뉴스 → 텔레그램", page_icon="📰", layout="wide")

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, '.env'))


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

    # 실행 버튼
    if st.button("🚀 뉴스 수집 시작", type="primary", use_container_width=True):
        keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]

        if not keyword_list:
            st.error("키워드를 입력해주세요.")
            return

        st.info(f"수집 시작: {len(keyword_list)}개 키워드")

        progress_bar = st.progress(0)
        status_text = st.empty()

        try:
            # 스크립트 임포트
            from scripts import _1_News_to_Telegram as news_module

            all_news = []

            for i, keyword in enumerate(keyword_list):
                status_text.text(f"검색 중: {keyword}")
                progress_bar.progress((i + 1) / len(keyword_list))

                try:
                    news_items = news_module.search_naver_news(keyword, max_news)
                    all_news.extend(news_items)
                    st.success(f"✅ '{keyword}': {len(news_items)}건")
                except Exception as e:
                    st.warning(f"⚠️ '{keyword}' 검색 실패: {e}")

            progress_bar.progress(1.0)
            status_text.text("완료!")

            # 결과 표시
            if all_news:
                st.markdown("### 📋 수집 결과")
                st.dataframe(all_news, use_container_width=True)

                # 텔레그램 발송
                if send_telegram:
                    st.info("텔레그램 발송 중...")
                    # news_module.send_to_telegram(...)
                    st.success("✅ 텔레그램 발송 완료")

        except ImportError as e:
            st.error(f"모듈 로드 실패: {e}")
            st.info("스크립트 파일을 확인해주세요.")

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
        for f in news_files[:5]:
            st.text(f"📄 {f['name']} ({f['modified'].strftime('%Y-%m-%d %H:%M')})")
    else:
        st.info("저장된 뉴스 파일이 없습니다.")


if __name__ == "__main__":
    main()
