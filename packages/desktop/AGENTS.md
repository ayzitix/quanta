# Desktop package notes

## Tests

- Follow the Tests section of `packages/app/AGENTS.md`: every test protects a named contract with a credible regression, has one owner, and can fail.
- Packaging, installer, IPC validation, credential, and SQLite migration and storage tests are contracts. Write them as tables: one table across channels, not one test per channel.
- Never add test-only parameters or exports to production modules (`now`, `delay`, `budget`). Use `setSystemTime` from `bun:test`.
- Test IPC through the raw message format the renderer sends, not through a mock client.
- No source-grep or tombstone tests that assert a file, export or feature is gone.
- Main-process code that belongs to a GUI extension is tested in `packages/gui-extensions`, not here.
- `bun typecheck` does not cover test files. Run `bun test <file>` for every test file you touch.

## Code

- Follow Solid best practices, leave a comment when violating this: https://www.brenelz.com/posts/solid-js-best-practices/
- Renderer process should only reach the main process through `window.electron` (exposed by `src/preload`) and the MessagePort RPC client in `src/renderer/api.ts`.
- Main process should define IPC handlers in `src/main/ipc-handlers/*` and compose them in `src/main/ipc.ts`.
- Avoid FS operations where possible. For any desktop persistence prefer sqlite in most cases, as performance and EPERM and many other things, especially on windows can be quite painful. Using anything other than sqlite should come with strong reasons.
- NEVER hardcode user-visible English strings in production code. ALWAYS use an i18n key for native menus, picker titles, dialogs, buttons, accessible labels, and displayed errors.
- When migrating existing copy to i18n, preserve the English text byte-for-byte unless the task explicitly requests a copy change.
- NEVER change existing English text or English keys to facilitate translation. English is intentional, designer-written source copy; adapt locale-specific translations and i18n mechanics around it.
- Keep locale and grammar logic in the shared typed i18n layer. Renderer code should resolve copy through the app language API, and the main process should consume typed native-translation bundles through `nativeT(...)`; native menus, dialogs, and IPC handlers must not inspect locales, choose plural categories, or assemble translated sentence fragments.
- Prefer complete translated phrases with only irreducible dynamic placeholders. If native UI needs richer grammar, deepen the shared bundle/API instead of adding locale branches to desktop feature code.
- Do not translate from model knowledge alone. Verify terminology and grammar with Unicode CLDR locale/plural data, Microsoft Localization Style Guides and terminology, Apple localization/style guidance and localized platform UI, Mozilla localization style guides, Mozilla Pontoon, and the Firefox localization corpus at `github.com/mozilla-l10n/firefox-l10n`.
- For developer-facing terminology, prefer established usage in the target language's developer community over literal translations. Cross-check maintained Firefox, KDE, and VS Code localizations, using at least two independent corpora when available. Keep established English loanwords and acronyms instead of inventing unfamiliar terms.
- Translate whole native-menu and dialog phrases in context. Audit recurring concepts for consistency and review every exact-English value; retain it only when it is an intentional product/provider/tool name, URL, code token, keyboard legend, acronym, asset name, or established borrowing.
- Record the corpora used and flag uncertain or regional terminology in review notes.
- Also use the relevant language authority or official dictionary for the locale (for example RAE/Fundéu, FranceTerme, Duden, TDK, Kotus/Kielitoimiston sanakirja, Språkrådet/Bokmålsordboka, Rada Języka Polskiego/PWN, the Russian and Arabic language academies, the Ukrainian Orthography, Taiwan MOE dictionaries, or the Royal Society of Thailand). Treat the English dictionary as the semantic source of truth and preserve placeholders, code identifiers, product names, and keyboard labels.

## Visual work (Quanta)

This section is ours, not upstream's. Everything above still applies; this adds the rules for
changing how the app looks.

### Read this before editing: the UI is not here

`src/renderer` is a thin Electron shell — six `.tsx` and two `.css` files. `desktop-app.tsx` does not draw the
app, it mounts `<AppInterface>` from `@opencode/app/desktop`. The pixels live in `packages/app` (169 `.tsx`,
24 `.css`) and the design system in `packages/ui`. **Both are shared with the web app.**

