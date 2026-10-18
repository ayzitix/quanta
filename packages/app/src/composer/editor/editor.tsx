import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  Suspense,
  lazy,
  type ComponentProps,
  type JSX,
} from "solid-js"
import { createStore } from "solid-js/store"
import { createResizeObserver } from "@solid-primitives/resize-observer"
import { createMediaQuery } from "@solid-primitives/media"
import { FileIcon } from "@opencode/ui/file-icon"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { createAnimatedPresence } from "@/runtime/animated-presence"
import { resolveBlobUrl } from "@/runtime/persistence/drafts"
import { ProviderModelIcon } from "@/providers/models/provider-group"
import { useI18n } from "@opencode/ui/context/i18n"
import { Button } from "@opencode/ui/button"
import { Keybind } from "@opencode/ui/keybind"
import { Menu } from "@opencode/ui/menu"
import { Tooltip } from "@opencode/ui/tooltip"
import { ScrollView } from "@opencode/ui/scroll-view"
import { AttachmentCard } from "@opencode/session-ui/attachment-card"
import { ProgressCircle } from "@opencode/ui/progress-circle"
import type { Upload } from "../attachments/uploads"
import { CommentCard } from "@opencode/session-ui/comment-card"
import { typeLabel } from "@opencode/session-ui/message-file"
import { getFilename } from "@opencode/util/path"
import { Skill } from "@opencode/schema/skill"
import type {
  ComposerAgentPart,
  ComposerAttachment,
  ComposerComment,
  ComposerFilePart,
  ComposerOption,
  ComposerPrompt,
  ComposerSkillPart,
  ComposerSuggestion,
} from "../types"
import type { ComposerEditorModel, ComposerSelectControl } from "./interaction"
import { isAttachment } from "../prompt-parts"
import "../attachments/attachments.css"
import "./editor.css"

const MobilePanelDrawer = lazy(async () => {
  const { MobilePanelDrawer } = await import("@/shell/mobile-panel-drawer")

  return { default: MobilePanelDrawer }
})

export type {
  ComposerAttachment,
  ComposerComment,
  ComposerOption,
  ComposerPersistedState,
  ComposerSuggestion,
} from "../types"

export type ComposerMode = "normal" | "shell"

const COMPOSER_SUGGESTION_MAX_HEIGHT = 320

const COMPOSER_SUGGESTION_ROW_HEIGHT = 28

const COMPOSER_SUGGESTION_ROW_PEEK = 18

const COMPOSER_SUGGESTION_TOP_PADDING = 8

const COMPOSER_SUGGESTION_SEARCH_HEIGHT = 28

const COMPOSER_SUGGESTION_CONTEXT_RESERVE = 80

export type ComposerEditorProps = {
  controller: ComposerEditorModel
  disabled?: boolean
  readOnly?: boolean
  borderUnderlay?: boolean
  class?: string
  modelControl?: JSX.Element
  /** Sits before the model control. The caller owns it, so this editor stays free of session state. */
  barSlot?: JSX.Element
  modelControlsVisible?: boolean
  attachKeybind?: string[]
  attachShortcut?: string
  alternateKeybind?: string[]
  exitShellKeybind?: string[]
  suggestionBoundary?: () => HTMLElement | undefined
}

