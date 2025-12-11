<template>
  <div class="app-layout">
    <SidebarModern v-if="authStore.isAuthenticated" ref="sidebarRef" />
    <div class="main-content">
      <TopBar
        v-if="authStore.isAuthenticated"
        @toggle-sidebar="handleToggleSidebar"
      />
      <div class="content-wrapper">
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
import { ref, onMounted, watch } from "vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useAuthStore } from "@/stores/auth";

// Force rebuild comment
const authStore = useAuthStore();
const sidebarRef = ref(null);

const handleToggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggle();
  }
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
