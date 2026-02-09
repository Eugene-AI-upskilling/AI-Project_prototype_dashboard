@echo off
chcp 65001 > nul
echo ============================================
echo   잠정실적 공시 실시간 모니터링
echo   종료: Ctrl+C
echo ============================================
echo.

cd /d "C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project"
python scripts/2_DART_Prelim_Earnings.py --monitor --interval=5

pause
