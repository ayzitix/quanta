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
- The tray's radius is `10px`, and it carries no `corner-shape`. It is a field, not a capsule: the 20px that
  `min(50%, 20px)` gave was exactly half the one-line height, which turns both ends into semicircles, so the
  shape stopped reading as a rounded rectangle at all. A percentage radius was the wrong tool anyway — it
  resolves against the box, so it is 20px on the 40px tray and 90px on the 180px maximum, where the ends
  swallow the start and end of every line. The same 10px stays a visible corner at that maximum, so one number
  serves both heights. Only the radius is here: the button insets derive from the tray's 40px height, not from
  this, so changing it moves nothing else.
- `corner-shape` does **not** inherit, so anything drawn over a squircle has to be told separately: the effort
  window's `::before` rim needs an explicit `corner-shape: inherit`, or it draws a circular hairline on top of
  a squircle and the mismatch shows exactly at the corners, where the eye goes first. The tray declares no
  `corner-shape` at all, so its own `::before` rim and `::after` glint declare none — `inherit` there resolves
  to the initial value and says nothing. Confirm with `getComputedStyle(el, '::before').cornerShape`: it reads
  `superellipse(1)` where there is no squircle and `superellipse(2)` where there is one.
- The two 24px icon buttons keep the squircle the tray gave up: `[data-action="composer-attach"]` and
  `[data-action="composer-submit"]` both get `corner-shape: squircle`, and their radius stays `rounded-full`,
  which on a 24px box clamps to 12px — the same ceiling a squircle has there. The shape and the number are
  independent here, and the buttons are the one place the composer still uses the curve, which is what keeps it
  a deliberate language rather than an inconsistency with the tray. The fill is what carries the shape, and the
  add button's open state inverts that fill on the same element, so it follows the curve in both states.
- Both buttons are `size-6` (24px) inside the tray, at `start-2`/`end-2` and `bottom-2`. All three gaps are 8px:
  `(40 − 24) / 2`, and the horizontal inset matches so neither button is tighter to its edge than to the top and
  bottom. Send is the catalog's `enter`, stop is `stop`.
- Send carries no fill; it brightens its glyph instead, and only when it can act. `canSubmit` drives the
  button's `disabled`, so `editor.css` gives it `--v2-text-text-base` when there is something to send and
  `--v2-text-text-muted` when there is not. The mark is the highlight. The white inverse fill it used to have
  made it the one solid shape in a tray of outlines, and moving that fill behind a content check still claimed
  an armed button over an empty field. The stop state hangs off `data-stopping` rather than a
  `text-v2-state-fg-danger` utility, because the two rules above are unlayered and would outrank it.
- The tray's leading text padding is `ps-11` (44px), which clears a 24px add button sitting 8px in: `8 + 24 + 12`.
  The placeholder overlay carries the same padding on its own `absolute` layer and does **not** inherit the
  contenteditable's — when the two disagree the hint slides under the add button. The trailing side is measured,
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
- The focus glint is that same rim's `::after`: a conic gradient masked to it, so the highlight travels the whole
  perimeter and bends around the corners, with `@property` on the angle so it interpolates and the 3s loop has no
  stall. It appears only under `:focus-within`, so no component observes focus. The `composerGlint` appearance
  setting writes `data-composer-glint="off"` on the root and the rule uses `content: none`, so switching it off
  leaves a tray that never animates rather than one too faint to notice.
- Send and stop keep their colour in mutually exclusive `classList` keys, not a base colour the stop state
  overrules: two `bg-*` utilities in one cascade resolve by stylesheet order, not by intent. The tray has no
  variant of its own — `variant="submit"` would repaint it with `--v2-elevation-button-contrast`.
- The model rides inside the **text tray**, in `composer-actions` before the submit button, not in the bar. It
  names what the prompt is about to run on, so it reads as the sentence's own furniture; the bar below is the
  instrument cluster — readouts, not inputs. Keep it at `size="small"` (24px) so it matches the submit
  button it sits beside, and remember the text's trailing padding is measured, see below.
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
- Chips take the tray's contour from `editor.css`, not from their own variant: radius **and** shape. Every
  button variant carries a small circular radius, which reads as a square block pasted into the tray the moment
  it takes the hover fill, and a circular hover fill against the squircle the chips themselves carry is the
  pairing that looks like an accident. The rule is unlayered for the same reason the glint is, which also
  means it beats the variant's own radius — `button.css` sits in `@layer components` — so **no chip needs
  `!rounded-full`**. The model chip is the one that looks like it does: it is inside the text tray rather than
  a bar tray, so it needs its own hook (`[data-component="composer"] [data-action="composer-model"]`) to reach
  the same rule. Three more controls take the hover fill and so need the contour named, because no slot hook
  reaches them: `[data-action="composer-exit-shell"]` and `[data-action="composer-alternate-delivery"]`, the
  tray's two text buttons, and `[data-action="prompt-project"]`, the new-session project picker. That last one
  was 28px at a 4px radius, so its hover fill read as a plain rounded rectangle sitting beside a squircle chip —
  one control out of step is what makes a set look undesigned rather than composed. Set radius and shape in the
  same rule: at these sizes the radius is a consequence of the curve, and splitting the pair across two files
  is how they drift apart.
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
- The effort window is a squircle at 20px, not the menu's `--radius-md`. It is the tray's other face — the
  window off the same control, carrying the same rim — so it should not be the only rounded-cornered thing in
  the composer, and six pixels is too small for the curve to read at all: the shape would be there and
  invisible. Its 20px is now its own number rather than a match to the tray's, which has come down to 10px
  along with the squircle; the curve still reads at that radius on a box taller than the tray's one line. Its
  `::before` rim needs `corner-shape: inherit` explicitly.
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
- The placeholder overlay is `text-v2-text-text-faint/55`. `faint` is already the lightest text role the theme
  exposes, so extra fade is an opacity modifier, not a second token.
- The model chip carries no provider mark. The selector groups by provider and draws one per group, which is where
  the mark belongs; on the chip it was noise beside a name that already reads.
- The add button's glyph is drawn in `editor.tsx`, not taken from the icon catalog. Catalog bodies carry no
  `stroke-width`, so they render at the SVG default of one unit — a hairline at these sizes that antialiases
  into a smear. Give a hand-drawn glyph an explicit weight, and give the svg `data-slot="icon-svg"` so the 45°
  cross rule still finds it.

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
