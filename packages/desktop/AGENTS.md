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

### Composer layout

The composer is two stacked regions, and the split between them is load-bearing.

- `<form data-component="composer">` is the tray. `[data-slot="composer-bar"]` is its **sibling**, directly below,
  both inside the editor root (`flex flex-col gap-1`).
- Keep the bar outside the form. The add menu, agent and model controls used to sit inside the form next to the
  submit button; that gave the tray a second full row and made it roughly twice its intended height while looking
  like a one-line input.
- The tray sizes itself from its text. The contenteditable carries `min-h-10` (40px) and the `ScrollView` is
  `min-h-0 max-h-[180px]`. Do not put a min-height back on the form — that is what pinned it to the old fixed
  height and hid the regression.
- The tray's radius is `min(50%, 20px)`, not `rounded-full`. A percentage radius resolves against the box, so
  `rounded-full` is a 20px pill on the one-line tray and 90px on the 180px maximum, where the semicircular ends
  swallow the start and end of every line. The 20px cap equals half the one-line height, so changing that height
  means changing this number too.
- The submit button is `size-7` (28px) and floats over the tray at `absolute end-1.5 bottom-1.5`. All three
  gaps are 6px: the vertical ones come from `(40 − 28) / 2`, and the inset matches so the button is not
  tighter to the right edge than to the top and bottom. Recompute from that formula rather than nudging it by
  eye, and keep the three equal if either dimension changes.
- Send is `arrow-up` and stop is `stop`.
- Because the button floats over the text, the contenteditable needs `pe-14` to keep the last character clear of it.
  Removing that padding puts text under the button as soon as a line fills.
- The scroll thumb is offset with `inset-inline-end: 34px` on the composer. It rides the right edge by default,
  which is where the send button floats, and the two overlapped by the button's inset. The number is `28 + 6`:
  the button's width plus its inset, so it moves with either.
- The actions row needs `z-20`. The contenteditable is `relative z-10` so it covers the placeholder overlay, and a
  positioned element without a z-index loses to any element that has one. Without the higher stack the tray swallows
  every click meant for the actions: the button looks fine, `elementFromPoint` at its centre returns the editor, and
  the caret just blinks there instead of the control behaving like a button.
- The submit button is `variant="ghost"`, not `submit`. `submit` paints a contrast fill with
  `--v2-elevation-button-contrast`, which is a second elevation on a tray that is meant to stay flat. The tray's
  flatness and this are the same decision: the button fills with `bg-inverse` / `danger/20` instead of a variant
  that carries its own shadow.
- The tray has no elevation. Do not put `shadow-[var(--v2-elevation-raised)]` back on the form — raised elevation
  belongs to popovers, which still use it.
- The tray's 1px rim is a `::before` pseudo-element masked to the border, not a `border` and not a box-shadow. A
  real border takes a pixel out of the content box and breaks the 40px the button inset is derived from; a
  box-shadow would replace the mask ring from `[data-dock-border-underlay]` rather than stack on it, because the
  later declaration wins outright. The `::after` glint sits on this same rim.
- Thinking power lives in the model popover footer, handed over as `footer` to `ModelSelectorPopover` in
  `providers/models/select-dialog.tsx`. The bar carries the add menu, agent and model only. Do not move the variant
  control back onto the bar.
- The placeholder overlay is `text-v2-text-text-faint/55`. `faint` is already the lightest text role the theme
  exposes, so extra fade is an opacity modifier, not a second token.

### Running the desktop on a machine without working Vulkan

On a Wayland session with no usable Vulkan, Electron warns
`'--ozone-platform=wayland' is not compatible with Vulkan` at startup. That warning is not the crash; it
predicts it. Minutes later the GPU process fails to launch and the app dies with:

```
GPU process launch failed: error_code=1002
FATAL:content/browser/gpu/gpu_data_manager_impl_private.cc:417] GPU process isn't usable. Goodbye.
```

Electron takes its extra flags from the `ELECTRON_CLI_ARGS` environment variable as a JSON array, so:

```bash
ELECTRON_CLI_ARGS='["--disable-vulkan","--disable-gpu-sandbox"]' bun run dev:desktop
```

This is a machine configuration issue, not a repo defect, so nothing is patched here. Drop the flags on a
machine with a working GPU; forcing `--disable-gpu` everywhere would cost real render performance.

`bun run dev:desktop` forwards plain CLI arguments to electron-vite, which does not pass them on to Electron.
The environment variable is the supported route.

### Diagnosing the dev CLI, if it ever fails again

`src/main/service/desktop-cli.ts` resolves the CLI with
`!app.isPackaged && process.env.OPENCODE_DESKTOP_CLI_DEV`, and `scripts/dev.ts` exports
`OPENCODE_DESKTOP_CLI_DEV` to point at the CLI source. Under dev both hold: the main log records
`packaged: false` and then `v2 CLI background service ready`.

`/proc/<pid>/environ` is not readable for the Electron main process on this machine, so it cannot show whether
the variable arrived. Read the app's own log instead — it is written per run under
`~/.config/ai.opencode.desktop.dev/logs/<timestamp>/main.log` — and look for `packaged:`,
`v2 CLI background service ready`, and `ENOENT`. An earlier report of `spawn .../opencode-cli ENOENT` in dev
could not be reproduced and was never explained; do not assume that failure mode is real without a log line
backing it.

### Verify

- `bun run dev:desktop` from the repo root, or `bun dev` from `packages/desktop`. HMR covers `packages/ui`, so
  glyph and token edits show up without a restart. Add the `ELECTRON_CLI_ARGS` from the Vulkan section above if
  the app dies with a GPU fatal shortly after launching.
- Never pipe `bun typecheck` into `tail` or `head` and then read the exit status. A pipeline reports the _filter's_
  status, so `bun typecheck 2>&1 | tail -4` exits 0 on a file with unbalanced JSX while the dev server prints
  `Expected corresponding JSX closing tag for <form>`. Redirect to a file and read `$?`, or do not pipe.
- Composer geometry is cheaper to check from the class names than from a screenshot. The renderer cannot be
  inspected over plain HTTP: `http://localhost:5173` renders an empty document outside Electron because the app
  needs the preload bridge, so DOM measurement in a plain browser proves nothing. Read the `min-h-*` on the
  contenteditable and the `size-*` plus `bottom-*` on the submit button and check the arithmetic, then confirm the
  shape in the running app.
- Check light and dark, and at least one width on each side of `768px`.
- Centred stacks clip at both ends when the content is taller than its container, and the new-session parent is
  `overflow-hidden`, so a very short window cuts the composer off the top.
- `bun typecheck` from `packages/desktop`, `packages/app`, and `packages/ui`.
- Root `bun run check` before a PR. `HUSKY=0 git push` skips the pre-push hook while iterating.
