# -*- coding: utf-8 -*-
"""db_loader 공용 LLM 호출 — Claude API (Anthropic SDK).

키: 환경변수 CLAUDE_API_KEY (setx claude_api_key ...) 또는 ANTHROPIC_API_KEY.
    setx 직후 이미 떠 있던 프로세스는 새 값을 못 보므로 Windows 사용자 환경변수(레지스트리)도 확인한다.
모델: CLAUDE_MODEL 로 바꿀 수 있음 (기본 claude-opus-5-5).

  text(system, user)               → 문자열 (실패/거절 시 None)
  json_out(system, user, schema)   → dict  (JSON Schema 로 형식 보장, 실패/거절 시 None)

거절(stop_reason == "refusal")은 서버측 fallbacks="default" 로 먼저 다른 모델이 재시도하고,
그래도 거절이면 None 을 돌려 호출부의 폴백(추출식 요약·데이터 요약)이 쓰이게 한다.
"""
import json
import os

MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5-5")
_BETAS = ["server-side-fallback-2026-07-01"]
_client = None
_disabled = None   # 키 오류·사용 한도 초과 등 — 같은 실행에서 더 호출해도 실패하므로 기억해 둠


def api_key():
    for name in ("CLAUDE_API_KEY", "ANTHROPIC_API_KEY"):
        if os.environ.get(name):
            return os.environ[name]
    try:   # setx 로 저장했지만 현재 프로세스 환경에 아직 없는 경우
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            for name in ("claude_api_key", "ANTHROPIC_API_KEY"):
                try:
                    v, _ = winreg.QueryValueEx(k, name)
                    if v:
                        return v
                except FileNotFoundError:
                    pass
    except Exception:
        pass
    return None


def available():
    return bool(api_key()) and not _disabled


def _get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(api_key=api_key(), max_retries=3, timeout=180.0)
    return _client


def _fatal(e):
    """계정 단위 오류(재시도해도 같은 결과)인지 판단."""
    import anthropic
    if isinstance(e, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return True
    msg = str(e).lower()
    return isinstance(e, anthropic.BadRequestError) and ("usage limit" in msg or "credit balance" in msg)


def _call(system, user, max_tokens, effort, output_format=None):
    global _disabled
    if _disabled:
        raise RuntimeError(f"Claude API 사용 불가: {_disabled}")
    try:
        return _request(system, user, max_tokens, effort, output_format)
    except Exception as e:
        if _fatal(e):
            _disabled = str(e)[:200]
            print(f"  ⚠ Claude API 계정 오류 → 이번 실행에서는 더 호출하지 않음: {_disabled}")
        raise


def _request(system, user, max_tokens, effort, output_format=None):
    output_config = {"effort": effort}
    if output_format:
        output_config["format"] = output_format
    resp = _get_client().beta.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config=output_config,
        betas=_BETAS,
        fallbacks="default",
    )
    if resp.stop_reason == "refusal":
        return None
    return next((b.text for b in resp.content if b.type == "text"), None)


def text(system, user, max_tokens=4000, effort="low"):
    """짧은 요약용. effort 는 low 기본 (1~2문장 요약에 깊은 추론 불필요)."""
    out = _call(system, user, max_tokens, effort)
    return out.strip() if out else None


def json_out(system, user, schema, max_tokens=8000, effort="medium"):
    out = _call(system, user, max_tokens, effort,
                {"type": "json_schema", "schema": schema})
    return json.loads(out) if out else None
