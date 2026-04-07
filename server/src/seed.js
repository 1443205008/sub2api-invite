import { db, getDbPath } from './db.js'

const now = new Date().toISOString()

const rewardStages = [
  { level: 1, stageKey: 'first_recharge', label: '首充返现', rate: 0.1, enabled: 1 },
  { level: 2, stageKey: 'second_recharge', label: '二充返现', rate: 0.08, enabled: 1 },
  { level: 3, stageKey: 'third_recharge', label: '三充返现', rate: 0.06, enabled: 1 },
  { level: 4, stageKey: 'repeat_recharge', label: '后续续充返现', rate: 0.05, enabled: 1 }
]

const users = [
  {
    userId: 'user_demo_001',
    nickname: 'God SAMA',
    inviteCode: 'GODSAMA88',
    announcements: ['返现将自动发放到系统余额，无需提现流程', '管理员可在后台配置多阶段返现比例'],
    invitees: [
      {
        userId: 'invitee_1001',
        nickname: '夜航星',
        orders: [120, 88, 66]
      },
      {
        userId: 'invitee_1002',
        nickname: '雾岛',
        orders: [199]
      },
      {
        userId: 'invitee_1003',
        nickname: 'Kite',
        orders: [69, 69]
      }
    ]
  },
  {
    userId: 'user_demo_002',
    nickname: 'Alpha',
    inviteCode: 'ALPHA1024',
    announcements: ['可查看自己邀请的用户和每一笔返现金额'],
    invitees: [
      {
        userId: 'invitee_2001',
        nickname: 'Luna',
        orders: [99, 99, 199]
      },
      {
        userId: 'invitee_2002',
        nickname: 'Mika',
        orders: [49]
      }
    ]
  }
]

const upsertStage = db.prepare(`
  INSERT INTO reward_stages (level, stage_key, label, rate, enabled, created_at, updated_at)
  VALUES (@level, @stageKey, @label, @rate, @enabled, @createdAt, @updatedAt)
  ON CONFLICT(stage_key) DO UPDATE SET
    level=excluded.level,
    label=excluded.label,
    rate=excluded.rate,
    enabled=excluded.enabled,
    updated_at=excluded.updated_at
`)

const upsertUser = db.prepare(`
  INSERT INTO invite_users (
    user_id, invite_code, invite_link, invited_by_user_id, invited_by_code, nickname,
    total_invites, active_invites, total_recharge_amount, total_reward_amount,
    balance_reward_amount, conversion_rate, announcements_json, source_mode,
    last_synced_at, created_at, updated_at
  ) VALUES (
    @userId, @inviteCode, @inviteLink, @invitedByUserId, @invitedByCode, @nickname,
    @totalInvites, @activeInvites, @totalRechargeAmount, @totalRewardAmount,
    @balanceRewardAmount, @conversionRate, @announcementsJson, @sourceMode,
    @lastSyncedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(user_id) DO UPDATE SET
    invite_code=excluded.invite_code,
    invite_link=excluded.invite_link,
    invited_by_user_id=excluded.invited_by_user_id,
    invited_by_code=excluded.invited_by_code,
    nickname=excluded.nickname,
    total_invites=excluded.total_invites,
    active_invites=excluded.active_invites,
    total_recharge_amount=excluded.total_recharge_amount,
    total_reward_amount=excluded.total_reward_amount,
    balance_reward_amount=excluded.balance_reward_amount,
    conversion_rate=excluded.conversion_rate,
    announcements_json=excluded.announcements_json,
    source_mode=excluded.source_mode,
    last_synced_at=excluded.last_synced_at,
    updated_at=excluded.updated_at
`)

const insertOrder = db.prepare(`
  INSERT INTO invite_orders (
    order_no, inviter_user_id, invitee_user_id, invitee_name, stage_key, stage_label,
    recharge_amount, reward_rate, reward_amount, reward_status, credited_to_balance, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'credited', 1, ?)
`)

const deleteOrdersByInviter = db.prepare('DELETE FROM invite_orders WHERE inviter_user_id = ?')

function getStageForIndex(index) {
  if (index === 0) return rewardStages[0]
  if (index === 1) return rewardStages[1]
  if (index === 2) return rewardStages[2]
  return rewardStages[3]
}

