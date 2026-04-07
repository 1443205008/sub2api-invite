import express from 'express'
import cors from 'cors'
import QRCode from 'qrcode'
import { db, getDbPath } from './db.js'

const app = express()
const port = Number(process.env.PORT || 8787)
const sourceMode = process.env.DATA_SOURCE_MODE === 'sub2api' ? 'sub2api' : 'mock'
const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://sub2api.example.com/register'
const adminApiBase = process.env.SUB2API_ADMIN_BASE_URL || ''
const adminApiToken = process.env.SUB2API_ADMIN_TOKEN || ''
const autoCreditEnabled = process.env.SUB2API_AUTO_CREDIT === 'true'

app.use(cors())
app.use(express.json())

function parseJsonField(value, fallback = []) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function calcConversionRate(totalInvites, activeInvites) {
  if (!totalInvites) return 0
  return Number(((activeInvites / totalInvites) * 100).toFixed(1))
}

async function buildQrCodeDataUrl(text) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
}

function ensureInviteLink(userId, inviteCode) {
  return `${publicBaseUrl}${publicBaseUrl.includes('?') ? '&' : '?'}code=${encodeURIComponent(inviteCode)}&referrer=${encodeURIComponent(userId)}`
}

function getRewardStages() {
  return db.prepare(`SELECT id, level, stage_key, label, rate, enabled FROM reward_stages ORDER BY level ASC, id ASC`).all().map((row) => ({
    id: row.id,
    level: row.level,
    stageType: row.stage_key,
    label: row.label,
    rate: row.rate,
    enabled: Boolean(row.enabled)
  }))
}

function getEnabledStageForNthRecharge(nth) {
  const stages = getRewardStages().filter((item) => item.enabled)
  if (nth <= 1) return stages.find((item) => item.stageType === 'first_recharge')
  if (nth === 2) return stages.find((item) => item.stageType === 'second_recharge')
  if (nth === 3) return stages.find((item) => item.stageType === 'third_recharge')
  return stages.find((item) => item.stageType === 'repeat_recharge')
}

function getUserRow(userId) {
  return db.prepare('SELECT * FROM invite_users WHERE user_id = ?').get(userId)
}

function ensureUserBase({ userId, nickname, inviteCode, source = sourceMode }) {
  const now = new Date().toISOString()
  const existing = getUserRow(userId)
  const finalCode = inviteCode || existing?.invite_code || `INV-${userId}`
  db.prepare(`
    INSERT INTO invite_users (
      user_id, invite_code, invite_link, nickname, total_invites, active_invites,
      total_recharge_amount, total_reward_amount, balance_reward_amount, conversion_rate,
      announcements_json, source_mode, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, '[]', ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      invite_code=excluded.invite_code,
      invite_link=excluded.invite_link,
      nickname=excluded.nickname,
      source_mode=excluded.source_mode,
      last_synced_at=excluded.last_synced_at,
      updated_at=excluded.updated_at
  `).run(
    userId,
    finalCode,
    ensureInviteLink(userId, finalCode),
    nickname || existing?.nickname || userId,
    source,
    now,
    existing?.created_at || now,
    now
  )
  return getUserRow(userId)
}

