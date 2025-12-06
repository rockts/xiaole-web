#!/bin/bash
# 前端诊断脚本

echo "🔍 前端健康检查"
echo "================="

echo ""
echo "1️⃣ 检查端口占用:"
lsof -i :3000 | grep LISTEN

echo ""
echo "2️⃣ 检查 Node 版本:"
node --version

echo ""
echo "3️⃣ 检查 Vite 进程:"
ps aux | grep -E "[v]ite|[n]ode.*3000"

echo ""
echo "4️⃣ 测试 HTTP 连接 (3秒超时):"
timeout 3 curl -I http://localhost:3000 || echo "❌ 连接超时"

echo ""
echo "5️⃣ 检查最近的前端日志:"
if [ -f "../logs/frontend.log" ]; then
    echo "📋 最近10行:"
    tail -10 ../logs/frontend.log
else
    echo "⚠️ 日志文件不存在"
fi

echo ""
echo "6️⃣ 检查后端连接:"
curl -s http://localhost:8000/api/sessions >/dev/null && echo "✅ 后端正常" || echo "❌ 后端无响应"

echo ""
echo "================="
echo "💡 如果前端卡住,运行: ./scripts/clean-restart.sh"
