#!/bin/bash
# 开发上下文同步脚本
# 自动总结开发任务、更新对话历史、同步到 Synology Drive

set -e

AGENT_DIR=".agent_local"
BACKUP_DIR="$HOME/SynologyDrive/drive/xiaole_agent"
DIALOG_FILE="$AGENT_DIR/dialog_history.md"
TASKS_FILE="$AGENT_DIR/tasks.md"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📝 开发上下文同步工具${NC}"
echo ""

# 检查 .agent_local 是否存在
if [ ! -d "$AGENT_DIR" ]; then
  echo -e "${YELLOW}⚠️  .agent_local 目录不存在，正在创建...${NC}"
  mkdir -p "$AGENT_DIR"
fi

# 1. 获取今天的日期
TODAY=$(date '+%Y-%m-%d')
echo -e "${GREEN}📅 日期: $TODAY${NC}"

# 2. 获取最近的 git 提交
echo ""
echo -e "${BLUE}🔍 检查最近的提交...${NC}"
RECENT_COMMITS=$(git log --since="$TODAY 00:00" --pretty=format:"- **%h**: %s" --no-merges 2>/dev/null || echo "")

if [ -z "$RECENT_COMMITS" ]; then
  echo "   ℹ️  今天还没有新提交"
else
  echo "$RECENT_COMMITS"
fi

# 3. 交互式添加对话记录
echo ""
echo -e "${BLUE}💬 添加对话记录${NC}"
echo "请输入今天的开发主题（直接回车跳过）:"
read -r TOPIC

if [ -n "$TOPIC" ]; then
  echo ""
  echo "问题描述（支持多行，输入 'END' 结束）:"
  PROBLEM=""
  while IFS= read -r line; do
    if [ "$line" = "END" ]; then
      break
    fi
    PROBLEM="${PROBLEM}${line}\n"
  done
  
  echo ""
  echo "解决方案（支持多行，输入 'END' 结束）:"
  SOLUTION=""
  while IFS= read -r line; do
    if [ "$line" = "END" ]; then
      break
    fi
    SOLUTION="${SOLUTION}- ${line}\n"
  done
  
  # 生成对话记录内容
  NEW_DIALOG="## $TODAY $TOPIC

### 🐛 问题描述
${PROBLEM}
### ✅ 解决方案
${SOLUTION}"
  
  if [ -n "$RECENT_COMMITS" ]; then
    NEW_DIALOG="${NEW_DIALOG}
### 📝 相关提交
$RECENT_COMMITS"
  fi
  
  NEW_DIALOG="${NEW_DIALOG}

### 📊 当前状态
- **本地分支**: $(git branch --show-current)
- **最新提交**: $(git log -1 --pretty=format:"%h" 2>/dev/null || echo "N/A")
- **远程同步**: ✅

---

"
  
  # 插入到对话历史文件开头（在标题后）
  if [ -f "$DIALOG_FILE" ]; then
    # 读取第一行（标题）
    HEADER=$(head -n 1 "$DIALOG_FILE")
    # 读取剩余内容
    REST=$(tail -n +2 "$DIALOG_FILE")
    # 重写文件
    echo "$HEADER" > "$DIALOG_FILE"
    echo "" >> "$DIALOG_FILE"
    echo -e "$NEW_DIALOG" >> "$DIALOG_FILE"
    echo "$REST" >> "$DIALOG_FILE"
    echo -e "${GREEN}✅ 已更新对话历史${NC}"
  else
    echo "# 小乐 AI 管家 - 对话历史" > "$DIALOG_FILE"
    echo "" >> "$DIALOG_FILE"
    echo -e "$NEW_DIALOG" >> "$DIALOG_FILE"
    echo -e "${GREEN}✅ 已创建对话历史${NC}"
  fi
fi

# 4. 交互式添加任务
echo ""
echo -e "${BLUE}✅ 添加已完成任务${NC}"
echo "输入已完成的任务（每行一个，输入 'END' 结束，直接 END 跳过）:"

TASKS=()
while IFS= read -r task; do
  if [ "$task" = "END" ]; then
    break
  fi
  if [ -n "$task" ]; then
    TASKS+=("$task")
  fi
done

if [ ${#TASKS[@]} -gt 0 ]; then
  # 生成任务内容
  NEW_TASKS="### $TODAY $(echo "$TOPIC" | cut -d' ' -f1-3)"
  for task in "${TASKS[@]}"; do
    NEW_TASKS="${NEW_TASKS}
- [x] $task"
  done
  NEW_TASKS="${NEW_TASKS}

"
  
  # 插入到任务文件的"已完成"部分后
  if [ -f "$TASKS_FILE" ]; then
    # 在 "## ✅ 已完成" 后插入新任务
    awk -v new="$NEW_TASKS" '
      /^## ✅ 已完成/ { print; print ""; print new; next }
      { print }
    ' "$TASKS_FILE" > "$TASKS_FILE.tmp"
    mv "$TASKS_FILE.tmp" "$TASKS_FILE"
    echo -e "${GREEN}✅ 已更新任务清单${NC}"
  else
    echo "# 小乐 AI 管家 - 任务清单" > "$TASKS_FILE"
    echo "" >> "$TASKS_FILE"
    echo "## ✅ 已完成" >> "$TASKS_FILE"
    echo "" >> "$TASKS_FILE"
    echo -e "$NEW_TASKS" >> "$TASKS_FILE"
    echo "## 📋 待办" >> "$TASKS_FILE"
    echo "" >> "$TASKS_FILE"
    echo -e "${GREEN}✅ 已创建任务清单${NC}"
  fi
fi

# 5. 备份到 Synology Drive
echo ""
echo -e "${BLUE}🔄 正在备份到 Synology Drive...${NC}"

if [ -d "$BACKUP_DIR" ]; then
  rsync -av --delete "$AGENT_DIR/" "$BACKUP_DIR/"
  echo -e "${GREEN}✅ 备份完成: $BACKUP_DIR${NC}"
else
  echo -e "${YELLOW}⚠️  备份目录不存在: $BACKUP_DIR${NC}"
  echo "   创建目录并备份..."
  mkdir -p "$BACKUP_DIR"
  rsync -av --delete "$AGENT_DIR/" "$BACKUP_DIR/"
  echo -e "${GREEN}✅ 备份完成${NC}"
fi

# 6. 显示摘要
echo ""
echo -e "${GREEN}🎉 同步完成！${NC}"
echo ""
echo "📂 本地文件:"
echo "   - $DIALOG_FILE"
echo "   - $TASKS_FILE"
echo ""
echo "☁️  已同步到: $BACKUP_DIR"
echo ""
echo "💡 提示: 下次换设备时，运行此脚本可恢复上下文"
