# coding=utf-8
"""
페이지 4: 컨퍼런스콜 요약
"""

import streamlit as st
import pandas as pd
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="컨콜 요약", page_icon="🎙️", layout="wide")


def get_secret(key, default=None):
    """Streamlit secrets 또는 환경변수에서 값 가져오기"""
    # 1. Streamlit secrets 확인
    try:
        value = st.secrets.get(key)
        if value:
            return value
    except Exception:
        pass

    # 2. 환경변수 확인
    value = os.environ.get(key)
    if value:
        return value

    return default


def summarize_with_openai(transcript: str, model: str = "gpt-4o") -> str:
    """OpenAI API로 컨콜 요약"""
    api_key = get_secret('OPENAI_API') or get_secret('OPENAI_API_KEY')

    if not api_key:
        raise ValueError("OpenAI API 키가 설정되지 않았습니다.")

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    prompt = f"""당신은 증권사 리서치 애널리스트입니다. 아래 실적발표 컨퍼런스콜 원문을 분석하여 정해진 양식에 맞게 요약해주세요.

## 출력 양식

# 연간 영업 실적
[매출] 금액 (YoY 변화율)
[EBITDA] 또는 [영업이익] 금액

# 분기 영업 실적
[매출] 금액 (QoQ, YoY)
[영업이익] 금액
[당기순이익] 금액

# 매출 포트폴리오
주요 제품/서비스별 매출 비중

# 지역/부문별 매출 구성
[지역별] 비중
[부문별] 비중

# 주요 비용구조
비용 항목별 금액 및 증감

# 향후 계획/파이프라인
신제품, 전략 방향 등

# 주주환원 정책
배당, 자사주 매입 등

* Comment
핵심 시사점 2-3개

Q&A
주요 질의응답 정리

## 컨퍼런스콜 원문:
{transcript[:15000]}
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "당신은 증권사 리서치 애널리스트입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=4000
    )

    return response.choices[0].message.content


def main():
    st.title("🎙️ 컨퍼런스콜 요약")
    st.markdown("실적발표 컨콜 원문 → GPT 자동 요약 → 표준 양식 출력")

    st.markdown("---")

    # 입력 방식 선택
    input_method = st.radio(
        "입력 방식 선택",
        ["📝 텍스트 직접 입력", "📁 파일 업로드"],
        horizontal=True
    )

    transcript = ""

    if input_method == "📝 텍스트 직접 입력":
        transcript = st.text_area(
            "컨콜 원문 입력",
            height=400,
            placeholder="컨퍼런스콜 원문을 여기에 붙여넣으세요..."
        )

    else:
        uploaded_file = st.file_uploader(
            "파일 업로드 (.txt, .docx)",
            type=['txt', 'docx']
        )

        if uploaded_file:
            if uploaded_file.name.endswith('.txt'):
                transcript = uploaded_file.read().decode('utf-8')
            elif uploaded_file.name.endswith('.docx'):
                try:
                    from docx import Document
                    import io
                    doc = Document(io.BytesIO(uploaded_file.read()))
                    transcript = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
                except ImportError:
                    st.error("python-docx 패키지가 필요합니다.")
                    return

            if transcript:
                st.success(f"✅ 파일 로드 완료: {len(transcript):,}자")
                with st.expander("원문 미리보기"):
                    st.text(transcript[:2000] + "..." if len(transcript) > 2000 else transcript)

    st.markdown("---")

    # 설정
    col1, col2 = st.columns(2)

    with col1:
        model = st.selectbox("GPT 모델", ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"])

    with col2:
        company_name = st.text_input("회사명 (선택)", placeholder="예: 삼성전자")

    # 요약 실행
    if st.button("🚀 요약 생성", type="primary", use_container_width=True):
        if not transcript or len(transcript) < 100:
            st.error("컨콜 원문을 입력해주세요. (최소 100자 이상)")
            return

        with st.spinner("GPT 요약 생성 중..."):
            try:
                summary = summarize_with_openai(transcript, model=model)

                st.success("✅ 요약 완료!")

                # 결과 표시
                st.markdown("### 📄 요약 결과")
                st.markdown(summary)

                # 다운로드 버튼
                filename = f"{company_name or '컨콜'}_{datetime.now().strftime('%Y%m%d')}_요약.txt"
                st.download_button(
                    label="📥 요약 다운로드 (.txt)",
                    data=summary,
                    file_name=filename,
                    mime="text/plain"
                )

            except Exception as e:
                st.error(f"요약 실패: {e}")

    st.markdown("---")

    # 최근 요약 파일
    st.subheader("📁 최근 요약 파일")

    summaries_dir = os.path.join(PROJECT_DIR, 'output', 'earnings_call_summaries')

    if os.path.exists(summaries_dir):
        files = [f for f in os.listdir(summaries_dir) if f.endswith(('.txt', '.docx'))]
        files.sort(reverse=True)

        if files:
            selected = st.selectbox("파일 선택", files[:10])

            if selected:
                filepath = os.path.join(summaries_dir, selected)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    st.text_area("내용", content, height=400)
                except:
                    st.warning("파일을 읽을 수 없습니다.")
        else:
            st.info("저장된 요약 파일이 없습니다.")
    else:
        st.info("요약 폴더가 없습니다.")

    # CLI 안내
    st.markdown("---")
    st.subheader("💻 CLI 명령어")
    st.code("""
# 파일로 요약
python scripts/4_Earnings_Call_Summarizer.py --file="원문.docx"

# 텔레그램 발송 포함
python scripts/4_Earnings_Call_Summarizer.py --file="원문.txt" --telegram
    """, language="bash")


if __name__ == "__main__":
    main()
