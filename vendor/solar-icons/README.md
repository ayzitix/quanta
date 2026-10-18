# Solar icons — 480 Design

Vendored verbatim from [480-Design/Solar-Icon-Set](https://github.com/480-Design/Solar-Icon-Set) at commit
`44017167688b49109d88ae6a98979b23d8950db0` (2025-06-23). Not yet wired into the icon catalog: `packages/ui/src/icons`
still holds its own hand-drawn set, and the Solar glyphs live here until a specific icon is adopted.

## Attribution

"Solar" is licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). 480 Design is the author. See
`LICENSE-CC-BY-4.0.txt`.

- Author: 480 Design
- Source: https://www.figma.com/community/file/1166831539721848736/solar-icons-set
- License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Attribution is **required**. The app carries it in Settings → About → Third-party notices.

Attribution has to reach the people who receive the artwork, and there are two of them: anyone who receives this
directory, and anyone who receives the shipped app. This file covers the first; `notices.ts` covers the second. A source
comment satisfies neither.

## Modifications

None yet — these files are byte-identical to the source. Anything adopted into `packages/ui/src/icons` **is** a
modification and CC BY asks for it to be marked: Solar is drawn on a 24px grid, this app's catalog is 16px, so a glyph
has to be redrawn rather than scaled. Scaling a 24px glyph to 16px antialiases into a smear at the sizes these render
at, which is the same reason the tray's add mark is hand-drawn today.

Mark it where the artwork actually ships, in the notice's `notice` line, rather than only here.

## Licence gap

The source repository carries no LICENSE file and its README says only "free". CC BY 4.0 is the license recorded by
Iconify, by the `solar-icons` community packages and by every aggregator, and it is the one these files are vendored
under. The author's own terms are worth confirming in writing before a release.

## Styles

`icons/SVG/<Style>/<Category>/<Name>.svg`, six styles: `Bold`, `Bold Duotone`, `Broken`, `Line Duotone`, `Linear`,
`Outline`. 7330 files total, all `viewBox="0 0 24 24"`, all filled shapes — none of them declare `stroke-width`, which
is what keeps them legible at 14px rather than rendering at the SVG default of one unit.

The set's own claim to squircle work is in the source README: corner smoothing raised to 100%, so the glyphs carry the
same continuous-corner curve the app declares with `corner-shape: squircle` on the message bubble.