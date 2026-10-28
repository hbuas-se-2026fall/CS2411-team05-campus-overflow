# 系统架构总览（Architecture Overview）

> 精简架构视图，供快速理解系统全貌。详细决策见 docs/adr/，领域建模见 docs/ddd/。

## 1. 系统定位

大学校园版 Stack Overflow：面向师生提供「提问 / 回答 / 采纳 / 评论」的问答闭环，并叠加教师认证、声誉激励（积分 / 徽章 / 悬赏）与内容发现（检索 / 推荐 / 通知）。

## 2. 总体形态

采用**模块化单体 + 六边形分层**（ADR-001）：一个可部署单元内划分四个限界上下文；跨上下文只能依赖对方 `*-api` 发布语言或订阅领域事件，数据库按表名前缀隔离，禁止跨前缀 JOIN。

## 3. 模块划分（多模块 Maven，ADR-010）

| 模块 | 职责 |
|------|------|
| `co-bootstrap` | 唯一启动入口，装配全部模块、加载配置 |
| `co-shared-kernel` | 共享内核：领域异常、Guard、事件基建、分页、审计 |
| `co-identity` | 身份与认证上下文（用户、课程、教师认证） |
| `co-qa` | 问答上下文（问题、回答、投票、评论、标签） |
| `co-reputation` | 声誉上下文（积分账本、徽章、悬赏） |
| `co-discovery` | 发现上下文（检索、推荐、通知） |

每个业务上下文内按五层分包：`api / domain / application / infrastructure / interfaces`。

## 4. 关键机制（对应 ADR）

| 机制 | 说明 | ADR |
|------|------|:--:|
| 事务性发件箱 | 跨上下文事件同事务落库、可靠投递、消费端幂等 | 002 |
| 服务端会话 | Spring Session + Redis，可即时封禁 | 003 |
| 声誉只追加账本 + 对账 | 可追溯、幂等、每日对账 | 004 |
| 中文全文检索 | MySQL ngram 全文索引 | 005 |
| 软删除 | 内容可追溯、引用完整 | 006 |
| 契约优先 | 前后端以 OpenAPI 契约协作 | 007 |
| 领域与持久化分离 | 领域纯 Java，JPA 适配器承接 | 008 |
| 声誉规则集中 + 事件联动 | 规则收敛为 ReputationRulebook | 009 |
| 覆盖率门禁渐进提升 | 领域层覆盖率门禁 0 → 0.70 | 011 |

## 5. 前端形态

Vite + React + TypeScript + antd + TanStack Query + react-router。`baseURL=/api`，接口类型由 OpenAPI 契约生成；页面按功能分区（pages / features / shared/components）。

## 6. 部署拓扑

`docker-compose` 编排：`backend`（Spring Boot 应用）、`mysql`（MySQL 8）、`redis`（Spring Session 会话存储）。
