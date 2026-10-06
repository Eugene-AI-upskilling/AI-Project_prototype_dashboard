# 유진 Insight Lab — 해외 증시 아침 갱신 작업을 Windows 작업 스케줄러에 등록/갱신 (매일 07:10)
# 실행:  powershell -ExecutionPolicy Bypass -File .\register_global_markets_task.ps1
# 견고화: 스크립트 경로를 자기 위치 기준으로 해석 + WorkingDirectory 명시.
$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$script   = Join-Path $here 'run_global_markets.ps1'
$taskName = 'EugeneInsightLab_GlobalMarkets'

if (-not (Test-Path -LiteralPath $script)) { throw "run_global_markets.ps1 을 찾을 수 없습니다: $script" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $script) `
  -WorkingDirectory $here
$trigger  = New-ScheduledTaskTrigger -Daily -At 7:10AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 45) `
              -MultipleInstances IgnoreNew `
              -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description '유진 Insight Lab: 해외 증시 — 실적·지수·섹터·신고가/ATH·AI 딥리서치 Supabase 적재' -Force | Out-Null

Write-Output "등록/갱신 완료: $taskName (매일 07:10)"
Write-Output "  script = $script"
