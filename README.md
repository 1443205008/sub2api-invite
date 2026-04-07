# sub2api-invite-page

独立部署的 `sub2api` 邀请充值返利外部服务，包含：

- Vue 3 + Vite 前端
- Node.js + Express + SQLite 后端
- 与 `sub2api` 自定义嵌入页参数兼容
- 不修改主站业务代码
- 通过主站管理员 API 发放返现到用户系统余额

## 当前状态

当前版本已经不是纯 mock 前端，而是一个**前后端完整可运行的外部返利服务**：

- 前端页面展示邀请返利仪表盘
- 后端提供真实 HTTP API
- SQLite 持久化存储邀请关系、充值订单、返现记录、返现规则
- 支持独立维护 inviter → invitee 关系
- 支持接收充值成功回调并自动计算返现
- 支持通过 sub2api 管理员接口把返现发到主站用户余额
- 可直接用 Docker Compose 启动

## 适用场景

适合你当前明确要求的路线：

- **不要改主站**
- 邀请返利系统像支付系统一样独立外挂
- 主站只提供：用户透传、管理员 API、余额能力

## 项目结构

```text
.
├── src/                 # Vue 前端
├── server/
│   ├── src/
│   │   ├── db.js        # SQLite 初始化
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

### 邀请返利首页数据

```http
GET /api/invite/dashboard
```

支持 query 参数：

- `userId`
- `user_id`
- `token`
- `theme`
- `lang`
- `mode`
- `source`
- `ui_mode`

### 邀请绑定

```http
POST /api/invite/bind
```

请求体：

```json
{
  "inviterUserId": "user_demo_001",
  "inviteeUserId": "invitee_real_001",
  "inviteeName": "测试邀请用户"
}
```

### 充值成功回调

```http
POST /api/invite/recharge-callback
```

请求体：

```json
{
  "orderNo": "ORDER-REAL-001",
  "inviteeUserId": "invitee_real_001",
  "rechargeAmount": 128,
  "paidAt": "2026-04-07T19:55:00+08:00",
  "source": "payment-webhook"
}
```

处理逻辑：

1. 查 invitee 是否已绑定 inviter
2. 判断这是第几次有效充值
3. 按多阶段返现比例计算返利
4. 调用 sub2api 管理员接口发放余额
5. 写入返现记录和幂等信息

### 管理员后台数据

```http
GET /api/admin/dashboard
```

### 更新返现比例

```http
PUT /api/admin/reward-stages
```

### 手工发放余额（测试/补发）

```http
POST /api/admin/credit-balance
```

## 数据库

当前使用 SQLite，数据文件位置：

```text
server/data/invite.sqlite
```

核心表：

- `invite_users`
- `invite_bindings`
- `recharge_orders`
- `invite_cashback_records`
- `reward_stages`
- `sync_state`

## 对接 sub2api 主站真实接口

当前项目已经对齐主站文档：

- `GET /api/v1/admin/users/:id`
- `POST /api/v1/admin/redeem-codes/create-and-redeem`
- `POST /api/v1/admin/users/:id/balance`

其中**生产推荐路径**是：

- 自动返现优先走 `create-and-redeem`
- 类型使用 `balance`
- 这样天然具备幂等语义、账务留痕和主站已有余额流水能力

`/users/:id/balance` 更适合：

- 管理员手工补发
- 人工修正余额
- 排障临时操作

### 后端环境变量

```bash
SUB2API_ADMIN_BASE_URL=https://your-sub2api.example.com
SUB2API_ADMIN_TOKEN=admin-xxxxxxxx
SUB2API_AUTO_CREDIT=true
PUBLIC_BASE_URL=https://invite.example.com/
```

说明：

- `SUB2API_ADMIN_BASE_URL`：主站地址
- `SUB2API_ADMIN_TOKEN`：主站管理员 API Key（走 `x-api-key`）
- `SUB2API_AUTO_CREDIT=true`：允许本项目调用主站余额接口发放返现
- `PUBLIC_BASE_URL`：生成邀请链接时使用的外部页面地址

## 与 sub2api 集成方式

推荐方式：**像支付系统一样走外部嵌入页**。

### 接入步骤

1. 部署本项目到独立域名
2. 在 `sub2api` 后台添加用户自定义页面
3. URL 填你部署后的前端地址
4. `sub2api` 会在 iframe 地址后自动附加用户参数
5. 本项目读取 query 参数并请求自己的后端 API
6. 你的支付系统或订单系统在充值成功后，调用本项目的：
   - `POST /api/invite/recharge-callback`

### 主站透传参数兼容

`sub2api` 在 iframe / 自定义页面中会统一透传：

- `user_id`
- `token`
- `theme`
- `lang`
- `ui_mode=embedded`
- 以及页面来源追踪参数

本项目当前已兼容：

- `userId` / `user_id`
- `theme`
- `lang`
- `mode`
- `source`

## 本地开发

### 前端

```bash
npm install
npm run dev
```

### 后端

```bash
cd server
npm install
node src/index.js
```

默认端口：

- 前端：`4177`
- 后端：`8787`

## Docker Compose 部署

项目根目录执行：

```bash
docker compose up -d --build
```

## 当前后端逻辑

- 独立维护 inviter → invitee 邀请关系
- 独立接收充值回调
- 独立计算返现规则
- 独立记录返现明细
- 通过主站管理员 API 把返现金额发到 sub2api 用户系统余额

这意味着你已经有了一套**不改主站业务代码**也能跑的外部邀请返利服务。

## 下一步如果要继续生产化

优先级建议：

1. 给回调接口增加签名校验
2. 把支付系统 / 订单系统正式接到 `recharge-callback`
3. 增加失败重试和补偿任务
4. 增加管理员鉴权
5. 增加更细的对账与日志查询