function recalcInviterSummary(userId) {
  const bindingSummary = db.prepare(`
    SELECT COUNT(*) AS total_invites
    FROM invite_bindings
    WHERE inviter_user_id = ? AND status = 'active'
  `).get(userId)

  const cashbackSummary = db.prepare(`
    SELECT
      COUNT(DISTINCT invitee_user_id) AS active_invites,
      COALESCE(SUM(recharge_amount), 0) AS total_recharge_amount,
      COALESCE(SUM(reward_amount), 0) AS total_reward_amount
    FROM invite_cashback_records
    WHERE inviter_user_id = ? AND credit_status IN ('credited', 'pending')
  `).get(userId)

  const totalInvites = Number(bindingSummary?.total_invites || 0)
  const activeInvites = Number(cashbackSummary?.active_invites || 0)
  const totalRechargeAmount = Number(cashbackSummary?.total_recharge_amount || 0)
  const totalRewardAmount = Number(cashbackSummary?.total_reward_amount || 0)

  db.prepare(`
    UPDATE invite_users
    SET total_invites = ?,
        active_invites = ?,
        total_recharge_amount = ?,
        total_reward_amount = ?,
        balance_reward_amount = ?,
        conversion_rate = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    totalInvites,
    activeInvites,
    totalRechargeAmount,
    totalRewardAmount,
    totalRewardAmount,
    calcConversionRate(totalInvites, activeInvites),
    new Date().toISOString(),
    userId
  )
}

function recalcAllInviterSummaries() {
  const inviters = db.prepare(`SELECT DISTINCT inviter_user_id AS user_id FROM invite_bindings`).all().map((row) => row.user_id)
  inviters.forEach((userId) => recalcInviterSummary(userId))
}

function getInvitedUsers(userId) {
  return db.prepare(`
    SELECT
      b.invitee_user_id,
      b.invitee_name,
      b.created_at AS joined_at,
      COALESCE(SUM(r.recharge_amount), 0) AS total_recharge_amount,
      COALESCE(SUM(r.reward_amount), 0) AS total_reward_amount,
      COUNT(r.id) AS recharge_count
    FROM invite_bindings b
    LEFT JOIN invite_cashback_records r ON r.invitee_user_id = b.invitee_user_id AND r.inviter_user_id = b.inviter_user_id
    WHERE b.inviter_user_id = ?
    GROUP BY b.invitee_user_id, b.invitee_name, b.created_at
    ORDER BY datetime(b.created_at) DESC
  `).all(userId).map((row, index) => ({
    id: index + 1,
    inviteeName: row.invitee_name || row.invitee_user_id,
    inviteeUserId: row.invitee_user_id,
    joinedAt: row.joined_at,
    status: Number(row.recharge_count) > 0 ? 'active' : 'pending',
    totalRechargeAmount: Number(row.total_recharge_amount || 0),
    totalRewardAmount: Number(row.total_reward_amount || 0)
  }))
}

function getRewardRecords(userId) {
  return db.prepare(`
    SELECT id, invitee_name, order_no, stage_label, recharge_amount, reward_rate,
           reward_amount, credit_status, created_at
    FROM invite_cashback_records
    WHERE inviter_user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
  `).all(userId).map((row) => ({
    id: row.id,
    inviteeName: row.invitee_name,
    orderNo: row.order_no,
    stageLabel: row.stage_label,
    rechargeAmount: Number(row.recharge_amount || 0),
    rewardRate: Number(row.reward_rate || 0),
    rewardAmount: Number(row.reward_amount || 0),
    rewardStatus: 'credited',
    creditedTo: '系统余额',
    createdAt: row.created_at
  }))
}

function mapDashboard(row, invitedUsers, rewardRecords, rewardStages, qrCodeDataUrl) {
  return {
    inviteCode: row.invite_code,
    inviteLink: row.invite_link,
    qrCodeDataUrl,
    stats: {
      totalInvites: row.total_invites,
      activeInvites: row.active_invites,
      totalRechargeAmount: Number(row.total_recharge_amount || 0),
      totalRewardAmount: Number(row.total_reward_amount || 0),
      settledRewardAmount: Number(row.total_reward_amount || 0),
      balanceRewardAmount: Number(row.balance_reward_amount || 0),
      conversionRate: Number(row.conversion_rate || 0)
    },
    invitedUsers,
    rewardRecords,
    rewardStages,
    announcements: parseJsonField(row.announcements_json),
    sourceMode: row.source_mode
  }
}

async function sub2apiRequest(path, options = {}) {
  if (!adminApiBase || !adminApiToken) throw new Error('SUB2API_ADMIN_BASE_URL or SUB2API_ADMIN_TOKEN is missing')
  const response = await fetch(`${adminApiBase.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'x-api-key': adminApiToken,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) throw new Error(`sub2api admin api error: ${response.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}

async function addBalanceToSub2apiUser(userId, amount, note, idempotencyKey) {
  if (!autoCreditEnabled) return { skipped: true, reason: 'SUB2API_AUTO_CREDIT is disabled' }
  const redeemCode = `invite_${String(userId)}_${idempotencyKey}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96)
  return sub2apiRequest('/api/v1/admin/redeem-codes/create-and-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ code: redeemCode, type: 'balance', value: Number(amount.toFixed(2)), user_id: Number(userId), notes: note })
  })
}

