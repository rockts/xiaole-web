<template>
  <div v-if="intent || core2Error" class="core2-result-meta">
    <span v-if="intent" class="intent-tag">{{ intentLabel }}</span>

    <div v-if="safeSources.length" class="core2-sources" aria-label="回答来源">
      <div class="meta-title">来源</div>
      <a
        v-for="(source, index) in safeSources"
        :key="`${source.title}-${index}`"
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="source-card"
      >
        <strong>{{ source.title }}</strong>
        <span v-if="source.summary">{{ source.summary }}</span>
        <time v-if="source.issue_date">{{ source.issue_date }}</time>
      </a>
    </div>

    <div v-if="intent === 'action'" class="action-card" :class="{ success: actionSucceeded }">
      <strong>{{ actionSucceeded ? '执行结果：成功' : '执行失败' }}</strong>
      <span v-if="action?.summary">{{ action.summary }}</span>
    </div>

    <div v-if="core2Error" class="core2-fallback">
      <button type="button" @click="$emit('switch-legacy')">切回小乐 1.0</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  intent: { type: String, default: '' },
  sources: { type: Array, default: () => [] },
  action: { type: Object, default: null },
  core2Error: { type: Boolean, default: false }
})
defineEmits(['switch-legacy'])

const intentLabel = computed(() => ({ conversation: '对话', memory: '知识', action: '执行' })[props.intent] || '')
const actionSucceeded = computed(() => props.action?.status === 'success')
const safeSources = computed(() => props.sources.filter(source =>
  source &&
  typeof source.title === 'string' &&
  !/^(?:file:|\/|[A-Za-z]:\\|~\/)/.test(source.title) &&
  /^https?:\/\//.test(source.url || '')
))
</script>

<style scoped>
.core2-result-meta { display: grid; gap: 8px; margin-top: 10px; font-size: 13px; }
.intent-tag { width: fit-content; padding: 2px 8px; border-radius: 999px; background: var(--input-bg); color: var(--text-secondary); }
.core2-sources { display: grid; gap: 6px; }
.meta-title { font-weight: 600; color: var(--text-secondary); }
.source-card { display: grid; gap: 3px; padding: 9px 11px; border: 1px solid var(--border-color); border-radius: 8px; color: inherit; text-decoration: none; }
.source-card:hover { border-color: var(--text-secondary); }
.source-card span, .source-card time { color: var(--text-secondary); }
.action-card { display: grid; gap: 3px; padding: 9px 11px; border-radius: 8px; background: rgba(220, 38, 38, .08); }
.action-card.success { background: rgba(22, 163, 74, .09); }
.core2-fallback button { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px; background: var(--card-bg); cursor: pointer; }
</style>
