# ─────────────────────────────────────────────────────────────
#  deploy.ps1 — Windows / PowerShell 部署脚本
#  作用：编译 → 部署 private_auction_nontracey.aleo 到 Aleo testnet
# ─────────────────────────────────────────────────────────────
#
# 使用前提：
#   1. 已安装 Leo CLI 4.x  (https://docs.leo-lang.org/getting_started/installation)
#   2. 已通过 https://faucet.provable.com/ 领取测试网 credits
#
# 使用方法（在 task4_project\program 目录下执行）：
#   1. 配置 .env：
#        Copy-Item .env.example .env
#        notepad .env     # 把 PRIVATE_KEY 改成你自己的
#   2. 执行（Win11 默认 ExecutionPolicy 是 Restricted，用 Bypass 跑）：
#        powershell -ExecutionPolicy Bypass -File ..\scripts\deploy.ps1
# ─────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$NETWORK   = if ($env:NETWORK)  { $env:NETWORK }  else { "testnet" }
$ENDPOINT  = if ($env:ENDPOINT) { $env:ENDPOINT } else { "https://api.explorer.provable.com/v1" }
$PRIORITY  = 1000000   # microcredits  (1 credit = 1,000,000 μcredits)

Write-Host "==> 1. leo build  ($NETWORK)" -ForegroundColor Cyan
& leo build --network $NETWORK
if ($LASTEXITCODE -ne 0) { Write-Error "leo build 失败"; exit 1 }

Write-Host "==> 2. leo deploy -> $NETWORK ($ENDPOINT)" -ForegroundColor Cyan
$leoArgs = @(
    "deploy",
    "--network",       $NETWORK,
    "--endpoint",      $ENDPOINT,
    "--priority-fees", "$PRIORITY",
    "--broadcast",
    "--json-output",
    "-y"
)
if ($env:PRIVATE_KEY) { $leoArgs += @("--private-key", $env:PRIVATE_KEY) }

& leo @leoArgs
if ($LASTEXITCODE -ne 0) { Write-Error "leo deploy 失败"; exit 1 }

Write-Host ""
Write-Host "==> 部署完成！" -ForegroundColor Green
Write-Host "tx_id 见  build\json-outputs\deploy.json"
Write-Host "浏览器： https://testnet.aleoscan.io/program?id=private_auction_nontracey.aleo"
