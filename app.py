# coding=utf-8
"""
================================================================================
Eugene AI Project - Streamlit Dashboard
================================================================================
멀티페이지 대시보드 메인 앱

실행 방법:
$ streamlit run app.py

배포:
- Streamlit Community Cloud: https://share.streamlit.io
- GitHub 연동 후 자동 배포

================================================================================
"""

import streamlit as st
import os
from datetime import datetime

# 페이지 설정
st.set_page_config(
    page_title="Eugene AI Project",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))


# =============================================================================
# 환경변수/Secrets 유틸리티
# =============================================================================

def get_secret(key: str, default: str = None) -> str:
    """
    Streamlit secrets 또는 환경변수에서 값 가져오기
    배포 환경과 로컬 환경 모두 지원
    """
    # 1. Streamlit secrets 확인 (배포 환경)
    try:
        if hasattr(st, 'secrets') and key in st.secrets:
            return st.secrets[key]
    except:
        pass

    # 2. 환경변수 확인 (로컬 환경)
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_DIR, '.env'))
    value = os.getenv(key)

    if value:
        return value

    return default


# 전역 설정 로드
OPENAI_API = get_secret('OPENAI_API')
BOT_TOKEN = get_secret('BOT_TOKEN')
CHAT_ID = get_secret('CHAT_ID')
NAVER_CLIENT_ID = get_secret('NAVER_CLIENT_ID')
NAVER_CLIENT_SECRET = get_secret('NAVER_CLIENT_SECRET')
DART_KEY = get_secret('dart_key') or get_secret('DART_KEY')


def main():
    # 사이드바
    with st.sidebar:
        st.title("📊 Eugene AI Project")
        st.markdown("---")
        st.markdown("### 메뉴")
        st.markdown("""
        - 🏠 **홈** (현재 페이지)
        - 📰 뉴스 → 텔레그램
        - 📈 DART 잠정실적
        - 🌍 해외 실적
        - 🎙️ 컨콜 요약
        - 📱 소셜 트래커
        - 🌐 웹 크롤링
        """)
        st.markdown("---")
        st.caption(f"v1.0 | {datetime.now().strftime('%Y-%m-%d')}")

    # 메인 콘텐츠
    st.title("🏠 Eugene AI Project Dashboard")
    st.markdown("**금융 데이터 수집 및 분석 자동화 플랫폼**")

    st.markdown("---")

    # 기능 개요
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("### 📰 뉴스 모니터링")
        st.markdown("""
        - 네이버 뉴스 키워드 검색
        - GPT 요약 생성
        - 텔레그램 자동 발송
        """)
        status1 = st.success("✅ 운영중")

    with col2:
        st.markdown("### 📈 DART 잠정실적")
        st.markdown("""
        - KIND 잠정실적 공시 수집
        - 실적 테이블 정규화
        - 텔레그램 알림
        """)
        status2 = st.success("✅ 운영중")

    with col3:
        st.markdown("### 🌍 해외 기업 실적")
        st.markdown("""
        - 98개 글로벌 종목 추적
        - 실적 발표일 모니터링
        - 섹터별 분류
        """)
        status3 = st.success("✅ 운영중")

    col4, col5, col6 = st.columns(3)

    with col4:
        st.markdown("### 🎙️ 컨콜 요약")
        st.markdown("""
        - 컨퍼런스콜 원문 입력
        - GPT 자동 요약
        - 표준 양식 출력
        """)
        status4 = st.success("✅ 운영중")

    with col5:
        st.markdown("### 📱 소셜 트래커")
        st.markdown("""
        - Instagram/TikTok 모니터링
        - 키워드 기반 추적
        - 트렌드 분석
        """)
        status5 = st.warning("🚧 준비중")

    with col6:
        st.markdown("### 🌐 웹 크롤링")
        st.markdown("""
        - TRASS 수출입 통계
        - KITA 무역 뉴스
        - 데이터 시각화
        """)
        status6 = st.warning("🚧 기획중")

    st.markdown("---")

    # 최근 출력 파일
    st.markdown("### 📁 최근 출력 파일")

    output_dir = os.path.join(PROJECT_DIR, 'output')
    if os.path.exists(output_dir):
        files = []
        for root, dirs, filenames in os.walk(output_dir):
            for f in filenames:
                if f.endswith(('.xlsx', '.json')):
                    filepath = os.path.join(root, f)
                    mtime = os.path.getmtime(filepath)
                    files.append({
                        'name': f,
                        'path': filepath,
                        'modified': datetime.fromtimestamp(mtime)
                    })

        # 최근 수정순 정렬
        files.sort(key=lambda x: x['modified'], reverse=True)

        if files:
            for f in files[:10]:
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    st.text(f"📄 {f['name']}")
                with col_b:
                    st.caption(f['modified'].strftime('%m-%d %H:%M'))
        else:
            st.info("출력 파일이 없습니다.")
    else:
        st.info("output 폴더가 없습니다.")

    st.markdown("---")

    # 빠른 실행
    st.markdown("### ⚡ 빠른 실행")

    col_run1, col_run2, col_run3 = st.columns(3)

    with col_run1:
        if st.button("📰 뉴스 수집 실행", use_container_width=True):
            st.info("👉 '뉴스 → 텔레그램' 페이지에서 실행하세요")

    with col_run2:
        if st.button("📈 잠정실적 수집", use_container_width=True):
            st.info("👉 'DART 잠정실적' 페이지에서 실행하세요")

    with col_run3:
        if st.button("🌍 해외실적 수집", use_container_width=True):
            st.info("👉 '해외 실적' 페이지에서 실행하세요")


if __name__ == "__main__":
    main()
