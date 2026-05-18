# GoodLinks CLI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 构建一个小型本地 CLI，让 agent 能通过 GoodLinks 本地 API 高效管理 links、tags、正文和 highlights。

**架构：** CLI 是 `http://localhost:9428/api/v1` 之上的薄封装。代码分为命令解析、配置解析、HTTP transport、输出格式化、GoodLinks 资源操作几个边界清晰的模块；这样后续如果做 MCP，可以复用同一套 core functions。

**技术栈：** Node.js 20+、TypeScript、内置 `fetch`、内置 `node:test`、尽量零 runtime dependencies。

---

## 当前状态

- 已初始化 Git repo。
- 尚未编写任何应用实现代码。
- 本计划故意停在设计阶段，等待设计问题确认后再开工。

## 已确认设计决策

- v1 使用 TypeScript/Node 20。
- 尽量零 runtime dependencies。
- token 支持 `GOODLINKS_API_TOKEN` 和 `~/.config/goodlinks-cli/config.json`。
- `goodlinks config set-token` 必须支持交互式输入 token，并且不回显输入内容。
- config file 保存 token 时使用 `0600` 权限；macOS Keychain 放到后续版本。
- 默认输出面向 agent：读命令默认 JSON，`--table` 给人类临时查看。
- v1 只做通用命令，不做 `goodlinks summarize` 这类内置 AI 命令。
- 删除默认 dry-run，必须显式 `--yes` 才真正删除。
- 删除只要求 `--yes`，不做额外交互式二次确认。
- `content` 默认 `autoDownload=true`，需要速度或无副作用时可显式传 `--auto-download=false`。
- tag conventions 作为 README/Skill 推荐习惯，不在 CLI 代码中硬编码。

## 计划文件结构

后续预计创建或修改：

- `package.json`：package metadata、bin mapping、scripts。
- `tsconfig.json`：TypeScript compiler settings。
- `.gitignore`：忽略 `dist`、`node_modules`、coverage、本地 env 文件。
- `README.md`：安装、配置和命令示例。
- `docs/cli-spec.md`：产品与命令规格。
- `docs/superpowers/plans/2026-05-18-goodlinks-cli.md`：本实现计划。
- `src/cli.ts`：entrypoint 和顶层 command dispatch。
- `src/config.ts`：config file/env/flag 解析和 token redaction。
- `src/goodlinks-client.ts`：typed API client 和 URL/query 构造。
- `src/output.ts`：JSON/table/markdown 格式化和正文截断。
- `src/errors.ts`：typed errors 和 exit-code mapping。
- `src/commands/doctor.ts`：API 健康检查。
- `src/commands/config.ts`：配置命令。
- `src/commands/list.ts`：内置 list 读取。
- `src/commands/search.ts`：资料库搜索。
- `src/commands/get.ts`：单个 link 读取，可选正文/highlights。
- `src/commands/content.ts`：文章正文读取。
- `src/commands/add.ts`：按 URL 添加或更新 link。
- `src/commands/edit.ts`：修改 link metadata/tags。
- `src/commands/delete.ts`：dry-run 与 confirmed deletion。
- `src/commands/tags.ts`：tag listing。
- `src/commands/highlights.ts`：highlight 搜索、note 更新、export。
- `test/config.test.ts`：config precedence 和 redaction tests。
- `test/goodlinks-client.test.ts`：endpoint/query/body tests，使用 mocked fetch。
- `test/output.test.ts`：compact field selection 和 truncation tests。
- `test/commands/*.test.ts`：命令行为测试。

## 开发阶段

### Phase 0: 固化 tag 使用约定文档

设计已确认。实现时需要把以下 tag 使用约定写入 README/Skill：

- [ ] 写明 `inbox` 表示未整理内容。
- [ ] 写明 `summarized` 表示已总结。
- [ ] 写明 `agent-reviewed` 表示 agent 已读并判断。
- [ ] 写明 `topic/...` 作为主题标签，例如 `topic/ai`、`topic/product`。
- [ ] 写明 `source/...` 作为来源标签，例如 `source/blog`、`source/paper`。
- [ ] 写明这些只是 README/Skill 建议，不在 CLI 内硬编码。

### Phase 1: Project Skeleton

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Create: `test/smoke.test.ts`

