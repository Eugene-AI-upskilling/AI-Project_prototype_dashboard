# 유진 Insight Lab — AI 앵커 브리핑 생성 작업을 스케줄러에 등록/갱신 (매일 17:45, 데이터 적재 17:15 직후)
# 실행:  powershell -ExecutionPolicy Bypass -File .\register_generate_briefings_task.ps1
$here = $PSScriptRoot
if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$script   = Join-Path $here 'run_generate_briefings.ps1'
$taskName = 'EugeneInsightLab_Briefings'

if (-not (Test-Path -LiteralPath $script)) { throw "run_generate_briefings.ps1 을 찾을 수 없습니다: $script" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $script) `
  -WorkingDirectory $here
$trigger  = New-ScheduledTaskTrigger -Daily -At 5:45PM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
              -MultipleInstances IgnoreNew `
              -RestartCount 1 -RestartInterval (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description '유진 Insight Lab: 매일 시황·리포트 AI 앵커 브리핑 영상 자동 생성(HeyGen) → Supabase ai_briefings' -Force | Out-Null

Write-Output "등록/갱신 완료: $taskName (매일 17:45)"
Write-Output "  script = $script"
