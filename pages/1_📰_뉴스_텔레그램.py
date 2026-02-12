# coding=utf-8
"""
페이지 1: 뉴스 → 텔레그램 - 다양한 소스 + 키워드 검색
"""

import streamlit as st
import pandas as pd
import os
import time
from datetime import datetime
from typing import List, Dict
from io import BytesIO

import requests
from bs4 import BeautifulSoup

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="뉴스 → 텔레그램", page_icon="📰", layout="wide")


# =============================================================================
# 뉴스 소스 정의 (작동 확인된 사이트만)
# =============================================================================

NEWS_SOURCES = {
    # 국내 바이오
    "더바이오": {
        "url": "https://www.thebionews.net/",
        "description": "국내 바이오 전문 뉴스",
        "language": "ko",
        "category": "국내 바이오"
    },
    "히트뉴스": {
        "url": "https://www.hitnews.co.kr/",
        "description": "국내 헬스케어/제약 뉴스",
        "language": "ko",
        "category": "국내 바이오"
    },
    "한경바이오인사이트": {
        "url": "https://www.hankyung.com/bioinsight",
        "description": "한국경제 바이오 섹션",
        "language": "ko",
        "category": "국내 바이오"
    },
    # 외신 바이오
    "FierceBiotech": {
        "url": "https://www.fiercebiotech.com/",
        "description": "바이오텍 전문 외신",
        "language": "en",
        "category": "외신 바이오"
    },
    "FiercePharma": {
        "url": "https://www.fiercepharma.com/",
        "description": "제약 전문 외신",
        "language": "en",
        "category": "외신 바이오"
    },
    # 외신 IT
    "TrendForce": {
        "url": "https://www.trendforce.com/",
        "description": "반도체/디스플레이 시장 분석",
        "language": "en",
        "category": "외신 IT"
    },
    "The Register": {
        "url": "https://www.theregister.com/",
        "description": "IT/엔터프라이즈 뉴스",
        "language": "en",
        "category": "외신 IT"
    },
}

SOURCE_GROUPS = {
    "네이버 뉴스": ["네이버 뉴스"],
    "국내 바이오": ["더바이오", "히트뉴스", "한경바이오인사이트"],
    "외신 바이오": ["FierceBiotech", "FiercePharma"],
    "외신 IT": ["TrendForce", "The Register"],
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}


# =============================================================================
# 헬퍼 함수
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


def keyword_match(title: str, keywords: List[str]) -> bool:
    """제목에 키워드가 포함되어 있는지 확인"""
    if not keywords:
        return True
    title_lower = title.lower()
    for kw in keywords:
        if kw.lower() in title_lower:
            return True
    return False