步骤：

- [ ] 添加 package metadata 和 scripts：
  - `build`
  - `test`
  - `typecheck`
  - `goodlinks` bin 指向 `dist/cli.js`
- [ ] 添加面向 Node 20 ESM 的 TypeScript config。
- [ ] 添加最小 CLI entrypoint，支持 `--help` 并正常退出。
- [ ] 添加 help output 的 smoke test。
- [ ] 运行 `npm test`。
- [ ] 运行 `npm run build`。
- [ ] Commit: `chore: scaffold goodlinks cli`。

验收：

- `node dist/cli.js --help` exit `0`。
- 本阶段不发起任何 GoodLinks API 请求。

### Phase 2: Config and Error Handling

**Files:**

- Create: `src/config.ts`
- Create: `src/errors.ts`
- Create: `test/config.test.ts`
- Create: `test/errors.test.ts`

步骤：

- [ ] 实现 config precedence：
  - flags
  - env vars
  - config file
  - defaults
- [ ] 实现 `goodlinks config set-token` 的交互式 token 输入。
- [ ] 确保交互式 token 输入不回显。
- [ ] 创建 config file 时使用 `0600` 权限。
- [ ] 实现 token redaction。
- [ ] 实现 config file path resolution。
- [ ] 实现 typed errors：
  - `ConfigError`
  - `ApiError`
  - `NetworkError`
  - `UsageError`
- [ ] 将错误映射到稳定 exit codes。
- [ ] 测试 missing token 行为。
- [ ] 测试 redaction 行为。
- [ ] 测试 default base URL 行为。
- [ ] Commit: `feat: add config and error handling`。

验收：

- 测试中不会打印 token。
- 缺 token 时，在网络请求前给出清晰错误。

### Phase 3: GoodLinks API Client

**Files:**

- Create: `src/goodlinks-client.ts`
- Create: `test/goodlinks-client.test.ts`

步骤：

- [ ] 定义 link、highlight、list response types。
- [ ] 实现带 Bearer auth 的 shared request function。
- [ ] 实现 query string builder，支持重复 `tag` 和 `id` 参数。
- [ ] 实现：
  - `getLists`
  - `getTags`
  - `listLinks`
  - `searchLinks`
  - `getLinkById`
  - `getLinkByUrl`
  - `getContent`
  - `addLink`
  - `editLink`
  - `deleteLinks`
  - `searchHighlights`
  - `editHighlightNote`
  - `exportHighlights`
- [ ] 测试 request method、URL、headers、query encoding、JSON body、text response handling。
- [ ] Commit: `feat: add goodlinks api client`。

验收：

- client tests 能证明 endpoint mapping 与官方 API spec 对齐。
- content/highlight export 能处理非 JSON text responses。

### Phase 4: Output Formatting

**Files:**

- Create: `src/output.ts`
- Create: `test/output.test.ts`

步骤：

- [ ] 实现 compact field projection。
- [ ] 实现自定义 `--fields`。
- [ ] 实现 `--full`。
- [ ] 实现正文截断和 `truncated` metadata。
- [ ] 实现 JSON output。
- [ ] 实现简单 table output。
- [ ] 实现 link/content bundle 的 Markdown output。
- [ ] 测试 projection、truncation 和稳定 JSON shape。
- [ ] Commit: `feat: add output formatting`。

验收：

- list/search 默认不包含文章正文。
- `--max-chars` 能防止输出过大的正文。

### Phase 5: Read Commands

**Files:**

- Create: `src/commands/doctor.ts`
- Create: `src/commands/list.ts`
- Create: `src/commands/search.ts`
- Create: `src/commands/get.ts`
- Create: `src/commands/content.ts`
- Create: `src/commands/tags.ts`
- Modify: `src/cli.ts`
- Create tests under `test/commands/`

步骤：

- [ ] 实现 `doctor`。
- [ ] 实现 `list <list>`。
- [ ] 实现 `search [query]`。
- [ ] 实现 `get <id-or-url>`。
- [ ] 实现 `content <id>`。
- [ ] 实现 `tags`。
- [ ] 将命令接入 `src/cli.ts`。
- [ ] 添加 argument parsing 和 client calls 测试。
- [ ] Commit: `feat: add read commands`。

