# -*- coding: utf-8 -*-
"""애널리스트 리포트 요약 → 텔레그램 전송.

설정 (한 번만):
  1) 텔레그램에서 @BotFather → /newbot → 봇 토큰 발급
  2) 만든 봇에게 아무 메시지나 보낸 뒤(그룹이면 봇 초대 후 메시지)
       setx TELEGRAM_BOT_TOKEN "123456:ABC..."
       python telegram_send.py --whoami          # chat_id 확인
       setx TELEGRAM_CHAT_ID "123456789"

사용:
  python telegram_send.py --query 삼성전자       # 캐시에서 검색해 전송 (종목·증권사·애널리스트)
  python telegram_send.py --nid 97012 97011     # 특정 리포트
  python telegram_send.py --today               # 오늘자 전체 (다이제스트)
"""
import argparse
import html
import os
import sys

import requests

MAX_LEN = 4000   # 텔레그램 한 메시지 한도 4096자


def _env(name):
    if os.environ.get(name):
        return os.environ[name]
    try:   # setx 직후 이미 떠 있던 프로세스는 새 값을 못 보므로 레지스트리도 확인 (llm.py 와 동일)
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, name)[0] or None
    except Exception:
        return None


def config():
    return _env("TELEGRAM_BOT_TOKEN"), _env("TELEGRAM_CHAT_ID")


def configured():
    token, chat = config()
    return bool(token and chat)


def _won(v):
    return f"{v:,}원" if v else "-"


def format_report(r):
    """리포트 1건 → 텔레그램 HTML 메시지 블록."""
    e = lambda t: html.escape(t or "", quote=False)
    s = r.get("summary") or {}
    goal, prev, px = r.get("goalPrice"), r.get("prevGoalPrice"), r.get("priceAtWriteDate")
    if goal and prev and goal != prev:
        change = f"{'▲ 상향' if goal > prev else '▼ 하향'} (직전 {prev:,})"
    elif goal and prev:
        change = "유지"
    else:
        change = ""
    upside = f" · 상승여력 {round((goal / px - 1) * 100):+d}%" if goal and px else ""
    analysts = ", ".join(r.get("analysts") or []) or "애널리스트 미확인"

    lines = [
        f"📊 <b>{e(r['itemName'])}</b> | {e(r['title'])}",
        f"🏢 {e(r['brokerName'])} · {e(analysts)} · {r['writeDate']}",
        f"🎯 {e(r.get('opinionText') or '의견없음')} | 목표가 {_won(goal)} {change}{upside}".rstrip(),
    ]
    if s.get("headline"):
        lines += ["", f"💡 <b>{e(s['headline'])}</b>"]
    lines += [f"• {e(p)}" for p in s.get("points") or []]
    if s.get("risk"):
        lines.append(f"⚠️ {e(s['risk'])}")
    links = [f'<a href="{html.escape(r["url"])}">네이버</a>']
    if r.get("pdfUrl"):
        links.append(f'<a href="{html.escape(r["pdfUrl"])}">PDF 원문</a>')
    lines.append("🔗 " + " · ".join(links))
    return "\n".join(lines)


def build_messages(reports, title=None):
    """여러 건을 4096자 한도에 맞춰 메시지 여러 개로 나눈다."""
    msgs, cur = [], (f"<b>{html.escape(title, quote=False)}</b>\n\n" if title else "")
    for r in reports:
        block = format_report(r) + "\n\n"
        if cur and len(cur) + len(block) > MAX_LEN:
            msgs.append(cur.strip())
            cur = ""
        cur += block
    if cur.strip():
        msgs.append(cur.strip())
    return msgs


def send_text(text, token=None, chat_id=None):
    t, c = config()
    token, chat_id = token or t, chat_id or c
    if not (token and chat_id):
        raise RuntimeError("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 가 설정되지 않았습니다 (telegram_send.py 상단 설명 참고)")
    r = requests.post(f"https://api.telegram.org/bot{token}/sendMessage", timeout=15, json={
        "chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True})
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"텔레그램 전송 실패: {data.get('description')}")
    return data


def send_reports(reports, title=None, token=None, chat_id=None):
    if title is None and len(reports) > 1:
        title = f"애널리스트 리포트 요약 {len(reports)}건"
    msgs = build_messages(reports, title)
    for m in msgs:
        send_text(m, token, chat_id)
    print(f"✓ 텔레그램 전송: 리포트 {len(reports)}건 / 메시지 {len(msgs)}개")
    return len(msgs)


def whoami():
    token, _ = config()
    if not token:
        sys.exit("먼저 TELEGRAM_BOT_TOKEN 을 설정하세요.")
    res = requests.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=15).json()
    chats = {}
    for u in res.get("result", []):
        msg = u.get("message") or u.get("channel_post") or u.get("my_chat_member") or {}
        ch = msg.get("chat")
        if ch:
            chats[ch["id"]] = ch.get("title") or ch.get("username") or ch.get("first_name")
    if not chats:
        print("받은 메시지가 없습니다. 봇에게 메시지를 하나 보낸 뒤 다시 실행하세요.")
    for cid, name in chats.items():
        print(f"chat_id={cid}  ({name})")


def main():
    from naver_reports import load_cache, sorted_reports
    from search import search

    ap = argparse.ArgumentParser(description="리포트 요약 텔레그램 전송")
    ap.add_argument("--query", help="종목명·증권사·애널리스트 검색어")
    ap.add_argument("--nid", nargs="+", help="리포트 nid")
    ap.add_argument("--today", action="store_true", help="가장 최근 작성일 리포트 전체")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--whoami", action="store_true", help="봇이 받은 메시지에서 chat_id 확인")
    ap.add_argument("--dry-run", action="store_true", help="보내지 않고 메시지만 출력")
    args = ap.parse_args()

    if args.whoami:
        return whoami()
    reports = sorted_reports(load_cache())
    if args.nid:
        reports = [r for r in reports if r["nid"] in set(args.nid)]
        title = None
    elif args.query:
        reports = search(reports, args.query)[:args.limit]
        title = f"'{args.query}' 리포트 요약"
    elif args.today and reports:
        latest = reports[0]["writeDate"]
        reports = [r for r in reports if r["writeDate"] == latest]
        title = f"{latest} 애널리스트 리포트 {len(reports)}건"
    else:
        ap.error("--query / --nid / --today 중 하나를 지정하세요")
    if not reports:
        sys.exit("조건에 맞는 리포트가 캐시에 없습니다. 먼저 naver_reports.py 로 수집하세요.")
    if args.dry_run:
        for m in build_messages(reports, title):
            print(m, "\n" + "─" * 40)
        return
    send_reports(reports, title)


if __name__ == "__main__":
    main()
