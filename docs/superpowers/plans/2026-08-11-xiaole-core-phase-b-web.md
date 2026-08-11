# 小乐 2.0 Phase B Web 灰度接入 Implementation Plan

> **For agentic workers:** Execute inline with strict Red -> Green -> Refactor cycles. Do not commit, push, deploy, modify Lezhi/Xiaoke, send Bark, switch production Web, or start Phase C.

**Goal:** Let the existing Vue Web safely opt into XiaoLe 2.0 Core while legacy remains the default and fully available.

**Architecture:** Introduce two focused chat transports and a selector that only chooses by persisted mode. Core2 uses a non-streaming request and maps its response into a strict UI-safe shape before Store persistence; the existing Brain remains the sole owner of intent and Memory/Action routing.

**Tech Stack:** Vue 3, Pinia, Axios, Vite, Vitest, jsdom, Python unittest/FastAPI.

## Global Constraints

- `chatMode` is `legacy | core2`, stored only in existing `xiaole_settings`, default `legacy`.
- Selector performs no intent classification or business routing.
- Core2 raw response, diagnostics, headers, evidence, task IDs, request IDs, and secrets never enter frontend message state.
- Core2 requests are not automatically retried and never automatically fall back to legacy.
- Core2 attachments are rejected with a clear limitation before upload/send; no new attachment capability.
- Legacy `/chat/stream` behavior remains available and unchanged at the backend.
- No database migration, old capability deletion, Lezhi/Xiaoke modification, Bark, deployment, commit, or push.

---

### Task 1: Mode persistence and transport contracts

**Files:** Create `src/chat/chatMode.js`, `src/chat/transports.js`; test `src/chat/__tests__/chatMode.test.js`, `transports.test.js`.

**Interfaces:** `readChatMode(storage)`, `writeChatMode(mode, storage)`, `createChatTransport(mode, dependencies)`, `LegacyChatTransport.send/cancel`, `Core2ChatTransport.send/cancel`.

- [ ] Write tests proving missing/corrupt/unknown settings resolve to legacy and core2 survives save/reload.
- [ ] Run `npm test -- src/chat/__tests__/chatMode.test.js`; verify failure because module is absent.
- [ ] Implement minimal safe settings parsing/merging and rerun until green.
- [ ] Write transport tests proving legacy calls only `streamChat`, core2 calls only `chatCore2`, conversation ID is mapped, attachment use is rejected, and selector has no intent API.
- [ ] Run focused tests and verify missing transport failure.
- [ ] Implement transports and selector, then rerun focused tests until green.

### Task 2: Core2 API boundary and safe response mapping

**Files:** Create `src/chat/core2Response.js`; modify `src/services/api.js`; test `src/chat/__tests__/core2Response.test.js`, `src/services/__tests__/apiCore2.test.js`.

**Interfaces:** `mapCore2Response(raw) -> { answer, intent, sources, action }`, `api.chatCore2(data, options)`.

- [ ] Write literal-fixture tests for answer/intent normalization, source allowlist, URL protocols, absolute-path removal, action status/summary allowlist, and absence of diagnostics/evidence/raw response.
- [ ] Run focused mapper test and verify missing-module failure.
- [ ] Implement mapper and rerun until green.
- [ ] Write API tests with an Axios adapter proving `/api/v2/chat`, JSON field names, Bearer JWT injection, and `retryCount` disables retry after a 500.
- [ ] Run focused API test and verify `chatCore2` is absent.
- [ ] Implement `chatCore2` with sanitized error metadata only; rerun until green.

### Task 3: Pinia orchestration and duplicate-submit protection

**Files:** Modify `src/stores/chat.js`; create `src/chat/__tests__/chatStoreCore2.test.js`.

**Interfaces:** `sendMessageWithMode(content, imagePath, router, { mode })`, existing legacy methods retained.

- [ ] Test legacy dispatch, Core2 complete-state insertion without fake deltas, successful conversation routing/list refresh, Core2 failure message with switch action, no legacy fallback, action failure never marked success, and concurrent second send ignored.
- [ ] Run focused Store tests and verify missing method failure.
- [ ] Add minimal orchestration using selector; keep existing legacy send functions as transport dependencies.
- [ ] Rerun focused tests; refactor only after green.

### Task 4: Minimal settings and safe result UI

**Files:** Create `src/components/chat/Core2ResultMeta.vue`, `src/components/chat/Core2ModeNotice.vue`; modify `src/components/common/SettingsModal.vue`, `src/views/SettingsView.vue`, `src/views/ChatView.vue`; test `src/components/chat/__tests__/Core2ResultMeta.test.js`, `src/components/common/__tests__/SettingsModalChatMode.test.js`.

**Interfaces:** Result component props `{ intent, sources, action, core2Error }`, emits `switch-legacy`; settings persist `chatMode` through shared helpers.

- [ ] Write component tests for memory links, hidden local paths, action success/failure, no diagnostics/internal evidence, experiment notice and switch event.
- [ ] Run focused component tests and verify components are absent.
- [ ] Implement small semantic components and rerun until green.
- [ ] Write settings test proving legacy default and persisted core2 selection.
- [ ] Add one radio group to both existing settings surfaces and wire ChatView to current mode, attachment guard, Store mode send, notice, and metadata component.
- [ ] Rerun component and Store tests until green.

### Task 5: Backend compatibility contract

**Files:** Modify only tests under `xiaole-backend/tests/xiaole_core/` unless an observed contract bug requires a minimal backend fix.

**Interfaces:** Existing `POST /api/v2/chat` and shared `conversations/messages` behavior.

- [ ] Add tests proving response fields used by Web, Core2-created session visibility through existing session manager, legacy history readability, 12-message short context, and no old Memory invocation.
- [ ] Run focused backend tests and verify any newly exposed contract failure.
- [ ] Apply the smallest compatible backend fix only if a test exposes a real defect; otherwise leave Phase A implementation untouched.
- [ ] Run `./venv/bin/python -m unittest discover -s tests -t . -v` and record totals.

### Task 6: Full automation and four local E2Es

**Files:** Update local E2E helpers only if tests first prove a Phase B safety gap.

- [ ] Run `npm test -- --run`, `npm run build`, backend unittest discovery, and `git diff --check` in both repositories.
- [ ] Legacy E2E: start local backend/Web, select stable mode, send a normal message, verify `/chat/stream` and rendered reply.
- [ ] Core2 Conversation E2E: select experiment mode, send `你好，今天我们做什么？`, verify one `/api/v2/chat`, `intent=conversation`, full answer render, and history entry.
- [ ] Core2 Memory E2E: use real local Lezhi with `最近有什么值得我关注的官方通知？`, verify `intent=memory`, answer, safe sources, and an openable link without modifying Lezhi.
- [ ] Core2 Action Mock E2E: use local Xiaoke plus Mock Notification and `给我手机发一条测试通知。`, verify success card and safety evidence that Bark was not contacted.
- [ ] Re-run all automated verification after E2E, inspect both Git statuses/diffs, and stop with the requested 17-part report.