export function ComposerEditor(props: ComposerEditorProps) {
  const i18n = useI18n()
  const state = props.controller.state
  const view = props.controller.view
  let editor: HTMLDivElement | undefined
  let viewport: HTMLDivElement | undefined
  let controlsViewport!: HTMLDivElement
  let controlsContent!: HTMLDivElement
  let tray: HTMLFormElement | undefined
  let actions: HTMLDivElement | undefined

  // The trailing actions hold the submit button and whatever delivery control is showing, and their width is
  // not knowable from CSS: the delivery control appears and disappears with the session's settings. Measure
  // the row and publish it, so the text clears all of it. Reserving only the submit button — which is what a
  // fixed trailing padding does — leaves a control sitting on the last line of a long prompt.
  createResizeObserver(
    () => actions,
    (rect) => tray?.style.setProperty("--composer-actions", `${Math.ceil(rect.width)}px`),
  )

  const [overflow, setOverflow] = createStore({ start: false, end: false })

  const updateOverflow = () => {
    const offset = Math.abs(controlsViewport.scrollLeft)
    setOverflow({
      start: offset > 1,
      end: controlsViewport.scrollWidth - controlsViewport.clientWidth - offset > 1,
    })
  }

  onMount(() => {
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(controlsViewport)
    observer.observe(controlsContent)
    updateOverflow()
    onCleanup(() => observer.disconnect())
  })
  let localInput = false

  const updateCursor = () => {
    if (!editor || !window.getSelection()?.isCollapsed) return
    props.controller.onCursor(composerCursor(editor))
  }

  const mode = createMemo(() => state.mode)

  const buttons = createMemo(() => ({
    opacity: mode() === "normal" ? 1 : 0,
    "pointer-events": mode() === "normal" ? ("auto" as const) : ("none" as const),
    transition: "opacity 200ms ease",
  }))

  createEffect(() => {
    const parts = props.controller.parts()

    if (!editor) return

    if (localInput) {
      localInput = false

      return
    }

    renderComposerEditor(editor, parts)
  })

  // Kept out of JSX: an inline ternary prop compiles to a memo created on every read, and the popover reads
  // search from a ResizeObserver callback, where that memo has no owner and is never disposed.
  const search = () =>
    state.popover.type === "command-menu"
      ? {
          value: state.popover.query,
          label: i18n.t("ui.promptInput.commands"),
          placeholder: "/",
          onValueChange: props.controller.setQuery,
          onKeyDown: props.controller.onKeyDown,
        }
      : undefined

  return (
    <div class={`relative size-full flex flex-col gap-0.5 ${props.class ?? ""}`}>
      <input
        ref={props.controller.setFileInput}
        type="file"
        multiple
        class="hidden"
        onChange={(event) => {
          const list = event.currentTarget.files

          if (list) props.controller.addAttachments(Array.from(list))
          event.currentTarget.value = ""
        }}
      />
      <Show when={!view.draftOnly && state.popover.type !== "closed"}>
        <ComposerEditorPopover
          emptyLabel={i18n.t("ui.promptInput.noMatchingItems")}
          items={props.controller.suggestions()}
          boundary={props.suggestionBoundary}
          activeID={state.popover.type === "closed" ? undefined : state.popover.activeID}
          search={search()}
          onActiveChange={(item) => props.controller.dispatch({ type: "popover.active", id: item.id })}
          onSelect={(item) => props.controller.dispatch({ type: "popover.select", item })}
        />
      </Show>
      <form
        ref={tray}
        data-component="composer"
        data-dock-border-underlay={props.borderUnderlay ? "true" : undefined}
        class="group/composer relative min-h-0 w-full overflow-clip bg-v2-background-bg-base"
        onSubmit={(event) => {
          event.preventDefault()

          if (!props.disabled) props.controller.submit()
        }}
        onDragEnter={props.controller.onDragEnter}
        onDragOver={props.controller.onDragOver}
        onDragLeave={props.controller.onDragLeave}
        onDrop={props.controller.onDrop}
      >
        <Show when={state.mode === "normal"}>
          <ComposerAttachments
            attachments={props.controller.attachments()}
            uploads={props.controller.uploads()}
            comments={props.controller.comments()}
            files={props.controller.files()}
            activeCommentID={state.activeContextID}
            removeLabel={i18n.t("ui.promptInput.removeAttachment")}
            onAttachmentClick={props.controller.openAttachment}
            onAttachmentRemove={(attachment) => props.controller.removeAttachment(attachment.id)}
            onUploadCancel={(upload) => props.controller.cancelUpload(upload.id)}
            onCommentClick={(comment) => props.controller.toggleContext(comment.key)}
            onCommentRemove={(comment) => props.controller.removeContext(comment.key)}
            onFileRemove={(file) => props.controller.removeContext(file.key)}
          />
        </Show>

        <ScrollView
          data-component="composer-scroll"
          class="min-h-0 max-h-[180px]"
          viewportRef={(element) => {
            viewport = element
            element.tabIndex = -1
          }}
        >
          <div
            ref={(element) => {
              editor = element
              props.controller.setEditor(element)
            }}
            data-component="composer-editor"
            role="textbox"
            aria-multiline="true"
            aria-label={i18n.t("ui.promptInput.label")}
            dir={state.mode === "normal" ? "auto" : "ltr"}
            contenteditable={!props.disabled && !props.readOnly}
            autocapitalize={state.mode === "normal" ? "sentences" : "off"}
            autocorrect={state.mode === "normal" ? "on" : "off"}
            spellcheck={state.mode === "normal"}
            // @ts-expect-error
            autocomplete="off"
            class="relative z-10 block min-h-10 w-full whitespace-pre-wrap bg-transparent py-2.5 pe-[calc(var(--composer-actions,44px)+12px)] ps-4 text-[14px] font-[440] leading-[22px] text-v2-text-text-base focus:outline-none [&_[data-mention=file]]:text-syntax-property [&_[data-mention=agent]]:text-syntax-type [&_[data-mention=reference]]:text-syntax-keyword"
            classList={{ "font-mono!": state.mode === "shell", "opacity-50": props.disabled }}
            style={{
              "unicode-bidi": state.mode === "normal" ? "plaintext" : undefined,
              "text-align": "start",
            }}
            onInput={(event) => {
              const cursor = composerCursor(event.currentTarget)
              const prompt = parseComposerEditor(event.currentTarget)
              const attachments = props.controller.parts().filter(isAttachment)
              localInput = true
              props.controller.onInput(prompt.map((part) => part.content).join(""), [...prompt, ...attachments], cursor)
            }}
            onKeyDown={(event) => {
              if (!view.draftOnly && props.controller.onKeyDown(event)) return
              const mod = event.metaKey || event.ctrlKey

              if (mod && event.key === "ArrowUp" && !event.shiftKey && !event.altKey) {
                if (view.submit.queue?.editFirst()) event.preventDefault()

                return
              }

              if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                event.preventDefault()

                if (event.repeat) return
                props.controller.submit(mod ? { alternate: true } : undefined)
              }
            }}
            onKeyUp={updateCursor}
            onPointerUp={updateCursor}
            onPaste={(event) => {
              props.controller.onPaste(event)
              // Programmatic multiline insertion does not reliably reveal the caret.
              requestAnimationFrame(() => {
                const selection = window.getSelection()

                if (!editor || !viewport || !selection?.isCollapsed || !selection.rangeCount) return

                if (!editor.contains(selection.anchorNode)) return
                const caret = selection.getRangeAt(0).getBoundingClientRect()

                if (!caret.height) return
                const bounds = viewport.getBoundingClientRect()

                if (caret.bottom > bounds.bottom - 8) viewport.scrollTop += caret.bottom - bounds.bottom + 8

                if (caret.top < bounds.top + 8) viewport.scrollTop += caret.top - bounds.top - 8
              })
            }}
            onFocus={() => props.controller.dispatch({ type: "focus.editor" })}
          />
          <Show when={!props.controller.value()}>
            {/* The hint is a sibling overlay, not the editor's own text: it does not inherit the padding above,
                and when the two disagree the hint slides away from where the text will actually start. The
                leading pad is a plain field inset now that no button shares the tray's leading edge. */}
            <div
              dir={state.mode === "normal" ? "auto" : "ltr"}
              class="pointer-events-none absolute inset-x-0 top-0 ps-4 pe-[calc(var(--composer-actions,44px)+12px)] pt-2.5 text-[14px] font-[440] leading-[22px] text-v2-text-text-base/36"
              classList={{ "font-mono!": state.mode === "shell" }}
              style={{ "unicode-bidi": state.mode === "normal" ? "plaintext" : undefined, "text-align": "start" }}
            >
              {view.placeholder?.() ??
                (state.mode === "shell"
                  ? i18n.t("ui.promptInput.placeholder.shell")
                  : i18n.t("ui.promptInput.placeholder.normal", { slash: "/", at: "@" }))}
            </div>
          </Show>
        </ScrollView>

        {/* z-20 clears the contenteditable's z-10: the editor covers the placeholder overlay, and
            without a higher stack the tray would swallow clicks meant for these actions.

            `bottom-2` with no height on the row and nothing added to the editor's padding. That is the
            whole mechanism and every attempt to improve on it broke the tray instead.

            The row is absolutely positioned, so `inset-y-0` would span whatever height a draft had made the
            tray and `items-center` inside that span re-centres the controls every time a line is added -- they
            travel down the tray with the text. `bottom-2` anchors to the tray's bottom edge instead, which does
            not move, and matches the `end-2` the row already had on the right.

            The height is deliberately absent, and no bottom padding was added to compensate. Both were tried:
            a fixed `h-9` needs the text to clear the row, and clearance on the editor is a reservation the
            *empty* tray pays for -- measured at 68px where it had been 44px, and it never shrank back. A row
            with its natural height over the bottom inset overlaps the last line only in a draft long enough
            to have one, which is what `bottom-2` and the trailing text padding are for. */}
        <div
          ref={actions}
          data-slot="composer-actions"
          class="absolute end-2 bottom-2 z-20 flex max-w-[calc(100%-104px)] items-center"
        >
          <Show when={state.mode === "normal"}>
            <ComposerEditorAlternateDelivery
              controller={props.controller}
              keybind={props.alternateKeybind ?? ["Mod", "Enter"]}
            />
          </Show>
          <Show when={state.mode === "shell"}>
            <Button
              data-action="composer-exit-shell"
              type="button"
              variant="ghost-faint"
              size="small"
              class="me-3 gap-1.5 px-1.5"
              onClick={() => {
                props.controller.dispatch({ type: "mode.normal" })
                props.controller.restoreFocus()
              }}
            >
              {i18n.t("ui.promptInput.exitShell")}
              <span class="hidden sm:block">
                <Keybind keys={props.exitShellKeybind ?? ["ESC"]} variant="neutral" />
              </span>
            </Button>
          </Show>
          {/* The model rides in the text tray at the trailing end, immediately before send. It names what
              this prompt is about to run as, which is a property of the sentence being written, and Cursor
              places it in the same position — trailing side of the tray, send at the far edge. Its width
              follows the session, which is why the row is measured rather than given a fixed width. */}
          <ComposerEditorSubmitButton
            mode={state.mode}
            stopping={view.submit.stopping()}
            disabled={!props.controller.canSubmit()}
            sendLabel={i18n.t("ui.promptInput.send")}
            stopLabel={i18n.t("ui.promptInput.stop")}
            onSubmit={() => props.controller.submit()}
            onStop={props.controller.stop}
          />
        </div>
      </form>

      <div data-slot="composer-bar" class="flex h-9 items-center gap-1 px-1">
        {/* The add control moved out of the tray and to the leading end of this bar, where the agent chip
            already sits. It was a button floating inside the text field, and it bought its space with a
            44px leading pad on every line of text — a whole column of padding whose only job was to clear a
            24px control. On the bar it is a control among controls, next to the agent it shares a row with,
            and the tray is left holding the sentence and nothing else. It sits outside the scrolling viewport
            so it does not scroll away with the agent when the row overflows. */}
        <div
          data-slot="composer-leading"
          aria-hidden={state.mode === "shell"}
          inert={state.mode === "shell" ? true : undefined}
          style={buttons()}
          class="flex shrink-0 items-center gap-1 px-1"
        >
          <ComposerEditorAddMenu
            disabled={view.draftOnly || state.mode === "shell"}
            title={i18n.t("ui.promptInput.add")}
            keybind={props.attachKeybind ?? ["Mod", "U"]}
            attachLabel={i18n.t("ui.promptInput.attachments")}
            attachShortcut={props.attachShortcut ?? "Mod+U"}
            commandsLabel={i18n.t("ui.promptInput.commands")}
            contextLabel={i18n.t("ui.promptInput.context")}
            shellLabel={i18n.t("ui.promptInput.shell")}
            onAttach={props.controller.attach}
            onCommands={props.controller.openCommands}
            onContext={props.controller.openContext}
            onShell={props.controller.openShell}
          />
          {/* The agent joins the add control at the leading end. It was the first thing in the scrolling
              viewport, so it was the first thing to scroll away when the row overflowed, while the model and
              the thinking level sat still at the trailing end — the two things you change least were the two
              that stayed. Naming the agent is a choice about the message, not a readout, so it belongs with
              the control that starts one. */}
          <Show when={view.agent} keyed>
            {(control) => (
              <ComposerEditorConfiguredSelect
                title={i18n.t("ui.promptInput.chooseAgent")}
                action="composer-agent"
                keybind={["Mod", "."]}
                control={control}
              />
            )}
          </Show>
        </div>
        <div
          ref={controlsViewport}
          data-slot="composer-controls"
          data-overflow-start={overflow.start}
          data-overflow-end={overflow.end}
          class="min-w-0 flex-1 overflow-x-auto overscroll-x-contain no-scrollbar"
          onScroll={updateOverflow}
          aria-hidden={state.mode === "shell"}
          inert={state.mode === "shell" ? true : undefined}
          style={buttons()}
        >
          <div ref={controlsContent} class="flex h-full w-max min-w-full items-center gap-1">
            {/* ms-auto pins the trailing group to the end of whatever width the viewport currently has,
                so the row follows the field as it resizes instead of the controls drifting in from the left.
                The tray is the controls' own pill, not the text box above it: two marks in a row read as
                one control group when they share a surface, and gap-0.5 keeps it tight without touching. */}
            <div class="ms-auto flex h-7 shrink-0 items-center gap-1">
              <div data-slot="composer-controls-tray" class="flex h-7 shrink-0 items-center gap-0.5 rounded-full px-1">
                {/* The thinking level sits alone in the bar. It was paired with the model here, and both
                    answer "what will this prompt run as" — but the model names the thing and the level
                    changes how hard it runs, so they are not the same control. With the model in the text
                    tray the bar keeps one mark, and the pair reads as a row rather than a cluster. */}
                <Show when={view.variant} keyed>
                  {(control) => (
                    <Show when={control.options().length > 1}>
                      <ComposerEditorConfiguredSelect
                        mobileDrawer
                        popoverClass="menu-v2-squircle composer-effort-popover"
                        panel={
                          <ComposerEffortPanel
                            options={control.options()}
                            current={control.current()}
                            onSelect={control.onSelect}
                          />
                        }
                        title={i18n.t("ui.promptInput.chooseVariant")}
                        action="composer-variant"
                        placement="top-end"
                        keybind={["Shift", "Mod", "D"]}
                        control={control}
                        class={control.current() === "default" ? "composer-variant-default" : undefined}
                      />
                    </Show>
                  )}
                </Show>
                <Show when={props.modelControlsVisible ?? true}>
                  {/* After the thinking level, not in the text tray. The tray is for what you are writing;
                      the model and the level are both what the prompt will run as, and they belong together
                      in the bar where the pair reads as one row of instruments. */}
                  <div class="flex min-w-0 items-center" inert={view.draftOnly ? true : undefined}>
                    {props.modelControl}
                  </div>
                </Show>
              </div>
              <Show when={props.barSlot}>
                {/* No fill and no rim: the slot carries one round readout, and a pill around it reads as a
                    second control rather than as the mark. The 28px box stays as hit area only. */}
                <div
                  data-slot="composer-bar-slot-tray"
                  class="flex size-7 shrink-0 items-center justify-center rounded-full"
                >
                  {props.barSlot}
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const mentionParts = new WeakMap<HTMLElement, Exclude<ComposerPrompt[number], ComposerAttachment | { type: "text" }>>()

function renderComposerEditor(editor: HTMLDivElement, prompt: ComposerPrompt) {
  const active = document.activeElement === editor
  editor.replaceChildren(
    ...prompt.flatMap<Node>((part) => {
      if (isAttachment(part)) return []

      if (part.type === "text") return [document.createTextNode(part.content)]
      const mention = document.createElement("span")
      mentionParts.set(mention, part)
      mention.textContent = part.content
      mention.contentEditable = "false"
      mention.dir = "auto"
      mention.style.unicodeBidi = "isolate"
      mention.dataset.mention =
        part.type === "file" && part.mime === "application/x-directory" ? "reference" : part.type

      if (part.type === "agent") mention.dataset.name = part.name

      if (part.type === "skill") {
        mention.dataset.id = part.id
        mention.dataset.name = part.name
      }

      if (part.type === "file") {
        mention.dataset.path = part.path

        if (part.mime) mention.dataset.mime = part.mime

        if (part.filename) mention.dataset.filename = part.filename
      }

      return [mention]
    }),
  )

  if (!active) return
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function parseComposerEditor(editor: HTMLDivElement) {
  const parts: Exclude<ComposerPrompt[number], ComposerAttachment>[] = []
  let buffer = ""
  let position = 0

  const flush = () => {
    if (!buffer) return
    parts.push({ type: "text", content: buffer, start: position, end: position + buffer.length })
    position += buffer.length
    buffer = ""
  }

  const mention = (element: HTMLElement) => {
    flush()
    const content = element.textContent ?? ""
    const original = mentionParts.get(element)

    if (element.dataset.mention === "agent") {
      const agent: ComposerAgentPart = {
        type: "agent",
        name: element.dataset.name ?? content.slice(1),
        content,
        start: position,
        end: position + content.length,
      }

      parts.push(original?.type === "agent" ? { ...original, ...agent } : agent)
      position += content.length

      return
    }

    if (element.dataset.mention === "skill") {
      const skill: ComposerSkillPart = {
        type: "skill",
        id: Skill.ID.make(element.dataset.id ?? content.slice(1)),
        name: Skill.Name.make(element.dataset.name ?? content.slice(1)),
        content,
        start: position,
        end: position + content.length,
      }

      parts.push(original?.type === "skill" ? { ...original, ...skill } : skill)
      position += content.length

      return
    }

    const parsed: ComposerFilePart = {
      type: "file",
      path: element.dataset.path ?? content.slice(1),
      content,
      start: position,
      end: position + content.length,
    }

    const file: ComposerFilePart = original?.type === "file" ? { ...original, ...parsed } : parsed

    if (element.dataset.mime) file.mime = element.dataset.mime

    if (element.dataset.filename) file.filename = element.dataset.filename
    parts.push(file)
    position += content.length
  }

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent ?? ""

      return
    }

    if (!(node instanceof HTMLElement)) return

    if (node.dataset.mention) {
      mention(node)

      return
    }

    if (node.tagName === "BR") {
      buffer += "\n"

      return
    }

    Array.from(node.childNodes).forEach(visit)
  }

  Array.from(editor.childNodes).forEach((node, index, nodes) => {
    visit(node)

    if (node instanceof HTMLElement && ["DIV", "P"].includes(node.tagName) && index < nodes.length - 1) buffer += "\n"
  })
  flush()

  if (
    parts.every((part) => part.type === "text") &&
    parts.every((part) => part.content.replace(/[\n\u200B]/g, "") === "")
  ) {
    return [{ type: "text" as const, content: "", start: 0, end: 0 }]
  }

  if (parts.length > 0) return parts

  return [{ type: "text" as const, content: "", start: 0, end: 0 }]
}

