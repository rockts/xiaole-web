import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import appRouter from '../index'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

describe('Phase F authenticated entry routing', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('opens the root route on Home for an authenticated user', async () => {
    useAuthStore().token = 'local-test-token'
    await appRouter.replace('/?phase-f=root')
    expect(appRouter.currentRoute.value.path).toBe('/home')
  })

  it('redirects an authenticated visit to Login back to Home', async () => {
    useAuthStore().token = 'local-test-token'
    await appRouter.replace('/login?phase-f=authenticated')
    expect(appRouter.currentRoute.value.path).toBe('/home')
  })

  it.each(['/chat', '/chat/session-123'])('keeps direct Chat entry available at %s', async (path) => {
    useAuthStore().token = 'local-test-token'
    await appRouter.replace(path)
    expect(appRouter.currentRoute.value.path).toBe(path)
  })

  it('sends an unauthenticated Home visit to Login without a loop', async () => {
    await appRouter.replace('/home?phase-f=unauthenticated')
    expect(appRouter.currentRoute.value.path).toBe('/login')
  })
})

describe('Phase F successful login entry', () => {
  it('replaces Login with Home after authentication succeeds', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'Login', component: LoginView },
        { path: '/home', name: 'Home', component: { template: '<div>Home</div>' } },
        { path: '/chat', name: 'Chat', component: { template: '<div>Chat</div>' } }
      ]
    })
    await router.push('/login')
    await router.isReady()

    const authStore = useAuthStore()
    authStore.login = vi.fn().mockResolvedValue(true)
    const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
    await wrapper.get('#username').setValue('local')
    await wrapper.get('#password').setValue('password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    wrapper.unmount()
  })
})
