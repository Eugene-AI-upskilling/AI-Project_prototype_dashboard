# 유진 Insight Lab — DB 적재 작업을 Windows 작업 스케줄러에 등록/갱신 (매일 17:15)
# 실행:  powershell -ExecutionPolicy Bypass -File .\register_db_push_task.ps1
# 견고화: 스크립트 경로를 자기 위치 기준으로 해석 + WorkingDirectory 명시.
$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$script   = Join-Path $here 'run_db_push.ps1'
$taskName = 'EugeneInsightLab_DBPush'

if (-not (Test-Path -LiteralPath $script)) { throw "run_db_push.ps1 을 찾을 수 없습니다: $script" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $script) `
  -WorkingDirectory $here
$trigger  = New-ScheduledTaskTrigger -Daily -At 5:15PM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
              -MultipleInstances IgnoreNew `
              -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description '유진 Insight Lab: 데일리 파이프라인 직후 Supabase 적재 (themes/events/market_snapshot/global_indices)' -Force | Out-Null

Write-Output "등록/갱신 완료: $taskName (매일 17:15)"
Write-Output "  script = $script"
