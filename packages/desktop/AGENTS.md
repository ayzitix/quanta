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

### The default theme's dark variant

`packages/ui/src/theme/themes/oc-2.json` is the theme every user lands on: `resolveStoredTheme` returns `oc-2`
for any unknown or missing id, and `loader.ts` treats `oc-2` as _the_ default theme. Its **dark** variant carries
the palette; its light variant is still the original one, deliberately, so changing the app's dark surface does
not silently restyle the light one too.

The dark variant is Cursor's. `cursor-dark-color-theme.json` and the `--cursor-*` token layer in
`workbench.glass.main.js` were read out of `/usr/share/cursor/resources/app` and ported by hand, because there
is no path that imports them. The page is `#141414` and the raised surface every tray and card sits on is
`#181818`; the text ramp is `#F0F0F0` at 100/74/60/36% and the icon ramp at 100/66/52/28%, which is the one
place the two deliberately diverge — an icon at the same nominal step must sit darker than the text beside it,
or the distinction between a label and a mark disappears. Syntax is Anysphere (`#82D2CE` keyword, `#EFB080`
function, `#E394DC` string, `#AAA0FA` property, `#F8C762` constant), not Nord.

**The seed only carries chroma and hue.** `generateNeutralScale` in `color.ts` takes lightness from a fixed
ladder and reads `c` and `h` from `hexToOklch(seed)`, so a neutral seed at `#141414` produces a pure grey ramp
with the same lightness distribution the warm one had. Changing the seed changes the cast; it cannot change
the ramp's shape.

**The page is pinned through `overrides`, not `v2Overrides`.** `resolve.ts:44` reads
`overrides["background-base"]` directly, before the neutral ramp is consulted at all. A
`v2Overrides["v2-grey-1000"]` pin looks equivalent and silently does nothing: the token stays at
`neutral[0]`, which with this seed is `#0b0b0b` rather than `#141414`. Do not add a second pin for the same
surface — one source, and it is `overrides`.

**Known wrong, measured in the running app on 2026-10-18: the page is not `#141414`.** Read the three values
rather than the token names, because none of them agree:

| what                                     | value     |
| ---------------------------------------- | --------- |
| what `html` actually paints              | `#080808` |
| `--v2-background-bg-base`                | `#121212` |
| `--background-base`, the pinned override | `#141414` |

So the pin reaches the token and stops there: no rule paints `html` from `--background-base`, and the element that
does is reading something else entirely. Two consequences worth knowing before you pick a colour. A surface
described as "the page" and written as `var(--v2-background-bg-base)` is **not** the page — it is 10 units lighter
than it, which is visible as a faint card edge and nothing more. And `--v2-background-bg-base` and
`--v2-grey-1000` are the same value (`#121212`), so a component that reaches for one is not reaching for a
different surface from a component that reaches for the other. Fixing this means finding what paints `html` and
giving it the pinned value; it is not fixed, deliberately, because nothing depends on the page being `#141414`
yet and a wrong pin costs more than an unpinned one.

**The light variant is still the original one**, deliberately. Porting the dark side was a separate decision
from porting the light one, and Cursor ships a light theme we have not read.

### Composer layout

The composer is a tray and a bar. The measurements below are one system: the tray's height sets the button insets,
and the insets set the padding and the scroll-thumb offset. Change one and recompute the rest.

- `<form data-component="composer">` is the tray. `[data-slot="composer-bar"]` is its **sibling**, directly below,
  both inside the editor root (`flex flex-col gap-0.5`).
- The context row — project, worktree, branch — sits **above the tray** and hangs off its leading edge, not
  centred under the bar. It names where the prompt is going, which is the sentence's own furniture, so it reads
  with the field it qualifies; centred underneath, the three controls read as a status line for the whole panel
  and sit marooned in the middle of an otherwise left-weighted stack. The gap to the tray is 8px: these are the
  tray's header, not a section of their own. It lives in `new-session/view.tsx` above `<Composer>`, and in a
  session in `session/composer/session-context-row.tsx` above the same element in `session/composer/region.tsx`.
- The draft's row is the project picker. The session's row is the project picker and nothing else: worktree and
  branch were both there and both went, because they duplicated what the session header already states, and three
  labels where one decision is made read as a status readout nobody asked for. Choosing a project opens a **new**
  session in it and leaves the current one alone — a session is bound to its location, so "switching" could only
  mean the next one, and starting another is the honest version of the gesture. Projects come from that session's
  server alone; another server's would mean a draft on a different connection, which is the home screen's job.
