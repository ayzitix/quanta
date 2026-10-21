- After changing the public Protocol or Server `HttpApi`, run `bun run generate` from `packages/client`. Do not edit generated client files directly.
- Keep runtime dependencies directed from Schema to Core and Protocol, then from Core and Protocol to Server. Client runtime code may depend on Schema and Protocol but never Core or Server; `sdk` composes Client, Core, and Server.
- This repository does not use Changesets. Do not add `.changeset` files; follow the existing release workflow instead.
- The default branch is `dev`. Base branches and worktrees on `origin/dev`, target PRs at `dev`, and diff against `origin/dev` unless told otherwise.

## Live TUI Testing

- Run `bun run dev:live` from a development worktree to test its TUI against the currently elected `opencode` background server and live sessions.
- Pass a directory after the script when needed, for example `bun run dev:live /path/to/project`.
- The script discovers the server with `opencode service status`, injects its private local credential from `opencode service get password`, and uses the `dev` TUI storage channel so tabs and other client-local state match the installed client.
- Prefer `dev:live` over plain `bun run dev` for this workflow. An implicit managed-service connection may replace the live server when the worktree client version differs; explicit `--server` warns and continues without replacing it.

## TUI Stories

- When a user asks for a TUI story, add a fixture-driven story under `packages/tui/src/feature-plugins/system/storybook` and register it in `index.tsx`.
- Render the real production component rather than a visual copy. Keep submissions and other side effects local to the story so it is safe to explore repeatedly.
- Expose the meaningful state dimensions through story keybindings and list them in `StoryFooter`; include a reset command when combinations can leave the fixture in a confusing state.
- Run a specific story with `OPENCODE_STORY=<story-id> bun run dev:live` from the development worktree, and exercise narrow and wide terminal sizes when layout is relevant.

## TUI Theme Tokens

- Choose theme tokens by semantic role, not by their current color. Do not use raw `theme.hue` values or borrow an unrelated semantic token to achieve a preferred appearance.
- Use `text.feedback` and `background.feedback` only for outcome or status feedback such as errors, warnings, success messages, and informational messages. Use `formfield` states for form-control text, ordinals, and selection markers, and `action` states for actions.
- If the theme does not expose a token for the required semantic role, extend the theme schema, defaults, resolution, and types with that role before using it in a component. Do not repurpose the nearest-looking existing token.
- When changing the public theme token surface, verify the built-in light and dark defaults and the custom-theme fallback path in addition to the affected TUI component.

## Branch Names

Use a short branch name of at most three words, separated by hyphens. Do not use slashes or type prefixes such as `feat/` or `fix/`.

Examples: `session-recovery`, `fix-scroll-state`, `regenerate-sdk`.

## Commits and PR Titles

Use conventional commit-style messages and PR titles: `type(scope): summary`.

Valid types are `feat`, `fix`, `docs`, `chore`, `refactor`, and `test`. Scopes are optional; use the affected package or area when helpful, e.g. `core`, `opencode`, `tui`, `app`, `desktop`, `sdk`, or `plugin`.

Examples: `fix(tui): simplify thinking toggle styling`, `docs: update contributing guide`, `chore(sdk): regenerate types`.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating `typeof value === "object"` and property-existence checks. Do not defensively revalidate values already guaranteed by a schema, constructor, or internal type.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent.js"`) when adding a new config module.
- In Effect generators, bind services to named variables before calling methods. Do not use nested service yields such as `yield* (yield* Foo.Service).bar()`.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Imports

- Never alias imports. Do not use `import { foo as bar } from "..."` or renamed imports like `resolve as pathResolve`.
- Never use type-position `import("...")` references such as `Schema.declare<import("@opencode/plugin/effect/plugin").Plugin["effect"]>`. Only when two imports genuinely collide on a name and no other option exists, an aliased type import (`import type { Plugin as PluginDefinition } from "..."`) is permitted as a last resort — still strongly preferred not to.
- Never use star imports. Do not use `import * as Foo from "..."` or `import type * as Foo from "..."`.
- If a namespace-style value is needed, import the module's own exported namespace by name, for example `import { Project } from "@opencode/core/project"`, then reference `Project.ID`.
- Prefer dynamic imports for heavy modules that are only needed in selected code paths, especially in startup-sensitive entrypoints. Destructure dynamic import bindings near the top of the narrowest scope that needs them so they read like normal imports. Avoid inline chains such as `await import("./module").then((mod) => mod.value())` or `(await import("./module")).value()`. Keep branch-specific imports inside the branch that needs them to preserve lazy loading.

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Complex Logic

When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.