function composerCursor(editor: HTMLDivElement) {
  const selection = window.getSelection()

  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return editor.textContent?.length ?? 0
  const range = selection.getRangeAt(0).cloneRange()
  range.selectNodeContents(editor)
  range.setEnd(selection.anchorNode!, selection.anchorOffset)

  return range.toString().length
}

export function ComposerAttachments(props: {
  attachments: ComposerAttachment[]
  uploads?: Upload[]
  comments?: ComposerComment[]
  // Files attached without a mention, such as one restored from a prompt another client sent.
  files?: Extract<ComposerComment, { type: "file" }>[]
  activeCommentID?: string
  removeLabel: string
  onAttachmentClick?: (attachment: ComposerAttachment) => void
  onAttachmentRemove: (attachment: ComposerAttachment) => void
  onUploadCancel?: (upload: Upload) => void
  onCommentClick?: (comment: ComposerComment) => void
  onCommentRemove?: (comment: ComposerComment) => void
  onFileRemove?: (file: Extract<ComposerComment, { type: "file" }>) => void
}) {
  const i18n = useI18n()
  const percent = (upload: Upload) => (upload.size === 0 ? 100 : Math.floor((upload.loaded / upload.size) * 100))

  return (
    <Show
      when={
        props.attachments.length > 0 ||
        (props.uploads?.length ?? 0) > 0 ||
        (props.comments?.length ?? 0) > 0 ||
        (props.files?.length ?? 0) > 0
      }
    >
      <div data-component="composer-attachments" data-slot="composer-attachments" class="relative">
        <div
          data-slot="composer-attachments-scroll"
          class="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar px-2 pt-2 pb-1"
        >
          <For each={props.comments ?? []}>
            {(comment) => (
              <div class="relative group shrink-0">
                <Tooltip
                  value={comment.comment}
                  placement="top"
                  openDelay={800}
                  contentClass="max-w-[300px] break-words"
                >
                  <CommentCard
                    comment={comment.comment ?? ""}
                    target={
                      comment.type === "note"
                        ? { type: "note", label: comment.label, icon: comment.icon }
                        : { type: "file", path: comment.path, selection: comment.selection }
                    }
                    active={comment.key === props.activeCommentID}
                    onClick={() => props.onCommentClick?.(comment)}
                  />
                </Tooltip>
                <button
                  type="button"
                  onClick={() => props.onCommentRemove?.(comment)}
                  class="absolute -top-1 -end-1 size-4 rounded-full bg-v2-icon-icon-muted outline-solid outline-1 outline-v2-icon-icon-contrast flex items-center justify-center hover-reveal group-hover:opacity-100"
                  aria-label={props.removeLabel}
                >
                  <Icon name="outline-xmark" class="text-v2-icon-icon-contrast" />
                </button>
              </div>
            )}
          </For>
          <For each={props.files ?? []}>
            {(file) => (
              <div class="relative group shrink-0" data-slot="composer-context-file">
                <Tooltip value={file.path} placement="top" contentClass="break-all">
                  <AttachmentCard title={file.name ?? getFilename(file.path)} surface="base">
                    <FileIcon node={{ path: file.path, type: "file" }} />
                    <span>
                      {typeLabel(file.name ?? file.path, "text/plain", i18n.t("ui.common.file"))}
                      <Show when={file.selection}>
                        {(selection) =>
                          selection().startLine === selection().endLine
                            ? `:${selection().startLine}`
                            : `:${selection().startLine}-${selection().endLine}`
                        }
                      </Show>
                    </span>
                  </AttachmentCard>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => props.onFileRemove?.(file)}
                  class="absolute -top-1 -end-1 size-4 rounded-full bg-v2-icon-icon-muted outline-solid outline-1 outline-v2-icon-icon-contrast flex items-center justify-center hover-reveal group-hover:opacity-100"
                  aria-label={props.removeLabel}
                >
                  <Icon name="outline-xmark" class="text-v2-icon-icon-contrast" />
                </button>
              </div>
            )}
          </For>
          <For each={props.attachments}>
            {(attachment) => (
              <div class="relative group shrink-0">
                <Tooltip
                  value={attachment.type === "path" ? attachment.path : attachment.filename}
                  placement="top"
                  contentClass="break-all"
                >
                  <Show
                    when={attachment.type === "image" && attachment.mime.startsWith("image/") ? attachment : undefined}
                    fallback={
                      <AttachmentCard title={attachment.filename}>
                        {typeLabel(attachment.filename, attachment.mime, i18n.t("ui.common.file"))}
                      </AttachmentCard>
                    }
                  >
                    {(image) => {
                      // Restored drafts and history carry image ids only; bytes load when shown.
                      const [url] = createResource(() => image().blob, resolveBlobUrl)

                      return (
                        <>
                          {/* Keep loading local; the route boundary would detach the screen and drop editor focus. */}
                          <Suspense fallback={<div class="w-[58px] h-[46px]" />}>
                            <img
                              src={url() ?? ""}
                              alt={attachment.filename}
                              class="w-[58px] h-[46px] rounded-[6px] object-cover"
                              onClick={() => props.onAttachmentClick?.(attachment)}
                            />
                          </Suspense>
                          <div class="absolute inset-0 rounded-[6px] shadow-[inset_0_0_0_0.5px_var(--v2-border-border-base)] pointer-events-none" />
                        </>
                      )
                    }}
                  </Show>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => props.onAttachmentRemove(attachment)}
                  class="absolute -top-1 -end-1 size-4 rounded-full bg-v2-icon-icon-muted outline-solid outline-1 outline-v2-icon-icon-contrast flex items-center justify-center hover-reveal group-hover:opacity-100"
                  aria-label={props.removeLabel}
                >
                  <Icon name="outline-xmark" class="text-v2-icon-icon-contrast" />
                </button>
              </div>
            )}
          </For>
          <For each={props.uploads ?? []}>
            {(upload) => (
              <div class="relative group shrink-0" data-slot="composer-upload">
                <Tooltip value={upload.filename} placement="top" contentClass="break-all">
                  <AttachmentCard title={upload.filename}>
                    <span class="inline-flex items-center gap-1">
                      <ProgressCircle percentage={percent(upload)} />
                      {i18n.t("ui.promptInput.uploading", { percent: percent(upload) })}
                    </span>
                  </AttachmentCard>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => props.onUploadCancel?.(upload)}
                  class="absolute -top-1 -end-1 size-4 rounded-full bg-v2-icon-icon-muted outline-solid outline-1 outline-v2-icon-icon-contrast flex items-center justify-center hover-reveal group-hover:opacity-100"
                  aria-label={i18n.t("ui.promptInput.cancelUpload")}
                >
                  <Icon name="outline-xmark" class="text-v2-icon-icon-contrast" />
                </button>
              </div>
            )}
          </For>
        </div>
        <div
          data-slot="composer-attachments-fade-left"
          class="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-[linear-gradient(to_right,var(--v2-background-bg-base),transparent)] rtl:bg-[linear-gradient(to_left,var(--v2-background-bg-base),transparent)]"
        />
        <div
          data-slot="composer-attachments-fade-right"
          class="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-[linear-gradient(to_left,var(--v2-background-bg-base),transparent)] rtl:bg-[linear-gradient(to_right,var(--v2-background-bg-base),transparent)]"
        />
      </div>
    </Show>
  )
}

