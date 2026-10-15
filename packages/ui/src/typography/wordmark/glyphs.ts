// Quanta wordmark geometry.
//
// "quanta" is set in the same block grid as the app mark: every glyph occupies a 5 cell wide
// by 6 cell tall box. Row 0 is the ascender used by t, rows 1 to 5 are the x-height, and row 5
// is the shared baseline. "X" is ink, "." is empty.
//
// Keeping the letters as a bitmap rather than as baked path data means the combined wordmark
// and the per-glyph symbols the About screen animates can never drift apart, and the source
// stays legible.

const GLYPHS = {
  q: [".....", "XXXXX", "X...X", "XXXXX", "....X", "....X"],
  u: [".....", "X...X", "X...X", "X...X", "X...X", "XXXXX"],
  a: [".....", "XXXXX", "....X", "XXXXX", "X...X", "XXXXX"],
  n: [".....", "XXXXX", "X...X", "X...X", "X...X", "X...X"],
  t: [".X...", "XXXXX", ".X...", ".X...", ".X...", ".XXXX"],
} satisfies Record<string, string[]>

// The word, typed against the glyph table so a typo is a compile error rather than a blank cell.
export const WORDMARK_LETTERS = ["q", "u", "a", "n", "t", "a"] satisfies (keyof typeof GLYPHS)[]

// Cell size and glyph pitch, in viewBox units. Both are multiples of 5 so the squares stay
// crisp at any render size.
const CELL = 5

const PITCH = 30

export const WORDMARK_WIDTH = WORDMARK_LETTERS.length * PITCH - (PITCH - CELL * 5)

export const WORDMARK_HEIGHT = 6 * CELL

export const WORDMARK_VIEWBOX = `0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`

function blockPath(pattern: string[], cell: number, offsetX = 0) {
  const parts: string[] = []

  for (let row = 0; row < pattern.length; row++) {
    for (let column = 0; column < pattern[row].length; column++) {
      if (pattern[row][column] !== "X") continue

      const x = column * cell + offsetX
      const y = row * cell

      parts.push(`M${x} ${y}H${x + cell}V${y + cell}H${x}Z`)
    }
  }

  return parts.join("")
}

function wordmarkPath(offsetX: number) {
  return WORDMARK_LETTERS.map((letter, index) => blockPath(GLYPHS[letter], CELL, offsetX + index * PITCH)).join("")
}

// One path per letter, in its own 0-origin box. The About screen draws one symbol per letter
// so it can shuffle them independently.
export const WORDMARK_GLYPHS = Object.fromEntries(
  Object.entries(GLYPHS).map(([letter, glyph]) => [letter, blockPath(glyph, CELL)]),
) satisfies Record<string, string>

export const WORDMARK = wordmarkPath(0)