```ts
// Good
export function loadThing(input: unknown) {
  const config = requireConfig(input)
  const metadata = readMetadata(input)
  return createThing({ config, metadata })
}

function requireConfig(input: unknown) {
  ...
}
```

- Keep helpers close to the code they support, below the main export when that improves readability.
- Do not over-abstract simple expressions into many single-use helpers; extract only when it names a real concept like `requireConfig` or `readMetadata`.
- Do not return `Effect` from helpers unless they actually perform effectful work. Synchronous parsing, validation, and option building should stay synchronous.
- Prefer Effect schema helpers such as `Schema.UnknownFromJsonString` and `Schema.decodeUnknownOption` over manual `JSON.parse` wrapped in `Effect.try` when parsing untrusted JSON strings.
- Add comments for non-obvious constraints and surprising behavior, not for obvious assignments or control flow.

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible, you shouldn't be using globalThis.\* at all unless it's the only option.
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package directories such as `packages/core`.

## Checks

- Run `bun run check` from the repository root as the canonical full lint and type-check verification.
- During focused iteration, run `bun typecheck` from the affected package directory (for example, `packages/core`). Never run `tsc` directly.

## The system prompt

`packages/core/src/session/runner/prompt/system.txt` is what every session starts from. `system-prompt.ts`
substitutes `${OPENCODE_TOOL_GUIDANCE}` with per-tool instructions, so the placeholder must survive verbatim — the
replacement is a plain `String.replace`, and nothing validates that it fired.

It is written as instructions to a person, not as a description of the harness. It opens by saying what the work
is, not what a harness is, because a prompt that explains itself has no room left to command.

**The load-bearing rule is the second paragraph, and it is the one most likely to be "cleaned up" by mistake.**
A declarative rule about the agent's character — _I never hide anything_, _I always ask first_, _I can't lie_ —
is satisfied by producing those words and changes no behaviour. The agent will recite the virtue instead of
acting on it, and the failure is invisible because the reply looks like compliance. So the prompt forbids
describing itself through its own rules and names the phrases in the forbidding, which makes the rule checkable
rather than a matter of tone. Adding any rule phrased as a property of the agent's character reintroduces this;
`care what it is for` in the project section is the one virtue left, kept as motivation for the orientation rule
that follows it.

**Asking is three tiers, not one test.** _Act_ when there is no real choice or it makes no difference to the
work; _act and say_ when a real choice exists but guessing wrong is cheap to fix, then state the assumption in a
line; _ask_ when guessing wrong would cost real work. A single test cannot separate these — "ask when the answer
changes what you do" and "otherwise act" pull in opposite directions, and ordering them does not resolve it,
because the model reads both. The middle tier is what makes the other two coherent, and it has no precedent in
any competitor prompt.

A question is also sorted by cost rather than by topic: how much a wrong guess would cost decides what goes
first, independent questions go in one message, and three is a ceiling rather than a target. Without those,
"ask" degrades into an interrogation and the tiering decides nothing.

**An ambiguous word is a fork, and it outranks everything else.** A name or typo that can be read two ways gets
asked about before any question about stack, scope or style, and is never silently corrected when the
correction changes what gets built. This has no counterpart anywhere in the 104 surveyed prompts: `auth` means
both authentication and authorization, and no competitor treats that as an ambiguity at all. In a head-to-head,
Claude Code asked what the bug was and missed the fork entirely; this prompt named four candidate subsystems
from the repository it was standing in. The reason it needs saying is that a typo is not read as a reading —
the model normalises it as noise — so `two honest readings` alone never fires on one.

**Ask only when the answer is a decision, not when a detail is missing.** `three is a ceiling, not a target` and
the rule against spending a question on what tier 1 or 2 already covers exist because user research is one-sided:
every complaint found about these tools is about too many questions, none about too few. Named symptoms are
"just build it", "I don't care" and "back and forth". Users write explicit "never ask without a consequential
fork" overrides to fight the default, which is the three tiers restated. Tier 1 defaults to deciding for that
reason, and the structure should not be tilted toward asking without new evidence that this specific agent
freezes.

_An answer settles the question asked; it is not a second approval gate_ governs the turn after a question, and it
is the only valve the prompt carries. It matters more than its length suggests, because the ask side was widened
this round — an ambiguous word became a fork of its own — and every valve on the other side of the question is
worthless at the moment of deciding whether to ask it. There was once a second one, _a clear, complete request is
an instruction rather than an invitation to negotiate_; it was dropped in a rewrite and is not back. Tier 1
covers it by implication and a six-prompt comparison showed every agent inferring it unprompted, so it is
absent on evidence rather than by oversight. Re-add it if asking at the moment of decision ever becomes the
observed failure.

