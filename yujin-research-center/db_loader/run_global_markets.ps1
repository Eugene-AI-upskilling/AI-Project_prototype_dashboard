# 유진 Insight Lab — 해외 증시 아침 갱신 (미국 장 마감 후 매일 07:10)
# 1) 해외 실적 엑셀 재생성(scripts/3_Global_Earnings.py)  2) 지수·섹터·신고가/ATH·딥리서치 적재
# 견고화: 자기 위치 기준 경로 해석 + python 자동탐색 + 항상 로깅.
$ErrorActionPreference = 'Continue'

# 자기(스크립트) 위치 기준으로 경로 해석 — 하드코딩/한글경로 세션 의존 제거
$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$root = Split-Path -Parent $here                 # db_loader 의 상위 = yujin-research-center
Set-Location -LiteralPath $root

$log = Join-Path $here 'global_markets.log'
$ts  = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$ts] global markets 시작 (root=$root) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log

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
  "==== [$ts] global markets 종료 (python 없음) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
  exit 1
}
"  python = $py" | Out-File -Append -Encoding utf8 -LiteralPath $log

$proj = Split-Path -Parent $root                # Eugene_AI_Project (실적 수집 스크립트 위치)
"  [1/2] 해외 실적 수집" | Out-File -Append -Encoding utf8 -LiteralPath $log
& $py (Join-Path $proj 'scripts_Global_Earnings.py') --no-cache *>> $log
"  [1/2] exit $LASTEXITCODE" | Out-File -Append -Encoding utf8 -LiteralPath $log

"  [2/2] 지수·섹터·신고가·딥리서치 적재" | Out-File -Append -Encoding utf8 -LiteralPath $log
$env:PYTHONIOENCODING = 'utf-8'
& $py -m db_loader.global_markets --push *>> $log
$code = $LASTEXITCODE
$te = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"==== [$te] global markets 종료 (exit $code) ====" | Out-File -Append -Encoding utf8 -LiteralPath $log
exit $code
