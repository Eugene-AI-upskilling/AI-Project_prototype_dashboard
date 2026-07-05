# 유진 Insight Lab — Gmail(research@eugenefn.com) 리포트 자동 수집 → Supabase reports 적재
# (작업 스케줄러가 매일 08:30 호출) — 견고화: 자기 위치 기준 경로 + python 자동탐색 + 항상 로깅.
$ErrorActionPreference = 'Continue'

$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$root = Split-Path -Parent $here                  # db_loader 의 상위 = yujin-research-center
Set-Location -LiteralPath $root

$log = Join-Path $here 'gmail_reports.log'
$ts  = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$ts] Gmail 리포트 수집 시작 (root=$root) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log

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
      "C:\Python314\python.exe")) {
    if (Test-Path -LiteralPath $p) { $py = $p; break }
  }
}
if (-not $py) {
  "  [ERROR] python 실행 파일을 찾지 못했습니다." | Out-File -Append -Encoding utf8 -LiteralPath $log
  exit 1
}
"  python = $py" | Out-File -Append -Encoding utf8 -LiteralPath $log

& $py -m db_loader.gmail_reports --days 2 *>> $log
$code = $LASTEXITCODE
$te = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$te] Gmail 리포트 수집 종료 (exit $code) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
exit $code