验收：

- agent 可以不用手写 API URL，就能 search/list/get content。
- 读命令支持 compact JSON。

### Phase 6: Write Commands

**Files:**

- Create: `src/commands/add.ts`
- Create: `src/commands/edit.ts`
- Create: `src/commands/delete.ts`
- Modify: `src/cli.ts`
- Create tests under `test/commands/`

步骤：

- [ ] 实现 `add <url>`。
- [ ] 在 `POST` 前校验 summary length。
- [ ] 实现 `edit <id>`。
- [ ] 在 `PATCH` 前校验 summary length。
- [ ] tag 编辑优先使用 `addedTags` 和 `removedTags`。
- [ ] 实现 `delete <id...>`，默认 dry-run。
- [ ] 真实删除必须带 `--yes`。
- [ ] 测试 dry-run 会读取 metadata 且不调用 delete。
- [ ] 测试 confirmed delete 调用 `DELETE /links?id=...`。
- [ ] Commit: `feat: add write commands`。

验收：

- 删除必须显式 opt-in。
- summary 长度限制在本地提前校验。

### Phase 7: Highlight Commands

**Files:**

- Create: `src/commands/highlights.ts`
- Modify: `src/cli.ts`
- Create: `test/commands/highlights.test.ts`

步骤：

- [ ] 实现 `highlights search`。
- [ ] 实现 `highlights note`。
- [ ] 实现 `highlights export`。
- [ ] 添加 query mapping 和 markdown export 测试。
- [ ] Commit: `feat: add highlight commands`。

验收：

- agent 可以读取和注释 highlights，不必读取完整文章。

### Phase 8: Documentation and Agent Skill

**Files:**

- Create: `README.md`
- Optionally create later: local Codex skill outside repo, if user confirms.

步骤：

- [ ] 文档化 setup：
  - 在 GoodLinks 中启用 API。
  - 从 GoodLinks settings 获取 token。
  - 通过 env 或 config 配置 token。
- [ ] 文档化命令示例。
- [ ] 文档化 agent recipes：
  - triage untagged
  - summarize unread
  - search prior reading
  - clean inbox tags
- [ ] 文档化安全规则。
- [ ] CLI 行为稳定后，再决定是否创建真正的 Codex Skill。
- [ ] Commit: `docs: document goodlinks cli usage`。

验收：

- 未来 agent 不读官方 API 文档，也能根据 README 正确使用 CLI。

### Phase 9: Optional MCP Wrapper

CLI 使用稳定前不要开始。

可能的 MCP tools：

- `goodlinks_search`
- `goodlinks_list`
- `goodlinks_get`
- `goodlinks_content`
- `goodlinks_add`
- `goodlinks_edit`
- `goodlinks_delete`
- `goodlinks_highlights_search`

实现方向：

- MCP server 调用 shared core functions 或 CLI。
- schemas 保持窄而明确。
- 保留与 CLI 相同的安全语义。

验收：

- MCP 增加便利性，而不是重复实现 GoodLinks API wrapper。

## 测试策略

Unit tests：

- Config precedence。
- Token redaction。
- URL and query building。
- API method/body mapping。
- Output projection。
- Content truncation。
- Delete safety。

Integration tests：

- 使用 mocked local HTTP server 模拟 GoodLinks。
- 常规测试和 CI 不修改真实 GoodLinks library。

Manual tests：

- `goodlinks doctor`
- `goodlinks list unread --limit 3`
- `goodlinks get <id> --with-content --max-chars 1000`
- `goodlinks add <safe test url> --tag cli-test`
- `goodlinks edit <id> --add-tag cli-tested`
- `goodlinks delete <id> --dry-run`

## 实现前待讨论

没有剩余阻塞实现的设计问题。后续可以直接按 Phase 1 开始。

## 已知风险

- 官方 API 文档没有暴露自定义 list 管理能力。
- `POST /links` 可能新建也可能更新已有 URL，因此 create/update 状态可能无法可靠判断。
- GoodLinks `summary` 最大 400 字符。
- 如果不截断，完整文章 markdown 可能很耗 token。
- Config file 存 token 比 Keychain 简单，但安全性弱。
- 过早做 MCP 可能拖慢交付，并重复 CLI 已解决的问题。
