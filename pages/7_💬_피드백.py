# coding=utf-8
"""
페이지 7: 피드백 및 기능 요청
"""

import streamlit as st
import os
import json
from datetime import datetime
from typing import List, Dict

import requests

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

st.set_page_config(page_title="피드백", page_icon="💬", layout="wide")


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


def load_feedback() -> List[Dict]:
    """피드백 목록 로드"""
    if 'feedback_list' not in st.session_state:
        st.session_state['feedback_list'] = []
    return st.session_state['feedback_list']


def save_feedback(feedback: Dict):
    """피드백 저장"""
    if 'feedback_list' not in st.session_state:
        st.session_state['feedback_list'] = []
    st.session_state['feedback_list'].insert(0, feedback)


# =============================================================================
# 메인 앱
# =============================================================================

def main():
    st.title("💬 피드백 & 기능 요청")
    st.markdown("원하는 기능이나 개선 사항을 남겨주세요!")

    st.markdown("---")

    # 피드백 작성 폼
    st.subheader("✍️ 새 피드백 작성")

    col1, col2 = st.columns(2)

    with col1:
        name = st.text_input("이름 (선택)", placeholder="익명")

    with col2:
        category = st.selectbox(
            "카테고리",
            ["기능 요청", "버그 신고", "개선 제안", "질문", "기타"]
        )

    title = st.text_input("제목", placeholder="간단한 제목을 입력하세요")

    content = st.text_area(
        "내용",
        height=150,
        placeholder="상세 내용을 작성해주세요...\n\n예시:\n- 어떤 기능이 필요한가요?\n- 어떤 문제가 있었나요?\n- 어떻게 개선하면 좋을까요?"
    )

    # 우선순위
    priority = st.select_slider(
        "중요도",
        options=["낮음", "보통", "높음", "긴급"],
        value="보통"
    )

    # 텔레그램 알림 옵션
    send_to_telegram = st.checkbox("텔레그램으로 알림 보내기", value=True)

    # 제출 버튼
    if st.button("📤 피드백 제출", type="primary", use_container_width=True):
        if not title or not content:
            st.error("제목과 내용을 모두 입력해주세요.")
        else:
            # 피드백 데이터 생성
            feedback = {
                'id': datetime.now().strftime('%Y%m%d%H%M%S'),
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'name': name if name else '익명',
                'category': category,
                'title': title,
                'content': content,
                'priority': priority,
                'status': '접수됨'
            }

            # 저장
            save_feedback(feedback)

            # 텔레그램 알림
            if send_to_telegram:
                priority_emoji = {
                    "낮음": "🟢",
                    "보통": "🟡",
                    "높음": "🟠",
                    "긴급": "🔴"
                }

                msg = f"""💬 <b>새 피드백 접수</b>

{priority_emoji.get(priority, '🟡')} <b>[{category}]</b> {title}

👤 작성자: {feedback['name']}
📅 시간: {feedback['timestamp']}
⚡ 중요도: {priority}

📝 내용:
{content[:500]}{'...' if len(content) > 500 else ''}
"""
                if send_telegram(msg):
                    st.success("✅ 피드백이 제출되었습니다! (텔레그램 알림 전송됨)")
                else:
                    st.success("✅ 피드백이 제출되었습니다!")
                    st.info("ℹ️ 텔레그램 알림은 전송되지 않았습니다. (설정 확인 필요)")
            else:
                st.success("✅ 피드백이 제출되었습니다!")

            st.rerun()

    st.markdown("---")

    # 피드백 목록
    st.subheader("📋 피드백 목록")

    feedback_list = load_feedback()

    if not feedback_list:
        st.info("아직 등록된 피드백이 없습니다.")
    else:
        # 필터
        col1, col2 = st.columns(2)

        with col1:
            filter_category = st.selectbox(
                "카테고리 필터",
                ["전체"] + list(set(f['category'] for f in feedback_list)),
                key="filter_cat"
            )

        with col2:
            filter_status = st.selectbox(
                "상태 필터",
                ["전체", "접수됨", "검토중", "진행중", "완료", "보류"],
                key="filter_status"
            )

        # 필터링
        filtered = feedback_list
        if filter_category != "전체":
            filtered = [f for f in filtered if f['category'] == filter_category]
        if filter_status != "전체":
            filtered = [f for f in filtered if f.get('status', '접수됨') == filter_status]

        st.caption(f"총 {len(filtered)}개의 피드백")

        # 피드백 카드
        for i, fb in enumerate(filtered):
            priority_color = {
                "낮음": "🟢",
                "보통": "🟡",
                "높음": "🟠",
                "긴급": "🔴"
            }
            status_badge = {
                "접수됨": "📥",
                "검토중": "🔍",
                "진행중": "🔧",
                "완료": "✅",
                "보류": "⏸️"
            }

            with st.expander(
                f"{priority_color.get(fb.get('priority', '보통'), '🟡')} "
                f"**[{fb['category']}]** {fb['title']} "
                f"— {fb['name']} ({fb['timestamp']})"
            ):
                col1, col2, col3 = st.columns([2, 2, 1])

                with col1:
                    st.markdown(f"**상태:** {status_badge.get(fb.get('status', '접수됨'), '📥')} {fb.get('status', '접수됨')}")

                with col2:
                    st.markdown(f"**중요도:** {fb.get('priority', '보통')}")

                with col3:
                    # 상태 변경 (관리자용)
                    new_status = st.selectbox(
                        "상태 변경",
                        ["접수됨", "검토중", "진행중", "완료", "보류"],
                        index=["접수됨", "검토중", "진행중", "완료", "보류"].index(fb.get('status', '접수됨')),
                        key=f"status_{fb['id']}",
                        label_visibility="collapsed"
                    )
                    if new_status != fb.get('status', '접수됨'):
                        fb['status'] = new_status
                        st.rerun()

                st.markdown("---")
                st.markdown(fb['content'])

    st.markdown("---")

    # 통계
    if feedback_list:
        st.subheader("📊 통계")

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("전체 피드백", len(feedback_list))

        with col2:
            pending = len([f for f in feedback_list if f.get('status', '접수됨') in ['접수됨', '검토중']])
            st.metric("대기중", pending)

        with col3:
            in_progress = len([f for f in feedback_list if f.get('status') == '진행중'])
            st.metric("진행중", in_progress)

        with col4:
            completed = len([f for f in feedback_list if f.get('status') == '완료'])
            st.metric("완료", completed)

    # 안내
    st.markdown("---")
    with st.expander("ℹ️ 안내"):
        st.markdown("""
        **피드백 유형:**
        - **기능 요청**: 새로운 기능 추가 요청
        - **버그 신고**: 오류나 문제점 신고
        - **개선 제안**: 기존 기능 개선 아이디어
        - **질문**: 사용법이나 기능에 대한 질문
        - **기타**: 그 외 의견

        **중요도:**
        - 🟢 낮음: 여유 있을 때 처리
        - 🟡 보통: 일반적인 요청
        - 🟠 높음: 빠른 처리 필요
        - 🔴 긴급: 즉시 처리 필요

        **참고:**
        - 피드백은 현재 세션 동안만 유지됩니다.
        - 텔레그램 알림이 설정되어 있으면 관리자에게 즉시 알림이 전송됩니다.
        """)


if __name__ == "__main__":
    main()
