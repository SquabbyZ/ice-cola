@echo off
REM Initialize Extensions - 扩展数据初始化脚本 (Windows)
REM This script seeds the database with default extensions

echo 🌱 Initializing Extensions...

REM Get database connection parameters from environment or use defaults
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=openclaw
if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=postgres

set PGPASSWORD=%DB_PASSWORD%

echo 📦 Loading extension data into database...

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%~dp0seed-extensions.sql"

echo.
echo ✅ Extensions initialized successfully!
echo.
echo Available extensions:
echo   - GitHub 集成 (开发工具)
echo   - Notion 连接器 (生产力)
echo   - Slack 机器人 (通讯)
echo   - VS Code 插件 (开发工具)
echo   - 日历助手 (生产力)
echo   - 实时翻译 (工具)
echo   - 天气插件 (工具)
echo   - PDF 处理器 (文档)
echo.
echo Total: 8 extensions loaded

set PGPASSWORD=
