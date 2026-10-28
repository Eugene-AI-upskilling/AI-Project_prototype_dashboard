# -*- coding: utf-8 -*-
"""AI 리서치 라운지 로컬 저장소 (SQLite).

로컬 시연용. 운영 전환 시 같은 테이블을 Supabase로 옮긴다.
  reports   리포트 메타 (PDF 1건 = 1행)
  pages     리포트 쪽별 원문 (근거 검색 · 인용 대조용)
  questions 고객 질문 + AI 초안 + 검수 결과
  feedback / event_apps / consults  고객 행동 기록
"""
import json
import os
import sqlite3
import threading
import time

PATH = os.environ.get("LOUNGE_DB", os.path.join(os.path.dirname(__file__), "lounge.db"))
_lock = threading.Lock()

SCHEMA = """
create table if not exists reports(
  id integer primary key, file text unique, url text, title text, kind text,
  category text, ticker text, author text, desk text, published_at text, page_count integer,
  added_at real);
create table if not exists pages(
  report_id integer, page integer, text text, primary key(report_id, page));
create table if not exists questions(
  id integer primary key, text text, persona text, topic text,
  status text,               -- drafting | pending | reviewed | hold | routed | error
  draft text,                -- AI 초안 JSON
  answer text,               -- 검수 후 공개 JSON
  route text, error text,
  stale integer default 0, stale_reason text,
  reviewer text, created_at real, reviewed_at real, draft_secs real);
create table if not exists feedback(id integer primary key, question_id integer, persona text, vote text, at real);
create table if not exists event_apps(id integer primary key, event_id text, persona text, state text, at real);
create table if not exists exports(id integer primary key, question_id integer, persona text, kind text,
  files text, created_at real);
create table if not exists consults(id integer primary key, persona text, kind text, question_id integer,
  context text, memo text, state text, at real);
create table if not exists web_answers(question_id integer primary key, text text, sources text, secs real, created_at real);
"""


def conn():
    c = sqlite3.connect(PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _lock, conn() as c:
        c.executescript(SCHEMA)


def q(sql, args=(), one=False):
    with _lock, conn() as c:
        rows = [dict(r) for r in c.execute(sql, args).fetchall()]
    return (rows[0] if rows else None) if one else rows


def x(sql, args=()):
    with _lock, conn() as c:
        cur = c.execute(sql, args)
        return cur.lastrowid


def now():
    return time.time()


def loads(s):
    try:
        return json.loads(s) if s else None
    except ValueError:
        return None
