# GoodLinks CLI 规格说明

## 目标

构建一个很薄的本地 CLI，让 agent 能以低 token、低摩擦的方式管理用户的 GoodLinks 资料库。

CLI 的职责是隐藏 GoodLinks REST API 的细节，默认返回紧凑、稳定、机器可读的输出；只有在明确请求时才读取文章正文；对删除、覆盖标签等高风险操作提供保护。

## 官方 API 能力摘要

GoodLinks 从 3.2 起提供本地 REST API：

- Base URL: `http://localhost:9428/api/v1`
- 鉴权方式：所有 `/api/*` 请求都需要 `Authorization: Bearer <token>`
- 主要资源：
  - `links`
  - `lists`
  - `tags`
  - `highlights`
- 文章正文读取：
  - `GET /links/{id}/content?format=markdown|plaintext|html`
  - `autoDownload=false` 可以避免强制 GoodLinks 下载尚未缓存的正文
- 链接写入：
  - `POST /links`
  - `PATCH /links/{id}`
  - `DELETE /links?id=...`
- 标签写入：
  - 通过 `PATCH /links/{id}` 的 `addedTags`、`removedTags` 或完整 `tags` 字段完成

重要约束：官方文档支持内置列表和标签，但没有看到自定义列表、文件夹、分组的创建或编辑 API。因此 v1 的“组织”能力应以 tag 和内置 list 为核心。

## 设计原则

1. 本地优先：只调用用户本机 GoodLinks API。
2. 默认省 token：列表和搜索默认只返回紧凑 metadata。
3. 正文懒加载：`list` / `search` 不自动读取文章正文。
4. agent 安全：删除、覆盖全部标签等操作必须显式确认。
5. 脚本友好：所有读命令都支持稳定的 `--json` 输出。
6. 人也能用：提供 `--table` 和 `--md`，但 agent 工作流优先 JSON。
7. 不内置 AI：v1 不在 CLI 内调用模型；总结、分类判断由外部 agent 完成，CLI 只负责读写 GoodLinks。

## 已确认设计决策

- v1 使用 TypeScript/Node 20。
- 尽量零 runtime dependencies，便于安装、调试和后续包装成 MCP。
- token 支持 `GOODLINKS_API_TOKEN` 和 `~/.config/goodlinks-cli/config.json`。
- CLI 必须支持交互式输入 token，不能要求用户提前手写 config file。
- config file 保存 token 时使用 `0600` 权限；macOS Keychain 放到后续版本。
- 默认输出面向 agent：读命令默认 JSON，`--table` 给人类临时查看。
- v1 只做通用读写命令，不做内置 AI summarization。
- 删除默认 dry-run，必须显式 `--yes` 才真正删除。
- 删除只要求 `--yes`，不再额外做交互式二次确认。
- `content` 默认 `autoDownload=true`，优先保证 agent 第一次读取时能拿到正文；需要速度和无副作用时可显式传 `--auto-download=false`。
- `content` 和 `get --with-content` 默认不截断；需要预览、批量维护或控制输出时显式传 `--max-chars`。

## 推荐技术栈

v1 已确认：

- Runtime: Node.js 20+
- Language: TypeScript，编译到 `dist/`
- Runtime dependencies: 零依赖或接近零依赖
- HTTP: 使用 Node 内置 `fetch`
- CLI parsing: 先用 Node 内置 `parseArgs`；只有解析变复杂时再考虑 `commander`
- Tests: `node:test` + mocked `fetch`

理由：Node 自带 HTTP、JSON 处理方便、启动成本低、跨平台安装简单，也方便后续把同一套核心函数包成 MCP。

## 配置设计

Token 解析优先级：

1. `--token`
2. `GOODLINKS_API_TOKEN`
3. config file 中保存的 token

Base URL 解析优先级：

1. `--base-url`
2. `GOODLINKS_API_BASE_URL`
3. config file 中保存的 base URL
4. 默认值：`http://localhost:9428/api/v1`

Config file:

- Path: `~/.config/goodlinks-cli/config.json`
- 示例：

```json
{
  "baseUrl": "http://localhost:9428/api/v1",
  "token": "stored only if the user explicitly configures it",
  "defaultFormat": "json",
  "defaultContentFormat": "markdown",
  "defaultMaxChars": null
}
```

Token 安全规则：

