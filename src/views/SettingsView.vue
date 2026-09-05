<template>
  <main class="settings-view">
    <header class="settings-header">
      <p class="eyebrow">XiaoLe</p>
      <h1>设置</h1>
      <p>调整小乐的外观与日常使用偏好。</p>
    </header>

    <div class="settings-groups">
      <section class="settings-group" aria-labelledby="appearance-title">
        <div class="group-heading"><div><h2 id="appearance-title">外观</h2><p>选择小乐在这台设备上的显示方式。</p></div></div>
        <div class="setting-row">
          <label for="theme-select"><strong>主题</strong><span>切换后立即应用，并在刷新后保持。</span></label>
          <select id="theme-select" v-model="settings.theme" data-testid="theme-select" @change="changeTheme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="conversation-title">
        <div class="group-heading"><div><h2 id="conversation-title">对话</h2><p>管理小乐与你交流时使用的个人偏好。</p></div></div>
        <div class="setting-row">
          <label for="nickname"><strong>称呼</strong><span>用于账户区域的显示名称。</span></label>
          <input id="nickname" v-model.trim="settings.nickname" type="text" autocomplete="nickname" placeholder="小乐该如何称呼你" />
        </div>
        <div class="setting-row unavailable" data-testid="unavailable-setting" aria-disabled="true">
          <div><strong>回答风格</strong><span>当前由每次对话内容决定。</span></div><span class="availability">暂不可设置</span>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="input-title">
        <div class="group-heading"><div><h2 id="input-title">输入</h2><p>与文字、语音和附件输入有关的偏好。</p></div></div>
        <div class="setting-row unavailable" data-testid="unavailable-setting" aria-disabled="true">
          <div><strong>语音输入</strong><span>请直接从对话输入区使用语音功能。</span></div><span class="availability">在对话中使用</span>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="advanced-title">
        <div class="group-heading"><div><h2 id="advanced-title">高级与诊断</h2><p>查看行为记录和可用工具等技术信息。</p></div></div>
        <nav class="advanced-links" aria-label="高级与诊断入口">
          <router-link to="/behavior">行为分析 <span aria-hidden="true">→</span></router-link>
          <router-link to="/tools">工具 <span aria-hidden="true">→</span></router-link>
        </nav>
      </section>
    </div>

    <footer class="settings-actions">
      <p class="save-status" role="status" aria-live="polite">{{ feedback }}</p>
      <div>
        <button class="secondary-button" type="button" data-testid="reset-settings" @click="showResetDialog = true">恢复默认</button>
        <button class="primary-button" type="button" data-testid="save-settings" @click="saveSettings">保存设置</button>
      </div>
    </footer>

    <ConfirmDialog
      :visible="showResetDialog"
      title="恢复默认设置"
      message="这会清除自定义称呼，并将主题恢复为跟随系统。确定继续吗？"
      confirm-text="恢复默认"
      cancel-text="取消"
      type="warning"
      @confirm="resetSettings"
      @cancel="showResetDialog = false"
    />
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { readSettingsSafely, SETTINGS_KEY } from '@/chat/chatSettingsMigration'
import { setThemePreference, themePreference } from '@/theme/themeAuthority'

const settings = ref({ nickname: '', theme: themePreference.value })
const feedback = ref('')
const showResetDialog = ref(false)

function loadSettings() {
  const stored = readSettingsSafely()
  settings.value = { nickname: stored.nickname || '', theme: themePreference.value }
}

function changeTheme() {
  setThemePreference(settings.value.theme)
  feedback.value = ''
}

function saveSettings() {
  const stored = readSettingsSafely()
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...stored, nickname: settings.value.nickname, theme: settings.value.theme }))
  feedback.value = '设置已保存'
}

function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY)
  settings.value = { nickname: '', theme: 'auto' }
  setThemePreference('auto')
  showResetDialog.value = false
  feedback.value = '已恢复默认设置'
}

onMounted(loadSettings)
</script>