- The picker window moved to `projects/picker.tsx` and is shared, so a session does not import from
  `new-session/`. Only its controls differ, through `PromptProjectControls` (`available`, `directory`, `select`,
  `add`) — the window, the controller, the search, the add-folder action and the item treatment are one control
  in two places rather than two controls that drift. Its `placement` is **upward** (`top-start`) in a session,
  because that trigger sits close to the bottom edge, and `bottom` in the draft, whose row is high enough for it.
- The picker window is styled by `projects/picker.css`, and it follows the composer's window language rather than
  the menu's: no elevation, a 20px squircle, and the tray's 1px masked hairline for its rim. Its rows carry **no**
  radius and **no** inset, because the window's squircle is what has to shape their fill, and a shape can only do
  that to something that reaches the edge — that also means the window's own `padding: 0` overrides the menu
  default's 2px, or every fill stops short of the frame and the squircle has nothing to clip. Replacing each row's
  radius with the window's 20px is not the fix: a middle row rounded to 20px reads as a lozenge.
- The project trigger shows the name alone, no avatar. It states which project, and the tile repeats what the
  word says while costing a rounded block in a row that is otherwise text. The avatar still earns its place on
  each item in the window, where it tells several projects apart.
- The context ring in the bar is the `session.composer.bar` slot's content, and it is **14px**, not the 16px the
  figures variant uses. At 16 it filled its 28px tray exactly, the one mark in the row with no air around it. The
  size is keyed on `iconOnly` because that prop marks the bar's instance alone, so no other consumer moves.
- Its stroke is **2.5**, and that number has to move whenever the size does. `ProgressCircle` takes `strokeWidth`
  in viewBox units and the indicator's viewBox is 16 whatever it renders at, so dropping the size to 14 scales
  the ring by 0.875 and thins the stroke from 2px to 1.75px along with it. It thickens inward and not outward
  because `radius` is `center - strokeWidth / 2`, which pins the outer edge to the viewBox and spends the extra
  weight inside — that is what keeps the mark the size the tray gave it. Measured: 2.19px rendered, outer edge at
  `6.75 + 2.5/2 = 8`, the centre line.
- Keep the bar outside the form. The add menu, agent and model controls used to sit inside the form next to the
  submit button; that gave the tray a second full row and made it roughly twice its intended height while looking
  like a one-line input.
- The tray sizes itself from its text. The contenteditable carries `min-h-10` (40px) and the `ScrollView` is
  `min-h-0 max-h-[180px]`. Do not put a min-height back on the form — that is what pinned it to the old fixed
  height and hid the regression.
- The tray's radius is `9999px` — a true pill, matching Cursor's `--cursor-radius-full` on its agent tray,
  Claude Desktop's shape language, and Codex's near-capsule. It is `box-shadow: none`, declared rather than
  omitted, because Cursor declares the same absence as an overridable token and the distinction is practical:
  an absent shadow is something nobody decided, a declared one is something a later rule can replace.
  Three products, three answers — `9999px`, `14px`, `28px` + `superellipse(1.5)` — so this is a taste call
  against a measurement, not a measurement. The three-step history here (`min(50%, 20px)` → `10px` →
  `9999px`) is a record of that: each was argued from the geometry and the last two disagreed.
- The tray, its chips and its icon buttons declare **no `corner-shape` at all**. That matched the field
  argument of the `10px` era and does not match the pill: a squircle inset inside a `9999px` tray is two shape
  languages in one control. Cursor's token set carries no `corner-shape` anywhere, so there is nothing to port.
  `corner-shape` still lives in one place — the effort knob, inside the popover, which is a menu surface and
  not the tray.
- The icon buttons take Cursor's control radius, not the tray's: `[data-action="composer-attach"]` is `6px`
  and `[data-action="composer-submit"]` is `9999px`. A pill-shaped button inside a pill tray is a smaller
  pill, and two radii where one language is enough reads as two components rather than one control group.
  Send is round because it is the one filled control on the surface. The attach mark's open state inverts its
  fill on the same element, so it follows in both states.
- The tray's controls are centred with `inset-y-0` + `items-center`, not with a `bottom-*` inset. The actions
  row is absolutely positioned, so with only a bottom edge it grows upward from a fixed 8px — and that number
  is correct for exactly one tray height. The tray is 42px now that the editor carries a 22px line box, which
  left send 10px from the top and 8px from the bottom; a grey button hides that and a white disc does not. This
  is the same class of bug as a fixed `--composer-actions`: position derived from a tray measurement that the
  next font-size change invalidates. Centring needs no number. Send is `size-7` and the catalog's `arrow-up`,
  stop is `stop`.
