# GoodLinks CLI NonOfficial

非官方 GoodLinks 本地 API CLI。这个项目不是 GoodLinks 官方项目，只是一个面向 agent 和本地脚本的轻量封装。

一个给 agent 和本地脚本使用的 GoodLinks 本地 API CLI。

核心目标：典型检索场景下快、准、全。列表和搜索只返回紧凑 metadata；文章正文只有明确调用 `content` 或 `get --with-content` 时才读取；删除默认 dry-run。省 token 重要，但不应牺牲检索准确性。

License: Apache-2.0。

## 前置条件

1. 安装 GoodLinks 3.2 或更新版本。
2. 在 GoodLinks 设置里启用 API。
3. 从 GoodLinks 设置里复制 API token。
4. 本机需要 Node.js 20 或更新版本。

GoodLinks API 默认地址：

```bash
http://localhost:9428/api/v1
```

## 安装

```bash
git clone git@github.com:wadjj/GoodLinksCLI-NonOfficial.git
cd GoodLinksCLI-NonOfficial
npm install
npm test
npm run build
```

本地直接运行：

```bash
node dist/cli.js --help
```

如果要把当前 checkout 暂时作为命令使用：

```bash
npm link
goodlinks --help
```

这个包目前面向本地使用，没有发布到 npm。

## 配置 token

推荐交互式输入，CLI 会保存到 `~/.config/goodlinks-cli/config.json`，并用 `0600` 权限创建文件：

```bash
goodlinks config set-token
```

也可以非交互写入：

```bash
goodlinks config set-token --token "YOUR_TOKEN"
```

注意：`--token` 方式可能把 token 留在 shell history 里。日常更推荐交互式输入。

查看配置时 token 会被隐藏：

```bash
goodlinks config get
```

也支持环境变量，适合临时调用或 CI：

```bash
export GOODLINKS_API_TOKEN="YOUR_TOKEN"
export GOODLINKS_API_BASE_URL="http://localhost:9428/api/v1"
```

## 读命令

默认输出是 JSON，方便 agent 直接消费。

```bash
goodlinks doctor
goodlinks tags
goodlinks list unread --limit 20
goodlinks list all --all-pages --fields id,title,url,wordCount
goodlinks list untagged --limit 50 --fields id,title,url,summary,tags
goodlinks search "agent memory" --tag topic/ai --limit 10
goodlinks search "agent memory" --all-pages --fields id,title,url,summary,tags,wordCount
goodlinks stats
goodlinks get abc123
goodlinks get abc123 --with-content --max-chars 8000
goodlinks content abc123 --format markdown
goodlinks content abc123 --format markdown --max-chars 12000
goodlinks content abc123 --auto-download=false
```

`--all-pages` 会遍历完整分页结果，适合 agent 需要完整候选集时使用。`goodlinks stats` 只读取 metadata，不读取或下载文章正文。

给人临时看时可以用表格：

```bash
goodlinks list unread --limit 10 --fields id,title,url --table
```

## 写命令

```bash
goodlinks add https://example.com/article --tag inbox --tag topic/ai
goodlinks edit abc123 --summary "400 字符以内摘要"
goodlinks edit abc123 --add-tag summarized --remove-tag inbox
goodlinks edit abc123 --tags topic/ai,source/blog
```

注意：`--tags` 会替换全部标签。日常更推荐 `--add-tag` 和 `--remove-tag`。

## 删除

删除默认 dry-run，不会真的删除：

```bash
goodlinks delete abc123
```

真实删除必须显式传 `--yes`：

```bash
goodlinks delete abc123 --yes
```

## Highlights

```bash
goodlinks highlights search "important" --limit 20
goodlinks highlights search --link-id abc123
goodlinks highlights note highlight123 --note "Key insight"
goodlinks highlights note highlight123 --clear
goodlinks highlights export abc123
```

## Smoke Checklist

本地改动后建议至少跑：

```bash
npm test
goodlinks doctor
goodlinks list unread --limit 5
```

如果改到写命令，可以用 disposable URL 做低风险验证：

```bash
goodlinks add https://example.com/goodlinks-cli-smoke --tag cli-test
goodlinks delete <new-id>
goodlinks delete <new-id> --yes
```

## Agent 使用习惯

这些标签不是 CLI 硬编码规则，只是推荐给 agent 的整理习惯：

- `inbox`：刚保存、未整理。
- `summarized`：agent 已经总结过。
- `agent-reviewed`：agent 已经读过并做过判断。
- `todo/read`：之后要读。
- `topic/ai`、`topic/product`、`topic/research`：主题。
- `source/blog`、`source/paper`、`source/docs`、`source/newsletter`：来源。

推荐流程：

```bash
goodlinks list untagged --limit 20 --fields id,title,url,summary,wordCount,addedAt
goodlinks content <id> --format markdown
goodlinks edit <id> --summary "<400 字符以内摘要>" --add-tag summarized --add-tag topic/ai
```

## 安全默认值

- token 不会被 `config get` 明文打印。
- `config set-token` 会保存到 `0600` config file。
- 删除默认 dry-run。
- 真实删除只认显式 `--yes`。
- `content` 默认 `autoDownload=true`，优先保证拿到正文；如果只想读已缓存内容，用 `--auto-download=false`。
- `content` 默认不截断；需要预览、批量维护或控制输出时，显式传 `--max-chars`。
- CLI 不内置 AI summarization；总结由外部 agent 完成，CLI 只负责读写 GoodLinks。

## 公开仓库边界

- 不要提交真实 GoodLinks API token。
- 不要提交 `~/.config/goodlinks-cli/config.json`。
- 不要提交私有文章导出、个人笔记或本地运行日志。
- 本地个人材料放在 `Personal/`，该目录已被 Git 忽略。
- 文档里使用 `~/.config/...` 这类通用路径，不写用户本地绝对路径。
