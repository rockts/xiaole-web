<template>
  <div class="app-layout" ref="appLayoutRef">
    <SidebarModern v-if="authStore.isAuthenticated" ref="sidebarRef" />
    <div class="main-content">
      <TopBar
        v-if="authStore.isAuthenticated"
        @toggle-sidebar="handleToggleSidebar"
      />
      <div
        class="content-wrapper"
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
import LoadingView from "@/views/LoadingView.vue";
import { ref, onMounted, watch, nextTick } from "vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "vue-router";

// Force rebuild comment
const authStore = useAuthStore();
const route = useRoute();
const sidebarRef = ref(null);
const appLayoutRef = ref(null);
const contentWrapperRef = ref(null);

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
});

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
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
    padding-top: 52px;
  }
  .content-wrapper {
    /* 移动端：确保内容填满且可滚动 */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }
}
</style>