- Send is a white disc with a dark glyph, at `size-7`. This reverses an earlier decision and the reversal is
  the point: it is Codex's treatment (`bg-primary-solid` at `#dfdfdf`, label inverted) and the only saturated
  object on its tray, everything else being 5-12% alpha. It was `no fill, brightens the glyph` here, and
  Cursor kept it that way, which is why the three references disagree on this element alone.
  The disc is **unconditional**. Gating it on `canSubmit` was tried and reads wrong: the control appears as
  you type, so the tray's only filled object is also the only thing that moves. `canSubmit` drives `disabled`,
  and the empty field is communicated by `opacity: .45` on the disc instead — which is where the information
  is. Hover drops the disc to 80%, the same move Codex makes. `stop` keeps the disc and changes the glyph
  rather than taking a hue; a red mark on an empty tray is the loudest thing in it.
- The tray's leading text padding is `ps-4` (16px). It was `ps-11` (44px) to clear a 24px add button sitting 8px
  in, and that button moved to the bar — where it is a control among controls next to the agent it shares a row
  with, rather than a control floating inside the field that bought its space with a whole column of padding on
  every line of text. The placeholder overlay carries the same padding on its own `absolute` layer and does
  **not** inherit the contenteditable's; when the two disagree the hint slides. The trailing side is measured,
  see below.
- The trailing actions row is **measured**, not assumed. A `ResizeObserver` on `[data-slot="composer-actions"]`
  publishes its width as `--composer-actions` on the tray, and both the editor's trailing padding and the
  scroll thumb's offset derive from it: `pe-[calc(var(--composer-actions,44px)+12px)]` and
  `inset-inline-end: calc(var(--composer-actions,24px)+8px)`. The row carries the model chip, whose width follows
  the session, so any fixed number strands one or the other — the text runs under the chip, or the scroll thumb
  ends up between the chip and the submit button. The observer takes an **accessor** (`() => actions`); passing
  the bare variable watches `undefined` and fails silently.
- The floating rows need `z-20`. The contenteditable is `relative z-10` so it covers the placeholder overlay, and a
  positioned element without a z-index loses to any element that has one. Without the higher stack the tray swallows
  every click meant for its actions: the button still measures right, but `elementFromPoint` at its centre returns
  the editor and the caret just blinks there instead of the control behaving like a button.
- The add button lives inside the tray, on the leading edge, and doubles as the menu's dismiss: `[data-expanded]`
  turns it 45° into a cross and gives it the inverse fill. Kobalte already sets that attribute, so no open state
  crosses into the component. The rules are unlayered on purpose — a layered rule would lose to the Tailwind
  utilities carrying the closed colours.
- The tray has no elevation. Do not put `shadow-[var(--v2-elevation-raised)]` back on the form — raised elevation
  belongs to popovers, which still use it. The ring in `[data-dock-border-underlay]` is what carried the slab.
- The tray's 1px rim is a `::before` pseudo-element masked to the border, not a `border` and not a box-shadow. A
  real border takes a pixel out of the content box and breaks the 40px the insets derive from; a box-shadow would
  replace the mask ring from `[data-dock-border-underlay]` rather than stack on it, because the later declaration
  wins outright.
- **The focus glint is gone.** It was a conic gradient masked to the rim, animating `--composer-glint-angle`
  0→360° over 3s on `:focus-within`, peaking at 40% white. It is replaced by the rim stepping from 8% white to
  12% over 150ms, and that replacement is not a taste call — it is what all three references do: Cursor moves
  its stroke 8%→12% over the same 150ms, Claude Desktop moves an inset ring 10%→20% over 200ms, and Codex
  spends its whole focus budget on a transparent outline, i.e. nothing. Three independent implementations spend
  it on a single alpha step. An animated three-second highlight had no counterpart in any of them and on an
  empty screen it was the loudest thing there. The `composerGlint` appearance setting was removed with it,
  end to end — schema, default, controller, persistence, i18n and its test assertion — because a switch that
  controls nothing is a defect, not a harmless leftover.
- Send and stop keep their colour in mutually exclusive `classList` keys, not a base colour the stop state
  overrules: two `bg-*` utilities in one cascade resolve by stylesheet order, not by intent. The tray has no
  variant of its own — `variant="submit"` would repaint it with `--v2-elevation-button-contrast`.
