import { WORDMARK_GLYPHS, WORDMARK_LETTERS } from "@opencode/ui/wordmark/glyphs"
import { createEffect, For, on, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

// "quanta" set in the mark's 5x7 block grid. Each glyph symbol draws the letter at the origin
// and repeats it two units down and right for the shadow layer, so the symbol box is 27x37.
const target = WORDMARK_LETTERS

const choices = [...new Set(WORDMARK_LETTERS)]

const PITCH = 30

export function AnimatedWordmark(props: { active: boolean }) {
  const [state, setState] = createStore({ letters: [...target] })
  const timers = new Set<ReturnType<typeof setTimeout>>()

  createEffect(
    on(
      () => props.active,
      (active) => {
        timers.forEach(clearTimeout)
        timers.clear()

        if (!active || matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setState("letters", [...target])

          return
        }

        const starts = target.map(() => choices[Math.floor(Math.random() * choices.length)])
        const settles = target.map(() => 6 + Math.floor(Math.random() * 8))
        const last = Math.max(...settles)
        setState("letters", starts)

        Array.from({ length: last }, (_, index) => index + 1).forEach((tick) => {
          const timer = setTimeout(() => {
            setState(
              "letters",
              target.map((letter, index) =>
                tick >= settles[index] ? letter : choices[Math.floor(Math.random() * choices.length)],
              ),
            )
            timers.delete(timer)
          }, tick * 75)

          timers.add(timer)
        })
      },
    ),
  )

  onCleanup(() => timers.forEach(clearTimeout))

  return (
    <svg class="settings-about-wordmark" viewBox="0 0 177 32" aria-hidden="true">
      <defs>
        <For each={Object.entries(WORDMARK_GLYPHS)}>
          {([letter, path]) => (
            <symbol id={`settings-about-letter-${letter}`} viewBox="0 0 27 32">
              <path class="settings-about-letter-shadow" d={path} transform="translate(2,2)" />
              <path d={path} />
            </symbol>
          )}
        </For>
      </defs>
      <For each={state.letters}>
        {(letter, index) => (
          <use href={`#settings-about-letter-${letter}`} x={index() * PITCH} width="27" height="32" />
        )}
      </For>
    </svg>
  )
}