- 永远不要打印 token。
- `goodlinks config get` 必须隐藏 token。
- `goodlinks config set-token` 必须支持交互式输入 token，并且不回显输入内容。
- config file 创建时使用 `0600` 权限。
- macOS Keychain 暂不进入 v1；如果这个 CLI 变成长期基础设施，再考虑。

## 输出模式

所有读命令支持：

- `--json`：给 agent 和脚本使用的稳定 JSON。
- `--table`：给人看的紧凑表格。
- `--md`：适合复制到笔记或报告的 Markdown。

默认值：

- 面向 agent 的读命令默认 JSON。意思是 agent 调用 `goodlinks list unread --limit 20` 时，不需要额外加 `--json`，就能拿到稳定结构化数据。
- `doctor` 和 config 命令默认 human-readable text。

JSON 约定：

- 单个资源返回 object。
- 集合返回 `{ "data": [...], "hasMore": boolean, "query": {...} }`。
- 错误默认写 stderr 并返回非零 exit code；如果指定 `--json`，输出结构化错误。

默认 link 字段：

```json
{
  "id": "abc123",
  "title": "Article title",
  "url": "https://example.com",
  "summary": "Existing GoodLinks summary",
  "author": "Author",
  "tags": ["ai", "agents"],
  "wordCount": 1200,
  "starred": false,
  "highlighted": true,
  "addedAt": "2026-05-18T03:00:00Z",
  "readAt": null
}
```

字段裁剪：

- `--fields id,title,url,tags` 返回指定字段。
- `--compact` 等价于安全默认字段集：`id,title,url,summary,tags,wordCount,starred,highlighted,addedAt,readAt`。
- `--full` 返回 API 原始对象，不做字段裁剪。

## 命令设计

### `goodlinks doctor`

检查 GoodLinks API 是否可访问、token 是否可用。

示例：

```bash
goodlinks doctor
goodlinks doctor --json
```

行为：

- 调用低成本端点，例如 `GET /tags` 或 `GET /lists`。
- 区分以下问题：
  - API server 无法连接。
  - 缺少 token。
  - token 无效。
  - 响应结构异常。

### `goodlinks config`

管理本地配置。

示例：

```bash
goodlinks config set-token
goodlinks config set-base-url http://localhost:9428/api/v1
goodlinks config get --json
```

规则：

- `set-token` 在交互式终端中应 prompt 输入。
- 非交互模式可以支持 `--token`，但文档中要提醒 shell history 泄漏风险。

### `goodlinks list <list>`

读取 GoodLinks 内置列表。

有效列表：

- `unread`
- `read`
- `starred`
- `untagged`
- `highlighted`
- `all`

示例：

```bash
goodlinks list unread --limit 20
goodlinks list untagged --limit 50 --fields id,title,url,summary,tags
goodlinks list starred --include-read --search agents --tag ai --json
```

支持参数：

- `--search <text>`
- `--tag <tag>`，可重复
- `--include-read`
- `--limit <1..1000>`
- `--offset <n>`
- `--all-pages`

默认行为：

- `limit=20`
- 不读取正文

### `goodlinks search [query]`

搜索整个资料库。

示例：

```bash
goodlinks search "agent memory" --limit 10
goodlinks search --tag ai --read=false --sort newestSaved
goodlinks search --word-count-min 1000 --word-count-max 6000 --tagged=false
```

支持过滤：

- `--tag <tag>`，可重复
- `--starred true|false`
- `--read true|false`
- `--tagged true|false`
- `--highlighted true|false`
- `--word-count-min <n>`
- `--word-count-max <n>`
- `--added-after <iso8601>`
- `--added-before <iso8601>`
- `--read-after <iso8601>`
- `--read-before <iso8601>`
- `--sort newestSaved|oldestSaved|newestRead|oldestRead|shortest|longest|titleA|titleZ`
- `--limit <1..1000>`
- `--offset <n>`
- `--all-pages`

### `goodlinks get <id-or-url>`

按 ID 或 URL 读取单个 link。

示例：

```bash
goodlinks get abc123
goodlinks get https://example.com/article
goodlinks get abc123 --with-content --content-format markdown --max-chars 8000
goodlinks get abc123 --with-highlights
```

行为：

- 参数以 `http://` 或 `https://` 开头时，调用 `GET /links?url=...`。
- 否则调用 `GET /links/{id}`。
- `--with-content` 会额外请求 `/links/{id}/content`。
- `--with-highlights` 会按 `linkID` 搜索 highlights。
- `--max-chars` 会截断正文，并返回 `truncated: true`。

### `goodlinks content <id>`

只读取文章正文。