- The model rides inside the **text tray**, in `composer-actions` between the delivery toggle and the submit
  button — Cursor's position, trailing side of the tray with send at the far edge. It names what the prompt is
  about to run on, so it reads as the sentence's own furniture; the bar below is the instrument cluster.
  This documentation claimed the model was in the tray for several rounds while the code had it in the bar
  next to the thinking level: the two are not the same control, one names the thing and the other changes how
  hard it runs. Keep it at `size="small"` (24px) so it matches the button it sits beside, and remember the
  text's trailing padding is measured, see below.
- The bar is two trays, not one row: `composer-controls-tray` holds the thinking-power chip,
  `composer-bar-slot-tray` holds whatever `barSlot` carries. Both carry **no surface at all** — no fill, no
  rim, no shadow. They were the text tray's twins with a hairline until the fill was dropped, and the mark
  read better on its own: a pill of its own around a mark that already sits on a pill above it doubles the
  surface and flattens both. They keep only the text tray's geometry — `rounded-full`, and the chip contour
  that goes with it. They have no contour of their own to shape, since nothing draws one. The slot tray is
  `size-7` (28px square) so its radius is a true circle; the controls tray is `h-7` with `px-1`. `ms-auto`
  sits on the group around both trays, not on the row, for the reason below.
- `justify-end` on the controls row would drag the agent along, so the trailing group uses `ms-auto`. `barSlot`
  is a prop, not state: the generic composer renders whatever the caller passes and knows nothing about sessions.
- Chips take the tray's contour from `editor.css`, not from their own variant: radius only. Every button
  variant carries a small circular radius, which reads as a square block pasted into a round tray the moment it
  takes the hover fill. The rule is unlayered, which also means it beats the variant's own radius —
  `button.css` sits in `@layer components` — so **no chip needs `!rounded-full`**. The model chip is the one that
  looks like it does: it is inside the text tray rather than a bar tray, so it needs its own hook
  (`[data-slot="composer-actions"] [data-action="composer-model"]`). Three more controls take the hover fill and
  so need the contour named, because no slot hook reaches them:
  `[data-action="composer-exit-shell"]` and `[data-action="composer-alternate-delivery"]`, the tray's two text
  buttons, and `[data-action="prompt-project"]`, the new-session project picker.
  **The model chip takes no fill on hover at all** — only the label lifts from muted to base. Cursor's model
  trigger does exactly this (`background-color: transparent`, `transition-duration: 0s`), and eight chips each
  filling put eight separate blocks into a row whose surface is 6% white.
- `editor.css` is **unlayered**, and that is the only reason colour belongs there rather than on the trigger:
  unlayered rules beat every `@layer`, Tailwind's `utilities` included. The direction is worth stating because
  it is easy to get backwards — a colour utility **does** beat `icon-button.css`'s own `color`, since that file
  sits in `@layer components` and `utilities` is declared after it. Verified rather than assumed: adding
  `text-v2-state-fg-danger` to an untouched `ghost-muted` icon button turns it from `#666666` to `#f70a6a`.
  So a class on the trigger is fine on its own and stops working the moment `editor.css` declares the same
  property for that element. The open state is excluded from the attach rule for that reason, and the send
  button's three states are all declared here rather than split between a class and a stylesheet.
- Both bar chips carry a caret. They are the only disclosure-looking controls in the row, and two marks without
  carets read as readouts you cannot open. It was the reverse once and both marks sat shoulder to shoulder
  looking inert.
- The agent picker is `view.agent`, at the leading end of the bar next to the add control. It has one gate,
  `view.agent` returns `undefined` only when the user has switched agents off in Settings → General, and its
  options fall back to `defaultAgent` when the server reports none. That fallback is the point: the gate used
  to be `visible && options.length > 0`, so an empty agent list removed the control entirely — no names, no way
  to see which agent the session runs as, even though the app resolves to `build` everywhere else anyway. One
  honest entry beats no control. Building those options out of `current` instead of a fixed list does not work:
  `current` is what `select` writes, so the list rebuilds from the agent just picked and comes back duplicated.
- The bar's trailing group is measured, not assumed. `ms-auto` pins the model, the thinking level and the
  context ring to the end of whatever width the viewport has, so the row follows the field as it resizes.
- Thinking power is `view.variant` rendered by the editor itself: a `ComposerEditorConfiguredSelect` gated on
  `options().length > 1`, keybind `Shift+Mod+D`. It is not a popover footer and not a segmented group. The
  editor reads it off `props.controller.view`, so `composer/model.ts` stays the only owner of model state and
  `composer/composer.tsx` needs no variant code at all.
