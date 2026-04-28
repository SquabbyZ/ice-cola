@echo off
REM OpenClaw Submodule Sync Script for Windows
REM Used to update packages/client/openclaw-official to the latest version

setlocal

set OPENCLAW_DIR=packages\client\openclaw-official

echo.
echo 🔄 Syncing OpenClaw submodule...
echo 📁 Directory: %OPENCLAW_DIR%
echo.

REM Check if directory exists
if not exist "%OPENCLAW_DIR%" (
    echo ❌ Error: %OPENCLAW_DIR% does not exist!
    echo 💡 Please copy OpenClaw to this directory first.
    exit /b 1
)

REM Change to OpenClaw directory
cd %OPENCLAW_DIR%

REM Check if it's a git repository
if not exist ".git" (
    echo ⚠️  Warning: Not a git repository.
    echo 💡 This is a manual copy. To enable auto-sync:
    echo    1. Remove the current directory
    echo    2. Run: git submodule add https://github.com/openclaw/openclaw.git %OPENCLAW_DIR%
    cd ..\..
    exit /b 1
)

REM Get current branch
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo 📌 Current branch: %CURRENT_BRANCH%
echo.

REM Pull latest changes
echo 📥 Pulling latest changes from upstream...
git pull origin %CURRENT_BRANCH%

if errorlevel 1 (
    echo ❌ Failed to pull updates.
    cd ..\..
    exit /b 1
)

REM Show latest commit
for /f "delims=" %%i in ('git log -1 --oneline') do set LATEST_COMMIT=%%i
echo ✅ Updated to: %LATEST_COMMIT%
echo.

REM Return to root directory
cd ..\..

echo.
echo 🎉 OpenClaw sync completed!
echo.
echo Next steps:
echo   1. Rebuild Tauri app: cd packages\client ^&^& pnpm tauri dev
echo   2. Commit the update: git add %OPENCLAW_DIR% ^&^& git commit -m "chore: update openclaw submodule"
echo.

endlocal
