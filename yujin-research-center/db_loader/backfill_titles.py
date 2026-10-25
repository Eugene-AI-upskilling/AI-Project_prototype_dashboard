# -*- coding: utf-8 -*-
"""임시 제목("[산업분석] 리포트" 등)인 reports 행을 PDF 첫 페이지의 실제 제목으로 교체(일회성 백필).

    python -m db_loader.backfill_titles          # 미리보기(변경 없음)
    python -m db_loader.backfill_titles --apply  # Supabase에 반영

임시 제목인 행만 대상. 글자로 된 제목을 뽑지 못한 PDF는 그대로 둔다.
기업 리포트(kind=company)는 비어 있는 company 칸도 PDF의 회사명으로 채운다.
"""
import re, sys, argparse, requests
from . import supabase_upsert as su
from .extract_reports import download_pdf, pdf_title

PLACEHOLDER = re.compile(r"^\s*\[[^\]]+\]\s*리포트\s*$")


def main(apply=False):
    su._check()
    r = requests.get(f"{su.URL}/rest/v1/reports?select=id,url,kind,title,company&limit=5000",
                     headers=su._headers(), timeout=30)
    r.raise_for_status()
    rows = [x for x in r.json() if PLACEHOLDER.match(x.get("title") or "")]
    print(f"임시 제목 행: {len(rows)}개")
    plan = []
    for x in rows:
        try:
            title, big = pdf_title(download_pdf(x["url"]))
        except Exception as e:
            print(f"  [skip] {x['url'].rsplit('/', 1)[-1]} PDF 실패: {e}")
            continue
        if not title:
            continue
        patch = {"title": title}
        if x.get("kind") == "company" and not x.get("company") and big:
            patch["company"] = big
        plan.append((x, patch))
        print(f"  {x['title']:<12} → {title}" + (f"   (회사명: {patch['company']})" if "company" in patch else ""))
    print(f"교체 대상: {len(plan)}개 / 제목 추출 불가(유지): {len(rows) - len(plan)}개")
    if not apply:
        print("미리보기만 했습니다. 반영하려면 --apply")
        return
    ok = 0
    for x, patch in plan:
        u = requests.patch(f"{su.URL}/rest/v1/reports?id=eq.{x['id']}", json=patch,
                           headers=su._headers({"Prefer": "return=minimal"}), timeout=30)
        if u.ok:
            ok += 1
        else:
            print("  [fail]", x["id"], u.status_code, u.text[:200])
    print(f"반영 완료: {ok}/{len(plan)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    main(ap.parse_args().apply)
