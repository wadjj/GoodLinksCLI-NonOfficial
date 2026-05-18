# GoodLinks CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 维护一个小型、公开安全的 GoodLinks 本地 API CLI，让 agent 能快速、准确、完整地检索、读取、整理、增删内容。

**Architecture:** CLI 是 `http://localhost:9428/api/v1` 之上的薄封装。命令解析、配置、HTTP client、输出格式、读写命令各自独立，后续 MCP 可以复用同一套 core behavior。

**Tech Stack:** Node.js 20+、TypeScript、内置 `fetch`、内置 `node:test`、尽量零 runtime dependencies。

---

## 当前状态

本计划已经从“开工前设计稿”更新为“项目基线与后续路线图”。

已完成：

- Git repo 已初始化，并已推送到公开仓库。
- 已合并远端 `LICENSE`，当前许可为 Apache-2.0。
- 已实现 TypeScript/Node 20 CLI scaffold、build、test。
- 已实现 token 配置：`GOODLINKS_API_TOKEN`、`~/.config/goodlinks-cli/config.json`、`goodlinks config set-token` 交互式输入。
- 已实现读命令：`doctor`、`tags`、`list`、`search`、`get`、`content`。
- 已实现写命令：`add`、`edit`、`delete`，其中删除默认 dry-run，真实删除必须显式 `--yes`。
- 已实现 highlights 命令：`highlights search`、`highlights note`、`highlights export`。
- 已确认 `content` 和 `get --with-content` 默认不截断；只有显式 `--max-chars` 才截断。
- 已安装本地 Codex Skill，并把草稿保存在 `docs/goodlinks-skill-draft.md`。
- 已做真实 GoodLinks smoke test：只读命令、一次 disposable link 新增/编辑/dry-run 删除/真实删除。
- 已做公开仓库安全审计：未发现真实 token、私有导出、用户本地绝对路径；`Personal/` 已被忽略。

当前已知约束：

- GoodLinks API 的 `summary` 是可编辑链接描述，不是 GoodLinks GUI 里的 AI Summary。
- 当前公开 API 没有暴露 GoodLinks AI Summary，也没有触发批量生成 AI Summary 的端点。
- 官方 API 没有看到自定义 list/folder 的创建或编辑能力，v1 的组织能力以 tag 和内置 list 为核心。
- 资料库未来可能增长 10-20 倍，所以分页和统计能力要补齐。

## 设计原则

1. 典型场景优先快、准、全。
2. 省 token 是重要原则，但不牺牲检索准确性。
3. `list` / `search` 默认只返回紧凑 metadata。
4. 需要判断文章内容时，优先读取候选文章完整正文；`--max-chars` 只用于预览、批量维护或明确控制输出。
5. 所有读命令默认 JSON，方便 agent 消费；`--table` 给人类临时查看。
6. CLI 不内置 AI summarization；总结、分类判断由外部 agent 完成。
7. 删除、覆盖全部标签等高风险操作保留显式 opt-in。
8. 公开仓库不能包含 token、私有文章导出、个人笔记、用户本地绝对路径。

## PR 拆分

### PR 1: Public Docs and Plan Refresh

**目标：** 让公开仓库首页和计划文档准确反映当前项目状态，并把隐私、安全、安装、验证路径讲清楚。

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-18-goodlinks-cli.md`

**Steps:**

- [ ] 在 README 顶部加入 unofficial disclaimer，说明本项目不是 GoodLinks 官方项目。
- [ ] 补充 Apache-2.0 license 说明。
- [ ] 补充从 GitHub clone、安装、build、`npm link` 的完整路径。
- [ ] 补充 token 安全说明：推荐交互式输入，`--token` 可能进入 shell history。
- [ ] 补充公开仓库边界：不要提交 config、token、私有导出、`Personal/`。
- [ ] 补充 smoke checklist：build/test、doctor、list、disposable link 写入/删除。
- [ ] 更新本计划，删除“尚未实现”的过期表述。
- [ ] Run: `npm test`。
- [ ] Commit: `docs: refresh public project plan`。

**Acceptance:**

- 新读者能从 README 完成本地安装和 token 配置。
- 文档不包含真实 token、私有数据或用户本地绝对路径。
- 计划文档能解释当前实现状态和下一步 PR。

### PR 2: Pagination and Library Stats

**目标：** 支持未来 10-20 倍资料库规模下的完整 metadata 遍历，并提供不输出全文的资料库统计能力。

**Files:**

- Modify: `src/cli.ts`
- Modify: `src/commands/read.ts`
- Modify: `src/goodlinks-client.ts` if query types need widening
- Modify: `README.md`
- Modify: `docs/cli-spec.md`
- Modify: `docs/superpowers/plans/2026-05-18-goodlinks-cli.md`
- Test: `test/commands-read.test.mjs`
- Test: `test/cli.test.mjs`

**Steps:**

- [ ] 写 `runListCommand` 的 failing test：`allPages: true` 时按 `limit` / `offset` 连续读取，直到 `hasMore` 为 false。
- [ ] 写 `runSearchCommand` 的 failing test：搜索同样支持 `allPages: true`。
- [ ] 实现 shared pagination helper，默认 `limit=20`，`--all-pages` 未开启时保持现有单页行为。
- [ ] 在 `src/cli.ts` 把 `--all-pages` 传给 `list` 和 `search`。
- [ ] 写 `runStatsCommand` 的 failing test：只用 metadata 统计 total、wordCount 分布、missing wordCount、tag counts、read/starred/highlighted counts。
- [ ] 实现 `goodlinks stats`，默认通过 `search --all-pages` 风格遍历 metadata，不读取正文。
- [ ] 在 help、README、CLI spec 中补充 `--all-pages` 和 `stats`。
- [ ] Run: `npm test`。
- [ ] 如可用，再运行真实 smoke：`goodlinks stats` 和一个小 limit 的 `list --all-pages`。
- [ ] Commit: `feat: add pagination and stats`。

**Acceptance:**

- `goodlinks list all --all-pages --fields id,title,wordCount` 能遍历所有 metadata。
- `goodlinks search "keyword" --all-pages` 能返回完整候选集合，而不是只返回第一页。
- `goodlinks stats` 不输出正文，也不触发正文下载。
- 统计能力足够支持“先看库里文章长短分布，再决定读取策略”的 agent 工作流。

## 未来路线

后续再考虑：

- `goodlinks open <id-or-url>`：输出或打开原文链接，方便人类核查。
- MCP wrapper：当 CLI 语义稳定后，把 `search/list/get/content/add/edit/delete/highlights/stats` 包成 MCP tools。
- Keychain token storage：如果 CLI 成为长期基础设施，再替代 config file token。
- 更强的 tag maintenance：例如找出未整理、重复 tag、过期 `inbox`，但批量修改必须保留人工确认。

## 风险

- `--all-pages` 可能在库很大时产生大量 metadata 输出；默认不开启。
- `stats` 只能基于 API 返回的 metadata，`wordCount` 缺失的文章无法靠不读正文自动补齐。
- GoodLinks `POST /links` 可能新建也可能更新已有 URL，create/update 状态不一定可靠。
- `summary` 最大 400 字符，且不是 AI Summary；自动维护摘要时必须避免误覆盖用户已有描述。
