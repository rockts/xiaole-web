<template>
  <nav class="mobile-bottom-nav" data-testid="mobile-bottom-nav" aria-label="主要导航">
    <router-link
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      class="mobile-nav-item"
      data-testid="mobile-primary-nav-item"
      :aria-label="item.label"
    >
      <span class="mobile-nav-icon" v-html="item.icon"></span>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
const items = [
  { path: '/home', label: '首页', icon: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v9H5v-9Z"/></svg>' },
  { path: '/chat', label: '对话', icon: '<svg viewBox="0 0 24 24"><path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"/></svg>' },
  { path: '/knowledge', label: '知识', icon: '<svg viewBox="0 0 24 24"><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2Zm16 0a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2Z"/></svg>' },
  { path: '/action', label: '行动', icon: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-5.3-8.2"/></svg>' }
]
</script>

<style scoped>
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    position: fixed;
    z-index: 850;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    min-width: 0;
    padding: 4px 6px max(4px, env(safe-area-inset-bottom));
    border-top: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
    backdrop-filter: blur(18px);
  }

  .mobile-nav-item {
    min-width: 0;
    min-height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: 12px;
    color: var(--text-secondary);
    font-size: 11px;
    text-decoration: none;
  }

  .mobile-nav-item.router-link-active {
    color: var(--primary-color);
    background: var(--bg-secondary);
  }

  .mobile-nav-icon {
    width: 20px;
    height: 20px;
  }

  .mobile-nav-icon :deep(svg) {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}
</style>
