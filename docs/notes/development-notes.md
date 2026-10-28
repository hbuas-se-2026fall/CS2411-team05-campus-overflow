# 开发协作笔记（Development Notes）

> 供团队本地开发与协作参考，持续更新。详细决策见 docs/adr/，领域建模见 docs/ddd/。

## 1. 技术栈与环境要求

- **后端**：Java 17 + Maven 多模块（Spring Boot），模块见 docs/architecture/overview.md
- **前端**：Node + pnpm + React 18 + TypeScript + Vite + antd + TanStack Query + react-router
- **数据库**：MySQL 8（ngram 全文索引）+ Flyway 迁移
- **会话/缓存**：Redis（Spring Session 服务端会话，见 ADR-003）
- **契约**：springdoc OpenAPI 3（`/v3/api-docs`，UI 在 `/swagger-ui.html`，见 ADR-007）

## 2. 常用命令

### 后端
```bash
# 构建 + 测试（含架构约束检查）
mvn -B verify
# 运行应用
cd backend && mvn -pl co-bootstrap -am spring-boot:run
# 单元测试
mvn -B test
```

### 前端
```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发（默认 http://localhost:5173，/api 代理到后端）
pnpm typecheck    # 类型检查
pnpm build        # 生产构建
```

## 3. 协作约定

- **分支**：基于 develop 建 feature 分支，推回组织仓库，走 PR 合并到 develop，稳定后合 main（develop/main 已开分支保护）
- **提交**：Conventional Commits —— `feat|fix|docs|test（scope）: 中文简述（#Issue号）`
- **Issue / PR**：每个 Task 建 Issue，PR 关联 Issue；Reviewers 请求 PO / SM
- **CI**：合并前必须转绿；红灯 30 分钟内认领
- **git 身份**：本地 `user.name` / `user.email` 必须与各自 GitHub 绑定邮箱一致，保证 Insights 统计准确

## 4. 常见问题与解决

| 现象 | 原因 / 解决 |
|------|------|
| CI 架构约束失败 `SNAPSHOT NOT allowed from central` | `mvn -B -f backend/pom.xml test -pl co-bootstrap ...` 缺少 `-am`，去 central 拉本地 SNAPSHOT 被拒；补 `-am` |
| 提交作者不被 GitHub 认领 | 本地 `user.email` 与 GitHub 绑定邮箱不一致（或双 @ 笔误）；`git config user.email` 修正 |
| 前端本地报缺 node_modules / pnpm | 先 `pnpm install`；不要凭直觉声称 build 通过，以真实构建结果为准 |
| rebase 冲突（endpoints 等） | 保留两边都要的端点后再 `git add` + `rebase --continue`；非交互环境用 `GIT_EDITOR=true` 绕过编辑器 |