- Its trigger is the word alone. A dial beside it was tried twice — icon only, then icon plus label — and
  both failed for the same reason: at 14px a needle says "some level" and nothing more, so the mark either
  replaced a word that already answered it or repeated it. The value has five or six possible names and the
  panel lists all of them, so the chip's whole job is to name the current one. Opened, it shows
  `ComposerEffortPanel`: stops are every option with `default` at the recommended one, and the dot drift
  speeds up with the level.
- The effort window opens on its trigger's **trailing** edge (`placement="top-end"`, threaded through
  `ComposerEditorSelect` as an optional prop). The chip is content-width and the trailing group is pinned to
  the end of the bar, so the chip's _leading_ edge is a function of the label's length — measured 64px at
  "low", 66 at "high", 82 at "default", 88 at "medium" — and moving it moves anything anchored there. With
  `top-start` the window slid 24px every time the level changed. The trailing edge is the one edge the bar
  holds still. Do not "fix" this by giving the chip a fixed width instead: a shorter word then sits in a box
  padded out to the longest one, and the label has to truncate in every language with longer words.
- **One menu modifier, not a rule per window.** `menu-v2-squircle` in `packages/ui/src/navigation/menu/menu.css`
  is the composer's window language: no elevation, a 20px squircle, the tray's 1px masked hairline rim, and rows
  with **no radius and no inset** so the window's own curve draws their fills. Three changes travel together
  because each is what makes the others work — the rim says "there is an edge here" without a shadow, the 20px
  is the tray's other face rather than the menu's 6px, and the menu's 2px gutter is exactly what stops a fill
  reaching the frame the curve has to clip. Giving each row the window's 20px is _not_ the fix: a middle row
  rounded to 20px reads as a lozenge.
- `overflow: hidden` is the rule the whole thing turns on. A curve can draw what reaches it but can only clip
  what is inside its own box, and the menu's default is `visible` — so without it the square row fills ran past
  the corners and a separator's negative margins stepped outside the frame entirely. That was "the elements
  stick out": not a row misplaced, but a fill the window had no power to cut.
- Everything that opens off the composer carries it: the agent picker (as `ComposerEditorSelect`'s default
  `popoverClass`), the add menu, the effort window, and the project picker in `projects/picker.tsx`. The
  effort window opts out of one part — `composer-effort-popover` restores `padding: 2px`, because its panel
  carries its own `p-3` and the knob's travel is measured against the track's own box. It does not re-declare
  the shape or the rim; those live with the modifier so two windows cannot drift apart.
- The add menu's shortcut column is `min-w-5`, not `w-5`. `w-5` sized it for one character, which is right for
  `/`, `@` and `!` and wrong for a two-key hint: `Ctrl+U` overflowed its own box — visibly while the window
  still had `overflow: visible`, then cut off the moment the window clipped. Same defect, two symptoms.
- The slider's `draft` is a **fraction of the scale**, not a stop index. `at()` returns the raw pointer
  position and only `nearest()` rounds it, so the knob tracks the cursor exactly while it is held. Rounding
  in `at()` made every stop a detent the knob jumped between, which is what "the slider is not smooth" felt
  like: the pointer moves and the knob is somewhere else for most of it. Snapping happens on release —
  `onSelect` fires once in `onPointerUp` with `stops()[nearest(draft)]`. Keyboard stepping stays on whole
  stops and commits immediately, since no drag is involved.
- `onPointerCancel` drops the draft and commits nothing: a cancelled drag is a gesture the user took back.
  Committing per `pointermove` instead relabelled the tray chip under the open panel on every pixel, and the
  chip is content-width, so its leading edge moved with the word.
- What the level _reads_ and what it _commits_ are deliberately separate. The fill's colour and the dot pace
  come from `preview()` — the stop the knob is currently on — so both move while the drag is still a
  question; only `onSelect` waits for release. Reading `props.current` for the colour is what made the slider
  look inert: nothing on it changed until the drag was already over.
- The green floor of the scale is a lime mixed in oklab from `green-800` and `yellow-700`, not
  `--v2-state-fg-success`. That token is the app's "this worked" green, and on a dial it read as a status
  rather than as a level running cool. The palette has no lime, so it is mixed from the two hues bracketing
  it rather than hardcoding a hex a custom theme would contradict — and `color-mix` keeps it theme-aware.
