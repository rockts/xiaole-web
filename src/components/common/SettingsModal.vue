<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>⚙️ 用户设置</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="settings-section">
          <h4>👤 个人信息</h4>
          <div class="form-group">
            <label>用户名</label>
            <input
              v-model="settings.username"
              type="text"
              placeholder="请输入用户名"
            />
          </div>
          <div class="form-group">
            <label>昵称</label>
            <input
              v-model="settings.nickname"
              type="text"
              placeholder="小乐会这样称呼你"
            />
          </div>
        </div>

        <div class="settings-section">
          <h4>🎨 界面设置</h4>
          <div class="form-group">
            <label>主题模式</label>
            <select v-model="settings.theme">
              <option value="light">浅色模式</option>
              <option value="dark">深色模式</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.compactMode" />
              紧凑模式
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>🤖 AI 设置</h4>
          <div class="form-group">
            <label>响应风格</label>
            <select v-model="settings.responseStyle">
              <option value="concise">简洁</option>
              <option value="balanced">平衡</option>
              <option value="detailed">详细</option>
              <option value="professional">专业</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.autoMemory" />
              自动记忆重要信息
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.voiceEnabled" />
              启用语音输入
            </label>
          </div>
        </div>

        <div class="settings-section">
          <details class="advanced-details">
            <summary>高级与诊断</summary>
            <div class="advanced-links"><a href="/behavior">行为分析</a><a href="/tools">工具</a></div>
          </details>
        </div>

        <div class="settings-section">
          <h4>🔔 通知设置</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.notificationEnabled" />
              启用桌面通知
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.soundEnabled" />
              启用提示音
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="resetSettings" class="btn-secondary">
          🔄 恢复默认
        </button>
        <button @click="saveSettings" class="btn-primary">💾 保存设置</button>
      </div>

      <!-- 移动端额外的关闭按钮 -->
      <div class="mobile-close-bar">
        <button @click="$emit('close')" class="mobile-close-btn">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { readSettingsSafely } from "@/chat/chatSettingsMigration";

const emit = defineEmits(["close"]);

const settings = ref({
  username: "default_user",
  nickname: "游戏小乐乐",
  theme: "light",
  compactMode: false,
  responseStyle: "balanced",
  autoMemory: true,
  voiceEnabled: false,
  notificationEnabled: true,
  soundEnabled: true,
});

const loadSettings = () => {
  // 从 localStorage 加载设置
  settings.value = { ...settings.value, ...readSettingsSafely() };
};

const saveSettings = () => {
  localStorage.setItem("xiaole_settings", JSON.stringify(settings.value));
  // 这里可以添加一个 toast 提示，或者简单 alert
  // alert("设置已保存！");
  emit("close");
};

const resetSettings = () => {
  if (confirm("确定要恢复默认设置吗？")) {
    localStorage.removeItem("xiaole_settings");
    loadSettings();
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease-out;
  z-index: 100000;
}

@media (max-width: 768px) {
  .modal-overlay {
    align-items: stretch;
  }

  .modal-content {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
  }

  .mobile-close-bar {
    display: flex;
    justify-content: center;
    padding: 16px;
    padding-bottom: calc(
      16px + env(safe-area-inset-bottom) + 60px
    ); /* 额外加60px避开浏览器底部菜单 */
    border-top: 1px solid var(--border-light);
    background: var(--bg-secondary);
  }

  .mobile-close-btn {
    width: 100%;
    max-width: 400px;
    padding: 14px 24px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mobile-close-btn:active {
    transform: scale(0.98);
    background: var(--brand-secondary);
  }
}

/* 桌面端隐藏移动端关闭按钮 */
@media (min-width: 769px) {
  .mobile-close-bar {
    display: none;
  }
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  padding-bottom: 12px; /* 减少底部padding给按钮区留空间 */
  overflow-y: auto;
  flex: 1;
}

.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus,
.form-group select:focus {
  border-color: var(--brand-primary);
  outline: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-footer {
  padding: 16px 24px;
  padding-bottom: 20px; /* 增加底部边距 */
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0; /* 防止被压缩 */
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--brand-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
</style>
