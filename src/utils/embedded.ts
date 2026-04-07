import type { EmbeddedContext } from '../types/invite'

export function getEmbeddedContext(): EmbeddedContext {
  const params = new URLSearchParams(window.location.search)
  return {
    userId: params.get('userId') || params.get('user_id') || 'user_demo_001',
    token: params.get('token') || '',
    theme: params.get('theme') === 'light' ? 'light' : 'dark',
    lang: params.get('lang') || 'zh-CN',
    source: params.get('source') || 'sub2api',
    mode: params.get('mode') === 'admin' ? 'admin' : 'user'
  }
}

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('light', theme === 'light')
}
