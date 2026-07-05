# 유진 Insight Lab — Gmail 리포트 수집 작업을 Windows 작업 스케줄러에 등록
# 매일 08:30 (리포트 발송 후). 실행: powershell -ExecutionPolicy Bypass -File .\register_gmail_reports_task.ps1
$script = "C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project\yujin-research-center\db_loader\run_gmail_reports.ps1"
$taskName = "EugeneInsightLab_GmailReports"

$action   = New-ScheduledTaskAction -Execute "powershell.exe" `
              -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger  = New-ScheduledTaskTrigger -Daily -At 8:30AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description "유진 Insight Lab: Gmail(research@eugenefn.com) 리포트 → PDF 요약 → reports 카드 적재" -Force

Write-Output "등록 완료: $taskName (매일 08:30)"
