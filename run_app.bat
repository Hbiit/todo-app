@echo off
echo ========================================================
echo   Launching Taskflow Todo Application
echo ========================================================
echo.
echo Starting Backend (FastAPI)...
start "Taskflow Backend (FastAPI)" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
echo Starting Frontend (React)...
start "Taskflow Frontend (React)" cmd /k "%~dp0run_frontend.bat"
timeout /t 3 /nobreak >nul
echo.
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173
echo.
echo Application is running!
echo Backend:  http://localhost:8000 (API & Docs: http://localhost:8000/docs)
echo Frontend: http://localhost:5173
echo.