<style scoped>
.settings-view{width:min(100%,1040px);margin:0 auto;padding:48px 40px 56px;color:var(--text-primary)}
.settings-header{max-width:620px;margin-bottom:32px}.eyebrow{margin:0 0 6px;color:var(--brand-primary);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.settings-header h1{margin:0;font-size:32px;line-height:1.2;letter-spacing:-.02em}.settings-header>p:last-child{margin:10px 0 0;color:var(--text-secondary);font-size:15px}
.settings-groups{display:grid;gap:16px}.settings-group{overflow:hidden;border:1px solid var(--border-light);border-radius:16px;background:var(--card-bg);box-shadow:var(--shadow-xs)}.group-heading{padding:20px 22px 16px;border-bottom:1px solid var(--border-light)}.group-heading h2{margin:0;font-size:16px;line-height:1.4}.group-heading p{margin:4px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.setting-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,260px);gap:24px;align-items:center;min-height:76px;padding:16px 22px}.setting-row+.setting-row{border-top:1px solid var(--border-light)}.setting-row label,.setting-row>div{display:flex;min-width:0;flex-direction:column}.setting-row strong{font-size:14px;font-weight:650}.setting-row label span,.setting-row>div span{margin-top:3px;color:var(--text-secondary);font-size:12px;line-height:1.45}
input,select,textarea{width:100%;min-height:44px;border:1px solid var(--input-border);border-radius:10px;background:var(--input-bg);color:var(--text-primary);font:inherit;font-size:14px}input{padding:0 12px}select{padding:0 36px 0 12px}option{background:var(--bg-primary);color:var(--text-primary)}input::placeholder,textarea::placeholder{color:var(--text-tertiary);opacity:1}input:disabled,select:disabled,textarea:disabled{background:var(--input-disabled-bg);color:var(--text-disabled);cursor:not-allowed}input:focus-visible,select:focus-visible,textarea:focus-visible,.primary-button:focus-visible,.secondary-button:focus-visible,.advanced-links a:focus-visible{outline:3px solid color-mix(in srgb,var(--border-focus) 28%,transparent);outline-offset:2px;border-color:var(--border-focus)}
.unavailable{color:var(--text-secondary)}.availability{justify-self:end;margin:0!important;padding:5px 9px;border-radius:999px;background:var(--bg-secondary);color:var(--text-secondary)!important;font-size:11px!important;white-space:nowrap}.advanced-links{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 22px 20px}.advanced-links a{display:flex;min-height:44px;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid var(--border-light);border-radius:10px;color:var(--text-primary);text-decoration:none}.advanced-links a:hover{background:var(--bg-hover)}
.settings-actions{display:flex;min-height:76px;align-items:center;justify-content:space-between;gap:20px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-light)}.settings-actions>div{display:flex;gap:10px}.save-status{margin:0;color:var(--success);font-size:13px}.primary-button,.secondary-button{min-height:44px;padding:0 18px;border-radius:10px;font:inherit;font-size:14px;font-weight:650;cursor:pointer}.primary-button{border:1px solid var(--brand-primary);background:var(--brand-primary);color:#fff}.primary-button:hover{background:var(--brand-primary-hover)}.secondary-button{border:1px solid var(--border-medium);background:var(--bg-primary);color:var(--text-primary)}.secondary-button:hover{background:var(--bg-hover)}
@media(min-width:1100px){.settings-groups{grid-template-columns:1fr 1fr;align-items:start}.settings-group:first-child,.settings-group:last-child{grid-column:1/-1}}
@media(max-width:600px){.settings-view{padding:28px 18px 40px}.settings-header{margin-bottom:24px}.settings-header h1{font-size:28px}.group-heading,.setting-row{padding-left:16px;padding-right:16px}.setting-row{grid-template-columns:1fr;gap:12px}.availability{justify-self:start}.advanced-links{grid-template-columns:1fr;padding:14px 16px 18px}.settings-actions{align-items:stretch;flex-direction:column}.settings-actions>div{display:grid;grid-template-columns:1fr 1fr}.primary-button,.secondary-button{width:100%}}
</style>
