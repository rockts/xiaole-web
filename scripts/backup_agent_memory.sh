#!/bin/bash

SOURCE=".agent_local"
DEST="$HOME/Library/Mobile Documents/com~apple~CloudDocs/xiaole_agent_backup"

echo "🔄 正在备份小乐 Agent 记忆..."

mkdir -p "$DEST"
rsync -av --delete "$SOURCE/" "$DEST/"

echo "✅ 备份完成：$DEST"
