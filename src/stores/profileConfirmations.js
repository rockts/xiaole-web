import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/services/api'

const ERROR_MESSAGES = {
  400: '提交的资料格式不正确，请检查后再试。',
  403: '当前账号暂时不能确认这项资料。',
  404: '这项资料目前不能确认，请刷新后再试。',
  409: '这项资料刚刚发生了变化，请刷新后再确认。',
  413: '填写的内容太长，请缩短后再试。',
  500: '这项资料暂时没有保存成功，原来的资料没有被覆盖，请稍后再试。'
}

export const useProfileConfirmationsStore = defineStore('profileConfirmations', () => {
  const items = ref([])
  const loading = ref(false)
  const loadError = ref('')
  const submitting = reactive({})
  const fieldErrors = reactive({})
  const pendingCount = computed(() => items.value.length)

  const load = async () => {
    loading.value = true
    loadError.value = ''
    try {
      const response = await api.getProfileConfirmations()
      items.value = Array.isArray(response?.items) ? response.items : []
      return true
    } catch (_) {
      items.value = []
      loadError.value = '待确认资料暂时无法读取，请稍后再试。'
      return false
    } finally {
      loading.value = false
    }
  }

  const submit = async (item, operation, userValue) => {
    if (!item?.key || submitting[item.key]) return false
    submitting[item.key] = true
    fieldErrors[item.key] = ''
    const idempotencyKey = crypto.randomUUID()
    const command = { operation, expected_version: item.version }
    if (operation === 'confirm') command.value = item.candidate_value
    if (operation === 'replace') command.value = userValue
    try {
      await api.submitProfileConfirmation(item.key, command, idempotencyKey)
      await load()
      return true
    } catch (cause) {
      const status = cause?.response?.status
      fieldErrors[item.key] = ERROR_MESSAGES[status] || '个人资料确认服务暂时不可用，请稍后再试。'
      if (status === 409) await load()
      return false
    } finally {
      submitting[item.key] = false
    }
  }

  const isSubmitting = (key) => Boolean(submitting[key])
  const errorFor = (key) => fieldErrors[key] || ''

  return { items, loading, loadError, pendingCount, load, submit, isSubmitting, errorFor }
})
