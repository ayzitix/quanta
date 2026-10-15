import { type ComponentProps } from "solid-js"
import { WORDMARK, WORDMARK_VIEWBOX } from "../typography/wordmark/glyphs"

// The mark is a 3x3 grid of blocks inside a 250 unit box, with the top-left, centre and
// bottom-right cells left empty. Kept as a single path so theming stays one fill and the
// outline treatment used by the wordmark keeps working.
const MARK = "M0 167H83V250H0ZM83 167H167V250H83ZM167 83H250V167H167ZM83 0H167V83H83ZM167 0H250V83H167ZM0 83H83V167H0Z"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 250 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-mark-blocks" d={MARK} fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 250 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={MARK} fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={WORDMARK_VIEWBOX}
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <path d={WORDMARK} fill="var(--icon-strong-base)" />
    </svg>
  )
}