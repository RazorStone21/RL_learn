#!/usr/bin/env bash
# 启动本地课程服务器。
# 用法: ./start.sh [端口]   默认 8777
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8777}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：需要 python3（macOS 可用 xcode-select --install 安装命令行工具）。" >&2
  exit 1
fi

if [ ! -f "pyodide/pyodide.js" ]; then
  echo "检测到 Pyodide 运行时缺失，正在内置下载（约 26 MB，只需一次）…"
  if command -v node >/dev/null 2>&1; then
    node tools/vendor-pyodide.mjs
  else
    echo "错误：需要 node 来下载 Pyodide 运行时。" >&2
    exit 1
  fi
fi

URL="http://127.0.0.1:${PORT}/"
echo "强化学习的数学原理 · 课程已启动： ${URL}"
echo "按 Ctrl+C 停止。"

# 尽力自动打开浏览器（失败不影响服务）
( sleep 1; command -v open >/dev/null 2>&1 && open "$URL" ) >/dev/null 2>&1 &

# 用自带的多线程 + 禁用缓存服务器（见 tools/serve.py 里的说明）。
# 直接跑 `python3 -m http.server` 有两个坑：单线程队列太小会被并发冲垮、
# 不发 Cache-Control 会让浏览器拿旧课表。
# 第二个参数传 --lan 时绑定 0.0.0.0，手机（同一 Wi-Fi）也能访问：
#   ./start.sh 8777 --lan
# ${@:2} = 除端口外的其余参数（例如 --lan），避免把端口重复传一遍
exec python3 tools/serve.py "$PORT" "${@:2}"
