@echo off
chcp 65001 > nul
echo ============================================
echo   Eugene AI Project Dashboard
echo   종료: Ctrl+C
echo ============================================
echo.

cd /d "C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project"
streamlit run app.py --server.port=8501

pause
