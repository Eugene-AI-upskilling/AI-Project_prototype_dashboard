# coding=utf-8
"""
================================================================================
1_News_to_Telegram.py
================================================================================
네이버 뉴스 검색 및 텔레그램 전송 스크립트

[기능]
- 네이버 뉴스 검색 API를 통한 뉴스 수집
- 키워드별 뉴스 검색 (복수 키워드 지원)
- 언론사 필터링 (선택적)
- HTML 태그 제거 및 중복 뉴스 제거
- 엑셀 저장 및 텔레그램 전송

[환경변수] (.env 파일에 설정)
- NAVER_CLIENT_ID: 네이버 API 클라이언트 ID
- NAVER_CLIENT_SECRET: 네이버 API 클라이언트 시크릿
- BOT_TOKEN: 텔레그램 봇 토큰
- CHAT_ID: 텔레그램 채팅 ID

[출력]
- output/naver_news_YYYYMMDD.xlsx

[실행 방법]
$ python scripts/1_News_to_Telegram.py

[실행 옵션]
- 기본 실행: 반도체, 실적 키워드로 검색
- 텔레그램 전송 포함: --telegram 옵션 추가

[Streamlit 연동]
- search_news(): 키워드로 뉴스 검색
- save_to_excel(): 엑셀 저장
- send_to_telegram(): 텔레그램 전송
- 각 함수는 독립적으로 호출 가능

================================================================================
"""

import os
import re
import sys
import html
import requests
import warnings
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from urllib.parse import quote

import pandas as pd
from dotenv import load_dotenv

# 환경변수 로드 (프로젝트 루트의 .env 파일)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_script_dir)
_env_path = os.path.join(_project_dir, '.env')
load_dotenv(dotenv_path=_env_path)

# 경고 무시
warnings.filterwarnings('ignore')


# =============================================================================
# 상수 정의
# =============================================================================

# 주요 언론사 목록 (Streamlit에서 선택 가능)
PRESS_LIST = {
    '전체': None,
    '조선일보': '조선일보',
    '중앙일보': '중앙일보',
    '동아일보': '동아일보',
    '한국경제': '한국경제',
    '매일경제': '매일경제',
    '서울경제': '서울경제',
    '파이낸셜뉴스': '파이낸셜뉴스',
    '머니투데이': '머니투데이',
    '이데일리': '이데일리',
    '연합뉴스': '연합뉴스',
    'YTN': 'YTN',
    'SBS': 'SBS',
    'KBS': 'KBS',
    'MBC': 'MBC',
}

# 네이버 뉴스 검색 API 설정
NAVER_NEWS_API_URL = "https://openapi.naver.com/v1/search/news.json"


# =============================================================================
# 유틸리티 함수
# =============================================================================

