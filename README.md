# sub2api-invite-page

独立部署的 `sub2api` 邀请返利嵌入页，包含：

- Vue 3 + Vite 前端
- Node.js + Express 后端
- Docker Compose 一键部署
- 与 `sub2api` 自定义嵌入页参数兼容

## 功能

当前版本提供：

- 邀请返利首页 UI
- 支持读取 `sub2api` 传入的嵌入参数
- 后端 `GET /api/invite/dashboard` 接口
- 前端通过 `/api/...` 真实请求后端
- 可直接用 Docker Compose 部署

## 嵌入参数

与 `sub2api` 的 embedded custom page 机制保持兼容：

- `user_id`
- `token`
- `theme`
- `lang`
- `ui_mode`
- `src_host`
- `src_url`

示例：

```text
https://your-invite-site.example.com/?user_id=123&token=abc&theme=dark&lang=zh-CN&ui_mode=embedded&src_host=https://your-sub2api.example.com&src_url=https://your-sub2api.example.com/#/invite
```

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
npm run dev
```

默认：

- 前端开发端口：`4177`
- 后端端口：`8080`

## Docker Compose 部署

在项目根目录执行：

```bash
docker compose up -d --build
```

启动后：

- 前端：`http://localhost:4177`
- 后端：`http://localhost:8080/api/health`

## 生产部署建议

### 前端容器

- Nginx 提供静态文件
- `/api/` 自动反向代理到后端容器

### 后端容器

当前是 mock / reserved API 版本。
后续你只需要把 `server/src/index.js` 里的 `createDashboard()` 替换成：

- 查数据库
- 或调用 `sub2api` / 你的主业务服务
- 或接你自己的用户返佣系统

## 接入真实业务时建议的数据来源

建议后端最终接入以下能力：

- 用户信息校验：根据 `user_id + token` 做鉴权
- 邀请码查询
- 被邀请用户列表
- 返佣记录列表
- 待结算/已结算金额统计
- 提现记录（如果你后续要加）

## 与 sub2api 集成方式

你已经选的是“像支付系统一样做外部嵌入页”，所以推荐方式是：

1. 将本项目部署到独立域名
2. 在 `sub2api` 后台配置一个用户侧自定义页面
3. 页面 URL 指向本项目部署地址
4. `sub2api` 会自动在 iframe URL 上附加 embedded 参数
5. 本项目读取参数并请求自己的后端接口

## 后续可扩展

后续我可以继续帮你补：

- 登录鉴权签名校验
- MySQL / PostgreSQL 持久化
- 邀请链接复制与二维码生成
- 提现申请页面
- 多级分销规则配置
- 管理后台
