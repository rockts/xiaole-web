<template>
  <div class="top-bar" :class="{ 'non-chat-page': !isChatPage }">
    <button
      class="mobile-menu-btn"
      @click="toggleSidebar"
      aria-label="打开菜单"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="3" y1="8" x2="21" y2="8"></line>
        <line x1="3" y1="16" x2="14" y2="16"></line>
      </svg>
    </button>

    <div class="top-bar-center">
      <input
        v-if="isEditingTitle && isChatPage"
        ref="titleInput"
        v-model="editingTitle"
        class="title-input"
        @blur="saveTitleEdit"
        @keydown.enter="saveTitleEdit"
        @keydown.esc="cancelTitleEdit"
      />
      <span
        v-else
        class="page-title"
        :class="{ editable: isChatPage }"
        @dblclick="startEditTitle"
      >
        {{ pageTitle }}
      </span>
    </div>

    <div class="top-bar-right">
      <!-- 新对话按钮 -->
      <button class="icon-btn" @click="handleNewChat" aria-label="新对话">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          ></path>
          <line x1="12" y1="8" x2="12" y2="14"></line>
          <line x1="9" y1="11" x2="15" y2="11"></line>
        </svg>
      </button>

      <!-- 三点菜单按钮 -->
      <div v-if="isChatPage" class="more-menu-container">
        <button
          ref="moreMenuBtnRef"
          class="icon-btn"
          @click.stop="toggleMoreMenu"
          aria-label="更多操作"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="5" cy="12" r="1"></circle>
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
          </svg>
        </button>

        <!-- 下拉菜单 -->
        <transition name="dropdown">
          <div v-if="showMoreMenu" class="more-menu-dropdown" @click.stop>
            <button
              class="menu-item"
              :disabled="!hasSharableSession"
              @click="handleShare"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>分享对话</span>
            </button>
            <button
              class="menu-item menu-item-danger"
              :disabled="!hasSharableSession"
              @click="handleDeleteSession"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"
                ></path>
              </svg>
              <span>删除对话</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <ShareDialog
      v-if="showShareDialog"
      :title="shareDialogTitle"
      :share-url="shareDialogUrl"
      :messages="sharePreviewMessages"
      share-mode="session"
      @close="showShareDialog = false"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除对话"
      message="删除后，该对话将不可恢复。确认删除吗？"
      confirm-text="删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmDeleteSession"
      @cancel="cancelDeleteSession"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/stores/chat";
import { storeToRefs } from "pinia";
import api from "@/services/api";
import ShareDialog from "@/components/common/ShareDialog.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const { messages, currentSessionId } = storeToRefs(chatStore);
const emit = defineEmits(["toggle-sidebar"]);

// 分享弹窗状态
const showShareDialog = ref(false);
const shareDialogUrl = ref("");
const shareDialogTitle = ref("分享对话");
const sharePreviewMessages = ref([]);
// 移动端判断
const isMobile = ref(window.innerWidth <= 768);
const showMore = ref(false);
const moreBtnRef = ref(null);
const moreDropdownRef = ref(null);

// 三点菜单状态
const showMoreMenu = ref(false);
const moreMenuBtnRef = ref(null);

// 删除确认弹窗状态
const showDeleteConfirm = ref(false);

const toggleMore = () => {
  showMore.value = !showMore.value;
};
const closeMore = () => {
  showMore.value = false;
};
const openSidebar = () => {
  emit("toggle-sidebar");
  closeMore();
};
const goto = (path) => {
  router.push(path);
  closeMore();
};

const shareCurrent = () => {
  const sessionId = route.params.sessionId;
  if (sessionId) {
    shareDialogTitle.value = chatStore.sessionInfo?.title || "分享对话";
    shareDialogUrl.value = `${window.location.origin}/share/${sessionId}`;
    // 获取最近消息作为预览
    sharePreviewMessages.value = (messages.value || []).slice(-4);
    showShareDialog.value = true;
    closeMore();
  } else {
    alert("当前没有可分享的对话");
  }
};

// 三点菜单相关函数
const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value;
};

const closeMoreMenu = () => {
  showMoreMenu.value = false;
};

const handleNewChat = () => {
  chatStore.clearCurrentSession();
  router.push("/chat");
};

const handleShare = () => {
  closeMoreMenu();
  shareCurrent();
};

const handleDeleteSession = () => {
  closeMoreMenu();
  showDeleteConfirm.value = true;
};

const confirmDeleteSession = async () => {
  const sessionId = route.params.sessionId;
  if (sessionId) {
    try {
      await api.deleteSession(sessionId);
      showDeleteConfirm.value = false;
      router.push("/chat");
    } catch (e) {
      console.error("删除对话失败:", e);
      alert("删除失败，请重试");
    }
  }
};

const cancelDeleteSession = () => {
  showDeleteConfirm.value = false;
};

// 点击外部关闭菜单
const handleClickOutside = (event) => {
  if (
    showMoreMenu.value &&
    moreMenuBtnRef.value &&
    !moreMenuBtnRef.value.contains(event.target)
  ) {
    closeMoreMenu();
  }
};

