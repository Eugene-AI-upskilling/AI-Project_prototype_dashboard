# coding=utf-8
"""
페이지 1: 뉴스 → 텔레그램 - 다양한 소스 지원
"""

import streamlit as st
import pandas as pd
import os
import re
import time
from datetime import datetime
from typing import List, Dict, Optional
from io import BytesIO

import requests
from bs4 import BeautifulSoup

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="뉴스 → 텔레그램", page_icon="📰", layout="wide")


# =============================================================================
# 뉴스 소스 정의
# =============================================================================

NEWS_SOURCES = {
    "네이버 뉴스": {
        "type": "naver_api",
        "description": "네이버 뉴스 API (키워드 검색)",
        "language": "ko"
    },
    # 국내 바이오 전문지
    "더바이오": {
        "type": "web_scrape",
        "url": "https://www.thebionews.net/",
        "description": "국내 바이오 전문 뉴스",
        "language": "ko",
        "category": "바이오"
    },
    "히트뉴스": {
        "type": "web_scrape",
        "url": "https://www.hitnews.co.kr/",
        "description": "국내 헬스케어/제약 뉴스",
        "language": "ko",
        "category": "바이오"
    },
    "한경바이오인사이트": {
        "type": "web_scrape",
        "url": "https://www.hankyung.com/bioinsight",
        "description": "한국경제 바이오 섹션",
        "language": "ko",
        "category": "바이오"
    },
    # 외신 바이오/헬스케어
    "Reuters Healthcare": {
        "type": "web_scrape",
        "url": "https://www.reuters.com/business/healthcare-pharmaceuticals/",
        "description": "로이터 헬스케어/제약",
        "language": "en",
        "category": "바이오"
    },
    "FierceBiotech": {
        "type": "web_scrape",
        "url": "https://www.fiercebiotech.com/",
        "description": "바이오텍 전문 외신",
        "language": "en",
        "category": "바이오"
    },
    "FiercePharma": {
        "type": "web_scrape",
        "url": "https://www.fiercepharma.com/",
        "description": "제약 전문 외신",
        "language": "en",
        "category": "바이오"
    },
    # 외신 IT/테크
    "TrendForce": {
        "type": "web_scrape",
        "url": "https://www.trendforce.com/",
        "description": "반도체/디스플레이 시장 분석",
        "language": "en",
        "category": "IT"
    },
    "DigiTimes": {
        "type": "web_scrape",
        "url": "https://www.digitimes.com/",
        "description": "아시아 테크 산업 뉴스",
        "language": "en",
        "category": "IT"
    },
    "The Register": {
        "type": "web_scrape",
        "url": "https://www.theregister.com/",
        "description": "IT/엔터프라이즈 뉴스",
        "language": "en",
        "category": "IT"
    },
    "Constellation Research": {
        "type": "web_scrape",
        "url": "https://www.constellationr.com/",
        "description": "기업 IT 리서치",
        "language": "en",
        "category": "IT"
    },
    "Phys.org": {
        "type": "web_scrape",
        "url": "https://phys.org/",
        "description": "과학/기술 뉴스",
        "language": "en",
        "category": "IT"
    },
}

# 언론사 그룹
SOURCE_GROUPS = {
    "네이버 뉴스 (키워드 검색)": ["네이버 뉴스"],
    "국내 바이오 전문지": ["더바이오", "히트뉴스", "한경바이오인사이트"],
    "외신 바이오/헬스케어": ["Reuters Healthcare", "FierceBiotech", "FiercePharma"],
    "외신 IT/테크": ["TrendForce", "DigiTimes", "The Register", "Constellation Research", "Phys.org"],
}


# =============================================================================
# 환경변수/Secrets
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


# =============================================================================
# 뉴스 수집 함수들
# =============================================================================

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}


def search_naver_news(keyword: str, display: int = 10) -> List[Dict]:
    """네이버 뉴스 API로 검색"""
    client_id = get_secret('NAVER_CLIENT_ID')
    client_secret = get_secret('NAVER_CLIENT_SECRET')

    if not client_id or not client_secret:
        st.error("네이버 API 키가 설정되지 않았습니다.")
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
            title = item['title'].replace('<b>', '').replace('</b>', '')
            description = item['description'].replace('<b>', '').replace('</b>', '')

            results.append({
                'source': '네이버 뉴스',
                'keyword': keyword,
                'title': title,
                'description': description,
                'link': item['originallink'] or item['link'],
                'pubDate': item['pubDate'],
                'language': 'ko'
            })

        return results

    except Exception as e:
        st.warning(f"네이버 뉴스 검색 실패: {e}")
        return []


