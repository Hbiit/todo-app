@echo off
echo Starting React Vite Frontend on http://localhost:5173 ...
set "PATH=%~dp0nodejs;%PATH%"
cd /d "%~dp0frontend"
npm run dev
pause
