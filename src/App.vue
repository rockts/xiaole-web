<template>
  <div class="app-layout" ref="appLayoutRef">
    <SidebarModern v-if="authStore.isAuthenticated" ref="sidebarRef" />
    <div class="main-content" :class="{ 'is-chat-route': isChatRoute }">
      <TopBar
        v-if="authStore.isAuthenticated"
        @toggle-sidebar="handleToggleSidebar"
      />
      <div
        class="content-wrapper"
        :class="{ 'is-chat-route': isChatRoute }"
        ref="contentWrapperRef"
        @scroll="onContentScroll"
      >
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </div>
    <ReminderNotification v-if="authStore.isAuthenticated" />
  </div>
</template>

<script setup>
import SidebarModern from "@/components/layout/SidebarModern.vue";
import TopBar from "@/components/layout/TopBar.vue";
import ReminderNotification from "@/components/common/ReminderNotification.vue";
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from "vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "vue-router";

const authStore = useAuthStore();
const route = useRoute();
const sidebarRef = ref(null);
const appLayoutRef = ref(null);
const contentWrapperRef = ref(null);

const isChatRoute = computed(() => route.path.startsWith("/chat"));

const updateTopBarCssVar = async () => {
  await nextTick();

  // 默认：未登录不显示 TopBar，就不要预留空间
  if (!authStore.isAuthenticated) {
    document.documentElement.style.setProperty("--app-topbar-h", "0px");
    return;
  }

  const root = appLayoutRef.value;
  const topBarEl = root?.querySelector?.(".top-bar");
  if (!topBarEl) {
    document.documentElement.style.setProperty("--app-topbar-h", "0px");
    return;
  }

  const h = Math.round(topBarEl.getBoundingClientRect().height);
  document.documentElement.style.setProperty(
    "--app-topbar-h",
    `${Math.max(0, h)}px`
  );
};

const handleToggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggle();
  }
};

// 移动端内容区滚动条
let contentScrollTimer = null;
const onContentScroll = () => {
  // 对话页面有自己的滚动条逻辑，跳过
  if (route.path.startsWith("/chat")) return;
  if (window.innerWidth > 768) return;

  const el = contentWrapperRef.value;
  const root = appLayoutRef.value;
  if (!el || !root) return;

  const { scrollTop, scrollHeight, clientHeight } = el;
  if (scrollHeight <= clientHeight) return;

  const containerRect = el.getBoundingClientRect();
  const thumbHeight = Math.max(
    (clientHeight / scrollHeight) * clientHeight,
    40
  );
  const maxScroll = scrollHeight - clientHeight;
  const thumbTop =
    containerRect.top + (scrollTop / maxScroll) * (clientHeight - thumbHeight);

  let thumb = root.querySelector(".mobile-content-scrollbar");
  if (!thumb) {
    thumb = document.createElement("div");
    thumb.className = "mobile-content-scrollbar";
    root.appendChild(thumb);
  }

  thumb.style.cssText = `
    position: fixed;
    right: 2px;
    top: ${thumbTop}px;
    width: 4px;
    height: ${thumbHeight}px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 2px;
    pointer-events: none;
    transition: opacity 0.3s;
    z-index: 50;
  `;

  if (document.documentElement.getAttribute("data-theme") === "light") {
    thumb.style.background = "rgba(0, 0, 0, 0.25)";
  }

  thumb.style.opacity = "1";

  clearTimeout(contentScrollTimer);
  contentScrollTimer = setTimeout(() => {
    if (thumb) thumb.style.opacity = "0";
  }, 1500);
};

const { connect, disconnect } = useWebSocket();

onMounted(() => {
  if (authStore.isAuthenticated) {
    connect();
  }

  updateTopBarCssVar();
  window.addEventListener("resize", updateTopBarCssVar, { passive: true });
  window.visualViewport?.addEventListener?.("resize", updateTopBarCssVar);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateTopBarCssVar);
  window.visualViewport?.removeEventListener?.("resize", updateTopBarCssVar);
});

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    updateTopBarCssVar();
  }
);

watch(
  () => route.fullPath,
  () => {
    updateTopBarCssVar();
  }
);
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  height: 100dvh; /* 移动端动态视口高度 */
  overflow: hidden;
  background: var(--bg-primary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto; /* 允许垂直滚动 */
  overflow-x: hidden;
  background: var(--bg-primary); /* 统一背景色 */
  display: flex;
  flex-direction: column;
  min-height: 0; /* 关键：允许 flex 子项收缩 */
}

@media (max-width: 768px) {
  .app-layout {
    height: 100dvh;
    height: calc(var(--app-vh, 100vh)); /* JS 计算的后备高度 */
  }
  .main-content {
    /* 移动端：TopBar 是 fixed，需要给内容留出顶部空间 */
    padding-top: var(--app-topbar-h, 52px);
  }

  /* 聊天页：由内容区自身做 top offset，避免任何覆盖/嵌套滚动副作用 */
  .main-content.is-chat-route {
    padding-top: 0;
  }
  .content-wrapper {
    /* 移动端：确保内容填满且可滚动 */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  /* 聊天页自身管理滚动，外层不要再滚动（避免嵌套滚动导致顶部遮挡/底部多余空白） */
  .content-wrapper.is-chat-route {
    overflow: hidden;
    position: fixed;
    top: var(--app-topbar-h, 52px);
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>