def scrape_news_site(source_name: str, max_items: int = 10) -> List[Dict]:
    """웹사이트에서 뉴스 스크래핑"""
    source = NEWS_SOURCES.get(source_name)
    if not source:
        return []

    url = source.get('url')
    language = source.get('language', 'ko')

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []

        # 사이트별 파싱 로직
        if source_name == "더바이오":
            articles = soup.select('div.article-list article, div.news-list li, .post-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', '.title', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = url.rstrip('/') + '/' + link.lstrip('/')
                    if title:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "히트뉴스":
            articles = soup.select('ul.type01 li, div.list-block article, .news-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', 'a', '.tit'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.hitnews.co.kr' + link
                    if title:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "한경바이오인사이트":
            articles = soup.select('div.news-list li, article.news-item, .article-list li')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', 'a', '.tit'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.hankyung.com' + link
                    if title:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "Reuters Healthcare":
            articles = soup.select('article, div[data-testid="MediaStoryCard"], .story-card')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h3', 'h2', 'span[data-testid="Heading"]', '.title'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.reuters.com' + link
                    if title and len(title) > 10:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name in ["FierceBiotech", "FiercePharma"]:
            articles = soup.select('article.node, div.view-content article, .article-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', '.field-title', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = url.rstrip('/') + link
                    if title and len(title) > 10:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "TrendForce":
            articles = soup.select('article, .news-item, div.post')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', '.title', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.trendforce.com' + link
                    if title and len(title) > 5:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "DigiTimes":
            articles = soup.select('div.col_body article, .article-list li, .news-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', 'a', '.title'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.digitimes.com' + link
                    if title and len(title) > 5:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "The Register":
            articles = soup.select('article, .story_list article, div.story')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', '.headline', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.theregister.com' + link
                    if title and len(title) > 10:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "Constellation Research":
            articles = soup.select('article, .post, .blog-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', '.title', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.constellationr.com' + link
                    if title and len(title) > 5:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        elif source_name == "Phys.org":
            articles = soup.select('article.news-item, div.sorted-article, .article-item')[:max_items]
            for article in articles:
                link_elem = article.find('a')
                title_elem = article.find(['h2', 'h3', 'h4', '.title', 'a'])
                if link_elem and title_elem:
                    title = title_elem.get_text(strip=True)
                    link = link_elem.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://phys.org' + link
                    if title and len(title) > 10:
                        results.append({
                            'source': source_name,
                            'title': title,
                            'link': link,
                            'language': language
                        })

        # 일반적인 파싱 (위에서 못 찾은 경우)
        if not results:
            # 일반적인 뉴스 아티클 패턴
            for tag in ['article', 'div.news', 'div.post', 'li.article']:
                articles = soup.select(tag)[:max_items]
                for article in articles:
                    link_elem = article.find('a')
                    title_elem = article.find(['h1', 'h2', 'h3', 'h4'])
                    if link_elem and title_elem:
                        title = title_elem.get_text(strip=True)
                        link = link_elem.get('href', '')
                        if title and len(title) > 5:
                            if not link.startswith('http'):
                                link = url.rstrip('/') + '/' + link.lstrip('/')
                            results.append({
                                'source': source_name,
                                'title': title,
                                'link': link,
                                'language': language
                            })
                if results:
                    break

        return results[:max_items]

    except Exception as e:
        st.warning(f"{source_name} 스크래핑 실패: {e}")
        return []


def translate_and_summarize(news_items: List[Dict], source_name: str) -> str:
    """외신 뉴스 번역 및 요약"""
    api_key = get_secret('OPENAI_API') or get_secret('OPENAI_API_KEY')

    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        news_text = "\n".join([f"- {n['title']}" for n in news_items[:7]])

        prompt = f"""다음은 '{source_name}'의 최신 헤드라인입니다.
한국어로 번역하고 핵심 내용을 요약해주세요.

[요구사항]
- 각 헤드라인을 자연스러운 한국어로 번역
- 전체적인 트렌드/핵심 이슈를 2-3문장으로 요약
- 투자자/업계 관계자 관점에서 중요한 포인트 강조

[헤드라인]
{news_text}

[출력 형식]
## 주요 헤드라인 (번역)
- (번역1)
- (번역2)
...

## 핵심 요약
(2-3문장 요약)
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 금융/바이오/IT 전문 번역가입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"번역/요약 실패: {str(e)}"


def summarize_korean_news(news_items: List[Dict], keyword: str) -> str:
    """국내 뉴스 요약"""
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
    st.markdown("다양한 소스에서 뉴스 수집 → GPT 요약/번역 → 텔레그램 발송")

    st.markdown("---")

    # 탭으로 구분
    tab1, tab2 = st.tabs(["🔍 뉴스 수집", "⚙️ 소스 관리"])

    with tab1:
        # 소스 선택
        st.subheader("📡 뉴스 소스 선택")

        col1, col2 = st.columns(2)

        with col1:
            selected_groups = st.multiselect(
                "소스 그룹 선택",
                list(SOURCE_GROUPS.keys()),
                default=["네이버 뉴스 (키워드 검색)"]
            )

        with col2:
            # 개별 소스 선택
            all_sources_in_groups = []
            for group in selected_groups:
                all_sources_in_groups.extend(SOURCE_GROUPS[group])

            if all_sources_in_groups:
                selected_sources = st.multiselect(
                    "개별 소스 선택 (선택한 그룹 내)",
                    all_sources_in_groups,
                    default=all_sources_in_groups
                )
            else:
                selected_sources = []

        st.markdown("---")

        # 네이버 뉴스 키워드 설정 (네이버 선택 시)
        if "네이버 뉴스" in selected_sources:
            st.subheader("🔎 네이버 뉴스 키워드")
            keywords = st.text_area(
                "검색 키워드 (줄바꿈으로 구분)",
                value="삼성전자\nSK하이닉스\n반도체",
                height=100
            )
        else:
            keywords = ""

        # 옵션
        st.subheader("⚙️ 옵션")
        col1, col2, col3 = st.columns(3)

        with col1:
            max_news = st.slider("소스당 뉴스 수", 3, 20, 10)

        with col2:
            use_gpt = st.checkbox("GPT 요약/번역", value=True)

        with col3:
            send_to_telegram = st.checkbox("텔레그램 발송", value=False)

        st.markdown("---")

        # 수집 버튼
        if st.button("🚀 뉴스 수집 시작", type="primary", use_container_width=True):
            if not selected_sources:
                st.error("소스를 선택해주세요.")
                return

            all_news = []
            summaries = {}

            progress_bar = st.progress(0)
            status_text = st.empty()

            total_steps = len(selected_sources)
            if "네이버 뉴스" in selected_sources and keywords:
                keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]
                total_steps += len(keyword_list) - 1  # 네이버는 키워드별로 수집

            current_step = 0

            for source_name in selected_sources:
                if source_name == "네이버 뉴스":
                    # 네이버 뉴스는 키워드별 수집
                    keyword_list = [k.strip() for k in keywords.split('\n') if k.strip()]
                    for keyword in keyword_list:
                        current_step += 1
                        status_text.text(f"수집 중: 네이버 뉴스 - {keyword}")
                        progress_bar.progress(current_step / total_steps)

                        news_items = search_naver_news(keyword, max_news)
                        if news_items:
                            all_news.extend(news_items)
                            st.success(f"✅ 네이버 '{keyword}': {len(news_items)}건")

                            if use_gpt:
                                summary = summarize_korean_news(news_items, keyword)
                                if summary:
                                    summaries[f"네이버-{keyword}"] = summary

                        time.sleep(0.3)
                else:
                    # 웹 스크래핑
                    current_step += 1
                    status_text.text(f"수집 중: {source_name}")
                    progress_bar.progress(current_step / total_steps)

                    news_items = scrape_news_site(source_name, max_news)
                    if news_items:
                        all_news.extend(news_items)
                        st.success(f"✅ {source_name}: {len(news_items)}건")

                        # 외신은 번역/요약
                        source_info = NEWS_SOURCES.get(source_name, {})
                        if use_gpt and source_info.get('language') == 'en':
                            summary = translate_and_summarize(news_items, source_name)
                            if summary:
                                summaries[source_name] = summary

                    time.sleep(0.5)

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

                # 소스별 요약
                for source_key, summary in list(summaries.items())[:3]:
                    msg += f"<b>[{source_key}]</b>\n"
                    # 요약 첫 200자만
                    msg += f"{summary[:200]}...\n\n"

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

            # GPT 요약/번역 표시
            if summaries:
                st.markdown("### 📝 GPT 요약/번역")
                for source_key, summary in summaries.items():
                    with st.expander(f"**{source_key}**", expanded=False):
                        st.markdown(summary)

            st.markdown("### 📰 뉴스 목록")

            # 소스 필터
            sources_found = list(set(n.get('source', '기타') for n in all_news))
            selected_filter = st.selectbox("소스 필터", ["전체"] + sources_found)

            if selected_filter == "전체":
                filtered_news = all_news
            else:
                filtered_news = [n for n in all_news if n.get('source') == selected_filter]

            # 테이블 표시
            if filtered_news:
                df_data = []
                for n in filtered_news:
                    df_data.append({
                        '소스': n.get('source', ''),
                        '제목': n.get('title', ''),
                        '언어': '🇰🇷' if n.get('language') == 'ko' else '🇺🇸',
                        '링크': n.get('link', '')
                    })

                df = pd.DataFrame(df_data)
                st.dataframe(df[['소스', '제목', '언어']], use_container_width=True)

                # 엑셀 다운로드
                output = BytesIO()
                df.to_excel(output, index=False, engine='openpyxl')
                output.seek(0)

                st.download_button(
                    label="📥 엑셀 다운로드",
                    data=output,
                    file_name=f"news_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )

    with tab2:
        st.subheader("⚙️ 뉴스 소스 목록")

        for group_name, sources in SOURCE_GROUPS.items():
            with st.expander(f"**{group_name}** ({len(sources)}개)", expanded=False):
                for source_name in sources:
                    source_info = NEWS_SOURCES.get(source_name, {})
                    lang_flag = "🇰🇷" if source_info.get('language') == 'ko' else "🇺🇸"
                    url = source_info.get('url', '')
                    desc = source_info.get('description', '')

                    st.markdown(f"**{lang_flag} {source_name}**")
                    st.caption(f"{desc}")
                    if url:
                        st.caption(f"🔗 {url}")
                    st.markdown("---")

        st.info("💡 소스 추가/수정이 필요하면 피드백 페이지에서 요청해주세요.")


if __name__ == "__main__":
    main()
