# coding=utf-8
"""
페이지 2: DART 잠정실적 - 웹에서 직접 수집
"""

import streamlit as st
import pandas as pd
import os
import sys
import re
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from io import StringIO, BytesIO

import requests
from bs4 import BeautifulSoup

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="DART 잠정실적", page_icon="📈", layout="wide")

# =============================================================================
# KIND 크롤링 함수들
# =============================================================================

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}

KIND_TODAY_URL = "https://kind.krx.co.kr/disclosure/todaydisclosure.do"
KIND_VIEWER_URL = "https://kind.krx.co.kr/common/disclsviewer.do"


def search_prelim_earnings(search_date: str, progress_callback=None) -> List[Dict]:
    """KIND에서 잠정실적 공시 검색"""
    headers = HEADERS.copy()
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    headers['X-Requested-With'] = 'XMLHttpRequest'

    disclosures = []
    page = 1

    while page <= 5:
        data = {
            'method': 'searchTodayDisclosureSub',
            'currentPageSize': '500',
            'pageIndex': str(page),
            'orderMode': '0',
            'orderStat': 'D',
            'forward': 'todaydisclosure_sub',
            'marketType': '',
            'disclosureType': '',
            'fromDate': search_date,
            'toDate': search_date
        }

        try:
            response = requests.post(KIND_TODAY_URL, headers=headers, data=data, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            rows = soup.select('tbody tr')

            if len(rows) == 0:
                break

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 4:
                    continue

                title_elem = cols[2].find('a')
                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)

                if '잠정' not in title:
                    continue

                onclick = title_elem.get('onclick', '')
                acptno_match = re.search(r"openDisclsViewer\('(\d+)'", onclick)
                if not acptno_match:
                    continue

                acptno = acptno_match.group(1)

                if any(d['acptno'] == acptno for d in disclosures):
                    continue

                company_elem = cols[1].find('a', id='companysum')
                corp_name = company_elem.get_text(strip=True) if company_elem else ''

                corp_onclick = company_elem.get('onclick', '') if company_elem else ''
                code_match = re.search(r"companysummary_open\('(\d+)'", corp_onclick)
                stock_code = code_match.group(1).zfill(6) if code_match else ''

                time_str = cols[0].get_text(strip=True)

                disclosures.append({
                    'time': time_str,
                    'stock_code': stock_code,
                    'corp_name': corp_name,
                    'title': title,
                    'acptno': acptno,
                    'date': search_date
                })

            if len(rows) < 500:
                break

            page += 1
            time.sleep(0.3)

        except Exception as e:
            st.warning(f"검색 오류: {e}")
            break

    return disclosures


def get_disclosure_document(acptno: str) -> Optional[str]:
    """KIND 공시 본문 HTML 가져오기"""
    try:
        viewer_url = f"{KIND_VIEWER_URL}?method=search&acptno={acptno}"
        response = requests.get(viewer_url, headers=HEADERS, timeout=30)

        soup = BeautifulSoup(response.text, 'html.parser')
        select = soup.find('select', id='mainDoc')
        if not select:
            return None

        docNo = None
        for opt in select.find_all('option'):
            val = opt.get('value', '')
            if '|' in val:
                docNo = val.split('|')[0]
                break

        if not docNo:
            return None

        post_data = {'method': 'searchContents', 'docNo': docNo}
        post_headers = HEADERS.copy()
        post_headers['Content-Type'] = 'application/x-www-form-urlencoded'

        post_response = requests.post(KIND_VIEWER_URL, data=post_data, headers=post_headers, timeout=30)

        url_match = re.search(r"setPath\s*\([^,]*,\s*['\"]([^'\"]+)['\"]", post_response.text)
        if not url_match:
            return None

        doc_url = url_match.group(1)
        if not doc_url.startswith('http'):
            doc_url = 'https://kind.krx.co.kr' + doc_url

        doc_response = requests.get(doc_url, headers=HEADERS, timeout=30)

        try:
            return doc_response.content.decode('utf-8')
        except:
            try:
                return doc_response.content.decode('euc-kr')
            except:
                return doc_response.content.decode('cp949', errors='ignore')

    except Exception as e:
        return None


def extract_earnings_table(html_content: str) -> Optional[pd.DataFrame]:
    """HTML에서 실적 테이블 추출"""
    if not html_content:
        return None

    try:
        tables = pd.read_html(StringIO(html_content))
    except:
        return None

    if not tables:
        return None

    best_table = None
    best_score = 0

    for df in tables:
        if df.empty:
            continue

        df_str = df.to_string()
        score = 0

        if '매출액' in df_str:
            score += 10
        if '영업이익' in df_str:
            score += 10
        if '당기순이익' in df_str:
            score += 10
        if '당기' in df_str or '당해' in df_str:
            score += 5
        if 3 <= len(df) <= 30 and 3 <= len(df.columns) <= 15:
            score += 5

        if score > best_score:
            best_score = score
            best_table = df

    return best_table


# =============================================================================
# 메인 앱
# =============================================================================

