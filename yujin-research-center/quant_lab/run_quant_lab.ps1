# ============================================================================
# 퀀트 스튜디오 배치 — 작업 스케줄러 진입점 (Eugene_QuantLab_Sun1000)
#
# quant.html 이 쓰는 실데이터를 주 1회 갱신한다.
#   1) pykrx 월말 KRX 패널 증분 수집 (신규 월말만)
#   2) 팩터 6종 월별 수익률 + 코스피 벤치마크 → Supabase
#   3) 종목별 실측 지표 → quant_stock_stats
#   4) 대표 전략 12종 tossquant 티어시트 → Storage 업로드 + 인덱싱
#
# 티어시트는 tossquant(사내 QuantStats 포크)가 필요하다:
#   pip install -e <quantstats_eugene 체크아웃 경로>
#
# 수동 실행:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "<이 파일>"
#   # 티어시트 없이 데이터만:  ... -OnlyPush
# ============================================================================
param([switch]$OnlyPush, [switch]$SkipIngest)

$ErrorActionPreference = "Continue"
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
# PowerShell 이 네이티브 출력을 cp949 로 디코딩해 한글 로그가 깨지는 걸 막는다.
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$root = Split-Path -Parent $here            # quant_lab 의 상위 = yujin-research-center
Set-Location -LiteralPath $root

$LogDir = Join-Path $here "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("quant_lab_{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))

$Python = "C:\Python314\python.exe"
if (-not (Test-Path $Python)) {
  $c = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($c) { $Python = $c.Source }
}
if (-not (Test-Path $Python)) {
  "[ERROR] python 실행 파일을 찾지 못했습니다." | Tee-Object -FilePath $LogFile -Append
  exit 1
}

$PyArgs = @("-m", "quant_lab.run_quant_lab")
if ($OnlyPush)   { $PyArgs += "--only-push" }
if ($SkipIngest) { $PyArgs += "--skip-ingest" }

"[$(Get-Date -Format s)] START $Python $PyArgs (root=$root)" | Tee-Object -FilePath $LogFile -Append
& $Python @PyArgs 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $LogFile -Append
$code = $LASTEXITCODE
"[$(Get-Date -Format s)] END exit=$code" | Tee-Object -FilePath $LogFile -Append
exit $code
