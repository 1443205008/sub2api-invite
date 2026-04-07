# sub2api-invite-page

独立部署的 `sub2api` 邀请返利嵌入页，包含：

- Vue 3 + Vite 前端
- Node.js + Express + SQLite 后端
- Docker Compose 一键部署
- 与 `sub2api` 自定义嵌入页参数兼容

## 当前状态

当前版本已经不是纯 mock 前端，而是一个**前后端完整可运行版本**：

- 前端页面展示邀请返利仪表盘
- 后端提供真实 HTTP API
- SQLite 持久化存储邀请用户、返利记录
- 自动初始化数据库和示例种子数据
- 可直接用 Docker Compose 启动

## 项目结构

```text
.
├── src/                 # Vue 前端
├── server/
│   ├── src/
│   │   ├── db.js        # SQLite 初始化
│   │   ├── seed.js      # 种子数据
│   │   └── index.js     # Express API
│   └── Dockerfile
├── docker/
│   └── nginx.conf
├── Dockerfile           # 前端生产镜像
└── docker-compose.yml
```

## API

### 健康检查

```http
GET /api/health
```

返回示例：

```json
{
  "success": true,
  "service": "sub2api-invite-server",
  "dbPath": "/app/data/invite.db"
}
```

### 邀请返利首页数据

```http
GET /api/invite/dashboard
```

支持 query 参数：

- `user_id`
- `token`
- `theme`
- `lang`
- `ui_mode`
- `source`
- `src_host`（兼容保留）

请求示例：

```text
/api/invite/dashboard?user_id=10001&token=demo-token-10001&theme=dark&lang=zh&ui_mode=embedded&source=https://your-sub2api.example.com
```

## 数据库

当前使用 SQLite，数据文件位置：

```text
server/data/invite.db
```

表：

- `users`
- `invite_records`
- `reward_records`

### 当前后端逻辑

- 如果 `user_id` 已存在：返回该用户邀请返利数据
- 如果 `user_id` 不存在：自动创建一个演示用户
- 如果传了 `token` 且与库内 token 不一致：返回 `401`

这意味着你已经有了一个很容易继续升级的最小真后端。

## 本地开发

### 1. 前端

```bash
npm install
npm run dev
```

### 2. 后端

```bash
cd server
npm install
npm run seed
npm run dev
```

默认端口：

- 前端：`4177`
- 后端：`8080`

## Docker Compose 部署

项目根目录执行：

```bash
docker compose up -d --build
```

启动后：

- 前端：`http://localhost:4177`
- 后端健康检查：`http://localhost:8080/api/health`

### 数据持久化

Compose 已挂载 volume：

- `invite_data:/app/data`

因此容器重建后 SQLite 数据仍会保留。

## 与 sub2api 集成方式

推荐使用你之前定下来的方式：**像支付系统一样走外部嵌入页**。

### 接入步骤

1. 部署本项目到独立域名
2. 在 `sub2api` 后台添加用户自定义页面
3. URL 填你部署后的前端地址
4. `sub2api` 会在 iframe 地址后自动附加用户参数
5. 本项目读取 query 参数并请求自己的后端 API

### 示例嵌入 URL

```text
https://invite.example.com/?user_id=10001&token=demo-token-10001&theme=dark&lang=zh&ui_mode=embedded&source=https://sub2api.example.com
```

## 后续接真实业务建议

你下一步如果要继续做正式生产版，优先级建议是：

1. 把 `user_id + token` 改成真实签名校验
2. 接 MySQL / PostgreSQL
3. 对接主站订单表与用户表
4. 加返佣规则配置
5. 增加提现申请 / 审核流程
6. 增加管理后台

## 我已经替你做好的部分

- 前端从 mock 改为真实请求后端
- Express API 已打通
- SQLite 已落地
- 种子数据已提供
- Docker Compose 已可用
- README 已补齐

如果你要，我下一步还可以继续把这套后端直接升级成：

- MySQL 版
- 带管理员接口版
- 带登录签名校验版
- 可提现版
