<template>
  <div class="settings-view">
    <div class="card">
      <h3>⚙️ 用户设置</h3>

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

      <div class="settings-actions">
        <button @click="saveSettings" class="btn-primary">💾 保存设置</button>
        <button @click="resetSettings" class="btn-secondary">
          🔄 恢复默认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { readSettingsSafely } from "@/chat/chatSettingsMigration";

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
  alert("设置已保存！");
};

const resetSettings = () => {
  if (confirm("确定要恢复默认设置吗？")) {
    localStorage.removeItem("xiaole_settings");
    loadSettings();
    alert("已恢复默认设置！");
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow-light);
}

.settings-section {
  margin: 24px 0;
  padding: 20px;
  background: var(--input-bg);
  border-radius: 8px;
}

.settings-section h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: var(--input-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--tab-hover);
}
</style>