So "change the desktop look" usually means editing shared code that also moves web. Decide deliberately, per
change, whether web should follow. If it should not, scope the change with the platform check below. Never
assume a directory implies a platform.

### Two different things are called "desktop"

- **Platform** — `usePlatform()` from `@/runtime/platform/platform`, then `platform.platform === "desktop"`.
  Components usually wrap it: `const desktop = createMemo(() => platform.platform === "desktop")`.
- **Viewport width** — `createMediaQuery("(min-width: 768px)")`. A layout breakpoint, true in a wide browser
  window and false in a narrow Electron window.

Both names appear in this codebase and are not interchangeable. Do not read one as the other, and do not copy
the `isDesktop` name for the media query into new code.

### Brand geometry has one source; never edit baked paths

The wordmark is generated, not hand-drawn. `packages/ui/src/typography/wordmark/glyphs.ts` holds the letters as
5-wide by 6-tall bitmaps and derives every path from them: `WORDMARK` for the combined word, `WORDMARK_GLYPHS`
for the per-letter symbols the About screen shuffles, and the viewBox constants. `Logo` and `Wordmark` consume
it; so does `packages/app/src/settings/about/animated-wordmark.tsx` through the `@opencode/ui/wordmark/glyphs`
export.

To change a letter, edit the bitmap table. Do not paste path data into a component — that is what drifted
before, when each of the three wordmarks carried its own baked copy.

The mark is the one exception: a single `MARK` path constant in `packages/ui/src/components/logo.tsx`.

`Mark` and `Splash` are square, `viewBox="0 0 250 250"`. Upstream assumed 4:5, so anything sized for the old
mark — `aspect-[4/5]` in `logo.css`, `w-16 h-20` in `startup/splash.tsx`, `aspect-[720/129]` on a wordmark — has
to move with it. Check the ratio you are changing against the viewBox you are changing.

### Restyling the icon sets

`scripts/generate-brand-icons.ts` regenerates all three channels (dev, beta, prod) from the single SVG at
`icons/source/quanta.svg`, using `rsvg-convert` and `magick`. Upstream built these with a Tauri + Image2Icon
pipeline that needs macOS. Run `bun scripts/generate-brand-icons.ts`, or `--check` to see what it would write.

- Output is deterministic. `-strip` drops the `tIME` chunk so regenerating does not churn every file in git.
  Keep it that way.
- ImageMagick writes a bare PNG to a `.icns` path rather than a real container, so the script assembles the
  ICNS itself. Do not replace it with a plain `magick out.icns`.
- An output path must never appear in the argument list as well. ImageMagick then reads it as another input,
  and with no output left it writes a stray file named `undefined-0`.
- Windows Store and StoreLogo assets stay glyph-on-transparency; launcher, iOS and dock icons keep the rounded
  ink plate.

### Brand vertical position

`top-[25.375%]` was one shared brand anchor for the desktop splash and the new-session stack. The new-session
stack is now centred instead, so only `startup/splash.tsx` still anchors there. If you move one, check whether
the other should move with it.

### Known trap: `app.isPackaged` under `electron-vite dev`

`src/main/service/desktop-cli.ts` picks its CLI with
`!app.isPackaged && process.env.OPENCODE_DESKTOP_CLI_DEV`. Under `bun run dev:desktop` that flag reads as
packaged, so the dev branch is skipped and the code falls through to `resolveBundledCli`, which looks for a
binary that does not exist and fails with `spawn .../opencode-cli ENOENT`. The window still opens and the UI
renders; chat does not work. Upstream behaviour, not introduced by the fork.

### Verify

- `bun run dev:desktop` from the repo root, or `bun dev` from `packages/desktop`. HMR covers `packages/ui`, so
  glyph and token edits show up without a restart.
- Check light and dark, and at least one width on each side of `768px`.
- Centred stacks clip at both ends when the content is taller than its container, and the new-session parent is
  `overflow-hidden`, so a very short window cuts the composer off the top.
- `bun typecheck` from `packages/desktop`, `packages/app`, and `packages/ui`.
- Root `bun run check` before a PR. `HUSKY=0 git push` skips the pre-push hook while iterating.
