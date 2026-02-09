# coding=utf-8
"""
페이지 5: 소셜 트래커 (준비중)
"""

import streamlit as st
import os
from datetime import datetime

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="소셜 트래커", page_icon="📱", layout="wide")


def main():
    st.title("📱 소셜 미디어 트래커")

    # 준비중 배너
    st.warning("🚧 **이 기능은 현재 준비중입니다.**")

    st.markdown("---")

    # 기능 소개
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 📸 Instagram")
        st.markdown("""
        **향후 지원 예정 기능:**
        - 해시태그 기반 게시물 검색
        - 인플루언서 계정 모니터링
        - 좋아요/댓글 수 추적
        - 트렌드 분석
        """)

        st.info("""
        **필요 사항:**
        - Facebook Developer 계정
        - Instagram Business 계정
        - Graph API 액세스 토큰
        """)

    with col2:
        st.markdown("### 🎵 TikTok")
        st.markdown("""
        **향후 지원 예정 기능:**
        - 키워드 기반 비디오 검색
        - 인기 해시태그 추적
        - 조회수/좋아요 분석
        - 크리에이터 모니터링
        """)

        st.info("""
        **필요 사항:**
        - TikTok for Developers 계정
        - Research API 승인
        - API 키 발급
        """)

    st.markdown("---")

    # Placeholder 키워드 설정
    st.markdown("### ⚙️ 모니터링 키워드 (Placeholder)")

    keywords = st.text_area(
        "키워드 목록",
        value="삼성전자\nNVIDIA\nAI\n반도체",
        height=150
    )

    keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]

    st.markdown("**설정된 키워드:**")
    for kw in keyword_list:
        st.markdown(f"- `{kw}`")

    st.markdown("---")

    # 데이터 구조 미리보기
    st.markdown("### 📊 데이터 구조 (예정)")

    import pandas as pd

    sample_data = pd.DataFrame({
        'platform': ['instagram', 'tiktok', 'instagram'],
        'author': ['@user1', '@creator2', '@brand3'],
        'content': ['새로운 AI 기술 소개...', '반도체 관련 영상...', '삼성전자 신제품...'],
        'keyword': ['AI', '반도체', '삼성전자'],
        'likes': [1523, 45200, 892],
        'comments': [45, 234, 12],
        'views': [None, 150000, None],
        'posted_at': ['2026-02-08', '2026-02-07', '2026-02-09']
    })

    st.dataframe(sample_data, use_container_width=True)

    st.markdown("---")

    # 개발 로드맵
    st.markdown("### 🗓️ 개발 로드맵")

    st.markdown("""
    | 단계 | 내용 | 상태 |
    |------|------|------|
    | 1 | Instagram Graph API 연동 | 🔜 예정 |
    | 2 | TikTok Research API 연동 | 🔜 예정 |
    | 3 | 키워드 모니터링 기능 | 🔜 예정 |
    | 4 | 텔레그램 알림 연동 | 🔜 예정 |
    | 5 | 트렌드 분석 대시보드 | 🔜 예정 |
    """)

    st.markdown("---")

    # Placeholder 실행
    if st.button("📄 Placeholder 엑셀 생성", use_container_width=True):
        output_dir = os.path.join(PROJECT_DIR, 'output')
        os.makedirs(output_dir, exist_ok=True)

        filepath = os.path.join(output_dir, 'social_tracker_placeholder.xlsx')

        df_empty = pd.DataFrame(columns=[
            'platform', 'post_id', 'author', 'content', 'keyword',
            'likes', 'comments', 'shares', 'views', 'posted_at', 'collected_at', 'url'
        ])

        df_empty.to_excel(filepath, index=False)

        st.success(f"✅ 생성 완료: {filepath}")


if __name__ == "__main__":
    main()
