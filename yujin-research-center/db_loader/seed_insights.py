# -*- coding: utf-8 -*-
"""insights 테이블을 애널리스트 채널 4분류 구조로 교체 적재.

탭: macro / tech / consumer / disclosure  (프론트 #inTabs 와 일치)
실행: python -m db_loader.seed_insights
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROWS = [
    {"tab": "macro", "tag": "주식전략·시황", "title": "주식 전략 & 시황",
     "author": "허재환", "role": "주식 전략·시황",
     "summary": "증시 방향과 주도 업종, 매크로 변수와 수급 변화를 매일 짚어주는 전략·시황 채널.",
     "grad": "135deg,#0b59d5,#0090ff", "channel_url": "https://t.me/huhjae"},
    {"tab": "macro", "tag": "ETF 전략", "title": "ETF 전략",
     "author": "강송철", "role": "ETF 전략",
     "summary": "국내외 ETF 자금 흐름과 상품 전략. 테마·자산배분 ETF로 읽는 시장의 방향.",
     "grad": "135deg,#194386,#1772f8", "channel_url": "https://t.me/buykkang"},
    {"tab": "macro", "tag": "퀀트 전략", "title": "퀀트 전략",
     "author": "안지선", "role": "퀀트 전략",
     "summary": "팩터·시그널 기반 퀀트 전략. 데이터로 검증한 종목·스타일 아이디어를 공유합니다.",
     "grad": "135deg,#062554,#006bd6", "channel_url": "https://t.me/evsunny"},
    {"tab": "tech", "tag": "테크·인프라", "title": "테크/인프라팀 리서치 & 뉴스",
     "author": "테크/인프라팀", "role": "반도체·전자·소재·인프라",
     "summary": "유진투자증권 테크/인프라팀의 리서치 자료와 뉴스. 반도체(손인준)·전기전자(이주형)·글로벌IT/테크(박재환)·화학/정유/유틸리티/배터리(황성현)·건설/부동산(류태환)·로봇/기계/운송/조선(양승윤)·철강(김소정)을 한 채널에서.",
     "grad": "135deg,#0090ff,#0b59d5", "channel_url": "https://t.me/eugene2team"},
    {"tab": "consumer", "tag": "컨슈머·전략산업", "title": "컨슈머/전략산업팀 인사이트",
     "author": "컨슈머/전략산업팀", "role": "소비재·성장산업",
     "summary": "이재일 팀장(Mobility/EV)·이현지(미디어/엔터/레저)·정의훈(인터넷/게임/우주항공)·이해니(유통/패션/화장품)·이찬영(통신)·이다빈(의료기기)이 전하는 컨슈머·전략산업 인사이트.",
     "grad": "135deg,#1772f8,#0090ff", "channel_url": "https://t.me/eugenetmm"},
    {"tab": "disclosure", "tag": "실시간 공시", "title": "어닝 서프라이즈·공시 실시간 알림",
     "author": "Daily Quant Tracker", "role": "퀀트 시그널 봇",
     "summary": "잠정실적 서프라이즈와 주요 공시를 실시간으로 받아보세요.",
     "grad": "135deg,#e0344b,#0b59d5", "channel_url": "https://t.me/arning_surprise_ssunny_bot"},
]

if __name__ == "__main__":
    from . import supabase_upsert
    n = supabase_upsert.replace_table("insights", ROWS)
    print(f"insights 적재 완료: {n}건 (macro 3 / tech 1 / consumer 1 / disclosure 1)")
