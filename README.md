# MiniShop 综合电商平台测试 Demo

MiniShop 是一个轻量级综合电商平台，作为 **WHartTest**（AI 测试管理与执行平台）的真实被测系统（SUT）。

覆盖完整业务闭环：注册登录 → 浏览/搜索/筛选商品 → 商品详情与规格(SKU) → 购物车 → 地址与优惠券 → 下单 → 模拟支付 → 管理端发货 → 物流 → 确认收货 → 评价，以及退款售后流程。

## 技术栈

| 层面 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + Ant Design 5 + React Router + Axios |
| 后端 | Python + FastAPI + SQLAlchemy + Pydantic + JWT |
| 数据库 | SQLite（通过 Docker volume 持久化） |
| 部署 | Docker + Docker Compose + Nginx |

## 快速启动

```bash
docker compose up -d --build
```

启动后访问：

| 入口 | 地址 |
|---|---|
| 商城前台 | http://localhost:3000 |
| 管理后台 | http://localhost:3000/admin |
| Swagger API 文档 | http://localhost:8000/docs |

停止 / 查看日志：

```bash
docker compose down          # 停止
docker compose logs -f       # 查看日志
```

> 首次启动会自动创建数据库表并初始化种子数据（幂等，重复启动不会产生重复数据）。

## 预置账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 普通用户 | `user` | `123456` |
| 管理员 | `admin` | `admin123` |

## 核心功能

### 用户端
- 注册 / 登录 / 退出（JWT）
- 首页、商品分类、搜索、筛选（价格区间）、排序（销量/价格）
- 商品详情：多规格 SKU 选择、数量、加购、立即购买、收藏
- 购物车：数量修改、删除、库存校验、合并同 SKU
- 收货地址：增删改、默认地址（唯一）
- 优惠券：领券中心、我的优惠券（可用/已使用/已过期）、满减校验
- 下单：订单预览（服务端重新校验价格/库存/优惠券/地址）、创建订单
- 模拟支付：成功 / 失败两种结果、重复支付保护
- 我的订单：状态筛选、取消、去支付、确认收货、申请退款、评价
- 用户中心：个人信息、收藏、优惠券、评价、售后、站内消息

### 管理后台（需管理员权限）
- Dashboard：用户/商品/订单/销售金额/退款金额/库存预警等统计
- 用户管理：查询、禁用/恢复
- 商品管理：新增/编辑/删除/上下架、SKU 规格维护
- 分类管理、库存管理（调增/调减、库存日志）
- 订单管理：详情、发货（物流公司+运单号）
- 优惠券管理、售后管理（同意/拒绝）、评价管理

## 数据模型

包含以下表：`users`、`categories`、`products`、`product_skus`、`carts`、`addresses`、`favorites`、`coupons`、`user_coupons`、`orders`、`order_items`、`payments`、`shipments`、`refunds`、`reviews`、`messages`、`inventory_logs`、`operation_logs`。

数据库文件位于 `data/minishop.db`（Docker volume 挂载，重启后数据保留）。

## 业务状态枚举

订单状态：`PENDING_PAYMENT`(待支付) → `PAID`(已支付) → `SHIPPED`(已发货) → `COMPLETED`(已完成)，另有 `CANCELLED`、`REFUNDING`、`REFUNDED`。

## 预置测试数据

### 商品
| 商品 | 价格 | 库存 | 用途 |
|---|---:|---:|---|
| iPhone 17 | 5999 | 20 | 正常购买 |
| 小米手机 | 2999 | 10 | 正常购买 |
| 华为平板 | 3999 | 5 | 正常购买 |
| MacBook | 8999 | 8 | 高价商品 |
| 机械键盘 | 399 | 50 | 普通商品 |
| 无线鼠标 | 199 | 0 | 售罄测试 |
| 蓝牙耳机 | 599 | 1 | 库存边界测试 |
| 运动鞋 | 499 | 多规格 | 8 个 SKU（黑/白×39-42） |
| 咖啡 | 59 | 100 | 低价商品 |

### 优惠券
- 新人满100减10（门槛 100，优惠 10）
- 满1000减100（门槛 1000，优惠 100）
- 满5000减500（门槛 5000，优惠 500）
- 满50减5（已过期，用于过期场景测试）

## 核心业务规则（已实现）

- 购物车：同 SKU 合并、数量 ≥1、不超过库存
- 下单：服务端重新校验商品上架、SKU 有效、库存充足、优惠券有效（门槛/过期/已用）、地址存在，价格以服务端为准
- 支付：金额来自服务端订单金额，客户端不能决定；已支付订单拒绝重复支付
- 仅待支付订单可取消；仅已支付/待发货可发货；仅已发货可确认收货；仅已完成可评价
- 退款：仅已支付后订单可申请，同一订单不能重复退款；拒绝必须填写原因；退款成功自动恢复库存
- 权限：普通用户访问管理 API 返回 403；用户不能查看/修改其他用户数据

## 本地开发

未安装 Docker 时，可分别启动后端与前端：

```bash
# 后端（默认端口 8000）
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 前端（默认端口 3000，/api 自动代理到 8000）
cd frontend
npm install
npm run dev
```

## 项目结构

```
Minishop/
├── frontend/          # React 前端（Vite + TS + AntD）
│   ├── src/
│   │   ├── api/       # Axios 请求封装
│   │   ├── components/
│   │   ├── layouts/   # 商城/后台布局
│   │   ├── pages/     # 各页面
│   │   ├── router/    # 路由
│   │   ├── store/     # 登录态
│   │   └── types/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── api/       # 路由
│   │   ├── models/    # SQLAlchemy 模型
│   │   ├── schemas/   # Pydantic 模型
│   │   ├── services/
│   │   ├── auth/      # JWT/权限
│   │   ├── database/  # 数据库
│   │   └── seed/      # 种子数据（幂等）
│   ├── requirements.txt
│   └── Dockerfile
├── nginx/            # 反代配置参考
├── data/             # SQLite 数据（volume）
├── docker-compose.yml
└── README.md
```

## API 文档

启动后访问 http://localhost:8000/docs 查看 Swagger UI，核心 API 前缀为 `/api`，认证使用 `Authorization: Bearer <token>`。