import express from 'express'
import cors from 'cors'
import { db, getDbPath } from './db.js'

const app = express()
const port = Number(process.env.PORT || 8080)
const host = process.env.HOST || '0.0.0.0'
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked: ${origin}`))
    },
  }),
)

app.use(express.json())

function buildInviteLink(source, inviteCode) {
  const base = source || 'https://example.com'
  return `${base.replace(/\/$/, '')}/#/register?invite_code=${inviteCode}`
}

function ensureDemoUser(userId, token) {
  const existed = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (existed) {
    return existed
  }

  const inviteCode = `S2A${userId.slice(-4).toUpperCase()}`
  const nickname = token ? `UID-${userId.slice(0, 8)}` : `访客-${userId}`
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')

  db.prepare(
    `INSERT INTO users (id, token, nickname, invite_code, rebate_rate, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, token || `token-${userId}`, nickname, inviteCode, 18, createdAt)

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
}

function getDashboard({ userId, token, source, lang, theme }) {
  const user = ensureDemoUser(userId, token)

  if (token && user.token !== token) {
    const error = new Error('invalid token')
    error.statusCode = 401
    throw error
  }

  const inviteRecords = db
    .prepare(
      `SELECT id, user_name AS userName, joined_at AS joinedAt, status, contribution
       FROM invite_records
       WHERE owner_user_id = ?
       ORDER BY joined_at DESC`
    )
    .all(user.id)

  const rewardRecords = db
    .prepare(
      `SELECT id, type, amount, status, created_at AS createdAt, note
       FROM reward_records
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`
    )
    .all(user.id)

  const totalInvites = inviteRecords.length
  const effectiveInvites = inviteRecords.filter((row) => row.status === 'effective').length
  const totalReward = rewardRecords.reduce((sum, row) => sum + Number(row.amount), 0)
  const pendingReward = rewardRecords
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount), 0)

  return {
    inviteCode: user.invite_code,
    inviteLink: buildInviteLink(source, user.invite_code),
    stats: {
      totalInvites,
      effectiveInvites,
      totalReward: Number(totalReward.toFixed(2)),
      pendingReward: Number(pendingReward.toFixed(2)),
    },
    inviteRecords,
    rewardRecords: rewardRecords.map((row) => ({
      ...row,
      note:
        row.note ||
        (lang.startsWith('zh')
          ? `当前为 ${theme} 主题展示。`
          : `Currently running in ${theme} theme.`),
    })),
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'sub2api-invite-server',
    dbPath: getDbPath(),
  })
})

app.get('/api/invite/dashboard', (req, res) => {
  try {
    const userId = String(req.query.user_id || '10001')
    const token = String(req.query.token || '')
    const source = String(req.query.source || req.query.src_host || 'https://example.com')
    const theme = String(req.query.theme || 'dark')
    const lang = String(req.query.lang || 'zh')

    const data = getDashboard({ userId, token, source, lang, theme })
    res.json({ success: true, data })
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'internal server error',
    })
  }
})

app.listen(port, host, () => {
  console.log(`sub2api-invite-server listening on http://${host}:${port}`)
  console.log(`database: ${getDbPath()}`)
})