def main():
    st.title("📈 DART 잠정실적 공시")
    st.markdown("KIND에서 잠정실적 공시 수집 → 정규화 → 조회")

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
        st.subheader("📊 현황")
        st.info(f"선택된 날짜: **{target_date.strftime('%Y년 %m월 %d일')}**")

    st.markdown("---")

    # 수집 버튼
    if st.button("🔍 잠정실적 조회", type="primary", use_container_width=True):

        # 1단계: 공시 검색
        with st.spinner("KIND에서 공시 검색 중..."):
            disclosures = search_prelim_earnings(date_str)

        if not disclosures:
            st.warning(f"⚠️ {target_date.strftime('%Y-%m-%d')}에 잠정실적 공시가 없습니다.")
            return

        st.success(f"✅ {len(disclosures)}건의 잠정실적 공시 발견")

        # 2단계: 상세 데이터 수집
        progress_bar = st.progress(0)
        status_text = st.empty()

        results = []

        for i, disc in enumerate(disclosures):
            status_text.text(f"수집 중: {disc['corp_name']} ({i+1}/{len(disclosures)})")
            progress_bar.progress((i + 1) / len(disclosures))

            try:
                html = get_disclosure_document(disc['acptno'])
                if html:
                    table = extract_earnings_table(html)
                    if table is not None and not table.empty:
                        results.append({
                            'corp_name': disc['corp_name'],
                            'stock_code': disc['stock_code'],
                            'title': disc['title'],
                            'time': disc['time'],
                            'acptno': disc['acptno'],
                            'table': table
                        })

                time.sleep(0.3)

            except Exception as e:
                pass

        progress_bar.progress(1.0)
        status_text.text("완료!")

        # 결과 저장
        st.session_state['dart_results'] = results
        st.session_state['dart_date'] = date_str

        st.success(f"✅ {len(results)}개 기업 데이터 수집 완료")

    # 결과 표시
    if 'dart_results' in st.session_state and st.session_state['dart_results']:
        results = st.session_state['dart_results']

        st.markdown("---")
        st.subheader(f"📊 수집 결과 ({len(results)}개 기업)")

        # 검색 필터
        col1, col2 = st.columns(2)

        with col1:
            search_text = st.text_input(
                "🔎 종목코드 또는 기업명 검색",
                placeholder="예: 005930 또는 삼성전자"
            )

        with col2:
            corp_names = ["전체 보기"] + [r['corp_name'] for r in results]
            selected_corp = st.selectbox("📋 기업 선택", corp_names)

        # 필터링
        if search_text:
            # 검색어로 필터링
            search_text = search_text.strip()
            filtered_results = [
                r for r in results
                if search_text.lower() in r['corp_name'].lower()
                or search_text in r['stock_code']
            ]

            if not filtered_results:
                st.warning(f"'{search_text}'에 해당하는 기업이 없습니다.")
            else:
                st.info(f"🔍 검색 결과: {len(filtered_results)}개 기업")

                for r in filtered_results:
                    with st.expander(f"**{r['corp_name']}** ({r['stock_code']}) - {r['time']}"):
                        st.caption(f"공시: {r['title']}")
                        st.dataframe(r['table'], use_container_width=True)

        elif selected_corp == "전체 보기":
            # 요약 테이블
            summary_data = []
            for r in results:
                summary_data.append({
                    '시간': r['time'],
                    '종목코드': r['stock_code'],
                    '기업명': r['corp_name'],
                    '공시제목': r['title'][:40] + "..." if len(r['title']) > 40 else r['title']
                })

            st.dataframe(pd.DataFrame(summary_data), use_container_width=True)

        else:
            # 개별 기업 상세
            for r in results:
                if r['corp_name'] == selected_corp:
                    st.markdown(f"### {r['corp_name']} ({r['stock_code']})")
                    st.caption(f"공시: {r['title']}")
                    st.dataframe(r['table'], use_container_width=True)
                    break

        # 엑셀 다운로드
        st.markdown("---")

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            summary_df = pd.DataFrame([{
                '시간': r['time'],
                '종목코드': r['stock_code'],
                '기업명': r['corp_name'],
                '공시제목': r['title']
            } for r in results])
            summary_df.to_excel(writer, sheet_name='요약', index=False)

            for r in results[:20]:
                sheet_name = r['corp_name'][:31].replace('/', '_')
                r['table'].to_excel(writer, sheet_name=sheet_name, index=False)

        output.seek(0)

        st.download_button(
            label="📥 엑셀 다운로드",
            data=output,
            file_name=f"prelim_earnings_{st.session_state.get('dart_date', date_str)}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    st.markdown("---")

    # CLI 안내
    with st.expander("💻 실시간 모니터링 (로컬 PC에서 실행)"):
        st.markdown("""
        **실시간 모니터링**은 웹 대시보드가 아닌 **로컬 PC**에서 실행해야 합니다.

        ### 실행 방법

        1. **명령 프롬프트(CMD) 또는 PowerShell 열기**
           - Windows: `Win + R` → `cmd` 입력 → Enter

        2. **프로젝트 폴더로 이동**
        ```
        cd C:\\Users\\anjs9\\OneDrive\\바탕 화면\\Eugene_AI_Project
        ```

        3. **스크립트 실행**
        ```
        # 특정 날짜 조회
        python scripts/2_DART_Prelim_Earnings.py --date=20260209

        # 실시간 모니터링 (5분 간격)
        python scripts/2_DART_Prelim_Earnings.py --monitor --interval=5

        # 텔레그램 알림 포함
        python scripts/2_DART_Prelim_Earnings.py --monitor --telegram
        ```

        4. **또는 배치 파일 더블클릭**
           - `run_prelim_monitor.bat` 파일 더블클릭
        """)


if __name__ == "__main__":
    main()
