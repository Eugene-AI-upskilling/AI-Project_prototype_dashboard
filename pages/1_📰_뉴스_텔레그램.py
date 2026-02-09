# coding=utf-8
"""
페이지 1: 뉴스 → 텔레그램 - 웹에서 직접 수집
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from io import BytesIO

import requests

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="뉴스 → 텔레그램", page_icon="📰", layout="wide")


# =============================================================================
# 환경변수/Secrets
# =============================================================================

def get_secret(key, default=None):
    """Streamlit secrets 또는 환경변수에서 값 가져오기"""
    try:
        if hasattr(st, 'secrets') and key in st.secrets:
            return st.secrets[key]
    except:
        pass
    return os.getenv(key, default)


# =============================================================================
# 네이버 뉴스 검색
# =============================================================================

def search_naver_news(keyword: str, display: int = 10) -> List[Dict]:
    """네이버 뉴스 API로 검색"""
    client_id = get_secret('NAVER_CLIENT_ID')
    client_secret = get_secret('NAVER_CLIENT_SECRET')

    if not client_id or not client_secret:
        st.error("네이버 API 키가 설정되지 않았습니다. (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)")
        return []

    url = "https://openapi.naver.com/v1/search/news.json"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret
    }
    params = {
        "query": keyword,
        "display": display,
        "sort": "date"
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get('items', []):
            # HTML 태그 제거
            title = item['title'].replace('<b>', '').replace('</b>', '')
            description = item['description'].replace('<b>', '').replace('</b>', '')

            results.append({
                'keyword': keyword,
                'title': title,
                'description': description,
                'link': item['originallink'] or item['link'],
                'pubDate': item['pubDate']
            })

        return results

    except Exception as e:
        st.warning(f"'{keyword}' 검색 실패: {e}")
        return []


def summarize_with_gpt(news_items: List[Dict], keyword: str) -> str:
    """GPT로 뉴스 요약"""
    api_key = get_secret('OPENAI_API') or get_secret('OPENAI_API_KEY')

    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        news_text = "\n".join([f"- {n['title']}" for n in news_items[:5]])

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "뉴스 헤드라인을 보고 핵심 내용을 2-3문장으로 요약해주세요."},
                {"role": "user", "content": f"키워드: {keyword}\n\n뉴스:\n{news_text}"}
            ],
            temperature=0.3,
            max_tokens=200
        )

        return response.choices[0].message.content

    except Exception as e:
        return None


def send_telegram(message: str) -> bool:
    """텔레그램 메시지 전송"""
    bot_token = get_secret('BOT_TOKEN')
    chat_id = get_secret('CHAT_ID')

    if not bot_token or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"

    try:
        response = requests.post(url, data={
            'chat_id': chat_id.strip(),
            'text': message[:4096],
            'parse_mode': 'HTML',
            'disable_web_page_preview': True
        }, timeout=30)

        return response.status_code == 200

    except:
        return False


# =============================================================================
# 메인 앱
# =============================================================================

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
        st.subheader("⚙️ 옵션")
        use_gpt = st.checkbox("GPT 요약 사용", value=True)
        send_to_telegram = st.checkbox("텔레그램 발송", value=False)

    st.markdown("---")

    # 수집 버튼
    if st.button("🚀 뉴스 수집 시작", type="primary", use_container_width=True):
        keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]

        if not keyword_list:
            st.error("키워드를 입력해주세요.")
            return

        all_news = []
        summaries = {}

        progress_bar = st.progress(0)
        status_text = st.empty()

        for i, keyword in enumerate(keyword_list):
            status_text.text(f"검색 중: {keyword}")
            progress_bar.progress((i + 1) / len(keyword_list))

            news_items = search_naver_news(keyword, max_news)

            if news_items:
                all_news.extend(news_items)
                st.success(f"✅ '{keyword}': {len(news_items)}건")

                # GPT 요약
                if use_gpt and news_items:
                    summary = summarize_with_gpt(news_items, keyword)
                    if summary:
                        summaries[keyword] = summary

        progress_bar.progress(1.0)
        status_text.text("완료!")

        # 결과 저장
        st.session_state['news_results'] = all_news
        st.session_state['news_summaries'] = summaries

        st.success(f"✅ 총 {len(all_news)}건 수집 완료")

        # 텔레그램 발송
        if send_to_telegram and all_news:
            msg = f"📰 <b>뉴스 수집 결과</b>\n"
            msg += f"수집 시간: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"

            for keyword in keyword_list[:3]:
                keyword_news = [n for n in all_news if n['keyword'] == keyword][:3]
                if keyword_news:
                    msg += f"<b>[{keyword}]</b>\n"
                    for n in keyword_news:
                        msg += f"• {n['title'][:50]}...\n"
                    if keyword in summaries:
                        msg += f"📝 {summaries[keyword]}\n"
                    msg += "\n"

            if send_telegram(msg):
                st.success("✅ 텔레그램 발송 완료")
            else:
                st.warning("⚠️ 텔레그램 발송 실패")

    # 결과 표시
    if 'news_results' in st.session_state and st.session_state['news_results']:
        all_news = st.session_state['news_results']
        summaries = st.session_state.get('news_summaries', {})

        st.markdown("---")
        st.subheader(f"📋 수집 결과 ({len(all_news)}건)")

        # 키워드별 탭
        keywords_found = list(set(n['keyword'] for n in all_news))

        if summaries:
            st.markdown("### 📝 GPT 요약")
            for keyword, summary in summaries.items():
                with st.expander(f"**{keyword}**"):
                    st.write(summary)

        st.markdown("### 📰 뉴스 목록")

        # 키워드 필터
        selected_keyword = st.selectbox("키워드 필터", ["전체"] + keywords_found)

        if selected_keyword == "전체":
            filtered_news = all_news
        else:
            filtered_news = [n for n in all_news if n['keyword'] == selected_keyword]

        # 테이블 표시
        df = pd.DataFrame(filtered_news)
        if not df.empty:
            df_display = df[['keyword', 'title', 'pubDate']].copy()
            df_display.columns = ['키워드', '제목', '날짜']
            st.dataframe(df_display, use_container_width=True)

            # 엑셀 다운로드
            output = BytesIO()
            df.to_excel(output, index=False, engine='openpyxl')
            output.seek(0)

            st.download_button(
                label="📥 엑셀 다운로드",
                data=output,
                file_name=f"naver_news_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )


if __name__ == "__main__":
    main()