function bindInviteRelation(inviterUserId, inviteeUserId, inviteeName = '') {
  const inviter = getUserRow(inviterUserId)
  if (!inviter) throw new Error('inviter not found')
  ensureUserBase({ userId: inviteeUserId, nickname: inviteeName || inviteeUserId })
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO invite_bindings (inviter_user_id, inviter_code, invitee_user_id, invitee_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(invitee_user_id) DO UPDATE SET
      inviter_user_id=excluded.inviter_user_id,
      inviter_code=excluded.inviter_code,
      invitee_name=excluded.invitee_name,
      status='active',
      updated_at=excluded.updated_at
  `).run(inviterUserId, inviter.invite_code, inviteeUserId, inviteeName || inviteeUserId, now, now)

  db.prepare(`UPDATE invite_users SET invited_by_user_id = ?, invited_by_code = ?, updated_at = ? WHERE user_id = ?`).run(
    inviterUserId,
    inviter.invite_code,
    now,
    inviteeUserId
  )
  recalcInviterSummary(inviterUserId)
}

async function processRechargeCallback({ orderNo, inviteeUserId, rechargeAmount, paidAt, source = 'callback' }) {
  const binding = db.prepare(`SELECT * FROM invite_bindings WHERE invitee_user_id = ? AND status = 'active'`).get(inviteeUserId)
  if (!binding) {
    db.prepare(`INSERT OR IGNORE INTO recharge_orders (order_no, invitee_user_id, recharge_amount, paid_at, source, status) VALUES (?, ?, ?, ?, ?, 'paid')`).run(
      orderNo,
      inviteeUserId,
      rechargeAmount,
      paidAt,
      source
    )
    return { skipped: true, reason: 'invite binding not found' }
  }

  const existing = db.prepare(`SELECT * FROM invite_cashback_records WHERE order_no = ?`).get(orderNo)
  if (existing) return { duplicated: true, recordId: existing.id }

  const paidCountRow = db.prepare(`SELECT COUNT(*) AS count FROM recharge_orders WHERE invitee_user_id = ?`).get(inviteeUserId)
  const nthRecharge = Number(paidCountRow?.count || 0) + 1
  const stage = getEnabledStageForNthRecharge(nthRecharge)
  if (!stage) return { skipped: true, reason: 'reward stage not configured' }

  db.prepare(`INSERT INTO recharge_orders (order_no, invitee_user_id, recharge_amount, paid_at, source, status) VALUES (?, ?, ?, ?, ?, 'paid')`).run(
    orderNo,
    inviteeUserId,
    rechargeAmount,
    paidAt,
    source
  )

  const rewardAmount = Number((Number(rechargeAmount) * Number(stage.rate || 0)).toFixed(2))
  const idempotencyKey = `invite-credit-${binding.inviter_user_id}-${orderNo}`
  const note = `invite cashback order:${orderNo} invitee:${inviteeUserId} stage:${stage.stageType}`
  let externalResult = null
  let creditStatus = 'pending'

  try {
    externalResult = await addBalanceToSub2apiUser(binding.inviter_user_id, rewardAmount, note, idempotencyKey)
    creditStatus = externalResult?.skipped ? 'pending' : 'credited'
  } catch (error) {
    externalResult = { error: error.message }
    creditStatus = 'failed'
  }

  const invitee = getUserRow(inviteeUserId)
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO invite_cashback_records (
      order_no, inviter_user_id, invitee_user_id, invitee_name, stage_key, stage_label,
      recharge_amount, reward_rate, reward_amount, credit_status, credit_target,
      idempotency_key, external_result_json, credited_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_balance', ?, ?, ?, ?, ?)
  `).run(
    orderNo,
    binding.inviter_user_id,
    inviteeUserId,
    binding.invitee_name || invitee?.nickname || inviteeUserId,
    stage.stageType,
    stage.label,
    Number(rechargeAmount),
    Number(stage.rate),
    rewardAmount,
    creditStatus,
    idempotencyKey,
    JSON.stringify(externalResult),
    creditStatus === 'credited' ? now : null,
    paidAt || now,
    now
  )

  recalcInviterSummary(binding.inviter_user_id)
  return { success: true, credited: creditStatus === 'credited', rewardAmount, stage: stage.stageType }
}

