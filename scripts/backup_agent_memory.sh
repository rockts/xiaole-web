#!/bin/bash

SOURCE=".agent_local"
# 使用 Synology Drive 同步（iCloud 同步不稳定）
DEST="$HOME/SynologyDrive/drive/xiaole_agent"

echo "🔄 正在备份小乐 Agent 记忆..."

mkdir -p "$DEST"
rsync -av --delete "$SOURCE/" "$DEST/"

echo "✅ 备份完成：$DEST"
