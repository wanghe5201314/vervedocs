#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "正在停止所有 VerveDocs 实例..."
FOUND=0

for pidfile in "$SCRIPT_DIR"/server*/server.pid; do
    [ -f "$pidfile" ] || continue
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "  已停止 pid=$pid"
        FOUND=1
    fi
    rm -f "$pidfile"
done

if [ "$FOUND" -eq 0 ]; then
    echo "未找到运行中的实例。"
else
    echo "所有实例已停止。"
fi