- The knob is a 28px square squircle at 12px, centred on the 24px track so it sits proud of it. It was a
  14×24 lozenge the track's height dictated, which read as a bar sliding in a groove rather than as something
  you pick up. The corner is `corner-shape: squircle` **declared in `editor.css`**, because the
  `corner-shape-squircle` utility is not in this Tailwind build: the class compiles and silently does
  nothing. `bg-v2-alpha-dark-40` is missing for the same reason — it compiled and left the element
  transparent. When a class would express one of these, check the computed style before believing it applied.
- The contrast under the knob is a **contact shadow**, `[data-slot="composer-effort-knob-shade"]`: a gradient
  plate painted before the knob, darkest under it, transparent at both ends, and deliberately **twice the
  knob's width**. Sized to match it, a 28px shade sat entirely behind a 28px handle and could not be seen at
  all. A flat fill at one opacity reads as a rectangle with two hard vertical edges pasted onto the line; the
  gradient is what makes it read as depth. An outline around the knob instead would be drawn _over_ the fill.
- The knob's `transition-[left]` is keyed on `!dragging() && !settling()`, and both states are needed.
  `dragging` alone leaves a gap: the release drops the drag immediately but the commit lands tens of
  milliseconds later, and in that window the knob is no longer "dragging" — so it animated the very snap the
  panel had just made, while the fill, which has no transition, jumped there instantly. That is what made the
  knob visibly lag the coloured line every time a drag overshot a level. `settling` is armed on release and
  cleared when the draft is dropped, which happens only once `selected()` matches it.
- The effort dots peak at `opacity: 0.5` in `@keyframes composer-effort-dot`, not in the element: the
  animation animates `opacity`, so an element-level value would be overwritten on every frame. At full
  strength seven dots crossing a 24px track read as debris rather than as motion.
- Their scatter is drawn once per panel from `effortParticles()` — the fixed `EFFORT_PARTICLE_LANES` table
  plus a small random height, pace and phase jitter. Called once for the life of the panel, not per render:
  a plain table sends all seven dots down the same lanes every time the window opens, and a memo would
  reshuffle them under the pointer mid-drag. Keep the jitter small — the table is the rhythm, the jitter only
  breaks it up.
- The placeholder overlay is `text-v2-text-text-base/36`, matching Cursor's
  `color-mix(in srgb, #F0F0F0 36%, transparent)`. It was `text-v2-text-text-faint/55`, a 55% alpha modifier on
  the faintest token, which resolved around 26% — dimmer than either reference (Cursor 36%, Claude Desktop's
  `#898781` about 66%). The editor is `text-[14px]` with `leading-[22px]`, also Cursor's, so the tray is 42px
  rather than 40px.
- The model chip carries no provider mark. The selector groups by provider and draws one per group, which is where
  the mark belongs; on the chip it was noise beside a name that already reads.
- The add button's glyph is drawn in `editor.tsx`, not taken from the icon catalog. Catalog bodies carry no
  `stroke-width`, so they render at the SVG default of one unit — a hairline at these sizes that antialiases
  into a smear. Give a hand-drawn glyph an explicit weight, and give the svg `data-slot="icon-svg"` so the 45°
  cross rule still finds it.

### Editing a user message in place

Clicking a user message turns the bubble into a field: a squircle of its measured width, a textarea of two lines,
the composer's model chip at the leading end and its send disc at the trailing one. Enter sends, Escape and a click
outside dismiss, and the rewrite runs through the machinery that already existed — `revert.to` stages the rewind and
`controller.composer.submit()` runs the turn.

- **Editing changes nothing about the bubble's surface.** No fill, no rim, no radius, no corner curve — the same 14px
  squircle at the same 12% rim in both states. Each of those was tried as a "this is writable" signal (a raised fill, a
  recessed rim, a larger radius for the taller box) and every one of them read as a second component rather than as one
  box becoming editable. What signals it instead is the caret, the controls, and the box growing. The curve is declared
  **once, at rest**, because declaring `corner-shape` only in the editing rule changed the corner shape the moment the
  box opened — which is the thing this removes.
- **`corner-shape` changes the curve's continuity, not its size.** The same 14px radius reads as a plain rounded
  rectangle under an ellipse and as a soft box under a squircle, so the two changes are not interchangeable and the
  radius cannot be reasoned about without knowing which one is in effect. `superellipse(2)` in a computed style is the
  squircle; a `9999px` radius under it clamps straight back to an ellipse, so the two numbers cannot be pushed apart.
