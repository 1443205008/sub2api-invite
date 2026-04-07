# sub2api-invite

一个 **不改主站业务代码** 的 `sub2api` 邀请充值返利外部服务。  
它可以像支付系统一样独立部署，通过 iframe / 自定义页面嵌入 `sub2api`，并在外部系统中完成：

- 邀请关系绑定
- 充值成功回调
- 多阶段返现比例计算
- 自动返现到 `sub2api` 用户系统余额
- 用户返现明细展示
- 管理员返利后台管理

---

## 适合什么场景

如果你想做一套邀请返利系统，但又**不想改 `sub2api` 主仓业务代码**，这个项目就是为这个场景准备的。

适合你这种路线：

- `sub2api` 主站保持不动
- 邀请返利系统独立部署
- 主站只负责：
  - 用户参数透传
  - 管理员 API
  - 用户余额能力
- 返利逻辑、邀请关系、返现明细、后台配置全部放在外部服务里维护

---

## 核心能力

### 用户侧
- 展示专属邀请码
- 展示邀请链接
- 生成邀请二维码
- 查看邀请用户列表
- 查看返现明细
- 查看累计邀请 / 累计充值 / 累计返现 / 当前返利余额

### 管理员侧
- 查看推广用户数据汇总
- 配置多阶段返现比例
- 手工绑定 inviter → invitee 关系
- 模拟充值回调
- 测试发放余额

### 后端能力
- 独立维护邀请关系
- 接收充值成功回调
- 按阶段规则计算返现
- 通过 `sub2api` 管理员 API 给用户余额发钱
- 落库保存订单、返现记录、返现规则
- 支持幂等处理

---

## 技术栈

- **Frontend**: Vue 3 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Deploy**: Docker Compose / Docker

---

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

---

## 快速开始

### 1. 前端开发

```bash
npm install
npm run dev
```

### 2. 后端开发

```bash
cd server
npm install
node src/index.js
```

默认端口：

- 前端：`4177`
- 后端：`8787`

---

## Docker Compose 部署

```bash
docker compose up -d --build
```

---

## 环境变量

后端可选环境变量：

```bash
SUB2API_ADMIN_BASE_URL=https://your-sub2api.example.com
SUB2API_ADMIN_TOKEN=admin-xxxxxxxx
SUB2API_AUTO_CREDIT=true
PUBLIC_BASE_URL=https://invite.example.com/
```

说明：

- `SUB2API_ADMIN_BASE_URL`：你的 `sub2api` 主站地址
- `SUB2API_ADMIN_TOKEN`：主站管理员 API Key（通过 `x-api-key` 调用）
- `SUB2API_AUTO_CREDIT=true`：允许自动调用主站接口发返现
- `PUBLIC_BASE_URL`：生成邀请链接时使用的外部页面地址

---

## 与 sub2api 的关系

本项目**不修改主站业务代码**。  
它通过 `sub2api` 已有能力完成闭环：

### 主站已有能力
- 自定义 iframe 页面 / 自定义菜单页面
- 用户参数透传
- 管理员 API
- 余额充值能力

### 本项目负责的事情
- inviter → invitee 关系维护
- 充值回调处理
- 多阶段返现规则
- 返现明细落库
- 调主站 API 把返现金额发给用户余额

---

## 嵌入参数兼容

`sub2api` 在 iframe / 自定义页面中通常会透传：

- `user_id`
- `token`
- `theme`
- `lang`
- `ui_mode=embedded`
- 来源页面参数

当前项目兼容：

- `userId` / `user_id`
- `theme`
- `lang`
- `mode`
- `source`
- `ui_mode`

---

## 主站 API 对接方式

本项目已对齐这些 `sub2api` 管理员接口：

- `GET /api/v1/admin/users/:id`
- `POST /api/v1/admin/redeem-codes/create-and-redeem`
- `POST /api/v1/admin/users/:id/balance`

### 生产推荐路径

返现发放推荐优先走：

```http
POST /api/v1/admin/redeem-codes/create-and-redeem
```

类型使用：

```json
{
  "type": "balance"
}
```

这样可以更好地复用主站已有的：

- 幂等能力
- 余额历史
- 账务留痕
- 对账能力

`/users/:id/balance` 更适合：

- 手工补发
- 人工修正余额
- 排障临时处理

---

## API 一览

## User API

### 获取邀请返利首页数据

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

---

## Binding API

### 保存邀请绑定关系

```http
POST /api/invite/bind
```

请求体示例：

```json
{
  "inviterUserId": "user_demo_001",
  "inviteeUserId": "invitee_real_001",
  "inviteeName": "测试邀请用户"
}
```

---

## Callback API

### 充值成功回调

```http
POST /api/invite/recharge-callback
```

请求体示例：

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
2. 判断第几次有效充值
3. 按多阶段返现比例计算返利
4. 调用 `sub2api` 管理员接口发放余额
5. 写入返现记录和幂等信息

---

## Admin API

### 获取后台汇总数据

```http
GET /api/admin/dashboard
```

### 更新返现比例

```http
PUT /api/admin/reward-stages
```

### 手工发放余额（补发/测试）

```http
POST /api/admin/credit-balance
```

---

## 数据存储

SQLite 数据文件：

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

---

## 当前业务闭环

当前版本已经可以做到：

- 独立维护 inviter → invitee 关系
- 独立接收充值回调
- 独立计算返现规则
- 独立保存返现明细
- 独立配置返现比例
- 调主站管理员 API 把返现金额发到 `sub2api` 用户系统余额

也就是说，**在不改主站业务代码的前提下，已经可以跑完整外部邀请返利链路**。

---

## 下一步建议

如果要继续生产化，建议优先做：

1. 给充值回调增加签名校验
2. 给管理员接口增加鉴权
3. 将真实支付系统 / 订单系统正式接到 `/api/invite/recharge-callback`
4. 增加失败重试与补偿任务
5. 增加更细的对账与日志查询

---

## License

如需开源发布，建议补充许可证文件（当前仓库请按你的实际需求决定）。
