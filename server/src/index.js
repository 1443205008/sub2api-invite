import express from 'express'
import cors from 'cors'

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

function createDashboard(query) {
  const userId = String(query.user_id || 'demo-user')
  const token = String(query.token || '')
  const source = String(query.source || query.src_host || 'https://example.com')
  const theme = String(query.theme || 'dark')
  const lang = String(query.lang || 'zh')

  const inviteCode = userId.slice(-6).toUpperCase().padStart(6, 'A')
  const inviteLink = `${source.replace(/\/$/, '')}/#/register?invite_code=${inviteCode}`
  const nickname = token ? `UID-${userId.slice(0, 8)}` : '演示用户'

  return {
    success: true,
    data: {
      inviteCode,
      inviteLink,
      stats: {
        totalInvites: 26,
        effectiveInvites: 13,
        totalReward: 1688.5,
        pendingReward: 286.3,
      },
      inviteRecords: [
        {
          id: 'inv-1001',
          userName: `${nickname}-A`,
          joinedAt: '2026-03-28 18:20:00',
          status: 'effective',
          contribution: 71.82,
        },
        {
          id: 'inv-1002',
          userName: `${nickname}-B`,
          joinedAt: '2026-03-30 09:12:00',
          status: 'pending',
          contribution: 17.82,
        },
        {
          id: 'inv-1003',
          userName: `${nickname}-C`,
          joinedAt: '2026-04-02 22:41:00',
          status: 'effective',
          contribution: 125.82,
        },
      ],
      rewardRecords: [
        {
          id: 'rew-2001',
          type: 'commission',
          amount: 71.82,
          status: 'settled',
          createdAt: '2026-03-29 10:00:00',
          note: '首单返利结算',
        },
        {
          id: 'rew-2002',
          type: 'bonus',
          amount: 17.82,
          status: 'pending',
          createdAt: '2026-03-31 10:00:00',
          note: '注册激活奖励待审核',
        },
        {
          id: 'rew-2003',
          type: 'commission',
          amount: 125.82,
          status: 'settled',
          createdAt: '2026-04-03 10:00:00',
          note:
            lang.startsWith('zh')
              ? `当前为 ${theme} 主题展示，后端接口已预留真实业务接入能力。`
              : `Currently running in ${theme} theme with backend integration ready.`,
        },
      ],
    },
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'sub2api-invite-server' })
})

app.get('/api/invite/dashboard', (req, res) => {
  res.json(createDashboard(req.query))
})

app.listen(port, host, () => {
  console.log(`sub2api-invite-server listening on http://${host}:${port}`)
})
