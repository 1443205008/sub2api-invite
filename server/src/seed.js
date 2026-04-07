import { db, getDbPath } from './db.js'

function ensureUser(user) {
  db.prepare(
    `INSERT OR REPLACE INTO users (id, token, nickname, invite_code, rebate_rate, created_at)
     VALUES (@id, @token, @nickname, @invite_code, @rebate_rate, @created_at)`
  ).run(user)
}

function replaceInviteRecords(ownerUserId, rows) {
  db.prepare('DELETE FROM invite_records WHERE owner_user_id = ?').run(ownerUserId)
  const stmt = db.prepare(
    `INSERT INTO invite_records (id, owner_user_id, user_name, joined_at, status, contribution)
     VALUES (@id, @owner_user_id, @user_name, @joined_at, @status, @contribution)`
  )
  const tx = db.transaction((records) => {
    for (const row of records) stmt.run(row)
  })
  tx(rows)
}

function replaceRewardRecords(ownerUserId, rows) {
  db.prepare('DELETE FROM reward_records WHERE owner_user_id = ?').run(ownerUserId)
  const stmt = db.prepare(
    `INSERT INTO reward_records (id, owner_user_id, type, amount, status, created_at, note)
     VALUES (@id, @owner_user_id, @type, @amount, @status, @created_at, @note)`
  )
  const tx = db.transaction((records) => {
    for (const row of records) stmt.run(row)
  })
  tx(rows)
}

const now = '2026-04-07 13:58:00'

ensureUser({
  id: '10001',
  token: 'demo-token-10001',
  nickname: 'God SAMA',
  invite_code: 'GOD888',
  rebate_rate: 18,
  created_at: now,
})

replaceInviteRecords('10001', [
  {
    id: 'inv-1001',
    owner_user_id: '10001',
    user_name: '星夜旅人',
    joined_at: '2026-03-28 18:20:00',
    status: 'effective',
    contribution: 71.82,
  },
  {
    id: 'inv-1002',
    owner_user_id: '10001',
    user_name: 'Nebula',
    joined_at: '2026-03-30 09:12:00',
    status: 'pending',
    contribution: 17.82,
  },
  {
    id: 'inv-1003',
    owner_user_id: '10001',
    user_name: 'Rin',
    joined_at: '2026-04-02 22:41:00',
    status: 'effective',
    contribution: 125.82,
  },
  {
    id: 'inv-1004',
    owner_user_id: '10001',
    user_name: 'Delta',
    joined_at: '2026-04-05 08:18:00',
    status: 'effective',
    contribution: 208.50,
  },
])

replaceRewardRecords('10001', [
  {
    id: 'rew-2001',
    owner_user_id: '10001',
    type: 'commission',
    amount: 71.82,
    status: 'settled',
    created_at: '2026-03-29 10:00:00',
    note: '首单返利结算',
  },
  {
    id: 'rew-2002',
    owner_user_id: '10001',
    type: 'bonus',
    amount: 17.82,
    status: 'pending',
    created_at: '2026-03-31 10:00:00',
    note: '注册激活奖励待审核',
  },
  {
    id: 'rew-2003',
    owner_user_id: '10001',
    type: 'commission',
    amount: 125.82,
    status: 'settled',
    created_at: '2026-04-03 10:00:00',
    note: '续费返佣已入账',
  },
  {
    id: 'rew-2004',
    owner_user_id: '10001',
    type: 'adjustment',
    amount: 208.50,
    status: 'settled',
    created_at: '2026-04-06 11:30:00',
    note: '套餐升级返利补发',
  },
])

console.log(`seed complete: ${getDbPath()}`)
