# 유진 Insight Lab — 데일리 파이프라인 직후 Supabase 적재
# (작업 스케줄러가 매일 호출. market_tone 수집 직후 권장)
# 견고화: 자기 위치 기준 경로 해석 + python 자동탐색 + 항상 로깅.
$ErrorActionPreference = 'Continue'

# 자기(스크립트) 위치 기준으로 경로 해석 — 하드코딩/한글경로 세션 의존 제거
$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$root = Split-Path -Parent $here                 # db_loader 의 상위 = yujin-research-center
Set-Location -LiteralPath $root

$log = Join-Path $here 'push.log'
$ts  = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$ts] DB push 시작 (root=$root) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log

# python 실행 파일 탐색 (스케줄러 세션에 PATH 가 없을 수 있음)
$py = $null
foreach ($cand in @('python','python3','py')) {
  $c = Get-Command $cand -ErrorAction SilentlyContinue
  if ($c) { $py = $c.Source; break }
}
if (-not $py) {
  foreach ($p in @(
      "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe",
      "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
      "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
      "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe")) {
    if (Test-Path -LiteralPath $p) { $py = $p; break }
  }
}
if (-not $py) {
  "  [ERROR] python 실행 파일을 찾지 못했습니다. PATH 또는 설치 경로를 확인하세요." | Out-File -Append -Encoding utf8 -LiteralPath $log
  "==== [$ts] DB push 종료 (python 없음) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
  exit 1
}
"  python = $py" | Out-File -Append -Encoding utf8 -LiteralPath $log

& $py -m db_loader.run --push *>> $log
$code = $LASTEXITCODE
$te = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$te] DB push 종료 (exit $code) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
exit $code