示例：

```bash
goodlinks content abc123 --format markdown --max-chars 12000
goodlinks content abc123 --format plaintext --auto-download=false
```

参数：

- `--format html|plaintext|markdown`
- `--auto-download true|false`
- `--max-chars <n>`
- `--output <path>`，用于把大正文写到本地文件

默认：

- `format=markdown`
- `autoDownload=true`
- 不截断正文；只有显式传 `--max-chars` 时才截断

### `goodlinks add <url>`

添加 link；如果 URL 已存在，GoodLinks API 会更新现有 link。

示例：

```bash
goodlinks add https://example.com/article --tag inbox --tag ai
goodlinks add https://example.com/article --title "Example" --summary "Short note" --read=false --starred
```

参数：

- `--title <text>`
- `--summary <text>`
- `--tag <tag>`，可重复
- `--read true|false`
- `--starred`
- `--added-at <iso8601>`

注意：

- API 文档说 `POST /links` 会 add or update。
- 如果 CLI 无法可靠判断是新建还是更新，就不要强行声称 created / updated，只返回 API 结果。

### `goodlinks edit <id>`

更新 link metadata。

示例：

```bash
goodlinks edit abc123 --summary "400 char max summary"
goodlinks edit abc123 --add-tag ai --add-tag agents --remove-tag inbox
goodlinks edit abc123 --tags ai,agents,read-later
goodlinks edit abc123 --read true --starred false
```

参数：

- `--title <text>`
- `--summary <text>`
- `--read true|false`
- `--starred true|false`
- `--add-tag <tag>`，可重复
- `--remove-tag <tag>`，可重复
- `--tags <csv-or-json-array>`，替换全部 tags

安全规则：

- 优先用 `--add-tag` / `--remove-tag`，避免覆盖已有标签。
- `--tags` 是全量替换，需要在文档和 help 中明确提醒。
- 如果 `--tags` 与 add/remove 同时出现，按官方 API 语义忽略 add/remove。

### `goodlinks delete <id...>`

删除一个或多个 links。

示例：

```bash
goodlinks delete abc123 --dry-run
goodlinks delete abc123 def456 --yes
```

默认：

- 不带 `--yes` 时只做 dry-run，打印将要删除的 links。

行为：

- dry-run 时先读取每个 link 的紧凑 metadata。
- 带 `--yes` 时调用 `DELETE /links?id=...`。
- 成功删除后，JSON 模式返回：

```json
{
  "deletedIds": ["abc123", "def456"]
}
```

### `goodlinks tags`

列出所有 tags。

示例：

```bash
goodlinks tags
goodlinks tags --json
```

输出：

- `--json` 输出 JSON array。
- plain mode 每行一个 tag。

### `goodlinks highlights search`

搜索 highlights。

示例：

```bash
goodlinks highlights search "agent" --limit 20
goodlinks highlights search --link-id abc123 --sort newest
goodlinks highlights search --created-after 2026-05-01T00:00:00Z
```

参数：

- `--q <text>`
- `--link-id <id>`
- `--content <text>`
- `--note <text>`
- `--created-after <iso8601>`
- `--created-before <iso8601>`
- `--sort newest|oldest|linkID|content|note`
- `--limit <1..1000>`
- `--offset <n>`
- `--all-pages`

### `goodlinks highlights note <highlight-id>`

更新 highlight note。

示例：

```bash
goodlinks highlights note highlight123 --note "Important insight"
goodlinks highlights note highlight123 --clear
```

安全规则：

- v1 不做批量 note 编辑。

### `goodlinks highlights export <link-id>`

按 GoodLinks 里的导出模板导出某篇 link 的 highlights。

示例：

```bash
goodlinks highlights export abc123
goodlinks highlights export abc123 --output highlights.md
```

## Agent 优化工作流

这些先作为文档 recipe。真实使用稳定后，再决定是否升级成子命令。

这里的 tag 示例只是“agent 如何组织内容”的建议，不是 CLI 必须强制的规则。CLI 本身只提供通用的 `--add-tag`、`--remove-tag`、`--tag` 能力。

### 处理未打标内容

```bash
goodlinks list untagged --limit 20 --fields id,title,url,summary,wordCount,addedAt
goodlinks content <id> --format markdown --max-chars 8000
goodlinks edit <id> --summary "<agent summary>" --add-tag ai --add-tag product --read false
```

### 总结最近未读

