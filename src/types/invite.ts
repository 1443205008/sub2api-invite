export interface EmbeddedContext {
  userId: string
  token: string
  theme: 'light' | 'dark'
  lang: string
  source: string
  mode: 'user' | 'admin'
}

export type RewardStageType = 'first_recharge' | 'second_recharge' | 'third_recharge' | 'repeat_recharge'

export interface RewardStage {
  id: number
  level: number
  stageType: RewardStageType
  label: string
  rate: number
  enabled: boolean
}

export interface InviteStats {
  totalInvites: number
  activeInvites: number
  totalRechargeAmount: number
  totalRewardAmount: number
  settledRewardAmount: number
  balanceRewardAmount: number
  conversionRate: number
}

export interface InvitedUserRecord {
  id: number
  inviteeName: string
  inviteeUserId: string
  joinedAt: string
  status: 'pending' | 'active'
  totalRechargeAmount: number
  totalRewardAmount: number
}

export interface RewardRecord {
  id: number
  inviteeName: string
  orderNo: string
  stageLabel: string
  rechargeAmount: number
  rewardRate: number
  rewardAmount: number
  rewardStatus: 'credited'
  creditedTo: string
  createdAt: string
}

export interface InviteDashboard {
  inviteCode: string
  inviteLink: string
  qrCodeDataUrl?: string
  stats: InviteStats
  invitedUsers: InvitedUserRecord[]
  rewardRecords: RewardRecord[]
  rewardStages: RewardStage[]
  announcements: string[]
  sourceMode?: 'mock' | 'sub2api'
}

export interface AdminSummary {
  totalUsers: number
  totalInvites: number
  totalRechargeAmount: number
  totalRewardAmount: number
  balanceRewardAmount: number
}

export interface AdminUserRow {
  userId: string
  nickname?: string
  inviteCode: string
  totalInvites: number
  activeInvites: number
  totalRechargeAmount: number
  totalRewardAmount: number
  balanceRewardAmount: number
  updatedAt: string
}

export interface AdminDashboard {
  summary: AdminSummary
  users: AdminUserRow[]
  rewardStages: RewardStage[]
  sync: {
    enabled: boolean
    mode: 'mock' | 'sub2api'
    baseUrl?: string
    lastSyncAt?: string | null
  }
}

export interface InviteDashboardResponse {
  success: boolean
  data: InviteDashboard
  message?: string
}

export interface AdminDashboardResponse {
  success: boolean
  data: AdminDashboard
  message?: string
}
