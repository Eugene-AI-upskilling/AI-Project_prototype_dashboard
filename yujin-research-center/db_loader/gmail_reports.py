# -*- coding: utf-8 -*-
"""Gmail(research@eugenefn.com) → 리포트 PDF URL 추출 → 카드 적재 (스케줄러용).

MCP가 아니라 Gmail API(OAuth)로 동작하므로 작업 스케줄러가 무인 실행 가능.
흐름: 메일 검색 → 본문에서 PDF URL 추출 → (신규만) extract_reports → reports upsert(url 기준).

최초 1회만 브라우저 인증(token 저장), 이후 refresh token으로 무인 갱신.
필요: pip install google-api-python-client google-auth google-auth-oauthlib
인증파일: db_loader/gmail_credentials.json (Google Cloud 다운로드)
        → db_loader/gmail_token.json (자동 생성/갱신)
"""
import os, re, sys, io, base64, argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = os.path.dirname(__file__)
CRED = os.path.join(BASE, "gmail_credentials.json")
TOKEN = os.path.join(BASE, "gmail_token.json")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
SENDER = "research@eugenefn.com"
URL_RE = re.compile(r'https?://(?:www\.)?eugenefn\.com/common/files/amail/[^\s"\'<>)]+\.pdf')


def _service():
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    creds = None
    if os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds or not creds.valid:
        refreshed = False
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())                  # 무인 갱신
                refreshed = True
            except Exception as e:                         # invalid_grant(만료·취소) 등 → 재인증 필요
                print(f"  [warn] 토큰 갱신 실패({e}). 브라우저 재인증이 필요합니다.")
                creds = None
        if not refreshed:
            if not os.path.exists(CRED):
                raise RuntimeError(f"gmail_credentials.json 없음 → {CRED} (Google Cloud OAuth 클라이언트 다운로드)")
            # 무인(스케줄러) 실행에서 브라우저 인증으로 무한 대기하지 않도록 가드.
            # 브라우저 재인증은 명시적 옵트인(GMAIL_ALLOW_INTERACTIVE=1)일 때만 허용.
            if os.getenv("GMAIL_ALLOW_INTERACTIVE") != "1":
                raise RuntimeError(
                    "Gmail 재인증 필요(토큰 만료/취소). 대화형 터미널에서 아래처럼 실행해 브라우저 인증을 완료하세요:\n"
                    "  Windows PowerShell:  $env:GMAIL_ALLOW_INTERACTIVE='1'; python -m db_loader.gmail_reports --days 2\n"
                    "  (완료 후 gmail_token.json 이 갱신되어 이후 무인 실행이 정상화됩니다.)"
                )
            flow = InstalledAppFlow.from_client_secrets_file(CRED, SCOPES)
            # host=127.0.0.1 고정: 'localhost'가 IPv6(::1)로 풀려 접근 거부되는 문제 회피.
            # prompt=consent: 재인증 시 새 refresh_token 발급 보장.
            creds = flow.run_local_server(
                host="127.0.0.1", port=0, open_browser=True,
                access_type="offline", prompt="consent",
                authorization_prompt_message="브라우저에서 로그인·동의를 완료하세요. (열리지 않으면 아래 URL 접속)\n{url}",
                success_message="인증 완료. 이 창을 닫고 터미널로 돌아가세요.",
            )
        with open(TOKEN, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def _walk_text(payload):
    """MIME 트리에서 text/plain·text/html 본문을 모두 디코드해 연결."""
    out = []
    def rec(p):
        body = p.get("body", {})
        data = body.get("data")
        if data and p.get("mimeType", "").startswith("text/"):
            out.append(base64.urlsafe_b64decode(data).decode("utf-8", "ignore"))
        for sub in p.get("parts", []) or []:
            rec(sub)
    rec(payload)
    return "\n".join(out)


def fetch_pdf_urls(days=2, max_msgs=50):
    """최근 N일 research 메일에서 PDF URL 집합 수집."""
    svc = _service()
    q = f"from:{SENDER} newer_than:{days}d"
    res = svc.users().messages().list(userId="me", q=q, maxResults=max_msgs).execute()
    urls = []
    for m in res.get("messages", []):
        msg = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
        urls += URL_RE.findall(_walk_text(msg.get("payload", {})))
    # 순서 보존 dedup
    seen, uniq = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u); uniq.append(u)
    return uniq


def run(days=2, push=True):
    from . import extract_reports
    urls = fetch_pdf_urls(days)
    print(f"메일에서 발견한 PDF URL: {len(urls)}개")
    if not urls:
        return []

    # 이미 적재된 url은 스킵(증분)
    skip = set()
    if push:
        try:
            from . import supabase_upsert
            skip = set(supabase_upsert.fetch_column("reports", "url"))
        except Exception as e:
            print("  [warn] 기존 url 조회 실패:", e)
    todo = [u for u in urls if u not in skip]
    print(f"신규 처리 대상: {len(todo)}개 (기존 {len(urls)-len(todo)} 스킵)")

    recs = [extract_reports.to_record(u) for u in todo]
    recs = [r for r in recs if r]
    for r in recs:
        print(f"  [{r['category']}] {r['title']} · {r['analyst']} · {r['published_at']}")

    if push and recs:
        from . import supabase_upsert
        n = supabase_upsert.upsert("reports", recs, "url")     # url 기준 upsert
        print(f"reports 적재(upsert): {n}건")
    return recs


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=2)
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()
    run(a.days, push=not a.no_push)