export function ComposerEditorAddMenu(props: {
  disabled?: boolean
  title: string
  keybind?: string[]
  attachLabel: string
  attachShortcut?: string
  commandsLabel: string
  contextLabel: string
  shellLabel: string
  onAttach: () => void
  onCommands: () => void
  onContext: () => void
  onShell: () => void
}) {
  return (
    <Tooltip
      placement="top"
      value={
        <>
          {props.title}
          <Keybind keys={props.keybind ?? []} variant="neutral" />
        </>
      }
    >
      <Menu gutter={6} modal={false} placement="top-start">
        <Menu.Trigger
          as={IconButton}
          data-action="composer-attach"
          type="button"
          /* Drawn here instead of taken from the catalog. Catalog bodies carry no stroke-width, so they
             render at the SVG default of one unit: a hairline in a 16 box at 20px, which antialiases into
             a smear. These arms are shorter than the catalog's as well, so the glyph sits inside the 24px
             circle the way a native add control does, and it carries `icon-svg` so the 45° cross rule and
             its transition still reach it. */
          icon={
            <svg
              data-slot="icon-svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              class="shrink-0"
            >
              <path d="M8 4.5v7M4.5 8h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          }
          /* ghost-muted, not ghost: the bar's other marks are all `ghost-muted`, whose colour is
             `--v2-icon-icon-muted`. `ghost` resolves to `--v2-text-text-base`, a step brighter, which made
             this one mark read as the row's primary control while the rest of it stayed muted. */
          variant="ghost-muted"
          disabled={props.disabled}
          aria-label={props.title}
          class="size-6 rounded-full"
        />
        <Menu.Portal>
          {/* `min-w-5`, not `w-5`: the shortcut column sized to one character for `/`, `@` and `!`, and a
              two-key hint like `Ctrl+U` overflowed its own box — visibly, while the window still had
              `overflow: visible`, and then cut off the moment the window clipped. The column now takes what
              the text needs and the menu's `min-width` decides the rest. */}
          <Menu.Content
            class="menu-v2-squircle [&_[data-slot=menu-v2-item-shortcut]]:min-w-5 [&_[data-slot=menu-v2-item-shortcut]]:justify-end"
            style={{ "min-width": "180px" }}
          >
            <Menu.Item onSelect={props.onAttach} shortcut={props.attachShortcut}>
              {props.attachLabel}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onSelect={props.onCommands} shortcut="/">
              {props.commandsLabel}
            </Menu.Item>
            <Menu.Item onSelect={props.onContext} shortcut="@">
              {props.contextLabel}
            </Menu.Item>
            <Menu.Item onSelect={props.onShell} shortcut="!">
              {props.shellLabel}
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </Tooltip>
  )
}

/** Non-default option ids in order. "default" is the provider's choice, not a level, so it stays out of
    every scale built from this list. */
function thinkingLevelIDs(options: ComposerOption[]) {
  return options.map((option) => option.id).filter((id) => id !== "default")
}

/** One cold-to-hot colour for the level, shared by the gauge needle and the effort track fill: neutral
    faint for default, green through yellow to red bands, dark red for the last level of a real scale. Bands
    rather than per-index colours, so the order always reads as one progression no matter how many options
    the model declares. The reds are fixed palette hues, not the danger role: danger resolves pinkish and,
    like everything dimmed, never reads as red. */
/** Colours for the levels that name themselves. These couple to the catalog's vocabulary — "high" and "max"
    are the ids providers use — so anything a model does not name falls through to the bands below. */
const NAMED_THINKING_TONES: Record<string, string> = {
  high: "var(--v2-orange-600)",
  max: "var(--v2-red-900)",
}

function thinkingTone(options: ComposerOption[], current: string) {
  const named = NAMED_THINKING_TONES[current]
  if (named) return named
  // Yellow, like the middle of the scale. Default parks on the recommended stop, and giving it the neutral
  // text role there made it read as a weaker state than "none", which carries a real green arc at the floor
  // of the scale.
  if (current === "default") return "var(--v2-state-fg-warning)"
  const ids = thinkingLevelIDs(options)
  const index = Math.max(0, ids.indexOf(current))
  // The top of the scale is the one place that gets the loudest red in the palette: red-600 is the only
  // stop that reads as red on a dark surface, and the step below it is red-700 so the two highest levels
  // stay distinguishable. Bands rather than per-index colours, so the order always reads as one
  // progression no matter how many options the model declares.
  //
  // The floor is a lime rather than the success token. `--v2-state-fg-success` is the app's "this worked"
  // green, and using it here made the weakest level look like a status; the scale wants the colour of a
  // dial running cool. The palette has no lime, so it is mixed from the two hues that bracket it — a dark
  // green pulled toward yellow — in oklab, which keeps the result theme-aware instead of hardcoding a hex
  // that a custom theme would then contradict.
  if (ids.length > 2 && index === ids.length - 1) return "var(--v2-red-600)"
  const level = index / Math.max(1, ids.length - 1)
  if (level < 0.34) return "color-mix(in oklab, var(--v2-green-800) 62%, var(--v2-yellow-700))"
  if (level < 0.67) return "var(--v2-state-fg-warning)"
  return "var(--v2-red-700)"
}

/** Dot start heights and pace multipliers across the 24px track. Negative delays start each dot mid-flight,
    so the track never opens empty. The multipliers keep the dots out of lockstep with each other; the
    absolute pace comes from the level.

    The jitter is drawn once per panel, not once per module: a fixed table sends the seven dots down the same
    lanes every time the window opens, and the eye catches that long before it catches anything else. A
    little vertical and phase drift reads as motion instead of as a pattern. The ranges stay inside the track
    — at most ±2px of height on a 24px band and a fraction of a second of phase — so no dot clips an edge or
    crowds its neighbours. */
const EFFORT_PARTICLE_LANES = [
  { top: 3, pace: 0.85, delay: 0 },
  { top: 7, pace: 1.15, delay: -0.7 },
  { top: 11, pace: 0.7, delay: -1.1 },
  { top: 15, pace: 1, delay: -0.3 },
  { top: 19, pace: 1.25, delay: -1.5 },
  { top: 9, pace: 0.9, delay: -0.9 },
  { top: 17, pace: 1.05, delay: -0.5 },
]
const effortParticles = () =>
  EFFORT_PARTICLE_LANES.map((lane) => ({
    top: lane.top + Math.round((Math.random() - 0.5) * 5),
    pace: lane.pace + Math.random() * 0.16 - 0.08,
    delay: lane.delay - Math.random() * 0.5,
  }))

/** An effort slider for the thinking level, in the shape of the mock: a header with the current value, a
    Faster/Smarter scale, a ticked track with a knob and drifting streaks, and a Recommended caption under
    the middle stop. Stops are every option in order, so nothing that the radio list offered is lost. The
    panel stays open while the knob moves — closing on every tick would fight dragging — and Escape or an
    outside click dismisses it through the menu itself. */
function ComposerEffortPanel(props: { options: ComposerOption[]; current: string; onSelect: (id: string) => void }) {
  const i18n = useI18n()
  // Default is not a level, so it takes the recommended stop rather than the far end: a scale whose order
  // reads none, low, medium, default, high puts the provider's own choice where it actually belongs, in the
  // middle, instead of labelling "off" as weaker than "let the provider pick". The levels keep their order
  // around it.
  const stops = createMemo(() => {
    const levels = props.options.filter((option) => option.id !== "default")
    const fallback = props.options.find((option) => option.id === "default")
    if (!fallback) return levels
    const at = Math.min(levels.length, Math.floor((props.options.length - 1) / 2))
    return [...levels.slice(0, at), fallback, ...levels.slice(at)]
  })
  const count = () => stops().length
  const selected = createMemo(() =>
    Math.max(
      0,
      stops().findIndex((option) => option.id === props.current),
    ),
  )
  const recommended = createMemo(() => Math.floor((count() - 1) / 2))
  const label = (index: number) => stops()[index]?.label ?? ""
  // Half the knob width on each side: the knob travels flush from edge to edge, and pointer math uses the
  // same insets so a press lands exactly where the knob would sit.
  const INSET = 7
  const fraction = (index: number) => (count() <= 1 ? 0 : index / (count() - 1))
  // The pointer position stays a fraction of the scale while the knob is held, so it tracks the cursor
  // exactly. Rounding here instead made every stop a detent the knob jumped between, which is what "the
  // slider is not smooth" felt like: the pointer moves and the knob is somewhere else for most of it.
  const at = (clientX: number, track: HTMLElement) => {
    const rect = track.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (clientX - rect.left - INSET) / (rect.width - INSET * 2)))
    return f * (count() - 1)
  }
  // Where a fraction lands as a choice. Applied to what is named and committed, never to the knob, so the
  // level reads as one of the levels at all times while the position stays continuous underneath.
  const nearest = (value: number) => Math.round(Math.min(count() - 1, Math.max(0, value)))
  const [dragging, setDragging] = createSignal(false)
  // The drag ended, but the snap it asked for has not landed yet. `dragging` alone is not enough to cover
  // this window: the commit lands tens of milliseconds later, once `props.current` changes, and by then the
  // knob is no longer "dragging" — so a transition keyed on that alone animated the snap the panel had just
  // made, and the fill, which has no transition, jumped there instantly. The two visibly parted company.
  const [settling, setSettling] = createSignal(false)
  // While the knob is held the panel follows the pointer and nothing is committed. Committing per
  // pointermove relabelled the tray chip under the open panel on every pixel, and the chip is content-width,
  // so its leading edge moved with the word. One commit on release is also what a slider is expected to
  // do: the level is chosen when the drag ends, not while it is still a question.
  const [draft, setDraft] = createSignal<number>()
  const shown = createMemo(() => draft() ?? selected())
  const choice = createMemo(() => nearest(shown()))
  // The stop the knob is on, live. Everything that *reads* the level reads this rather than `props.current`,
  // so the fill's colour and the dot pace move with the pointer while the drag is still a question; only
  // `onSelect` waits for release. Reading `props.current` instead is what made the slider look inert — the
  // colour did not move until the drag was already over.
  const preview = createMemo(() => stops()[choice()]?.id ?? props.current)
  // Hand the knob back to the committed level once the commit lands, so a released drag is not left frozen
  // on its preview if the selection is refused and the level never changes.
  createEffect(() => {
    const value = draft()
    if (value === undefined || selected() !== value) return
    setDraft(undefined)
    setSettling(false)
  })
  const level = createMemo(() => {
    const ids = thinkingLevelIDs(props.options)
    if (preview() === "default") return 0.5
    if (ids.length < 2) return 0
    return Math.max(0, ids.indexOf(preview())) / (ids.length - 1)
  })
  // Drawn once for the life of the panel, so the scatter survives re-renders instead of reshuffling under
  // the pointer while a drag is in progress.
  const particles = effortParticles()
  const step = (delta: number) => {
    const next = Math.min(count() - 1, Math.max(0, choice() + delta))
    if (next === choice()) return
    setDraft(undefined)
    props.onSelect(stops()[next].id)
  }

  return (
    <div class="w-[248px] select-none p-3">
      <div class="flex items-center gap-2">
        <span class="text-[13px] leading-5 text-v2-text-text-faint">{i18n.t("ui.promptInput.effort")}</span>
        <span class="truncate text-[13px] font-[530] capitalize leading-5 text-v2-text-text-base">
          {label(choice())}
        </span>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs leading-4 text-v2-text-text-faint">
        <span>{i18n.t("ui.promptInput.effortFaster")}</span>
        <span>{i18n.t("ui.promptInput.effortSmarter")}</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={i18n.t("ui.promptInput.chooseVariant")}
        aria-valuemin={0}
        aria-valuemax={count() - 1}
        aria-valuenow={choice()}
        aria-valuetext={label(choice())}
        aria-orientation="horizontal"
        class="relative mt-1 h-6 rounded-md bg-v2-background-bg-layer-03 touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-border-border-strong"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          setSettling(false)
          setDraft(at(event.clientX, event.currentTarget))
        }}
        onPointerMove={(event) => {
          if (event.buttons & 1) setDraft(at(event.clientX, event.currentTarget))
        }}
        onPointerUp={() => {
          const value = draft()
          if (value === undefined) return
          // Snap the preview to the stop it is about to commit, and only then drop the drag state. The order
          // is the whole fix: `dragging` is what switches the knob's `transition-[left]` off, so ending the
          // drag first left the knob animating into the snap it was already in — the fill has no transition
          // and changed colour instantly, so the two visibly parted company for 150ms every time a drag
          // overshot a level. Snap while still dragging and nothing moves; the colour and the knob change on
          // the same frame.
          setDraft(nearest(value))
          props.onSelect(stops()[nearest(value)].id)
          setDragging(false)
          setSettling(true)
        }}
        // A cancelled drag is a gesture the user took back: drop the preview and leave the level alone.
        onPointerCancel={() => {
          setDragging(false)
          setSettling(false)
          setDraft(undefined)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault()
            step(-1)
          } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault()
            step(1)
          } else if (event.key === "Home") {
            event.preventDefault()
            props.onSelect(stops()[0].id)
          } else if (event.key === "End") {
            event.preventDefault()
            props.onSelect(stops()[count() - 1].id)
          }
        }}
      >
        {/* The fill carries the level's tone from the tray edge to the knob, so the track reads the value
            even before the eye reaches the knob. Same tone helper as the gauge needle, so the two never
            disagree. */}
        <span
          aria-hidden="true"
          class="absolute inset-y-0 left-0 rounded-md"
          style={{
            width: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${fraction(shown())})`,
            background: thinkingTone(props.options, preview()),
          }}
        />
        <For each={stops()}>
          {(_, index) => (
            <span
              aria-hidden="true"
              class={
                index() === recommended()
                  ? "absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-v2-text-text-base"
                  : "absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-v2-text-text-faint"
              }
              style={{ left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${fraction(index())})` }}
            />
          )}
        </For>
        {/* Drifting dots across the track, always moving, never interactive. Their pace follows the level: a
            drift at the bottom, a blur at the top, which is the only reading of "more" the motion
            carries. Levels without a scale on them (default) drift at mid pace. Hidden under reduced
            motion. */}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 overflow-hidden rounded-md motion-reduce:hidden"
        >
          <For each={particles}>
            {(particle) => (
              <span
                class="composer-effort-particle"
                style={{
                  top: `${particle.top}px`,
                  "animation-duration": `${((1.9 / (0.6 + 5.4 * level())) * particle.pace).toFixed(2)}s`,
                  "animation-delay": `${(particle.delay / (0.6 + 5.4 * level())).toFixed(2)}s`,
                }}
              />
            )}
          </For>
        </span>
        {/* The darkening lives under the knob, not around it. The handle is the one light mark on the
            track and it loses its edge exactly where the fill is brightest, so the contrast belongs where
            the two meet. It is wider than the knob on purpose: sized to match it, it sat entirely behind a
            28px handle and could not be seen at all. Twice the width leaves ten pixels of gradient showing on
            each side, which is what makes it read as a shadow rather than as a second mark on the line.
            Painted before the knob so the fill shows through it. */}
        <span
          aria-hidden="true"
          data-slot="composer-effort-knob-shade"
          class="absolute inset-y-0 w-12 -translate-x-1/2"
          classList={{ "transition-[left] duration-150": !dragging() && !settling() }}
          style={{
            left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${fraction(shown())})`,
          }}
        />
        {/* The knob is a square, not the 14x24 lozenge the track's height used to dictate: a handle that is
            taller than it is wide reads as a bar sliding along a groove rather than as something you pick up.
            At 28px it also sits proud of the 24px track, centred on it, so it is clearly the thing above the
            line rather than a mark painted on it. The shape is a squircle at 12px — near the half-box a radius
            clamps at, so the corner is as full as a 28px square allows. */}
        <span
          aria-hidden="true"
          data-slot="composer-effort-knob"
          class="absolute left-0 size-7 rounded-[12px] bg-v2-text-text-contrast"
          classList={{ "transition-[left] duration-150": !dragging() && !settling() }}
          style={{
            left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${fraction(shown())})`,
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <div class="relative mt-1 h-4">
        <span
          class="absolute top-0 text-[11px] leading-4 whitespace-nowrap text-v2-text-text-faint"
          classList={{
            "left-0": recommended() === 0,
            "right-0": recommended() === count() - 1,
          }}
          style={
            recommended() === 0 || recommended() === count() - 1
              ? undefined
              : {
                  left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${fraction(recommended())})`,
                  transform: "translateX(-50%)",
                }
          }
        >
          {i18n.t("ui.promptInput.effortRecommended")}
        </span>
      </div>
    </div>
  )
}

function ComposerEditorConfiguredSelect(props: {
  mobileDrawer?: boolean
  title: string
  keybind?: string[]
  /** Names the trigger so a rule can key on it; aria-label is a translated string, not a hook. */
  action?: string
  /** Which edge of the trigger the window lines up with. */
  placement?: ComponentProps<typeof Menu.Sub>["placement"]
  control: ComposerSelectControl
  model?: boolean
  class?: string
  caret?: boolean
  /** Replaces the option list with custom menu content, for pickers that read as an instrument. */
  panel?: JSX.Element
  /** Extra class on the popover itself, for pickers that restyle their own window. */
  popoverClass?: string
}) {
  const current = () => props.control.current()
  const providerID = () => props.control.options().find((option) => option.id === current())?.providerID

  return (
    <ComposerEditorSelect
      mobileDrawer={props.mobileDrawer}
      title={props.title}
      class={props.class}
      caret={props.caret}
      action={props.action}
      placement={props.placement}
      panel={props.panel}
      popoverClass={props.popoverClass ?? "menu-v2-squircle"}
      keybind={props.control.keybind?.() ?? props.keybind}
      options={props.control.options()}
      current={current()}
      currentIcon={
        <Show when={props.model && providerID()}>
          {(id) => <ProviderModelIcon provider={{ id: id(), name: id() }} class="shrink-0 opacity-60" />}
        </Show>
      }
      onSelect={props.control.onSelect}
    />
  )
}

export function ComposerEditorSelect(props: {
  mobileDrawer?: boolean
  title: string
  keybind?: string[]
  options: ComposerOption[]
  current: string
  currentIcon?: JSX.Element
  class?: string
  action?: string
  placement?: ComponentProps<typeof Menu.Sub>["placement"]
  /** Both bar chips open a window, so both carry a caret; set false only for a trigger with another disclosure of its own. */
  caret?: boolean
  /** A mark that leads the label, for a value that reads as a picture beside its name. */
  /** Replaces the option list with custom menu content, for pickers that read as an instrument. */
  panel?: JSX.Element
  /** Extra class on the popover itself, for pickers that restyle their own window. */
  popoverClass?: string
  onOpenChange?: (open: boolean) => void
  onSelect: (id: string) => void
}) {
  const mobile = createMediaQuery("(max-width: 767px)")
  const [store, setStore] = createStore({ open: false, loaded: false })
  let trigger: HTMLButtonElement | undefined

  const setOpen = (open: boolean) => {
    setStore("open", open)

    if (open) setStore("loaded", true)
    props.onOpenChange?.(open)
  }

  createEffect(() => {
    if (!mobile() && store.open) setOpen(false)
  })

  const content = () => (
    <>
      {props.currentIcon}
      <span class="truncate capitalize leading-5">
        {props.options.find((option) => option.id === props.current)?.label ?? props.current}
      </span>
      <Show when={props.caret ?? true}>
        <span class="-ms-0.5 -me-1 flex shrink-0">
          <Icon name="chevron-down" />
        </span>
      </Show>
    </>
  )

  return (
    <Tooltip
      inactive={props.mobileDrawer && mobile()}
      placement="top"
      value={
        <>
          {props.title}
          <Keybind keys={props.keybind ?? []} variant="neutral" />
        </>
      }
    >
      <Show
        when={props.mobileDrawer && mobile()}
        fallback={
          <Menu gutter={6} modal={false} placement={props.placement ?? "top-start"} onOpenChange={props.onOpenChange}>
            <Menu.Trigger
              as={Button}
              variant="ghost-muted"
              size="normal"
              class={`max-w-[220px] justify-start ![font-weight:440] ${props.class ?? ""}`}
              aria-label={props.title}
              data-action={props.action}
            >
              {content()}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content class={props.popoverClass}>
                <Show
                  when={props.panel}
                  fallback={
                    <Menu.RadioGroup value={props.current} onChange={props.onSelect}>
                      <For each={props.options}>
                        {(option) => (
                          <Menu.RadioItem value={option.id} class="capitalize" closeOnSelect>
                            {option.label}
                          </Menu.RadioItem>
                        )}
                      </For>
                    </Menu.RadioGroup>
                  }
                >
                  {(panel) => panel()}
                </Show>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
        }
      >
        <Button
          ref={(element: HTMLButtonElement) => {
            trigger = element
          }}
          variant="ghost-muted"
          size="normal"
          class={`max-w-[220px] justify-start ![font-weight:440] ${props.class ?? ""}`}
          aria-label={props.title}
          data-action={props.action}
          aria-haspopup="dialog"
          aria-expanded={store.open}
          onClick={() => setOpen(true)}
        >
          {content()}
        </Button>
        <Show when={store.loaded}>
          <Suspense>
            <MobilePanelDrawer
              hideHeader
              title={props.title}
              open={store.open}
              onOpenChange={setOpen}
              returnFocus={() => trigger}
            >
              <div class="flex flex-col overflow-hidden rounded-lg border border-v2-border-border-base bg-v2-background-bg-layer-02 divide-y divide-v2-border-border-base">
                <Show
                  when={props.panel}
                  fallback={
                    <For each={props.options}>
                      {(option) => (
                        <Button
                          variant="ghost"
                          class="w-full !h-10 !justify-start !rounded-none !px-3 !font-[440] capitalize focus-visible:!outline-offset-[-2px]"
                          aria-pressed={props.current === option.id}
                          data-state={props.current === option.id ? "pressed" : undefined}
                          onClick={() => {
                            props.onSelect(option.id)
                            setOpen(false)
                          }}
                        >
                          {option.label}
                          <Show when={props.current === option.id}>
                            <Icon name="check" class="ms-auto" />
                          </Show>
                        </Button>
                      )}
                    </For>
                  }
                >
                  {(panel) => panel()}
                </Show>
              </div>
            </MobilePanelDrawer>
          </Suspense>
        </Show>
      </Show>
    </Tooltip>
  )
}

export function ComposerEditorPopover(props: {
  emptyLabel: string
  items: ComposerSuggestion[]
  activeID?: string
  search?: {
    value: string
    label: string
    placeholder: string
    onValueChange: (value: string) => void
    onKeyDown: (event: KeyboardEvent) => void
  }
  boundary?: () => HTMLElement | undefined
  onActiveChange: (item: ComposerSuggestion) => void
  onSelect: (item: ComposerSuggestion) => void
}) {
  const [store, setStore] = createStore({ maxHeight: COMPOSER_SUGGESTION_MAX_HEIGHT })

  const resize = (height: number) =>
    setStore("maxHeight", composerSuggestionMaxHeight(height, props.search !== undefined))

  // A detached boundary (e.g. the previous session's timeline while the next one loads) measures 0px.
  const boundary = () => {
    const element = props.boundary?.()

    return element?.isConnected ? element : undefined
  }

  createEffect(() => resize(boundary()?.clientHeight ?? COMPOSER_SUGGESTION_MAX_HEIGHT * 2))
  createResizeObserver(boundary, (rect) => resize(rect.height))

  return (
    <div
      data-component="composer-suggestions"
      class="absolute inset-x-0 -top-2 z-40 flex -translate-y-full scroll-pb-[18px] flex-col overflow-auto rounded-xl bg-v2-background-bg-base p-2 shadow-[var(--v2-elevation-raised)] no-scrollbar"
      style={{ "max-height": `${store.maxHeight}px` }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Show when={props.search}>
        {(search) => (
          <div class="shrink-0 px-2 py-1">
            <input
              ref={(element) => requestAnimationFrame(() => element.focus())}
              value={search().value}
              aria-label={search().label}
              placeholder={search().placeholder}
              class="w-full bg-transparent text-[13px] leading-5 text-v2-text-text-base outline-none placeholder:text-v2-text-text-faint"
              onInput={(event) => search().onValueChange(event.currentTarget.value)}
              onKeyDown={(event) => search().onKeyDown(event)}
              onMouseDown={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </Show>
      <Show
        when={props.items.length > 0}
        fallback={<div class="px-2 py-1 text-v2-text-text-muted">{props.emptyLabel}</div>}
      >
        <For each={props.items}>
          {(item) => (
            <button
              type="button"
              data-suggestion-id={item.id}
              data-active={props.activeID === item.id ? "" : undefined}
              class="flex h-7 w-full shrink-0 items-center gap-2 rounded-md px-2 py-1 text-start hover:bg-v2-overlay-simple-overlay-hover"
              classList={{ "bg-v2-overlay-simple-overlay-hover": props.activeID === item.id }}
              onPointerMove={() => props.onActiveChange(item)}
              onClick={() => props.onSelect(item)}
            >
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <ComposerSuggestionIcon item={item} />
                <bdi dir="auto" class="shrink-0 text-v2-text-text-base">
                  {item.label}
                </bdi>
                <Show when={item.description}>
                  <span class="min-w-0 truncate text-v2-text-text-muted">{item.description}</span>
                </Show>
              </div>
              <Show when={item.keybind?.length}>
                <span class="shrink-0 text-v2-text-text-muted">{item.keybind?.join("+")}</span>
              </Show>
            </button>
          )}
        </For>
      </Show>
    </div>
  )
}

function composerSuggestionMaxHeight(boundaryHeight: number, search: boolean) {
  const reserve = Math.min(COMPOSER_SUGGESTION_CONTEXT_RESERVE, boundaryHeight / 4)
  const limit = Math.min(COMPOSER_SUGGESTION_MAX_HEIGHT, boundaryHeight - reserve)
  const chrome = COMPOSER_SUGGESTION_TOP_PADDING + (search ? COMPOSER_SUGGESTION_SEARCH_HEIGHT : 0)

  if (limit < chrome + COMPOSER_SUGGESTION_ROW_HEIGHT + COMPOSER_SUGGESTION_ROW_PEEK) return limit

  return (
    chrome +
    Math.floor((limit - chrome - COMPOSER_SUGGESTION_ROW_PEEK) / COMPOSER_SUGGESTION_ROW_HEIGHT) *
      COMPOSER_SUGGESTION_ROW_HEIGHT +
    COMPOSER_SUGGESTION_ROW_PEEK
  )
}

// "Steer ⌘⏎" / "Queue ⌘⏎" hint next to the submit button: submits with the
// delivery opposite to what plain Enter does. Visible only while the queue
// exposes an alternate (turn running and composer holding a value), so it
// disappears on its own when the current turn ends.
function ComposerEditorAlternateDelivery(props: { controller: ComposerEditorModel; keybind: string[] }) {
  const i18n = useI18n()
  const view = props.controller.view

  const action = createMemo(() => {
    const queue = view.submit.queue

    if (!queue || !props.controller.canSubmit()) return undefined

    if (queue.editing()) return "steer" as const

    return queue.alternate()
  })

  const [button, setButton] = createSignal<HTMLButtonElement>()
  const presence = createAnimatedPresence(action, () => button() ?? null)

  return (
    <Show when={presence.present() && presence.value()} keyed>
      {(delivery) => (
        <Tooltip placement="top" inactive={delivery !== "steer"} value={i18n.t("ui.promptInput.steerHint")}>
          <Button
            ref={setButton}
            data-action="composer-alternate-delivery"
            type="button"
            variant="ghost-faint"
            size="small"
            class="me-3 gap-1.5 px-1.5 ![font-weight:530] duration-150 motion-reduce:animate-none"
            classList={{
              "animate-in fade-in": presence.animate() && presence.show(),
              "animate-out fade-out fill-mode-forwards": presence.animate() && !presence.show(),
            }}
            onClick={() => props.controller.submit({ alternate: true })}
          >
            {delivery === "steer" ? i18n.t("ui.promptInput.steer") : i18n.t("ui.promptInput.queue")}
            <span class="hidden sm:block">
              <Keybind keys={props.keybind} variant="neutral" />
            </span>
          </Button>
        </Tooltip>
      )}
    </Show>
  )
}

export function ComposerEditorSubmitButton(props: {
  mode: ComposerMode
  stopping: boolean
  disabled: boolean
  sendLabel: string
  stopLabel: string
  onSubmit: () => void
  onStop: () => void
}) {
  return (
    <Tooltip
      placement="top"
      inactive={!props.stopping && props.disabled}
      value={props.stopping ? props.stopLabel : props.sendLabel}
    >
      <IconButton
        data-action="composer-submit"
        // The hook editor.css keys the stop state's colour off. Its danger foreground is no longer a class,
        // because editor.css is unlayered and outranks every utility: the armed and empty colours declared
        // there would both beat a `text-v2-state-fg-danger` on the trigger and the stop mark would come out in
        // the resting tone.
        data-stopping={props.stopping || undefined}
        type="button"
        disabled={!props.stopping && props.disabled}
        tabIndex={props.mode === "normal" ? undefined : -1}
        icon={
          <Icon name={props.stopping ? "stop" : props.mode === "shell" ? "arrow-undo-down" : "arrow-to-down-left"} />
        }
        variant="ghost"
        // size-7, not size-6. It was the only filled object on the surface and had to survive a 6% tray on a
        // near-black page; it carries no fill now, and the 28px box is hit area rather than a mark. It is not
        // dropped to 24px because a send control is the one thing pressed rather than aimed at, and 24px is a
        // mark's size.
        class="size-7 rounded-full p-1"
        aria-label={props.stopping ? props.stopLabel : props.sendLabel}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()

          if (props.stopping) {
            props.onStop()

            return
          }

          props.onSubmit()
        }}
      />
    </Tooltip>
  )
}

function ComposerSuggestionIcon(props: { item: ComposerSuggestion }) {
  if (props.item.kind === "agent") return <Icon name="brain" size="small" class="shrink-0 text-icon-info-active" />

  if (props.item.kind === "skill") return <Icon name="post-skill" size="small" class="shrink-0" />

  if (props.item.kind === "command") return null

  return (
    <FileIcon
      node={{ path: props.item.path ?? props.item.label, type: props.item.kind === "reference" ? "directory" : "file" }}
      class="size-4 shrink-0"
    />
  )
}
