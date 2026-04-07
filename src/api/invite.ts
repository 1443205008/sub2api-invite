import type { EmbeddedContext, InviteDashboard } from '../types/invite'

export async function fetchInviteDashboard(context: EmbeddedContext): Promise<InviteDashboard> {
  await new Promise((resolve) => setTimeout(resolve, 220))

  return {
    inviteCode: `S2A-${context.userId}`,
    inviteLink: `https://example.com/register?ref=${context.userId}`,
    stats: {
      totalInvites: 28,
      effectiveInvites: 16,
      totalReward: 386.5,
      pendingReward: 92
    },
    inviteRecords: [
      { id: 'i_1001', userName: 'Neko', joinedAt: '2026-04-02 16:20', status: 'effective', contribution: 88 },
      { id: 'i_1002', userName: 'Alice', joinedAt: '2026-04-03 10:14', status: 'pending', contribution: 0 },
      { id: 'i_1003', userName: 'Orion', joinedAt: '2026-04-05 21:42', status: 'effective', contribution: 128 },
      { id: 'i_1004', userName: 'Delta', joinedAt: '2026-04-06 09:33', status: 'effective', contribution: 56 }
    ],
    rewardRecords: [
      { id: 'r_2001', type: '首充返利', amount: 88, status: 'settled', createdAt: '2026-04-02 18:02', note: 'Neko 首次充值' },
      { id: 'r_2002', type: '续费返利', amount: 42.5, status: 'settled', createdAt: '2026-04-04 12:25', note: '历史订单返利' },
      { id: 'r_2003', type: '首充返利', amount: 92, status: 'pending', createdAt: '2026-04-06 11:08', note: '等待结算' },
      { id: 'r_2004', type: '套餐购买返利', amount: 164, status: 'settled', createdAt: '2026-04-06 20:40', note: 'Orion 套餐购买' }
    ]
  }
}
