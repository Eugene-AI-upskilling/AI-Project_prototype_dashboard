# coding=utf-8
"""
페이지 4: 컨퍼런스콜 요약
"""

import streamlit as st
import os
import sys
from datetime import datetime

# 프로젝트 경로 추가
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_DIR)

st.set_page_config(page_title="컨콜 요약", page_icon="🎙️", layout="wide")

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, '.env'))


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
                    st.error("python-docx 패키지가 필요합니다: pip install python-docx")

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
        send_telegram = st.checkbox("텔레그램 발송", value=False)

    # 요약 실행
    if st.button("🚀 요약 생성", type="primary", use_container_width=True):
        if not transcript or len(transcript) < 100:
            st.error("컨콜 원문을 입력해주세요. (최소 100자 이상)")
            return

        with st.spinner("GPT 요약 생성 중..."):
            try:
                scripts_dir = os.path.join(PROJECT_DIR, 'scripts')
                sys.path.insert(0, scripts_dir)

                from _4_Earnings_Call_Summarizer import summarize_with_gpt, save_to_txt

                summary, company, quarter = summarize_with_gpt(transcript, model=model)

                st.success(f"✅ 요약 완료: {company} {quarter}")

                # 결과 표시
                st.markdown("### 📄 요약 결과")
                st.markdown(summary)

                # 다운로드 버튼
                st.download_button(
                    label="📥 요약 다운로드 (.txt)",
                    data=summary,
                    file_name=f"{company}_{quarter}_컨콜요약.txt",
                    mime="text/plain"
                )

                # 저장
                output_dir = os.path.join(PROJECT_DIR, 'output', 'earnings_call_summaries')
                os.makedirs(output_dir, exist_ok=True)
                filepath = save_to_txt(summary, company, quarter, output_dir)
                st.info(f"저장됨: {filepath}")

            except ImportError as e:
                st.error(f"모듈 로드 실패: {e}")
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

# 대화형 모드
python scripts/4_Earnings_Call_Summarizer.py --interactive
    """, language="bash")


if __name__ == "__main__":
    main()
