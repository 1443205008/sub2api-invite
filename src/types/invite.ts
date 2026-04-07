export interface EmbeddedContext {
  userId: string
  token: string
  theme: 'light' | 'dark'
  locale: 'zh' | 'en'
  uiMode: string
  source: string
}

export interface InviteStats {
  totalInvites: number
  effectiveInvites: number
  totalReward: number
  pendingReward: number
}

export interface InviteRecord {
  id: string
  userName: string
  joinedAt: string
  status: 'pending' | 'effective'
  contribution: number
}

export interface RewardRecord {
  id: string
  type: string
  amount: number
  status: 'settled' | 'pending'
  createdAt: string
  note: string
}

export interface InviteDashboard {
  inviteCode: string
  inviteLink: string
  stats: InviteStats
  inviteRecords: InviteRecord[]
  rewardRecords: RewardRecord[]
}
