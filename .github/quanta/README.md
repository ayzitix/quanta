# Quanta — fork notes

This repository is a fork of [`anomalyco/opencode`](https://github.com/anomalyco/opencode), tracked as the `upstream` remote.
Everything outside `.github/quanta/` is upstream code; read [`AGENTS.md`](../../AGENTS.md) before changing it — those
conventions are upstream's and should be followed in forks too.

## Remotes

| Remote    | URL                                          | Role                       |
| --------- | -------------------------------------------- | -------------------------- |
| `origin`  | `https://github.com/ayzitix/quanta.git`       | this fork, where we push   |
| `upstream`| `https://github.com/anomalyco/opencode.git`  | where we pull from         |

## Branches

| Branch  | Purpose                                                              |
| ------- | -------------------------------------------------------------------- |
| `dev`   | Working branch. Tracks `origin/dev`, the base for every PR and worktree. |
| `main`  | Stable line, advanced by merging `dev` into it. Mirrors upstream `dev` at setup time. |

Upstream publishes every change on its own `dev` branch, so `dev` is the only upstream branch that needs tracking.

## Day-to-day

```bash
git switch dev
git pull --rebase origin dev      # pick up your own work pushed from elsewhere
bun install                        # required after clone and after most upstream merges
bun run check                      # canonical lint + typecheck (also runs on pre-push)
```

Branch names are at most three hyphen-separated words, no `feat/` style prefixes. Commits and PR titles use
`type(scope): summary` with `feat`, `fix`, `docs`, `chore`, `refactor`, or `test`.

### Taking upstream changes

```bash
.github/quanta/sync-upstream.sh            # merge upstream/dev into dev
.github/quanta/sync-upstream.sh --rebase   # rebase instead (only with unpushed local commits)
.github/quanta/sync-upstream.sh --push     # push the result to origin/dev
```

Merge is the default because rebasing rewrites history that is already pushed to `origin`. Upstream is large and busy,
so expect the first sync after a long gap to bring real conflicts — the same ones upstream's own contributors hit.

After syncing, regenerate anything the upstream merge touched:

```bash
bun install
bun run check
```

Push conflicts to a topic branch and open a PR against `dev` rather than pushing to `dev` directly.

## Toolchain

- **Bun 1.4.2** — pinned by `packageManager`; the `pre-push` hook hard-fails on a mismatch.
- **Node 26** for tooling that shells out to `node`.
- `.husky/pre-push` runs `bun run check` across the whole monorepo. That is slow. Bypass it with `HUSKY=0 git push`
  while iterating, and run `bun run check` yourself before opening a PR.

## CI

Upstream's GitHub Actions workflows target upstream infrastructure (`blacksmith-*` self-hosted runners, release and
deploy credentials, scheduled issue triage) and are disabled at the repository level rather than edited in the tree,
so they never conflict with upstream. Re-enable or add workflows with a `.github/quanta/` prefix.