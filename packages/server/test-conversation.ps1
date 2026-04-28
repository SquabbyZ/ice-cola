# 对话功能测试快速启动脚本 (PowerShell)

Write-Host "🚀 OpenClaw 对话功能测试" -ForegroundColor Cyan
Write-Host ""

# 检查后端服务是否运行
Write-Host "📡 检查后端服务状态..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ 后端服务运行正常" -ForegroundColor Green
} catch {
    Write-Host "⚠️  后端服务未运行，请先启动：" -ForegroundColor Yellow
    Write-Host "   cd packages/server && pnpm dev" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "是否继续测试？(y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 测试配置:" -ForegroundColor Cyan
Write-Host "   API Base: $(if ($env:API_BASE) { $env:API_BASE } else { 'http://localhost:3000/api/v1' })"
Write-Host "   Team ID: default"
Write-Host "   Debug: $(if ($env:DEBUG) { $env:DEBUG } else { 'false' })"
Write-Host ""

# 运行测试
Write-Host "🧪 开始执行测试..." -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

& npx tsx test-conversation-complete.ts

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ 测试脚本执行完成" -ForegroundColor Green
} else {
    Write-Host "❌ 测试脚本执行失败 (exit code: $exitCode)" -ForegroundColor Red
}

exit $exitCode
