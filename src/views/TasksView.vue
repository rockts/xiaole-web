<template>
  <div class="tasks-view">
    <div class="card">
      <h3>✅ 任务管理</h3>
      <div class="tasks-header">
        <select v-model="statusFilter" @change="loadTasks">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">执行中</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <div class="tasks-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="tasks.length === 0" class="empty">暂无任务</div>
        <div
          v-else
          v-for="task in tasks"
          :key="task.id"
          class="task-item"
          @click="goToTask(task.id)"
        >
          <div class="task-content">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <span :class="['status-badge', task.status]">{{
                getStatusText(task.status)
              }}</span>
              <span class="task-time">{{ formatTaskTime(task) }}</span>
            </div>
          </div>
          <button class="delete-btn" @click.stop="confirmDelete(task.id)">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="confirm-dialog" @click.stop>
        <h3 class="confirm-title">永久删除任务</h3>
        <p class="confirm-message">删除后，该任务将不可恢复。确认删除吗？</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="cancelDelete">取消</button>
          <button class="btn-delete" @click="deleteTask">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const router = useRouter();
const tasks = ref([]);
const loading = ref(false);
const statusFilter = ref("");
const showDeleteConfirm = ref(false);
const taskToDelete = ref(null);

const loadTasks = async () => {
  try {
    loading.value = true;
    const data = await api.getTasks(statusFilter.value);
    tasks.value = data.tasks || [];
  } catch (error) {
    console.error("Failed to load tasks:", error);
  } finally {
    loading.value = false;
  }
};

const goToTask = (id) => {
  router.push(`/task/${id}`);
};

const confirmDelete = (id) => {
  taskToDelete.value = id;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  taskToDelete.value = null;
};

const deleteTask = async () => {
  const id = taskToDelete.value;
  showDeleteConfirm.value = false;

  try {
    const result = await api.deleteTask(id);
    if (result.success) {
      // 直接从列表中移除，不需要重新加载
      const index = tasks.value.findIndex((t) => t.id === id);
      if (index > -1) {
        tasks.value.splice(index, 1);
      }
    } else {
      alert("删除失败: " + (result.error || "未知错误"));
    }
  } catch (error) {
    console.error("Failed to delete task:", error);
    const errorMsg =
      error.response?.data?.detail || error.message || "删除出错";
    alert(`删除失败: ${errorMsg}`);
  } finally {
    taskToDelete.value = null;
  }
};

const getStatusText = (status) => {
  const statusMap = {
    pending: "待处理",
    in_progress: "执行中",
    waiting: "等待中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return statusMap[status] || status;
};

const formatTaskTime = (task) => {
  const now = new Date();

  // 根据状态显示不同的时间
  if (task.status === "completed" && task.completed_at) {
    const completedAt = new Date(task.completed_at);
    const createdAt = new Date(task.created_at);
    const duration = Math.floor((completedAt - createdAt) / 1000 / 60); // 分钟
    const timeAgo = formatTimeAgo(completedAt, now);
    return `✅ ${timeAgo}完成 · 用时 ${formatDuration(duration)}`;
  }

  if (task.status === "in_progress" && task.started_at) {
    const startedAt = new Date(task.started_at);
    const duration = Math.floor((now - startedAt) / 1000 / 60); // 分钟
    const timeAgo = formatTimeAgo(startedAt, now);
    return `▶️ ${timeAgo}开始 · 已运行 ${formatDuration(duration)}`;
  }

  if (task.status === "failed" && task.updated_at) {
    const failedAt = new Date(task.updated_at);
    const timeAgo = formatTimeAgo(failedAt, now);
    return `❌ ${timeAgo}失败`;
  }

  // 待处理、等待中等状态显示创建时间
  if (task.created_at) {
    const createdAt = new Date(task.created_at);
    const timeAgo = formatTimeAgo(createdAt, now);
    return `📅 ${timeAgo}创建`;
  }

  return "";
};

const formatTimeAgo = (date, now) => {
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "刚刚";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}天前`;
  return date.toLocaleDateString("zh-CN");
};

const formatDuration = (minutes) => {
  if (minutes < 1) return "不到1分钟";
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

// 监听刷新事件
const handleRefresh = () => {
  loadTasks();
};

onMounted(() => {
  loadTasks();
  window.addEventListener("refresh-tasks", handleRefresh);
});

onUnmounted(() => {
  window.removeEventListener("refresh-tasks", handleRefresh);
});
</script>

<style scoped>
.tasks-view {
  padding: var(--space-xl);
  padding-bottom: var(--space-lg);
}

@media (max-width: 768px) {
  .tasks-view {
    padding: var(--space-md);
    padding-bottom: var(--space-md);
  }
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
}

.card h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs) 0;
}

.tasks-header {
  display: flex;
  gap: var(--space-md);
  margin: var(--space-lg) 0;
}

.tasks-header select {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-medium);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.task-item {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
  border: 1px solid transparent;
}

.task-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.task-title {
  font-weight: 500;
  font-size: 15px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.task-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge.pending {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.status-badge.in_progress {
  background: rgba(14, 165, 233, 0.1);
  color: var(--info);
}
.status-badge.waiting {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}
.status-badge.completed {
  background: rgba(16, 163, 127, 0.1);
  color: var(--success);
}
.status-badge.failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
}
.status-badge.cancelled {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.delete-btn {
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 16px;
  transition: all var(--duration-fast);
  flex-shrink: 0;
  opacity: 0;
}

.task-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--error);
  color: var(--error);
}

.loading,
.empty {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-secondary);
}

/* 删除确认对话框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.confirm-dialog {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-xl);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
}

.confirm-message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 var(--space-xl) 0;
}

.confirm-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
}

.btn-cancel,
.btn-delete {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.btn-delete {
  background: var(--error);
  color: white;
}

.btn-delete:hover {
  background: #dc2626;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .card {
    padding: var(--space-lg);
  }

  .card h3 {
    font-size: 20px;
  }

  .tasks-header {
    flex-direction: column;
  }

  .tasks-header select {
    width: 100%;
  }

  .task-item {
    padding: var(--space-md);
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-md);
  }

  .task-title {
    font-size: 14px;
    white-space: normal;
    word-break: break-word;
  }

  .delete-btn {
    opacity: 1;
    align-self: flex-end;
  }

  .confirm-actions {
    flex-direction: column-reverse;
  }

  .btn-cancel,
  .btn-delete {
    width: 100%;
    padding: 12px;
  }
}
</style>
