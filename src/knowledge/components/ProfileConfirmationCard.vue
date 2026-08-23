<template>
  <article class="confirmation-card" data-test="confirmation-card">
    <header>
      <div><h3>{{ item.label }}</h3><span>待确认</span></div>
      <p v-if="hasCandidate" class="candidate-value">{{ displayCandidate }}</p>
    </header>

    <div v-if="hasCandidate && !editing" class="candidate-actions">
      <button type="button" data-test="confirm-candidate" :disabled="submitting" @click="$emit('confirm', item)">确认这个信息</button>
      <button type="button" class="secondary" data-test="modify-candidate" :disabled="submitting" @click="startEditing">修改</button>
    </div>

    <form v-else class="replacement-form" @submit.prevent="saveReplacement">
      <div v-if="item.input_type === 'multi_text'" class="multi-values">
        <div v-for="(_, index) in multiValues" :key="index" class="multi-row">
          <input v-model="multiValues[index]" data-test="multi-text-input" :aria-label="`${item.label} ${index + 1}`" :list="optionsId" :disabled="submitting" />
          <button type="button" data-test="remove-multi-value" aria-label="移除这项" :disabled="submitting || multiValues.length === 1" @click="removeValue(index)">移除</button>
        </div>
        <button type="button" class="secondary add-value" data-test="add-multi-value" :disabled="submitting" @click="multiValues.push('')">添加一项</button>
      </div>
      <input v-else v-model="singleValue" data-test="single-text-input" :aria-label="item.label" :list="optionsId" :disabled="submitting" />
      <datalist v-if="item.options?.length" :id="optionsId"><option v-for="option in item.options" :key="option" :value="option" /></datalist>
      <div class="form-actions">
        <button v-if="hasCandidate" type="button" class="secondary" data-test="cancel-replacement" :disabled="submitting" @click="editing = false">取消</button>
        <button type="submit" class="primary-action" data-test="save-replacement" :disabled="submitting || !canSave">{{ submitting ? '保存中…' : (hasCandidate ? '保存修改' : '保存') }}</button>
      </div>
    </form>
    <p v-if="error" class="field-error" data-test="confirmation-error" role="alert">{{ error }}</p>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['confirm', 'replace'])
const hasCandidate = computed(() => props.item.candidate_value !== null && props.item.candidate_value !== undefined)
const editing = ref(!hasCandidate.value)
const singleValue = ref('')
const multiValues = ref([''])
const displayCandidate = computed(() => Array.isArray(props.item.candidate_value) ? props.item.candidate_value.join('、') : String(props.item.candidate_value || ''))
const optionsId = computed(() => `confirmation-options-${props.item.key}`)
const canSave = computed(() => props.item.input_type === 'multi_text'
  ? multiValues.value.some((value) => value.trim())
  : Boolean(singleValue.value.trim()))

const startEditing = () => {
  if (props.item.input_type === 'multi_text') {
    multiValues.value = Array.isArray(props.item.candidate_value) ? [...props.item.candidate_value] : ['']
  } else {
    singleValue.value = typeof props.item.candidate_value === 'string' ? props.item.candidate_value : ''
  }
  editing.value = true
}
const removeValue = (index) => { if (multiValues.value.length > 1) multiValues.value.splice(index, 1) }
const saveReplacement = () => {
  if (!canSave.value || props.submitting) return
  const value = props.item.input_type === 'multi_text'
    ? multiValues.value.map((entry) => entry.trim()).filter(Boolean)
    : singleValue.value.trim()
  emit('replace', props.item, value)
}
</script>

<style scoped>
.confirmation-card{min-width:0;padding:20px;border:1px solid var(--border-light);border-radius:18px;background:var(--bg-primary)}
.confirmation-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.confirmation-card h3{margin:0 0 6px;font-size:17px}.confirmation-card header span{color:var(--text-secondary);font-size:12px}.candidate-value{max-width:55%;margin:0;color:var(--text-primary);font-weight:600;text-align:right;overflow-wrap:anywhere}.candidate-actions,.form-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:18px}.form-actions{padding-top:14px;border-top:1px solid var(--border-light);scroll-margin-bottom:120px}.confirmation-card button{min-height:44px;padding:0 16px;border:0;border-radius:11px;background:var(--brand-primary);color:#fff;font-weight:650;cursor:pointer}.confirmation-card button.secondary,.multi-row button{border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary)}.confirmation-card button:disabled{cursor:default}.confirmation-card button.primary-action:disabled{border:1px solid color-mix(in srgb,var(--brand-primary) 45%,var(--border-light));background:color-mix(in srgb,var(--brand-primary) 28%,var(--bg-primary));color:color-mix(in srgb,var(--brand-primary) 72%,var(--text-secondary))}.confirmation-card button.secondary:disabled,.multi-row button:disabled{opacity:.55}.replacement-form{min-width:0;margin-top:18px}.replacement-form input{box-sizing:border-box;width:100%;min-width:0;min-height:46px;padding:0 12px;border:1px solid var(--border-light);border-radius:11px;background:var(--bg-primary);color:var(--text-primary);font-size:16px}.multi-values{display:flex;min-width:0;flex-direction:column;gap:9px}.multi-row{display:grid;min-width:0;grid-template-columns:minmax(0,1fr) auto;gap:8px}.multi-row button{padding:0 12px}.add-value{align-self:flex-start}.field-error{margin:14px 0 0;color:#b94d4d;font-size:13px;line-height:1.55}
@media(max-width:768px){.confirmation-card{padding:17px 14px}.confirmation-card header{flex-direction:column;gap:10px}.candidate-value{max-width:none;text-align:left}.candidate-actions,.form-actions{justify-content:stretch}.candidate-actions button,.form-actions button{flex:1}.multi-row{grid-template-columns:minmax(0,1fr) 64px}.multi-row button{padding:0 8px}}
</style>