const isEditingTitle = ref(false);
const editingTitle = ref("");
const titleInput = ref(null);

// 判断当前回话是否有可分享内容
const hasMessages = computed(() => (messages.value?.length || 0) > 0);
const hasSharableSession = computed(() => {
  if (!isChatPage.value) return false;
  const routeSessionId = route.params.sessionId;
  if (!routeSessionId) return false;
  if (currentSessionId.value && currentSessionId.value !== routeSessionId) {
    return false;
  }
  return hasMessages.value;
});

const isChatPage = computed(() => route.path.startsWith("/chat"));

const pageTitle = computed(() => {
  // 如果是聊天页面,显示当前会话标题
  if (isChatPage.value) {
    const sessionInfo = chatStore.sessionInfo;
    if (sessionInfo?.title) {
      return sessionInfo.title;
    }
    return "新对话";
  }
  return route.meta.title || "小乐 AI 管家";
});

const startEditTitle = () => {
  if (!isChatPage.value) return;
  isEditingTitle.value = true;
  editingTitle.value = pageTitle.value;
  setTimeout(() => {
    if (titleInput.value) {
      titleInput.value.focus();
      titleInput.value.select();
    }
  }, 0);
};

onMounted(() => {
  // 点击外部关闭菜单
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

const saveTitleEdit = async () => {
  const newTitle = editingTitle.value.trim();
  if (!newTitle || newTitle === pageTitle.value) {
    isEditingTitle.value = false;
    return;
  }

  const sessionId = route.params.sessionId;
  if (!sessionId) {
    isEditingTitle.value = false;
    return;
  }

  try {
    await api.updateSession(sessionId, { title: newTitle });

    // 更新当前会话信息
    if (chatStore.sessionInfo) {
      chatStore.sessionInfo.title = newTitle;
    }
    // 重新加载会话列表以更新侧边栏
    await chatStore.loadSessions();
  } catch (error) {
    console.error("标题更新失败:", error);
  }

  isEditingTitle.value = false;
};

const cancelTitleEdit = () => {
  isEditingTitle.value = false;
  editingTitle.value = "";
};

const toggleSidebar = () => {
  emit("toggle-sidebar");
};

const handleOutsideClick = (e) => {
  // 点击到更多之外则关闭
  const inMore =
    e.target.closest &&
    (e.target.closest(".more-container") || e.target.closest(".more-dropdown"));
  if (!inMore) showMore.value = false;
};

onMounted(() => {
  const onResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };
  window.addEventListener("resize", onResize);
  window.__topbar_onResize = onResize;

  document.addEventListener("click", handleOutsideClick);

});

// 同步网页标题为当前对话标题
const updateDocumentTitle = () => {
  if (isChatPage.value) {
    document.title = pageTitle.value || "新对话";
  } else {
    document.title = route.meta.title || "小乐 AI 管家";
  }
};

// 首次和后续变化都更新
watch(
  [() => route.fullPath, pageTitle, isChatPage],
  () => {
    updateDocumentTitle();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  if (window.__topbar_onResize) {
    window.removeEventListener("resize", window.__topbar_onResize);
    delete window.__topbar_onResize;
  }
});
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  padding: 0 var(--space-lg);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 100;
}

@media (min-width: 769px) {
  .top-bar.non-chat-page {
    display: none;
  }
}

.mobile-menu-btn {
  display: none;
  position: absolute;
  left: var(--space-lg);
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-primary);
  cursor: pointer;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }

  .top-bar {
    padding: 0 var(--space-md);
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
  }

  .mobile-menu-btn {
    left: var(--space-md);
  }

  .title-input {
    min-width: 100px;
    max-width: 160px;
    font-size: 14px;
    padding: 4px 8px;
  }

  .page-title {
    max-width: 180px;
    font-size: 14px;
    padding: 4px 8px;
  }
}

.top-bar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 6px;
  transition: background var(--duration-fast) var(--ease-out);
  /* 防止标题过长撑开 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  text-align: center;
}

.page-title.editable {
  cursor: pointer;
}

.page-title.editable:hover {
  background: var(--bg-hover);
}

.title-input {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium);
  border-radius: 6px;
  padding: 6px 12px;
  outline: none;
  min-width: 200px;
  max-width: 400px;
  text-align: center;
}

.title-input:focus {
  border-color: var(--brand-primary);
  background: var(--bg-primary);
}

.top-bar-right {
  position: absolute;
  right: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .top-bar-right {
    gap: 4px;
    right: var(--space-sm);
  }

  .top-bar-center {
    display: none;
  }
}

.more-container {
  position: relative;
}

.more-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 1000;
}

.more-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.more-item:hover {
  background: var(--bg-hover);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 三点菜单容器 */
.more-menu-container {
  position: relative;
}

/* 下拉菜单 */
.more-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item-danger {
  color: var(--error, #ef4444);
}

.menu-item-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