```bash
goodlinks list unread --limit 10 --fields id,title,url,summary,tags,wordCount
goodlinks content <id> --format markdown
goodlinks edit <id> --summary "<400 chars max>" --add-tag summarized
```

### 找相关历史阅读

```bash
goodlinks search "memory agent" --tag ai --sort newestSaved --limit 20 --fields id,title,url,summary,tags,wordCount,readAt
```

### 清理 inbox tag

```bash
goodlinks search --tag inbox --limit 50 --fields id,title,url,tags
goodlinks edit <id> --add-tag <final-tag> --remove-tag inbox
```

## v1 非目标

- 不内置 LLM summarization。
- 不做自定义 list 创建，除非 GoodLinks API 后续支持。
- 不做网页抓取。
- 不做后台 daemon。
- 不做同步服务。
- 暂不做 MCP server。
- v1 不建本地数据库缓存，除非实际使用中发现明显性能问题。

## MCP 与 Skill 策略

推荐顺序：

1. 先做 CLI。
2. CLI 稳定后，写一个 Codex Skill 说明什么时候、如何调用 CLI。
3. 如果反复使用后发现 schema-native tool call 明显优于 shell CLI，再做 MCP。

为什么先做 CLI：

- 实现面最小。
- 人和 agent 都能用。
- 后续容易包装成 MCP。
- 通过紧凑输出和正文截断，天然省 token。

为什么 Skill 放第二：

- Skill 适合沉淀 agent 行为规则：
  - 先 list/search，再 content
  - 默认 compact fields
  - 只有必要时读取正文
  - 删除必须 dry-run 或 `--yes`
  - 写入 GoodLinks `summary` 时控制在 400 字符内

为什么不先做 MCP：

- 多一层 server、schema、配置和进程管理。
- 调试成本比直接 CLI 高。
- 即使做 MCP，也仍需要一个可靠的本地 API wrapper。

## 已确认 tag 使用约定

这些标签只作为 README/Skill 中的推荐习惯，不在 CLI 层硬编码。CLI 只提供通用的 `--add-tag`、`--remove-tag`、`--tag` 能力。

1. 推荐 agent 状态标签：
   - `inbox`：临时收件箱，表示还没整理。
   - `summarized`：已经被 agent 总结过。
   - `agent-reviewed`：agent 已经读过并做过判断。
   - `todo/read`：之后要读。

2. 推荐主题标签：
   - `topic/ai`
   - `topic/product`
   - `topic/research`
   - `topic/devtools`

3. 推荐来源标签：
   - `source/newsletter`
   - `source/blog`
   - `source/paper`
   - `source/docs`

4. 层级 tag 约定：
   - GoodLinks tag 可能只是普通字符串；即使 UI 不把 `/` 当层级，`topic/ai` 这种命名也便于搜索和批量处理。

5. 摘要职责：
   - v1 已确认 agent 负责总结，CLI 只负责读取正文和写回 summary。
   - 以后可以再加 `goodlinks summarize`，但那是我们自己的增强能力，不是官方 API。

## 已确认安全与默认行为

- `delete` 默认 dry-run。
- 真实删除必须显式传 `--yes`。
- 传了 `--yes` 后直接执行删除，不再追加 TTY 二次确认。
- `content` 默认 `autoDownload=true`，保证优先拿到可读正文。
- `content` 默认不截断；需要预览、批量维护或控制输出时显式传 `--max-chars`。
- 如果调用方只想读取 GoodLinks 已缓存内容，可传 `--auto-download=false`。

## 风险清单

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| GoodLinks app/API 没启动 | CLI 调用失败 | `doctor` 给出明确诊断 |
| token 缺失或无效 | 所有请求失败 | config/env 解析和红acted diagnostics |
| 读取过多正文 | token 浪费 | 先用 list/search/highlights/wordCount 缩小候选集；只有预览或批量维护时使用 `--max-chars` |
| summary 超过 400 字符 | API 拒绝或行为不符合预期 | 请求前本地校验长度 |
| 误用全量 `tags` 覆盖 | 标签丢失 | 默认推荐 add/remove；`--tags` 强提醒 |
| 删除错 ID | 内容丢失，虽然可能进 trash | 默认 dry-run；真实删除必须 `--yes` |
| `POST /links` 新建/更新难判断 | 输出误导 | 无法确认时不声称 created/updated |
| API 不支持自定义 list 管理 | “组织”预期不匹配 | v1 明确用 tags + built-in lists |
| 过早做 MCP | 交付变慢、重复封装 | CLI 稳定后再包 |
