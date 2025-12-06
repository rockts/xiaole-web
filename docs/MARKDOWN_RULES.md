# 开发中创建 Markdown 文档的规则

> 本文档说明在开发过程中如何创建和管理 Markdown 文档

## 📋 文档分类

### 1. 项目文档（当前仓库）
- **位置**: 项目根目录或 `docs/` 目录
- **用途**: 项目特定的文档，如 README、部署说明、开发指南等
- **示例**: `README.md`, `CLOUDFLARE_PAGES.md`, `docs/MARKDOWN_RULES.md`
- **提交**: 提交到当前仓库

### 2. 共享文档（xiaole-ai 文档库）
- **位置**: `../xiaole-ai/` 文档库
- **用途**: 跨仓库共享的文档，如组件文档、API 文档、开发规范等
- **目录结构**:
  - `frontend/setup/` - 前端设置相关
  - `frontend/development/` - 前端开发相关
  - `frontend/components/` - 组件文档
  - `frontend/api/` - API 文档
  - `backend/setup/` - 后端设置相关
  - `backend/development/` - 后端开发相关
- **提交**: 提交到 xiaole-ai 文档库

## 🚀 快速创建文档

### 使用 create-doc.sh 脚本

```bash
# 创建开发相关文档
./scripts/create-doc.sh development <文档名称>

# 创建设置相关文档
./scripts/create-doc.sh setup <文档名称>

# 创建组件文档（仅前端）
./scripts/create-doc.sh components <文档名称>

# 创建 API 文档（仅前端）
./scripts/create-doc.sh api <文档名称>
```

### 示例

```bash
# 创建前端优化方案文档
./scripts/create-doc.sh development optimization-plan

# 创建组件使用文档
./scripts/create-doc.sh components button-usage

# 创建 API 接口文档
./scripts/create-doc.sh api user-api
```

## 📝 文档命名规范

1. **使用小写字母和连字符**
   - ✅ 正确: `user-guide.md`, `api-reference.md`
   - ❌ 错误: `UserGuide.md`, `API_Reference.md`

2. **使用描述性名称**
   - ✅ 正确: `component-button-usage.md`
   - ❌ 错误: `button.md`, `doc1.md`

3. **避免特殊字符**
   - 不使用空格、中文、特殊符号

## 📄 文档结构模板

### 基础模板

```markdown
# 文档标题

> 创建时间: YYYY-MM-DD HH:MM
> 仓库: xiaole-web (frontend)
> 类型: development

## 概述

[文档概述，说明文档的目的和范围]

## 详细内容

[详细内容，可以包含多个章节]

### 子章节

[子章节内容]

## 相关链接

- [相关链接1]
- [相关链接2]

## 更新记录

- YYYY-MM-DD: 创建文档
```

### 组件文档模板

```markdown
# ComponentName 组件

> 创建时间: YYYY-MM-DD HH:MM
> 仓库: xiaole-web (frontend)
> 类型: components

## 概述

[组件功能描述]

## Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| prop1  | String | - | 属性说明 |

## 使用示例

\`\`\`vue
<ComponentName prop1="value" />
\`\`\`

## 相关链接

- [组件源码路径]
- [相关文档]

## 更新记录

- YYYY-MM-DD: 创建文档
```

## ✅ 创建文档检查清单

- [ ] 确定文档类型（项目文档 vs 共享文档）
- [ ] 选择合适的文档位置
- [ ] 使用 `create-doc.sh` 脚本创建（如适用）
- [ ] 遵循命名规范
- [ ] 填写完整的文档内容
- [ ] 添加相关链接
- [ ] 更新更新记录
- [ ] 提交到正确的仓库

## 🔍 文档位置判断

### 应该放在项目文档（当前仓库）的情况：
- 项目特定的配置说明
- 部署流程文档
- 项目开发规则
- 项目 README 和说明

### 应该放在共享文档（xiaole-ai）的情况：
- 组件使用文档
- API 接口文档
- 开发规范和最佳实践
- 跨仓库共享的技术文档

## 📌 注意事项

1. **不要创建重复文档**
   - 创建前先检查是否已有相关文档
   - 优先更新现有文档而非创建新文档

2. **保持文档更新**
   - 代码变更时同步更新相关文档
   - 在更新记录中记录变更内容

3. **文档质量**
   - 确保文档内容准确、完整
   - 使用清晰的标题和结构
   - 添加必要的代码示例

4. **提交规范**
   - 项目文档：提交到当前仓库
   - 共享文档：提交到 xiaole-ai 文档库
   - 提交信息格式：`docs(type): 添加/更新 文档名称`

## 🔗 相关资源

- [create-doc.sh 脚本](../scripts/create-doc.sh)
- [xiaole-ai 文档库](../../xiaole-ai)
- [Markdown 语法指南](https://www.markdownguide.org/)