**Reversibility and scope act on disjoint objects.** Scope covers what exists afterwards — commits, branches,
worktrees, config outside the repository. Reversibility covers how one operation is performed. That is why a
reversible route may be move-instead-of-delete or dry-run-first but may not be _make a branch_: a branch is a
new thing to create, so it falls back under Scope and needs the user's word. Folding either rule into the other
resolves the collision by deleting the boundary, and the collision comes straight back — the same situation then
has two correct answers depending on which rule the model reaches first.

**Reporting is the last line of the prompt on purpose.** Brevity precedes it so that "failure output and
anything you did not verify are not brevity" can follow and override it. Reversed, the unqualified brevity rule
lands last and is the one that wins.

Craft rules — minimum code, nothing speculative, decide what proves it worked before starting — came from
Andrej Karpathy's four guidelines. Honest reporting and the ask-if-unclear clause came from Claude Code, which
the user works with daily and rates above the rest for asking well while still executing well. "Never name a
tool" from Cursor. Codex contributes the ambition-versus-precision split and brevity-as-a-default; Cursor's newer
prompt is the counter-example, mandating status narration between tool batches, which is the opposite of what a
terminal user wants.

How these were validated, because a prompt read by its author proves nothing. Six prompts were run side by side
— Claude Code, Cursor, Codex, MiMo Code, and this one before and after the fork rule — against identical
first messages. On "як краще зробити лендинг для кафе?" all six answered instead of building, so the missing
"a question is not a task" rule was not needed and was not added. On "виправ баг в auth" the results split:
Claude Code missed the fork, MiMo caught it but offered no options and answered in English, and this prompt
named four candidate subsystems from the repository. The simulation runs one model through one harness, so it
isolates the prompt and does not transfer to the real products; treat it as evidence about the text, not about
the tools.

## Session Core

- Keep durable events minimal: record irreducible new facts and do not repeat state derivable by folding the ordered aggregate history. Enrich projections and read models with previous or derived state when consumers need self-contained views.
- Keep durable prompt admission separate from model execution. `Session.prompt(...)` publishes `session.inbox.enqueued`, whose projection inserts one durable `session_inbox` row, before scheduling advisory `SessionExecution.wake(sessionID)` unless `resume: false` requests admit-only behavior. Delivery publishes `session.inbox.delivered`; its projection consumes the inbox row and inserts the visible message in the same transaction. `session_inbox` stores only unconsumed work.
- Reusing a Session ID adopts the existing Session. Reusing a user or synthetic inbox item ID is idempotent when Session and type match: the first admission wins and the retried payload, metadata, and delivery mode are ignored, whether the item is still pending or already delivered (reconciled from the projected message without retained enqueue history). Cross-Session or cross-type reuse fails. Control items keep their operation-specific conflict behavior.
- Keep `SessionExecution` process-global and Session-ID based. Its local implementation owns the process-local Session coordinator and discovers placement through `SessionStore` plus `LocationServiceMap.get(session.location)` only when a drain starts; no layer should take a Session ID. Interruption targets the active process-local ownership chain for that Session; interruption of a known but idle or locally unowned Session is a no-op, while the public API rejects an unknown Session.
- Keep `SessionRunner`, model resolution, tool registry, permissions, and filesystem Location-scoped. Omitted `Location.workspaceID` means implicit-local placement; explicit workspace identity remains reserved for future placement semantics.
- Each step is one explicit `llm.stream` call that continues from reloaded history. Do not add an in-memory tool loop.
- Keep local Session drains process-local until clustering is implemented. `SessionRunCoordinator` joins explicit same-Session resumes, coalesces prompt wakeups, and allows different Sessions to run concurrently. A write-ahead execution claim marks a process-local busy period for restart recovery: terminal completion, failure, or user interruption releases it, while shutdown interruption and process death preserve it. Startup recovery resumes claimed top-level Sessions with durable per-execution attempt accounting. The claim is a recovery marker, not clustered ownership, fencing, or an exactly-once guarantee.
- Keep delivery vocabulary explicit. Prompts steer by default. At safe step boundaries, steered compaction takes priority up to the first steered move control; other steers retain enqueue order. At an idle boundary, steers take priority; otherwise exactly one queued item delivers before the runner reevaluates continuation. Inbox items may be cancelled or changed between queue and steer before delivery. Promoting new user input resets the selected agent's step allowance; a batch of steers resets it once.
- One step is one logical LLM call; its durable record covers only the model-visible span. Do not write "provider turn", and do not use bare "turn" for a single call: "turn" is reserved for the future assistant-turn unit containing all steps from prompt promotion until the session would go idle.
- Keep event replay ownership separate from clustered Session execution ownership.
