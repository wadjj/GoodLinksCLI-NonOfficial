# Repository Instructions

This repository is intended to be safe for a public GitHub remote.

## Public/Private Boundary

- Do not commit real GoodLinks API tokens, local config files, private article exports, personal notes, or user-specific operational logs.
- Put any local-only personal material under `Personal/`.
- `Personal/` is ignored by Git and must remain untracked.
- Do not reference user-specific absolute local paths in tracked files. Use generic paths such as `~/.config/goodlinks-cli/config.json`.
- Before pushing, scan staged changes for secrets and local absolute paths.

## GoodLinks CLI Behavior

- Prefer the local `goodlinks` CLI over raw API calls.
- Treat GoodLinks API `summary` as editable link description metadata, not GoodLinks AI Summary.
- For retrieval tasks, prioritize fast, accurate, complete answers; use metadata narrowing to control token cost.
- Use `--max-chars` only for preview, broad triage, or bulk maintenance.