- **The padding moves off the bubble and onto its two parts**, because one uniform value cannot serve both: the field
  needs the message's own `8px 12px` or the caret jumps sideways on open, and the controls need a tighter 6px from the
  corner or they read as hung off it. Whichever the bubble picks, one of the two moves. The tray's pill was tried for the
  editing state and reads as a button among messages.
- **The controls sit in flow, not floating over the field.** Floating them needed padding to reserve their space, which
  indented the text 36px from both sides and pushed the last line of a wrapped message under the send button. The row is
  `flex items-center gap-1` with `ms-auto` on send: `justify-between` sets the space _between_ children, and with two
  controls at the leading end that is the wrong gap.
- **Dismissal is a `pointerdown` outside the bubble, not a `focusout`.** The model selector is a portal, and closing it
  after a choice drops focus on the document, so `relatedTarget` is `null` — a focus rule reads that as "dismissed" at the
  exact moment the model was picked, and the editor closed. A pointer says where the hand went, which is what dismissal
  is about. If a focus rule is ever wanted here, it has to survive a null `relatedTarget` and a menu item.
- **The model chip is the tray's own component**, extracted to `packages/app/src/composer/model-control.tsx` so both
  render one thing: the unpaid path, the mobile drawer, provider grouping and the animation are four things to get wrong
  twice. It reaches the message as a **function** rather than a node, because the message owns focus while it is open and
  the picker has to hand focus back to that field, not to the tray. Build it **once in a `createMemo`** — written straight
  into JSX it is reconstructed on every pass over the parent's children, which remounts the selector and closes its menu
  under the pointer on the way to picking a model.
- **Unchanged text is still a send.** The editor carries a model selector, and choosing a different model is the other
  half of the same act; treating untouched text as "nothing to do" made the model unreachable for every message that did
  not also need rewording.
- **Enter-to-edit requires a collapsed selection.** Otherwise dragging across the message to copy a phrase opens the
  editor instead. Collapsing on a click-only press is what tells the two apart.
- **The actions are a right-click window, not a row under the bubble.** A full-width bubble with a control strip under it
  gives every message two things to look at and only one of them is the message. What stays below is the time, because
  that is a reading and not a control; the agent and model names went with the buttons, and the model is on the chip while
  a message is open for editing. The known cost: a right-click window has no keyboard route, so revert and copy are
  pointer-only until something opens it on a key.
- **Kobalte binds `contextmenu` to its `Trigger`, not to its root.** A context menu wrapped around markup that already
  exists needs an explicit `Menu.Context.Trigger`, or right-click does nothing at all and the only symptom is a menu that
  never opens. Both wrappers here carry `contents`: the component's root is a flex column, and a real div between it and
  its children becomes the flex item instead. `Menu.Context`'s props type does not mention `class` even though Kobalte
  forwards it, so the interface in `menu.tsx` now says so.
- **Revert and copy are separated.** They are not two operations — one rewinds the session, the other only reads text —
  and a reader should not have to work out which is which from the order they sit in.
- **The resend composes `revert.to` with the composer's own submit** rather than adding an operation. `revert.to`
  restores the original prompt into the tray, which is right when the tray is the editing surface and wrong here, so the
  tray's draft is captured before and put back after — `restore` is what keeps the message's attachments on the re-sent
  turn. `submit` clones the draft synchronously before its first `await`, which is what makes restoring it immediately
  safe.
- **The attach control was removed, deliberately.** It delegated to the tray's own trigger, which edits the _tray's_
  draft — a second source of truth for one prompt. Doing it properly means the editor writes to that prompt, and that
  also puts the message being edited into the tray as you type, which is not what either of them means. That is a
  decision to make on purpose, not one to arrive at through a button.

**The cascade here is worth stating once.** `message-part.css` is imported into `layer(components)` and `icon-button.css`
is injected from its own module into the same layer, so an equal-specificity rule loses to whichever lands later in the
document — and the component's does. `[data-slot] [data-action]` is not enough; add `[data-component="icon-button-v2"]`
and the rule wins without `!important` and without moving one file out of the layer the rest of the message styles live
in. `editor.css` wins for the opposite reason: it is unlayered, which is why the composer's own chrome can beat a Tailwind
colour utility. Both directions are easy to get backwards, and the failing case looks like "my rule is in the file and does
nothing".

### Timeline density is a named preset, and the array order is not the slider's