function seedDefaultStagesIfNeeded() {
  const count = db.prepare(`SELECT COUNT(*) AS count FROM reward_stages`).get()
  if (Number(count?.count || 0) > 0) return
  const now = new Date().toISOString()
  const rows = [
    [1, 'first_recharge', '首充返现', 0.1, 1],
    [2, 'second_recharge', '二充返现', 0.08, 1],
    [3, 'third_recharge', '三充返现', 0.06, 1],
    [4, 'repeat_recharge', '后续续充返现', 0.05, 1]
  ]
  const stmt = db.prepare(`INSERT INTO reward_stages (level, stage_key, label, rate, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  rows.forEach((row) => stmt.run(...row, now, now))
}

seedDefaultStagesIfNeeded()
ensureUserBase({ userId: 'user_demo_001', nickname: 'God SAMA', inviteCode: 'GODSAMA88' })
ensureUserBase({ userId: 'user_demo_002', nickname: 'Alpha', inviteCode: 'ALPHA1024' })

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', dbPath: getDbPath(), sourceMode, autoCreditEnabled, adminApiBase: adminApiBase || null } })
})

app.get('/api/invite/dashboard', async (req, res) => {
  try {
    const userId = String(req.query.userId || req.query.user_id || 'user_demo_001')
    const row = ensureUserBase({ userId })
    recalcInviterSummary(userId)
    const fresh = getUserRow(userId)
    const invitedUsers = getInvitedUsers(userId)
    const rewardRecords = getRewardRecords(userId)
    const rewardStages = getRewardStages()
    const qrCodeDataUrl = await buildQrCodeDataUrl(fresh.invite_link)
    res.json({ success: true, data: mapDashboard(fresh, invitedUsers, rewardRecords, rewardStages, qrCodeDataUrl) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/admin/dashboard', (_req, res) => {
  recalcAllInviterSummaries()
  const users = db.prepare(`
    SELECT user_id, nickname, invite_code, total_invites, active_invites, total_recharge_amount,
           total_reward_amount, balance_reward_amount, updated_at
    FROM invite_users
    WHERE total_invites > 0 OR total_reward_amount > 0
    ORDER BY total_reward_amount DESC, updated_at DESC
  `).all()

  const summary = db.prepare(`
    SELECT COUNT(*) AS total_users,
           COALESCE(SUM(total_invites), 0) AS total_invites,
           COALESCE(SUM(total_recharge_amount), 0) AS total_recharge_amount,
           COALESCE(SUM(total_reward_amount), 0) AS total_reward_amount,
           COALESCE(SUM(balance_reward_amount), 0) AS balance_reward_amount
    FROM invite_users
    WHERE total_invites > 0 OR total_reward_amount > 0
  `).get()

  const syncState = db.prepare('SELECT * FROM sync_state WHERE id = 1').get()

  res.json({
    success: true,
    data: {
      summary: {
        totalUsers: Number(summary.total_users || 0),
        totalInvites: Number(summary.total_invites || 0),
        totalRechargeAmount: Number(summary.total_recharge_amount || 0),
        totalRewardAmount: Number(summary.total_reward_amount || 0),
        balanceRewardAmount: Number(summary.balance_reward_amount || 0)
      },
      users: users.map((item) => ({
        userId: item.user_id,
        nickname: item.nickname,
        inviteCode: item.invite_code,
        totalInvites: item.total_invites,
        activeInvites: item.active_invites,
        totalRechargeAmount: Number(item.total_recharge_amount || 0),
        totalRewardAmount: Number(item.total_reward_amount || 0),
        balanceRewardAmount: Number(item.balance_reward_amount || 0),
        updatedAt: item.updated_at
      })),
      rewardStages: getRewardStages(),
      sync: {
        enabled: true,
        mode: sourceMode,
        baseUrl: adminApiBase || undefined,
        lastSyncAt: syncState?.last_sync_at || null
      }
    }
  })
})

app.put('/api/admin/reward-stages', (req, res) => {
  const stages = Array.isArray(req.body?.stages) ? req.body.stages : []
  if (!stages.length) return res.status(400).json({ success: false, message: 'stages is required' })
  const now = new Date().toISOString()
  const upsert = db.prepare(`
    INSERT INTO reward_stages (id, level, stage_key, label, rate, enabled, created_at, updated_at)
    VALUES (@id, @level, @stageKey, @label, @rate, @enabled, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      level=excluded.level,
      stage_key=excluded.stage_key,
      label=excluded.label,
      rate=excluded.rate,
      enabled=excluded.enabled,
      updated_at=excluded.updated_at
  `)
  const tx = db.transaction(() => {
    stages.forEach((stage) => {
      upsert.run({
        id: stage.id,
        level: Number(stage.level || 0),
        stageKey: stage.stageType,
        label: stage.label,
        rate: Math.max(0, Number(stage.rate || 0)),
        enabled: stage.enabled ? 1 : 0,
        createdAt: now,
        updatedAt: now
      })
    })
  })
  tx()
  res.json({ success: true, data: { rewardStages: getRewardStages() } })
})

app.post('/api/invite/bind', (req, res) => {
  try {
    const inviterUserId = String(req.body?.inviterUserId || '')
    const inviteeUserId = String(req.body?.inviteeUserId || '')
    const inviteeName = String(req.body?.inviteeName || inviteeUserId)
    if (!inviterUserId || !inviteeUserId) return res.status(400).json({ success: false, message: 'inviterUserId and inviteeUserId are required' })
    bindInviteRelation(inviterUserId, inviteeUserId, inviteeName)
    res.json({ success: true, message: 'invite binding saved' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/invite/recharge-callback', async (req, res) => {
  try {
    const orderNo = String(req.body?.orderNo || '')
    const inviteeUserId = String(req.body?.inviteeUserId || '')
    const rechargeAmount = Number(req.body?.rechargeAmount || 0)
    const paidAt = String(req.body?.paidAt || new Date().toISOString())
    const source = String(req.body?.source || 'callback')
    if (!orderNo || !inviteeUserId || rechargeAmount <= 0) {
      return res.status(400).json({ success: false, message: 'orderNo, inviteeUserId and rechargeAmount are required' })
    }
    const result = await processRechargeCallback({ orderNo, inviteeUserId, rechargeAmount, paidAt, source })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/admin/sync/user', async (req, res) => {
  const userId = String(req.body?.userId || '')
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required' })
  ensureUserBase({ userId, source: 'sub2api' })
  res.json({ success: true, message: `synced ${userId}` })
})

app.post('/api/admin/credit-balance', async (req, res) => {
  const userId = String(req.body?.userId || '')
  const amount = Number(req.body?.amount || 0)
  const note = String(req.body?.note || 'invite cashback credit')
  const idempotencyKey = String(req.body?.idempotencyKey || `invite-credit-${userId}-${amount}-${Date.now()}`)
  if (!userId || amount <= 0) return res.status(400).json({ success: false, message: 'userId and positive amount are required' })
  try {
    const result = await addBalanceToSub2apiUser(userId, amount, note, idempotencyKey)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.listen(port, () => {
  console.log(`Invite server listening on http://0.0.0.0:${port}`)
})
