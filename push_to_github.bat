@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Push Taskflow to Your GitHub
echo ========================================================
echo.

set "PATH=%~dp0git\cmd;%~dp0git\bin;%PATH%"

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git was not found. Please ensure git is installed or downloaded.
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist ".git" (
    echo Initializing local Git repository...
    git init
)

echo.
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo No GitHub remote URL found yet!
    echo Please create a new repository on GitHub (https://github.com/new).
    echo Then paste your repository URL below.
    echo (Example: https://github.com/your-username/todo-app.git)
    echo.
    set /p REPO_URL="Enter your GitHub Repository URL: "
    if "!REPO_URL!"=="" (
        echo [ERROR] No URL provided. Aborting.
        pause
        exit /b 1
    )
    git remote add origin !REPO_URL!
    echo Remote origin set to: !REPO_URL!
) else (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set "EXISTING_URL=%%i"
    echo Current remote origin: !EXISTING_URL!
    echo.
)

echo.
echo Staging all project files...
git add .

echo Creating commit...
git commit -m "feat: Taskflow todo app with FastAPI, React, Drag-and-Drop, Reminders, Recurring tasks, and Cross-device sync"

echo Setting main branch...
git branch -M main

echo.
echo Pushing to GitHub...
echo (If prompted, log in with your GitHub Personal Access Token or browser credentials)
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! Your project has been pushed to GitHub!
    echo ========================================================
) else (
    echo.
    echo [NOTE] If git push asked for credentials or failed:
    echo 1. Generate a GitHub Personal Access Token at: https://github.com/settings/tokens
    echo    (Check the 'repo' scope checkbox)
    echo 2. When git asks for Password, paste your Token!
)

echo.
pause
