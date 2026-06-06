#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  deploy.sh — Linux / macOS 部署脚本
#  作用：编译 → 部署 private_auction_nontracey.aleo 到 Aleo testnet
# ─────────────────────────────────────────────────────────────
#
# 使用前提：
#   1. 已安装 Leo CLI 4.x  (https://docs.leo-lang.org/getting_started/installation)
#        cargo install leo-lang leo-fmt leo-lsp
#      或 cargo binstall leo-lang
#   2. 已通过 https://faucet.provable.com/ 领取测试网 credits
#
# 使用方法（在 task4_project/program 目录下执行）：
#   1. 配置 .env（推荐）：
#        cat > .env <<EOF
#        NETWORK=testnet
#        ENDPOINT=https://api.explorer.provable.com/v1
#        PRIVATE_KEY=APrivateKey1zkp...
#        EOF
#   2. 或导出环境变量：
#        export PRIVATE_KEY="APrivateKey1zkp..."
#   3. 执行：
#        ../scripts/deploy.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
ENDPOINT="${ENDPOINT:-https://api.explorer.provable.com/v1}"
PRIORITY=1000000   # microcredits

echo "==> 1. leo build  ($NETWORK)"
leo build --network "$NETWORK"

echo "==> 2. leo deploy → $NETWORK ($ENDPOINT)"
LEO_ARGS=(
    deploy
    --network       "$NETWORK"
    --endpoint      "$ENDPOINT"
    --priority-fees "$PRIORITY"
    --broadcast
    --json-output
    -y
)
if [[ -n "${PRIVATE_KEY:-}" ]]; then
  LEO_ARGS+=(--private-key "$PRIVATE_KEY")
fi

leo "${LEO_ARGS[@]}"

echo
echo "==> 部署完成！"
echo "tx_id 见  build/json-outputs/deploy.json"
echo "浏览器： https://testnet.aleoscan.io/program?id=private_auction_nontracey.aleo"