def clean_html_tags(text: str) -> str:
    """
    HTML 태그 및 특수문자 제거

    Args:
        text: 원본 텍스트

    Returns:
        정제된 텍스트
    """
    if not text:
        return ""

    # HTML 엔티티 디코딩 (&lt; -> <, &amp; -> & 등)
    text = html.unescape(text)

    # HTML 태그 제거
    text = re.sub(r'<[^>]+>', '', text)

    # 연속 공백 정리
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def extract_press_name(original_link: str, title: str) -> str:
    """
    뉴스 링크 또는 제목에서 언론사명 추출

    Args:
        original_link: 원본 뉴스 링크
        title: 뉴스 제목

    Returns:
        언론사명 (추출 실패시 '기타')
    """
    # 도메인에서 언론사 추출
    domain_press_map = {
        'chosun.com': '조선일보',
        'joongang.co.kr': '중앙일보',
        'donga.com': '동아일보',
        'hankyung.com': '한국경제',
        'mk.co.kr': '매일경제',
        'sedaily.com': '서울경제',
        'fnnews.com': '파이낸셜뉴스',
        'mt.co.kr': '머니투데이',
        'edaily.co.kr': '이데일리',
        'yna.co.kr': '연합뉴스',
        'ytn.co.kr': 'YTN',
        'sbs.co.kr': 'SBS',
        'kbs.co.kr': 'KBS',
        'mbc.co.kr': 'MBC',
        'news1.kr': '뉴스1',
        'newsis.com': '뉴시스',
        'etnews.com': '전자신문',
        'zdnet.co.kr': 'ZDNet',
        'bloter.net': '블로터',
    }

    for domain, press in domain_press_map.items():
        if domain in original_link:
            return press

    return '기타'


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    중복 뉴스 제거 (제목 기준)

    Args:
        df: 뉴스 DataFrame

    Returns:
        중복 제거된 DataFrame
    """
    if df.empty:
        return df

    # 제목에서 특수문자 제거 후 비교용 컬럼 생성
    df['title_clean'] = df['title'].apply(lambda x: re.sub(r'[^\w\s]', '', str(x).lower()))

    # 중복 제거
    df_unique = df.drop_duplicates(subset=['title_clean'], keep='first')

    # 비교용 컬럼 삭제
    df_unique = df_unique.drop(columns=['title_clean'])

    return df_unique.reset_index(drop=True)


# =============================================================================
# 네이버 뉴스 검색 API
# =============================================================================

def search_news(
    keywords: List[str],
    max_results: int = 10,
    press_filter: Optional[List[str]] = None,
    search_date: Optional[str] = None
) -> pd.DataFrame:
    """
    네이버 뉴스 검색 API를 사용하여 뉴스 검색

    Args:
        keywords: 검색 키워드 리스트
        max_results: 키워드당 최대 검색 결과 수 (최대 100)
        press_filter: 언론사 필터 리스트 (None이면 전체)
        search_date: 검색 날짜 (YYYY-MM-DD, 기본: 오늘)

    Returns:
        뉴스 DataFrame (columns: date, keyword, press, title, summary, original_url)
    """
    client_id = os.getenv('NAVER_CLIENT_ID')
    client_secret = os.getenv('NAVER_CLIENT_SECRET')

    if not client_id or not client_secret:
        print("[오류] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.")
        return pd.DataFrame()

    headers = {
        'X-Naver-Client-Id': client_id,
        'X-Naver-Client-Secret': client_secret
    }

    if search_date is None:
        search_date = datetime.now().strftime('%Y-%m-%d')

    all_news = []

    for keyword in keywords:
        print(f"  - '{keyword}' 검색 중...")

        params = {
            'query': keyword,
            'display': min(max_results, 100),  # 최대 100개
            'start': 1,
            'sort': 'date'  # 최신순 정렬
        }

        try:
            response = requests.get(
                NAVER_NEWS_API_URL,
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()
            items = data.get('items', [])

            for item in items:
                # HTML 태그 제거
                title = clean_html_tags(item.get('title', ''))
                description = clean_html_tags(item.get('description', ''))
                original_url = item.get('originallink', item.get('link', ''))
                pub_date = item.get('pubDate', '')

                # 날짜 파싱 (RFC 2822 형식)
                try:
                    dt = datetime.strptime(pub_date, '%a, %d %b %Y %H:%M:%S %z')
                    news_date = dt.strftime('%Y-%m-%d')
                except:
                    news_date = search_date

                # 언론사 추출
                press = extract_press_name(original_url, title)

                # 언론사 필터링
                if press_filter and '전체' not in press_filter:
                    if press not in press_filter:
                        continue

                all_news.append({
                    'date': news_date,
                    'keyword': keyword,
                    'press': press,
                    'title': title,
                    'summary': description,
                    'original_url': original_url
                })

            print(f"    -> {len(items)}건 수집")

        except requests.exceptions.RequestException as e:
            print(f"    [오류] API 요청 실패: {e}")
            continue

    # DataFrame 생성
    df = pd.DataFrame(all_news)

    if not df.empty:
        # 중복 제거
        original_count = len(df)
        df = remove_duplicates(df)
        removed_count = original_count - len(df)
        if removed_count > 0:
            print(f"  -> 중복 {removed_count}건 제거")

    return df


# =============================================================================
# LLM 요약 함수 (추후 확장용)
# =============================================================================

def generate_summary_llm(text: str) -> str:
    """
    LLM을 사용한 뉴스 요약 (추후 구현)

    Args:
        text: 원본 텍스트

    Returns:
        요약된 텍스트
    """
    # TODO: OpenAI API를 사용한 요약 구현
    # 현재는 원본 텍스트 반환
    return text


def enhance_summaries_with_llm(df: pd.DataFrame) -> pd.DataFrame:
    """
    DataFrame의 summary를 LLM으로 개선 (추후 구현)

    Args:
        df: 뉴스 DataFrame

    Returns:
        요약이 개선된 DataFrame
    """
    # TODO: LLM 요약 적용
    # 현재는 원본 DataFrame 반환
    return df


# =============================================================================
# 엑셀 저장
# =============================================================================

def save_to_excel(
    df: pd.DataFrame,
    output_dir: Optional[str] = None,
    filename: Optional[str] = None
) -> str:
    """
    뉴스 데이터를 엑셀 파일로 저장

    Args:
        df: 뉴스 DataFrame
        output_dir: 출력 디렉토리 (기본: 프로젝트/output)
        filename: 파일명 (기본: naver_news_YYYYMMDD.xlsx)

    Returns:
        저장된 파일 경로
    """
    if output_dir is None:
        output_dir = os.path.join(_project_dir, 'output')

    os.makedirs(output_dir, exist_ok=True)

    if filename is None:
        today_str = datetime.now().strftime('%Y%m%d')
        filename = f"naver_news_{today_str}.xlsx"

    filepath = os.path.join(output_dir, filename)

    # 엑셀 저장
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # 전체 뉴스
        df.to_excel(writer, sheet_name='All_News', index=False)

        # 키워드별 시트 생성
        if 'keyword' in df.columns:
            for keyword in df['keyword'].unique():
                df_keyword = df[df['keyword'] == keyword]
                # 시트명은 31자 제한, 특수문자 제거
                sheet_name = re.sub(r'[\\/*?:\[\]]', '', keyword)[:31]
                df_keyword.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"[저장 완료] {filepath}")
    return filepath


# =============================================================================
# 텔레그램 전송
# =============================================================================

def send_to_telegram(
    message: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None
) -> bool:
    """
    텔레그램으로 메시지 전송

    Args:
        message: 전송할 메시지
        bot_token: 봇 토큰 (기본: 환경변수)
        chat_id: 채팅 ID (기본: 환경변수)

    Returns:
        전송 성공 여부
    """
    if bot_token is None:
        bot_token = os.getenv('BOT_TOKEN')
    if chat_id is None:
        chat_id = os.getenv('CHAT_ID')

    if not bot_token or not chat_id:
        print("[오류] BOT_TOKEN 또는 CHAT_ID가 설정되지 않았습니다.")
        return False

    # 공백 제거
    bot_token = bot_token.strip()
    chat_id = chat_id.strip()

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML',
        'disable_web_page_preview': True
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()

        result = response.json()
        if result.get('ok'):
            return True
        else:
            print(f"[오류] 텔레그램 전송 실패: {result.get('description')}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"[오류] 텔레그램 API 요청 실패: {e}")
        return False


def send_news_to_telegram(
    df: pd.DataFrame,
    max_news: int = 5,
    keywords_to_send: Optional[List[str]] = None
) -> int:
    """
    뉴스 DataFrame을 텔레그램으로 전송

    Args:
        df: 뉴스 DataFrame
        max_news: 키워드당 최대 전송 뉴스 수
        keywords_to_send: 전송할 키워드 리스트 (None이면 전체)

    Returns:
        전송된 뉴스 수
    """
    if df.empty:
        print("[알림] 전송할 뉴스가 없습니다.")
        return 0

    sent_count = 0

    # 키워드 필터링
    if keywords_to_send:
        df = df[df['keyword'].isin(keywords_to_send)]

    # 키워드별로 메시지 구성
    for keyword in df['keyword'].unique():
        df_keyword = df[df['keyword'] == keyword].head(max_news)

        # 메시지 구성
        message_lines = [f"<b>📰 [{keyword}] 뉴스 ({len(df_keyword)}건)</b>\n"]

        for idx, row in df_keyword.iterrows():
            news_line = f"• <a href='{row['original_url']}'>{row['title']}</a>"
            if row.get('press'):
                news_line += f" ({row['press']})"
            message_lines.append(news_line)

        message = '\n'.join(message_lines)

        # 텔레그램 메시지 길이 제한 (4096자)
        if len(message) > 4000:
            message = message[:4000] + "\n..."

        if send_to_telegram(message):
            sent_count += len(df_keyword)
            print(f"  -> '{keyword}' 뉴스 {len(df_keyword)}건 전송 완료")

    return sent_count


# =============================================================================
# 메인 실행
# =============================================================================

def main(send_telegram: bool = False):
    """
    메인 실행 함수

    Args:
        send_telegram: 텔레그램 전송 여부
    """
    print("=" * 60)
    print("  네이버 뉴스 검색 및 텔레그램 전송")
    print(f"  실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    # 검색 설정 (예시: 반도체, 실적)
    keywords = ['반도체', '실적']
    max_results = 10
    press_filter = None  # 전체 언론사

    print(f"[설정]")
    print(f"  - 키워드: {keywords}")
    print(f"  - 키워드당 최대 기사: {max_results}개")
    print(f"  - 언론사 필터: {'전체' if not press_filter else press_filter}")
    print()

    # 뉴스 검색
    print("[1/3] 뉴스 검색 중...")
    df = search_news(
        keywords=keywords,
        max_results=max_results,
        press_filter=press_filter
    )

    if df.empty:
        print("[완료] 검색된 뉴스가 없습니다.")
        return

    print(f"  -> 총 {len(df)}건 수집 완료")
    print()

    # 엑셀 저장
    print("[2/3] 엑셀 저장 중...")
    filepath = save_to_excel(df)
    print()

    # 결과 미리보기
    print("[결과 미리보기]")
    print("-" * 60)
    for keyword in df['keyword'].unique():
        df_keyword = df[df['keyword'] == keyword]
        print(f"\n[{keyword}] - {len(df_keyword)}건")
        for idx, row in df_keyword.head(3).iterrows():
            print(f"  - {row['title'][:50]}...")
            print(f"    {row['press']} | {row['date']}")
    print()

    # 텔레그램 전송 (옵션)
    if send_telegram:
        print("[3/3] 텔레그램 전송 중...")
        sent = send_news_to_telegram(df, max_news=5)
        print(f"  -> 총 {sent}건 전송 완료")
    else:
        print("[3/3] 텔레그램 전송: 건너뜀 (--telegram 옵션으로 활성화)")

    print()
    print("=" * 60)
    print("[완료] 모든 작업이 완료되었습니다.")
    print("=" * 60)

    return filepath


if __name__ == "__main__":
    # 명령행 인수 처리
    send_telegram = '--telegram' in sys.argv
    main(send_telegram=send_telegram)