# =============================================================================
# 네이버 뉴스 API
# =============================================================================

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
    params = {"query": keyword, "display": display, "sort": "date"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get('items', []):
            title = item['title'].replace('<b>', '').replace('</b>', '')
            results.append({
                'source': '네이버 뉴스',
                'keyword': keyword,
                'title': title,
                'link': item['originallink'] or item['link'],
                'pubDate': item['pubDate'],
                'language': 'ko'
            })
        return results
    except Exception as e:
        st.warning(f"네이버 뉴스 검색 실패: {e}")
        return []


# =============================================================================
# 웹 스크래핑
# =============================================================================

def scrape_thebionews(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """더바이오 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.thebionews.net/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for article in soup.select('div.td-module-container, article, .entry-title')[:max_items * 2]:
            a = article.find('a')
            if a:
                title = a.get_text(strip=True)
                link = a.get('href', '')
                if title and len(title) > 10 and keyword_match(title, keywords):
                    if not link.startswith('http'):
                        link = 'https://www.thebionews.net' + link
                    results.append({
                        'source': '더바이오',
                        'title': title,
                        'link': link,
                        'language': 'ko'
                    })
                    if len(results) >= max_items:
                        break
    except Exception as e:
        st.warning(f"더바이오 스크래핑 실패: {e}")
    return results


def scrape_hitnews(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """히트뉴스 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.hitnews.co.kr/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a'):
            href = a.get('href', '')
            if '/news/articleView' in href:
                title = a.get_text(strip=True)
                if title and len(title) > 15 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.hitnews.co.kr' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': '히트뉴스',
                            'title': title,
                            'link': href,
                            'language': 'ko'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"히트뉴스 스크래핑 실패: {e}")
    return results


def scrape_hankyung_bio(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """한경바이오인사이트 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.hankyung.com/bioinsight', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a'):
            href = a.get('href', '')
            if '/article/' in href:
                title = a.get_text(strip=True)
                if title and len(title) > 15 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.hankyung.com' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': '한경바이오인사이트',
                            'title': title,
                            'link': href,
                            'language': 'ko'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"한경바이오인사이트 스크래핑 실패: {e}")
    return results


def scrape_fiercebiotech(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """FierceBiotech 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.fiercebiotech.com/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for h in soup.select('h2, h3'):
            a = h.find('a')
            if a:
                title = a.get_text(strip=True)
                href = a.get('href', '')
                if title and len(title) > 15 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.fiercebiotech.com' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': 'FierceBiotech',
                            'title': title,
                            'link': href,
                            'language': 'en'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"FierceBiotech 스크래핑 실패: {e}")
    return results


def scrape_fiercepharma(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """FiercePharma 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.fiercepharma.com/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for h in soup.select('h2, h3'):
            a = h.find('a')
            if a:
                title = a.get_text(strip=True)
                href = a.get('href', '')
                if title and len(title) > 15 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.fiercepharma.com' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': 'FiercePharma',
                            'title': title,
                            'link': href,
                            'language': 'en'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"FiercePharma 스크래핑 실패: {e}")
    return results


def scrape_trendforce(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """TrendForce 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.trendforce.com/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for article in soup.select('article, div.post, .news-item'):
            a = article.find('a')
            title_elem = article.find(['h2', 'h3', 'h4'])
            if a and title_elem:
                title = title_elem.get_text(strip=True)
                href = a.get('href', '')
                if title and len(title) > 10 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.trendforce.com' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': 'TrendForce',
                            'title': title,
                            'link': href,
                            'language': 'en'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"TrendForce 스크래핑 실패: {e}")
    return results


def scrape_theregister(keywords: List[str], max_items: int = 20) -> List[Dict]:
    """The Register 스크래핑"""
    results = []
    try:
        r = requests.get('https://www.theregister.com/', headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        for article in soup.select('article'):
            a = article.find('a')
            title_elem = article.find(['h2', 'h3', 'h4'])
            if a and title_elem:
                title = title_elem.get_text(strip=True)
                href = a.get('href', '')
                if title and len(title) > 15 and keyword_match(title, keywords):
                    if not href.startswith('http'):
                        href = 'https://www.theregister.com' + href
                    if not any(r['link'] == href for r in results):
                        results.append({
                            'source': 'The Register',
                            'title': title,
                            'link': href,
                            'language': 'en'
                        })
                        if len(results) >= max_items:
                            break
    except Exception as e:
        st.warning(f"The Register 스크래핑 실패: {e}")
    return results


SCRAPER_MAP = {
    "더바이오": scrape_thebionews,
    "히트뉴스": scrape_hitnews,
    "한경바이오인사이트": scrape_hankyung_bio,
    "FierceBiotech": scrape_fiercebiotech,
    "FiercePharma": scrape_fiercepharma,
    "TrendForce": scrape_trendforce,
    "The Register": scrape_theregister,
}


# =============================================================================
# GPT 요약/번역
# =============================================================================

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


def summarize_korean_news(news_items: List[Dict], source_name: str) -> str:
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
                {"role": "user", "content": f"소스: {source_name}\n\n뉴스:\n{news_text}"}
            ],
            temperature=0.3,
            max_tokens=200
        )
        return response.choices[0].message.content
    except Exception:
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
    st.markdown("다양한 소스에서 키워드 검색 → GPT 요약/번역 → 텔레그램 발송")

    st.markdown("---")

    # 탭
    tab1, tab2 = st.tabs(["🔍 뉴스 수집", "⚙️ 소스 목록"])

    with tab1:
        # 소스 그룹 선택
        st.subheader("📡 뉴스 소스 선택")

        selected_groups = st.multiselect(
            "소스 그룹",
            list(SOURCE_GROUPS.keys()),
            default=["네이버 뉴스"]
        )

        # 선택된 소스 목록
        selected_sources = []
        for group in selected_groups:
            selected_sources.extend(SOURCE_GROUPS[group])

        if selected_sources:
            st.info(f"선택된 소스: {', '.join(selected_sources)}")

        st.markdown("---")

        # 키워드 입력
        st.subheader("🔎 키워드 검색")
        keywords_input = st.text_area(
            "검색 키워드 (줄바꿈으로 구분)",
            value="반도체\nAI\n바이오",
            height=100,
            help="키워드가 제목에 포함된 뉴스만 수집합니다. 비워두면 전체 수집."
        )

        keywords = [k.strip() for k in keywords_input.split('\n') if k.strip()]

        st.markdown("---")

        # 옵션
        st.subheader("⚙️ 옵션")
        col1, col2, col3 = st.columns(3)

        with col1:
            max_news = st.slider("소스당 뉴스 수", 5, 30, 10)
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
            current_step = 0

            for source_name in selected_sources:
                current_step += 1
                status_text.text(f"수집 중: {source_name}")
                progress_bar.progress(current_step / total_steps)

                if source_name == "네이버 뉴스":
                    # 네이버는 키워드별 검색
                    for kw in keywords:
                        news_items = search_naver_news(kw, max_news)
                        if news_items:
                            all_news.extend(news_items)
                            st.success(f"✅ 네이버 '{kw}': {len(news_items)}건")

                            if use_gpt and news_items:
                                summary = summarize_korean_news(news_items, f"네이버-{kw}")
                                if summary:
                                    summaries[f"네이버-{kw}"] = summary
                        time.sleep(0.3)
                else:
                    # 웹 스크래핑 (키워드 필터링)
                    scraper = SCRAPER_MAP.get(source_name)
                    if scraper:
                        news_items = scraper(keywords, max_news)
                        if news_items:
                            all_news.extend(news_items)
                            st.success(f"✅ {source_name}: {len(news_items)}건")

                            # GPT 요약/번역
                            source_info = NEWS_SOURCES.get(source_name, {})
                            if use_gpt:
                                if source_info.get('language') == 'en':
                                    summary = translate_and_summarize(news_items, source_name)
                                else:
                                    summary = summarize_korean_news(news_items, source_name)
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
                msg += f"수집 시간: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                msg += f"키워드: {', '.join(keywords)}\n\n"

                for source_key, summary in list(summaries.items())[:3]:
                    msg += f"<b>[{source_key}]</b>\n"
                    msg += f"{summary[:300]}...\n\n"

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

            # GPT 요약/번역
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

            # 테이블
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
                if group_name == "네이버 뉴스":
                    st.markdown("**🇰🇷 네이버 뉴스**")
                    st.caption("네이버 뉴스 API (키워드 검색)")
                else:
                    for source_name in sources:
                        info = NEWS_SOURCES.get(source_name, {})
                        lang = "🇰🇷" if info.get('language') == 'ko' else "🇺🇸"
                        st.markdown(f"**{lang} {source_name}**")
                        st.caption(f"{info.get('description', '')}")
                        st.caption(f"🔗 {info.get('url', '')}")
                        st.markdown("---")

        st.info("💡 소스 추가 요청은 피드백 페이지에서 해주세요.")


if __name__ == "__main__":
    main()
