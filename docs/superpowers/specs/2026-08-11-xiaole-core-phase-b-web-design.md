# 小乐 2.0 Phase B Web 灰度接入设计

## 目标与边界

现有 Vue Web 增加用户手动选择的 `legacy | core2` 对话模式。默认始终为 legacy；只有用户明确选择“小乐 2.0（实验）”才调用 `POST /api/v2/chat`。旧 XiaoLeAgent、旧 `/chat/stream`、既有会话数据和生产配置全部保留。

本阶段只修改本地 `xiaole-web`，以及为 Web 契约补充必要的 `xiaole-backend` 自动化测试或安全适配。不提交、不推送、不部署、不修改乐知或小可、不发送 Bark、不开始 Phase C。

## 组件边界

- `LegacyChatTransport` 封装现有 SSE `/chat/stream`，保持现有请求、取消和事件行为。
- `Core2ChatTransport` 封装非流式 `/api/v2/chat`，复用 Axios JWT 拦截器，但显式禁用 5xx/网络自动重试。
- transport selector 仅根据 `legacy | core2` 返回 transport，不做 Intent 分类、不选择 Memory/Action、不解释业务结果。所有 Intent 和 Gateway 路由只属于后端 Brain。
- Pinia Chat Store 管理消息、loading、取消和会话刷新，通过统一 transport 接口发送；不复制 Brain 逻辑。

统一 transport 调用接收 `message`、`conversationId`、可选附件元数据和 legacy 所需展示回调。Legacy transport 继续流式回调；Core2 transport 只在完整响应到达后返回安全消息结果。

## 模式设置

`chatMode` 作为 `xiaole_settings` JSON 的单一字段保存，合法值只有 `legacy`、`core2`。缺失、损坏或未知值一律归一化为 `legacy`。设置弹窗和设置页增加“对话引擎”单选项；刷新后读取保存值。Core2 模式在聊天界面显示轻量“小乐 2.0 · 实验”标识。

模式切换只影响下一次发送。进行中的发送保持其创建时的 transport，且发送锁防止切换导致重复提交。

## Core2 请求与附件

Core2 请求体只包含后端真实 Schema：

```json
{"message":"...","conversation_id":"... or null","attachments":[]}
```

JWT 由现有 Axios request interceptor 注入。请求配置使用 `retryCount: MAX_RETRIES` 禁止通用拦截器重试，避免重复 Action。

Phase A 虽接受 `attachments` 字段，但 Brain 尚未使用。Core2 模式存在待发送附件时，Web 不上传、不调用 Core2、不调用 legacy，直接显示“2.0 实验模式暂不支持附件，请移除附件或切回小乐 1.0”。不新增解析能力。

## Core2 响应安全映射

原始响应只能在 transport 的局部作用域中存在。写入 Store 消息前执行白名单映射：

- `answer`: 字符串；
- `intent`: 仅 `conversation | memory | action`；
- `sources`: 每项只保留 `title`、`summary` 或 `snippet`、`issue_date`、安全的 `open_url` 或 `preview_url`；
- `action`: 只保留归一化的 `status` 与安全 `summary`。

不得保存、传播或渲染完整 diagnostics、request/response headers、原始 response、Action evidence、task_id、request_id 或内部执行字段。来源 URL 仅允许 `http:`/`https:`；绝对文件路径、`file:`、相对服务器路径及疑似本机路径不显示。来源标题若疑似绝对路径则使用通用“来源”占位。

## 展示行为

`answer` 继续走现有 Markdown 渲染。Memory sources 在回答下方以独立来源卡展示，包含安全标题、摘要、日期和可点击链接。Action 以独立状态卡展示：只有 `success` 显示“执行结果：成功”，其余终态或缺失结果显示“执行失败”或“暂不可用”。不展示 Dispatcher、Adapter、Attempt、monitor-service、Bark、HTTP 状态、stdout/stderr 或 evidence。

Intent 只映射为轻量“对话/知识/执行”标签，且仅在实验模式消息上显示。

## 错误与回退

- 401 继续走现有全局退出和登录流程。
- Core2 网络或 5xx 失败显示“小乐 2.0 暂时不可用”，并提供“切回小乐 1.0”按钮。
- 失败绝不自动切换、重发或调用 legacy，避免 Action 重复执行。
- Memory 不可用时展示后端诚实降级 answer，不二次处理。
- Action intent 且无成功结果时绝不显示成功。
- Core2 错误日志只记录安全分类和状态码，不记录 token、headers、config 或完整响应。

## 会话兼容

Core2 后端继续写现有 `conversations/messages`。成功响应返回 `conversation_id` 后，Store 更新当前会话、路由到 `/chat/:id` 并刷新现有 `/sessions` 列表。历史消息保持当前通用 `role/content` 渲染；Core2 sources/action 是本轮前端展示元数据，不要求数据库迁移。

legacy 打开 Core2 会话时继续使用相同消息表；Core2 打开 legacy 会话只由后端读取最近 12 条短期上下文，不触发旧 Memory。

## 测试与本地验收

前端增加最小 Vitest + jsdom 测试设施，覆盖模式持久化、selector、两种 transport、JWT、conversation_id、非流式完成态、安全白名单、sources/action 展示数据、401、无自动 fallback、无重复提交、附件限制及会话刷新。组件测试只覆盖新增的小型展示组件，避免为现有巨型 ChatView 建立脆弱快照。

后端运行现有 Phase A 全套测试，并补足 Web 所依赖的 Schema/会话兼容契约测试。

自动化通过后依次执行本地 E2E：legacy 普通聊天；Core2 conversation；连接真实本机乐知的 Core2 memory；本地小可加 Mock Notification 的 Core2 action。Action E2E 使用 Phase A 隔离脚本和临时配置，不连接 monitor-service/Bark。任何外部本地服务不可用时只报告阻塞，不修改对应项目。
