import type {
  EmbeddedContext,
  InviteDashboard,
  InviteDashboardResponse,
} from '../types/invite'

function buildQuery(context: EmbeddedContext) {
  const params = new URLSearchParams()
  params.set('user_id', context.userId)
  params.set('token', context.token)
  params.set('theme', context.theme)
  params.set('lang', context.locale)
  params.set('ui_mode', context.uiMode)
  params.set('source', context.source)
  return params.toString()
}

export async function fetchInviteDashboard(
  context: EmbeddedContext,
): Promise<InviteDashboard> {
  const response = await fetch(`/api/invite/dashboard?${buildQuery(context)}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`加载邀请返利数据失败: ${response.status}`)
  }

  const result = (await response.json()) as InviteDashboardResponse

  if (!result.success) {
    throw new Error('后端返回失败')
  }

  return result.data
}
