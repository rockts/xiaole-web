<template>
  <div class="chat-error-recovery" role="status" aria-live="polite">
    <span>{{ recovery.message }}</span>
    <button
      v-if="recovery.retryable"
      type="button"
      :disabled="recovery.retrying"
      @click="$emit('retry')"
    >
      {{ recovery.retrying ? '正在重试…' : recovery.actionLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  recovery: { type: Object, required: true }
})

defineEmits(['retry'])
</script>

<style scoped>
.chat-error-recovery {
  display: flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, #c78b45 35%, var(--border-light));
  border-radius: 12px;
  background: color-mix(in srgb, #c78b45 8%, var(--bg-primary));
  color: var(--text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.chat-error-recovery span {
  min-width: 0;
  flex: 1;
}

.chat-error-recovery button {
  min-width: 72px;
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.chat-error-recovery button:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.chat-error-recovery button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.chat-error-recovery button:disabled {
  cursor: default;
  opacity: .55;
}

@media (max-width: 430px) {
  .chat-error-recovery {
    align-items: stretch;
    flex-direction: column;
  }

  .chat-error-recovery button {
    width: 100%;
  }
}
</style>
