---
name: goodlinks
description: Use when the user asks to read, search, organize, tag, summarize, add, edit, or delete items in their GoodLinks library. Use the local `goodlinks` CLI first; optimize for fast, accurate, and complete answers in typical retrieval tasks, using metadata and candidate narrowing to control token cost. Follow the GoodLinks deletion safety rules.
---

# GoodLinks

Use this skill whenever the task involves the user's GoodLinks library: finding saved links, reading article content, summarizing saved items, adding links, editing summaries/tags, managing highlights, or deleting links.

Default tool: the local `goodlinks` CLI.

## Core Rules

- Use `goodlinks` CLI before raw API calls.
- Optimize for fast, accurate, complete answers first; token efficiency is important but secondary.
- Control cost by narrowing candidates with metadata first: `list`, `search`, `tags`, `highlights search`, `--fields`, `--limit`, and `wordCount` filters.
- Fetch article body only after narrowing candidates with `content` or `get --with-content`.
- For selected high-relevance candidates, prefer complete content unless the task is only preview/bulk maintenance.
- Default to JSON for agent work; use `--fields` to reduce output.
- Treat GoodLinks API `summary` as the editable link description field, often captured by clipper. Do not treat it as GoodLinks AI Summary or as high-quality evidence by default.
- Do not call browser tools for GoodLinks library operations.
- Do not build custom scraping around GoodLinks links unless the user explicitly asks to inspect the live webpage.

## Read Workflows

Find candidate links:

```bash
goodlinks search "<query>" --limit 10 --fields id,title,url,summary,tags,wordCount,readAt
goodlinks list unread --limit 20 --fields id,title,url,summary,tags,wordCount,addedAt
goodlinks list untagged --limit 20 --fields id,title,url,summary,wordCount,addedAt
```

Read one item:

```bash
goodlinks get <id> --fields id,title,url,summary,tags,wordCount
goodlinks content <id> --format markdown
```

For quick inspection:

```bash
goodlinks get <id> --fields id,title,url,tags --table
```

## Evidence Search Strategy

When the user asks to find information inside GoodLinks, use retrieval that favors recall and correctness:

1. Search/list metadata first.
2. Check highlights if the query may match highlighted passages.
3. Use `wordCount` and metadata to prioritize candidates, not to avoid reading relevant ones.
4. Read likely candidates completely when the candidate set is small.
5. Use `--max-chars` only for preview, broad triage, or bulk maintenance.
6. Only say "not found" after checking the relevant candidates deeply enough for the task.

Do not treat "not present in a capped excerpt" as evidence that the article does not contain the information.

Expected library shape: the library may grow 10-20x, but typical article length is not expected to grow dramatically. For this shape, reduce token cost by narrowing the candidate set rather than truncating every selected article.

## Summarization

The CLI does not summarize by itself. The agent reads content, writes the summary, then updates GoodLinks.

```bash
goodlinks content <id> --format markdown
goodlinks edit <id> --summary "<400 characters or fewer>" --add-tag summarized
```

Rules:

- GoodLinks `summary` is limited to 400 characters.
- GoodLinks `summary` is the editable link description shown in the link editor; it is usually clipper metadata and is not the same as GoodLinks UI AI Summary.
- Do not overwrite `summary` unless the user asks to update summaries or the workflow is explicitly summary-maintenance.
- Keep summaries concise and useful for future search.
- If unsure whether to mark an item summarized, do not add `summarized`.

## Tagging Conventions

These are recommendations, not CLI-enforced rules.

- `inbox`: saved but not organized.
- `summarized`: agent has written or verified a summary.
- `agent-reviewed`: agent has read and judged the item.
- `todo/read`: user or agent should read later.
- `topic/...`: topic tags, such as `topic/ai`, `topic/product`, `topic/research`, `topic/devtools`.
- `source/...`: source tags, such as `source/blog`, `source/paper`, `source/docs`, `source/newsletter`.

Prefer incremental tag edits:

```bash
goodlinks edit <id> --add-tag topic/ai --remove-tag inbox
```

Avoid full tag replacement unless the user asks:

```bash
goodlinks edit <id> --tags topic/ai,source/blog
```

## Add/Edit

Add a link:

```bash
goodlinks add <url> --tag inbox
```

Edit metadata:

```bash
goodlinks edit <id> --summary "<400 characters or fewer>"
goodlinks edit <id> --add-tag agent-reviewed
goodlinks edit <id> --remove-tag inbox
```

## Highlights

Search highlights before fetching whole articles when highlights may be enough:

```bash
goodlinks highlights search "<query>" --limit 20
goodlinks highlights search --link-id <id>
goodlinks highlights export <id>
```

Edit highlight notes only when the user asks or the workflow clearly requires it:

```bash
goodlinks highlights note <highlight-id> --note "<note>"
goodlinks highlights note <highlight-id> --clear
```

## Deletion Safety

Deletion rules:

- Agent-created disposable test links in the current turn: may dry-run, then delete with `--yes`.
- User explicitly specifies 1-2 existing links to delete: first verify with `get` or dry-run; if title/URL match the user's intent, delete with `--yes` without asking again.
- User explicitly specifies more than 2 existing links: dry-run and ask the user to confirm before `--yes`.
- User intent is vague or agent selected deletion candidates: show candidate list and wait for user confirmation.
- Batch cleanup or broad deletion: never do it without user confirmation.

Commands:

```bash
goodlinks delete <id>
goodlinks delete <id> --yes
```

`goodlinks delete <id>` is dry-run and does not delete.

## Testing And Validation

For read-only validation, run directly:

```bash
goodlinks doctor
goodlinks tags
goodlinks list unread --limit 5 --fields id,title,url,summary,tags
```

For write validation, create a disposable link and delete only that link:

```bash
goodlinks add "https://example.com/?goodlinks-cli-smoke=<timestamp>" --title "GoodLinks CLI smoke test" --summary "Temporary CLI smoke test link" --tag cli-test
goodlinks edit <id> --add-tag agent-reviewed --remove-tag cli-test
goodlinks delete <id>
goodlinks delete <id> --yes
```

Do not ask the user to run ordinary read-only checks. Ask only for high-risk, broad, or unclear destructive operations.