const seed = db.transaction(() => {
  for (const stage of rewardStages) {
    upsertStage.run({
      ...stage,
      createdAt: now,
      updatedAt: now
    })
  }

  for (const inviter of users) {
    let totalRechargeAmount = 0
    let totalRewardAmount = 0

    upsertUser.run({
      userId: inviter.userId,
      inviteCode: inviter.inviteCode,
      inviteLink: `https://sub2api.example.com/register?code=${inviter.inviteCode}`,
      invitedByUserId: null,
      invitedByCode: null,
      nickname: inviter.nickname,
      totalInvites: inviter.invitees.length,
      activeInvites: inviter.invitees.filter((item) => item.orders.length > 0).length,
      totalRechargeAmount: 0,
      totalRewardAmount: 0,
      balanceRewardAmount: 0,
      conversionRate: inviter.invitees.length
        ? Number(((inviter.invitees.filter((item) => item.orders.length > 0).length / inviter.invitees.length) * 100).toFixed(1))
        : 0,
      announcementsJson: JSON.stringify(inviter.announcements),
      sourceMode: 'mock',
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now
    })

    for (const invitee of inviter.invitees) {
      let inviteeTotalRecharge = 0
      let inviteeTotalReward = 0
      invitee.orders.forEach((amount, index) => {
        const stage = getStageForIndex(index)
        const rewardAmount = Number((amount * stage.rate).toFixed(2))
        totalRechargeAmount += amount
        totalRewardAmount += rewardAmount
        inviteeTotalRecharge += amount
        inviteeTotalReward += rewardAmount
      })

      upsertUser.run({
        userId: invitee.userId,
        inviteCode: `${inviter.inviteCode}-${invitee.userId}`,
        inviteLink: `https://sub2api.example.com/register?code=${inviter.inviteCode}`,
        invitedByUserId: inviter.userId,
        invitedByCode: inviter.inviteCode,
        nickname: invitee.nickname,
        totalInvites: 0,
        activeInvites: invitee.orders.length > 0 ? 1 : 0,
        totalRechargeAmount: inviteeTotalRecharge,
        totalRewardAmount: inviteeTotalReward,
        balanceRewardAmount: 0,
        conversionRate: 0,
        announcementsJson: '[]',
        sourceMode: 'mock',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now
      })
    }

    deleteOrdersByInviter.run(inviter.userId)

    for (const invitee of inviter.invitees) {
      invitee.orders.forEach((amount, index) => {
        const stage = getStageForIndex(index)
        const rewardAmount = Number((amount * stage.rate).toFixed(2))
        insertOrder.run(
          `${inviter.userId}-${invitee.userId}-ORD-${index + 1}`,
          inviter.userId,
          invitee.userId,
          invitee.nickname,
          stage.stageKey,
          stage.label,
          amount,
          stage.rate,
          rewardAmount,
          new Date(Date.now() - (invitee.orders.length - index) * 86400000).toISOString()
        )
      })
    }

    upsertUser.run({
      userId: inviter.userId,
      inviteCode: inviter.inviteCode,
      inviteLink: `https://sub2api.example.com/register?code=${inviter.inviteCode}`,
      invitedByUserId: null,
      invitedByCode: null,
      nickname: inviter.nickname,
      totalInvites: inviter.invitees.length,
      activeInvites: inviter.invitees.filter((item) => item.orders.length > 0).length,
      totalRechargeAmount,
      totalRewardAmount,
      balanceRewardAmount: totalRewardAmount,
      conversionRate: inviter.invitees.length
        ? Number(((inviter.invitees.filter((item) => item.orders.length > 0).length / inviter.invitees.length) * 100).toFixed(1))
        : 0,
      announcementsJson: JSON.stringify(inviter.announcements),
      sourceMode: 'mock',
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now
    })
  }

  db.prepare(`
    INSERT INTO sync_state (id, last_sync_at, last_sync_mode, last_sync_note)
    VALUES (1, ?, 'mock', 'seed initialized')
    ON CONFLICT(id) DO UPDATE SET
      last_sync_at=excluded.last_sync_at,
      last_sync_mode=excluded.last_sync_mode,
      last_sync_note=excluded.last_sync_note
  `).run(now)
})

seed()
console.log(`Seed completed. Database: ${getDbPath()}`)
