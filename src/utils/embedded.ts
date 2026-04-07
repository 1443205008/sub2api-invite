import type { EmbeddedContext } from '../types/invite'

function normalizeTheme(value: string | null): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : 'light'
}

function normalizeLocale(value: string | null): 'zh' | 'en' {
  return value === 'en' ? 'en' : 'zh'
}

export function getEmbeddedContext(): EmbeddedContext {
  const params = new URLSearchParams(window.location.search)
  return {
    userId: params.get('user_id') ?? '10001',
    token: params.get('token') ?? '',
    theme: normalizeTheme(params.get('theme')),
    locale: normalizeLocale(params.get('lang')),
    uiMode: params.get('ui_mode') ?? 'embedded',
    source: params.get('source') ?? 'sub2api'
  }
}

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
