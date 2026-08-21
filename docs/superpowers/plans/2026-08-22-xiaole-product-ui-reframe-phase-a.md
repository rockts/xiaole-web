# XiaoLe Product UI Reframe Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the XiaoLe web shell around Home, Chat, Knowledge, and Action while preserving every legacy route and chat capability.

**Architecture:** Keep the existing Vue Router and backend APIs. Replace the oversized navigation shell with focused desktop sidebar, mobile drawer, mobile bottom navigation, and conversation-list components; add transitional Knowledge and Action landing pages without pretending their later phases are complete.

**Tech Stack:** Vue 3, Vue Router 4, Pinia, Vitest, Vue Test Utils, existing CSS design tokens.

**Spec:** Approved in the 2026-08-22 Product UI Reframe conversation; no repository spec file was created because the first phase was explicitly read-only and no-commit.

## Global Constraints

- Do not change `/` or login redirects from `/chat`.
- Preserve `/memory`, `/behavior`, `/tasks`, `/task/:id`, `/documents`, `/documents/:id`, `/tools`, `/chat/:sessionId?`, and `/home`.
- Do not change chat mode storage, transports, models, fallback, attachments, voice, vision, backend, Home API, or secrets.
- Desktop shows six recent conversations; mobile drawer shows five.
- Mobile bottom navigation contains Home, Chat, Knowledge, and Action and supports 360, 390, 430, and 768 px without horizontal overflow.
- No new UI framework, commit, push, deployment, or Phase B work.

---

### Task 1: Navigation contract tests

**Files:**
- Create: `src/components/layout/__tests__/ProductShell.test.js`
- Create: `src/router/__tests__/phaseARoutes.test.js`

**Interfaces:**
- Consumes: existing Pinia chat store and Vue Router.
- Produces: executable contracts for desktop/mobile navigation, conversation limits, legacy routes, and default redirect.

- [ ] Write component and route tests that assert the approved Phase A behavior.
- [ ] Run the focused tests and confirm they fail because the new shell and routes do not exist.

### Task 2: Transitional product routes

**Files:**
- Create: `src/views/KnowledgeView.vue`
- Create: `src/views/ActionView.vue`
- Create: `src/views/ConversationsView.vue`
- Modify: `src/router/index.js`

**Interfaces:**
- Produces routes `/knowledge`, `/action`, and `/conversations`.
- Preserves every existing route and the `/` to `/chat` redirect.

- [ ] Implement minimal transitional landing pages using existing route links and tokens.
- [ ] Add the three routes without changing authentication or default-route behavior.
- [ ] Run route tests to green.

### Task 3: Desktop and mobile shell

**Files:**
- Replace: `src/components/layout/SidebarModern.vue`
- Create: `src/components/layout/MobileBottomNav.vue`
- Modify: `src/App.vue`
- Modify: `src/components/layout/TopBar.vue`

**Interfaces:**
- Desktop sidebar exposes four primary destinations, a New Chat action, six recent conversations, View All, and bottom account/settings.
- Mobile drawer exposes New Chat, five recent conversations, View All, Settings, and Advanced; bottom navigation owns the four primary destinations.

- [ ] Implement the minimal shell required by the failing component tests.
- [ ] Preserve current-session highlighting and conversation rename/share/pin/delete actions.
- [ ] Hide the ordinary-page TopBar on desktop while retaining Chat and mobile TopBars.
- [ ] Run focused shell tests to green.

### Task 4: Responsive and compatibility verification

**Files:**
- Modify as required by observed failures only.

**Interfaces:**
- Consumes the complete Phase A shell.
- Produces verified behavior at desktop and 360, 390, 430, and 768 px.

- [ ] Run the full Vitest suite.
- [ ] Run the production build.
- [ ] Run `git diff --check`.
- [ ] Run local browser acceptance for desktop and 390 px, including drawer, bottom navigation, New Chat, recent conversations, View All, and direct legacy routes.
- [ ] Capture desktop and mobile screenshots without changing production state.
- [ ] Review `git diff` to confirm no Phase B, backend, Home API, default-route, or chat-mode changes.