`timelinePresets` in `packages/session-ui/src/timeline/detail.ts` holds five presets at the time of writing and **26
call sites address them by index**. Inserting one in the middle silently repoints about fifteen tests at a different
preset, and every one of them keeps passing, so the mistake surfaces as a UI nobody can explain rather than as a
failure. A new preset therefore goes **at the end of the array**, and the two places that care about order state it:

- `packages/app/src/settings/timeline-detail.tsx` names the slider order explicitly (`text-only`, `quiet`, `compact`,
  `separate`, `detailed`, `everything`), least detail first. It must not derive it from the array, because the array
  now ends with the default and reversing it would put the default on the "least" end.
- `defaultSettings.general.timelineDetail` reads `defaultTimelineDetail`, a named export, not `timelinePresets[2]`.

**The default is `separate`: every category on its own row, collapsed.** `compact` groups, which is one line saying
"Used 1 Thought" and hides what it names — too much on the line and too little to read. `quiet` hides them entirely.
The rung between the two was the one that was missing. `tools` carries a placement only, no `details`: a row there is
either present or not, so the preset must not claim a collapsed state it cannot express.

### A rewind of a message the server no longer has is not a failure

`revert.stage` answers `MessageNotFoundError` when the message is already gone from the session — the state the rewind
was for. `request()` in `packages/app/src/session/revert.ts` toasts on every other failure, so that one was the noise
behind "I pressed send and it did not work": the toast named a problem the user could neither cause nor repair, and
`resendMessage` carries on to submit either way.

The suppression is a typed predicate, `isMessageNotFoundError(error, messageID)` in
`packages/app/src/runtime/server/errors.ts`, matched on `_tag` **and** `messageID`. String-matching the toast text
would be the tempting shortcut and it would swallow genuine 404s for other messages. `request()` therefore takes a
`reached` predicate naming the failures that mean the desired state already holds; everything else stays visible.

### The native right-click menu

Electron offers Select All and Inspect Element on right-click. `suppressNativeContextMenu` in
`packages/desktop/src/renderer/context-menu.ts` cancels it everywhere except inside a field, where cut, copy and paste
are real commands no menu of ours stands in for.

**It lives in the desktop shell, not in `packages/app/src/entry.tsx`.** The app's entry is the web and PWA build; the
Electron renderer mounts through `packages/desktop/src/renderer/index.tsx`. Putting it in the app entry typechecks,
prettifies and does nothing, and the only symptom is a menu that is still there.

**It listens on the bubble phase and checks `defaultPrevented` before cancelling. Both halves are load bearing.**
Kobalte's context-menu trigger opens only when `event.defaultPrevented` is false — verified in the installed package,
not assumed:

```js
const onContextMenu = (e) => {
  callHandler(e, local.onContextMenu)
  if (local.disabled) return
  if (e.defaultPrevented) return
```

So a capture-phase listener that cancels eagerly does not merely fail to suppress the native menu. It runs first, sets
the flag, and **every context menu in the app silently stops opening**. That is what happened here, and the symptom
points at the wrong place entirely: the menus look untouched, only right-click does nothing. Letting the trigger cancel
first and then standing down is what makes "cancel it unless something else already did" correct.

### Extension content in the composer

The bar hosts extension content through the `session.composer.bar` slot, one of five on `SlotMap`. Adding a slot
means changing `SlotMap` with TSDoc, rendering it where it belongs, and updating the table in
`packages/gui-extensions/README.md`; `bun script/sdk-docs.ts` fails on a stale guide block or an undocumented member.
Two rules make this cheap to add and cheap to read:

- The session composer fills the slot and the generic composer only receives it as a prop. That keeps
  `ComposerEditor` free of session state, which is what lets the new-session screen reuse it unchanged.
- It is mounted with the composer, so a contribution there is absent while the composer is unmounted and never on a
  screen without a session. Pick `session.header` when the content should survive the composer being gone.

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
- **When the renderer serves code that is not on disk, check the vite log before you change anything.**
  `packages/session-ui` edits are delivered as `hot updated: ../session-ui/...` lines, and after one
  `no importers to handle import.meta.hot.invalidate()` the watcher went quiet for that workspace while app
  files kept updating — twice, over two sessions. A renderer reload did not fix it; only restarting `dev:desktop`
  did. The symptom is a DOM that disagrees with the file you just edited, and the tempting wrong move is to
  re-`edit` the source, which buries the real cause under three diffs of nothing. Grep the log for your file name
  first. The backend on `:3084` is a separate process and a restart does not take it down, but leave it alone
  regardless.
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
