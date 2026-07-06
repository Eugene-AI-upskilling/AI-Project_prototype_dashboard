# 유진 Insight Lab — 매일 시황·리포트 AI 앵커 브리핑 영상 자동 생성(HeyGen)
# (작업 스케줄러가 매일 17:45 호출 — 데이터 적재 17:15 직후)
# 견고화: 자기 위치 기준 경로 + python 자동탐색 + 항상 로깅.
$ErrorActionPreference = 'Continue'

$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$root = Split-Path -Parent $here                  # db_loader 의 상위 = yujin-research-center
Set-Location -LiteralPath $root

$log = Join-Path $here 'generate_briefings.log'
$ts  = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$ts] AI 앵커 브리핑 생성 시작 (root=$root) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log

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

& $py -m db_loader.generate_briefings *>> $log
$code = $LASTEXITCODE
$te = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$te] 생성 종료 (exit $code) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
exit $code
