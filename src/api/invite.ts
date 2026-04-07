import type {
  AdminDashboardResponse,
  InviteDashboardResponse,
  RewardStage
} from '../types/invite'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')

async function safeJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || 'request failed')
  }
  return data as T
}

export async function fetchInviteDashboard(userId: string): Promise<InviteDashboardResponse> {
  const response = await fetch(`${API_BASE}/api/invite/dashboard?userId=${encodeURIComponent(userId)}`)
  return safeJson<InviteDashboardResponse>(response)
}

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  const response = await fetch(`${API_BASE}/api/admin/dashboard`)
  return safeJson<AdminDashboardResponse>(response)
}

export async function updateRewardStages(stages: RewardStage[]) {
  const response = await fetch(`${API_BASE}/api/admin/reward-stages`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stages })
  })
  return safeJson<{ success: boolean; data: { rewardStages: RewardStage[] } }>(response)
}

export async function syncAdminUser(userId: string) {
  const response = await fetch(`${API_BASE}/api/admin/sync/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  })
  return safeJson<{ success: boolean; message: string }>(response)
}

export async function creditUserBalance(userId: string, amount: number, note: string) {
  const response = await fetch(`${API_BASE}/api/admin/credit-balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, amount, note })
  })
  return safeJson<{ success: boolean; data: unknown }>(response)
}

export async function bindInviteRelation(inviterUserId: string, inviteeUserId: string, inviteeName: string) {
  const response = await fetch(`${API_BASE}/api/invite/bind`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inviterUserId, inviteeUserId, inviteeName })
  })
  return safeJson<{ success: boolean; message: string }>(response)
}

export async function submitRechargeCallback(orderNo: string, inviteeUserId: string, rechargeAmount: number) {
  const response = await fetch(`${API_BASE}/api/invite/recharge-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderNo, inviteeUserId, rechargeAmount, paidAt: new Date().toISOString(), source: 'admin-manual-test' })
  })
  return safeJson<{ success: boolean; data: unknown }>(response)
}
