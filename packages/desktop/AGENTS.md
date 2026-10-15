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

This section is ours, not upstream's. Everything above still applies — this only adds the rules for changing how the
app looks. Assume the change is visible work until proven otherwise.

### Read this before editing: the UI is not here

`src/renderer` is a thin Electron shell — six `.tsx` and two `.css` files. `desktop-app.tsx` does not draw the app, it
mounts `<AppInterface>` from `@opencode/app/desktop`. The pixels live in `packages/app` (169 `.tsx`, 24 `.css`) and
the design system in `packages/ui`. **Both are shared with the web app.**

So "change the desktop look" almost always means editing shared code that also moves web. Decide deliberately, per
change, whether web should follow. If it should not, scope the change with the platform check below. Do not assume a
directory implies a platform.

### Two different things are called "desktop"

- **Platform** — `const platform = usePlatform()` from `@/runtime/platform/platform`, then
  `platform.platform === "desktop"`. Components usually wrap it:
  `const desktop = createMemo(() => platform.platform === "desktop")`. This is the real check.
- **Viewport width** — `const isDesktop = createMediaQuery("(min-width: 768px)")`. A layout breakpoint. It is true in
  a wide browser window and false in a narrow Electron window.

Both names appear in this codebase and they are not interchangeable. Upstream names the media query `isDesktop`; do
not copy that name into new code, and do not read it as a platform check. Anything that must differ between Electron
and web is a platform check; anything that must differ between narrow and wide is a media query.

### Theming is the first lever, not the last

Colors are CSS custom properties resolved onto `:root` from the active theme. Semantic roles include
`--background-base`, `--text-strong`, `--text-weak`, `--text-weaker`, `--border-weak-base`, `--surface-raised-base`,
`--icon-base`, plus the `--v2-*` scales and `--line-height-compact` / `--line-height-base`.

- Pick tokens by semantic role, never by the color they currently happen to be. This is the same rule the root
  `AGENTS.md` gives the TUI.
- If no token expresses the role you need, extend the theme schema, defaults, resolution, and types first. Do not
  repurpose the nearest-looking existing token.
- Never hardcode hex, `rgb()`, or `oklch()` in a component or a component CSS file.
- Prefer the Tailwind utilities that reference tokens — `text-text-weak`, `bg-background-base`,
  `border-border-weak-base` — over raw `var()`.

### Changing the whole look: add a theme

Themes are JSON in `packages/ui/src/theme/themes/*.json`, validated by `desktop-theme.schema.json`, registered in
`default-themes.ts`, and re-exported from `packages/ui/src/theme/index.ts`. Adding one is additive and is by far the
cheapest way to make the app look different, so prefer it over per-component edits when the intent is a new overall
appearance rather than one screen.

- Required: `name`, `id`, `light`, `dark`. `id` must match `^[a-z0-9-]+$`.
- Seed palette keys: `neutral`, `ink`, `primary`, `success`, `warning`, `error`, `info`, `interactive`, `diffAdd`,
  `diffDelete`. `overrides` may set any token, as hex or `var(--token)`.
- Verify the built-in light and dark defaults as well as the custom-theme fallback path, not just the new theme.
- Users pick a theme in Settings → General → Theme; `loadThemeFromUrl` also accepts an external one.

### Two couplings to native that a color change can break

`DesktopEffects` in `desktop-app.tsx` reads the resolved `--background-base` and pushes it to the native window via
`setBackgroundColor`, and pushes the theme mode to the titlebar via `setTitlebar`. Changing background tokens or the
scheme changes the real window chrome, not just the page. Check light and dark against the titlebar.

### Genuinely desktop-only surfaces

- `packages/app/src/shell/titlebar/` — custom titlebar, tab strip, popovers (`titlebar.css`, `tab-nav.css`,
  `tab-popover.css`). Safe to restyle without touching web.
- `packages/desktop/src/renderer/startup/splash.tsx` and `splash.css` — launch splash and first-launch onboarding.
- Native menus and window chrome — `src/renderer/platform/menu.ts`, `src/main/windows`, and `src/renderer/window/*`
  (fullscreen, zoom, routing).

Everything else is shared. "Desktop-only" is proven by the platform check, not by file location.

### New visible strings

Visual work adds strings. The Localization rules above are absolute: no hardcoded user-visible English, including in
new buttons, tooltips, empty states, and `aria-label`s. Native menus, dialogs, and picker titles use the typed native
bundle via `nativeT(...)`.

### Solid

Follow the Solid guidance in the Code section above. Visual work tends to add reactive class and style expressions —
keep them derived, not imperative DOM writes, and keep signals and memos to what is actually reactive.

### Verify

- `bun run dev:desktop` from the repo root, or `bun dev` from `packages/desktop`.
- Check light and dark, and at least one window width on each side of `768px`, since that breakpoint changes layout
  regardless of platform.
- `bun typecheck` from `packages/desktop`, `packages/app`, and `packages/ui`.
- Root `bun run check` before opening a PR. `HUSKY=0 git push` skips the pre-push hook while iterating.
