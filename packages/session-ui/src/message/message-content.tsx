import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  onCleanup,
  Show,
  type ComponentProps,
  type JSX,
} from "solid-js"
import { createStore } from "solid-js/store"
import { createMediaQuery } from "@solid-primitives/media"
import { useData } from "../context"
import { useDialog } from "@opencode/ui/context/dialog"
import { useI18n } from "@opencode/ui/context/i18n"
import { Markdown } from "../components/markdown"
import { ImagePreview } from "@opencode/ui/image-preview"
import { getFilename } from "@opencode/util/path"
import { AttachmentCard } from "./attachment-card"
import { CommentCard } from "./comment-card"
import { TimelineSeparator } from "../components/timeline-separator"
import { Tooltip } from "@opencode/ui/tooltip"
import { IconButton } from "@opencode/ui/icon-button"
import { Menu } from "@opencode/ui/menu"
import { Icon } from "@opencode/ui/icon"
import { Button } from "@opencode/ui/button"
import { TextShimmer } from "@opencode/ui/text-shimmer"
import { Collapsible } from "@opencode/ui/collapsible"
import { BasicTool } from "../components/basic-tool"
import { Card } from "@opencode/ui/card"
import type {
  PromptAgentAttachment,
  PromptFileAttachment,
  SessionMessageAssistant,
  SessionMessageAssistantReasoning,
  SessionMessageCompaction,
  SessionMessageUser,
} from "@opencode/client/promise"
import type { SessionUserActions, SessionUserAttachmentReference, SessionUserComment } from "../actions"
import { attached, typeLabel } from "../components/message-file"

export async function writeClipboard(text: string): Promise<boolean> {
  const body = typeof document === "undefined" ? undefined : document.body

  if (body) {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    textarea.style.pointerEvents = "none"
    body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    body.removeChild(textarea)

    if (copied) return true
  }

  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard

  if (!clipboard?.writeText) return false

  return clipboard.writeText(text).then(
    () => true,
    () => false,
  )
}

function modelLabel(
  data: ReturnType<typeof useData>,
  i18n: ReturnType<typeof useI18n>,
  model: SessionMessageAssistant["model"],
) {
  const name = data.store.provider?.all?.get(model.providerID)?.models?.[model.id]?.name ?? model.id

  if (!model.variant || model.variant === "default") return name

  return i18n.t("ui.message.modelVariant", {
    model: name,
    variant: model.variant[0]?.toUpperCase() + model.variant.slice(1),
  })
}

function MessageActionButton(
  props: Pick<ComponentProps<"button">, "disabled" | "onMouseDown" | "onClick" | "aria-label"> & {
    icon: "check" | "copy" | "reset" | "arrow-down-to-line" | "outline-trash" | "xmark" | "arrow-up"
    label: JSX.Element
  },
) {
  const icon = () => (props.icon === "copy" ? "outline-copy" : props.icon)

  return (
    <Tooltip appearance="compact" value={props.label} placement="top" gutter={4}>
      <IconButton
        icon={<Icon name={icon()} size="small" />}
        size="normal"
        variant="ghost-muted"
        disabled={props.disabled}
        onMouseDown={props.onMouseDown}
        onClick={props.onClick}
        aria-label={props["aria-label"]}
      />
    </Tooltip>
  )
}

const TEXT_RENDER_PACE_MS = 24

const TEXT_RENDER_IMMEDIATE = 512

const TEXT_RENDER_SNAP = /[\s.,!?;:)\]]/

function step(size: number) {
  if (size <= 12) return 2

  if (size <= 48) return 4

  if (size <= 96) return 8

  return Math.min(256, Math.ceil(size / 4))
}

function next(text: string, start: number) {
  const end = Math.min(text.length, start + step(text.length - start))
  const max = Math.min(text.length, end + 8)

  for (let i = end; i < max; i++) {
    if (TEXT_RENDER_SNAP.test(text[i] ?? "")) return i + 1
  }

  return end
}

function createPacedValue(getValue: () => string, live?: () => boolean) {
  const [value, setValue] = createSignal(getValue())
  let shown = getValue()
  let timeout: ReturnType<typeof setTimeout> | undefined

  const clear = () => {
    if (!timeout) return
    clearTimeout(timeout)
    timeout = undefined
  }

  const sync = (text: string) => {
    shown = text
    setValue(text)
  }

  const run = () => {
    timeout = undefined
    const text = getValue()

    if (!live?.()) {
      sync(text)

      return
    }

    if (!text.startsWith(shown) || text.length <= shown.length) {
      sync(text)

      return
    }

    if (text.length - shown.length <= TEXT_RENDER_IMMEDIATE) {
      sync(text)

      return
    }

    const end = next(text, shown.length)
    sync(text.slice(0, end))

    if (end < text.length) timeout = setTimeout(run, TEXT_RENDER_PACE_MS)
  }

  createEffect(() => {
    const text = getValue()

    if (!live?.()) {
      clear()
      sync(text)

      return
    }

    if (!text.startsWith(shown) || text.length < shown.length) {
      clear()
      sync(text)

      return
    }

    if (text.length - shown.length <= TEXT_RENDER_IMMEDIATE) {
      clear()
      sync(text)

      return
    }

    if (text.length === shown.length || timeout) return
    timeout = setTimeout(run, TEXT_RENDER_PACE_MS)
  })

  onCleanup(() => {
    clear()
  })

  return value
}

function PacedMarkdown(props: { text: string; cacheKey: string; streaming: boolean }) {
  const value = createPacedValue(
    () => props.text,
    () => props.streaming,
  )

  return (
    <Show when={value()}>
      <Markdown text={value()} cacheKey={props.cacheKey} streaming={props.streaming} deferUntilReady />
    </Show>
  )
}

function UserMessageComments(props: { comments: SessionUserComment[]; bounded: boolean }) {
  const i18n = useI18n()
  const [state, setState] = createStore({ expanded: false })
  const comments = createMemo(() => (props.bounded && !state.expanded ? props.comments.slice(0, 5) : props.comments))

  return (
    <div data-slot="user-message-comments" data-bounded={props.bounded ? "true" : undefined}>
      <For each={comments()}>
        {(comment) => (
          <CommentCard
            comment={comment.comment}
            target={
              comment.type === "note"
                ? { type: "note", label: comment.label, icon: comment.icon }
                : { type: "file", path: comment.path, selection: comment.selection }
            }
            title={comment.comment}
            tooltip
            wide
          />
        )}
      </For>
      <Show when={props.bounded && props.comments.length > 5 && !state.expanded}>
        <Button size="small" variant="ghost-muted" onClick={() => setState("expanded", true)}>
          {i18n.t("ui.common.showMore")}
        </Button>
      </Show>
    </div>
  )
}

export function CurrentUserMessageDisplay(props: {
  sessionID: string
  message: SessionMessageUser
  text: string
  agent: string
  model: SessionMessageAssistant["model"]
  actions?: SessionUserActions
  /** The model selector, rendered beside the controls while this message is edited. It takes the
      message's own focus-back rather than naming the composer's field, which is not where focus came from. */
  modelPicker?: (input: { onClose: () => void }) => JSX.Element
  comments?: SessionUserComment[]
  references?: SessionUserAttachmentReference[]
  voice?: boolean
}) {
  const dialog = useDialog()
  const i18n = useI18n()

  const [state, setState] = createStore({ copied: false, reverting: false, updating: false, editing: false })
  const [draft, setDraft] = createSignal(props.text)
  // Built once, not per render. A component node written straight into JSX is constructed again on every pass
  // over the parent's children, which remounts the selector with it -- so its menu closed under the pointer on
  // the way to picking a model. `draftInput` is read through the ref on each call rather than captured, so the
  // node does not depend on when the field was mounted.
  const modelPicker = createMemo(() => props.modelPicker?.({ onClose: () => draftInput?.focus() }))
  let draftInput: HTMLTextAreaElement | undefined

  const startEditing = () => {
    if (!props.actions?.resend) return
    // A click that ends a drag is a text selection, not an intent to edit. Collapsing on a click-only press is
    // what tells them apart, and without this the message could not be selected at all.
    const selection = document.getSelection()
    if (selection && !selection.isCollapsed) return

    setDraft(props.text)
    setState("editing", true)
    requestAnimationFrame(() => {
      draftInput?.focus()
      draftInput?.setSelectionRange(draftInput.value.length, draftInput.value.length)
    })
  }

  const cancelEditing = () => setState("editing", false)

  const resend = async () => {
    if (!props.actions?.resend || state.reverting) return
    // Unchanged text is still a send. The editor carries a model selector, and choosing a different model is
    // the other half of the same act: rewinding and re-running on that model is the point, and treating
    // untouched text as "nothing to do" would leave the model unreachable for every message but the ones that
    // also needed rewording.
    if (!draft().trim()) {
      cancelEditing()

      return
    }

    setState("reverting", true)
    try {
      await props.actions.resend({ sessionID: props.sessionID, messageID: props.message.id, text: draft() })
    } finally {
      setState("reverting", false)
      setState("editing", false)
    }
  }

  const status = createMemo(() => props.actions?.pending?.status(props.message.id))
  const pending = createMemo(() => status() !== undefined && status() !== "queued")
  const waiting = createMemo(() => status() === "steering" || status() === "stranded")
  const attachments = createMemo(() => (props.message.files ?? []).filter(attached))
  const references = createMemo(() => props.references ?? [])
  const inlineFiles = createMemo(() => (props.message.files ?? []).filter((file) => !!file.mention))
  const agents = createMemo(() => props.message.agents ?? [])
  const comments = createMemo(() => props.comments ?? [])

  const copy = async (text: string) => {
    if (!text || !(await writeClipboard(text))) return
    setState("copied", true)
    setTimeout(() => setState("copied", false), 2000)
  }

  const revert = async () => {
    if (!props.actions?.revert || state.reverting) return
    setState("reverting", true)

    try {
      await props.actions.revert({ sessionID: props.sessionID, messageID: props.message.id })
    } finally {
      setState("reverting", false)
    }
  }

  const updatePending = async (action: "queue" | "remove") => {
    const actions = props.actions?.pending

    if (!actions || state.updating) return
    setState("updating", true)
    await actions[action]({ sessionID: props.sessionID, messageID: props.message.id })
    setState("updating", false)
  }

  const renderAttachments = () => (
    <Show when={attachments().length > 0 || references().length > 0}>
      <div data-slot="user-message-attachments">
        <For each={references()}>
          {(file) => (
            <AttachmentCard title={file.name} hover={file.path}>
              {typeLabel(file.name, file.mime, i18n.t("ui.common.file"))}
            </AttachmentCard>
          )}
        </For>
        <Index each={attachments()}>
          {(file) => {
            const url = () => {
              const source = file().source

              return source.type === "uri" ? source.uri : `data:${file().mime};base64,${file().data}`
            }

            const name = () => file().name ?? i18n.t("ui.message.attachment.alt")
            const image = () => file().mime.startsWith("image/")

            return (
              <Show
                when={!image()}
                fallback={
                  <div
                    data-slot="user-message-attachment"
                    data-type="image"
                    data-clickable="true"
                    onClick={() => dialog.show(() => <ImagePreview src={url()} alt={name()} />)}
                  >
                    <img data-slot="user-message-attachment-image" src={url()} alt={name()} />
                  </div>
                }
              >
                <AttachmentCard
                  title={getFilename(name())}
                  hover={name()}
                  clickable={!!props.actions?.openAttachment}
                  onClick={() => props.actions?.openAttachment?.(file())}
                >
                  {typeLabel(name(), file().mime, i18n.t("ui.common.file"))}
                </AttachmentCard>
              </Show>
            )
          }}
        </Index>
      </div>
    </Show>
  )

  // The actions live in a right-click window rather than in a row under the message. A full-width bubble with a
  // control strip under it gives every message two things to look at, and only one of them is the message. What
  // is left below is the time, which is a reading and not a control.
  //
  // `class="contents"` because Kobalte's root is a div and this component's root is a flex column: without it
  // the wrapper becomes a flex item and the attachments stop sharing the column.
  const actions = () => (
    <Menu.Context.Portal>
      <Menu.Context.Content class="menu-v2-squircle">
        <Show when={pending()}>
          <Menu.Item onSelect={() => void updatePending("queue")}>{i18n.t("ui.message.moveToQueue")}</Menu.Item>
          <Menu.Item onSelect={() => void updatePending("remove")}>{i18n.t("ui.message.deletePending")}</Menu.Item>
          <Menu.Separator />
        </Show>
        <Show when={props.actions?.revert && !pending() && !state.editing}>
          <Menu.Item disabled={state.reverting} onSelect={() => void revert()}>
            {i18n.t("ui.message.revertMessage")}
          </Menu.Item>
        </Show>
        {/* Revert rewinds the session; copy only reads the text. One separator, because they are not two
            operations and a reader should not have to work out which is which from the order. */}
        <Show when={(props.actions?.revert && !pending() && !state.editing) || pending()}>
          <Menu.Separator />
        </Show>
        <Show when={props.text}>
          <Menu.Item onSelect={() => void copy(props.text)}>{i18n.t("ui.message.copyMessage")}</Menu.Item>
        </Show>
        <Show when={props.voice}>
          <Menu.Item onSelect={() => void copy(props.message.text)}>{i18n.t("ui.message.copyFullMessage")}</Menu.Item>
        </Show>
      </Menu.Context.Content>
    </Menu.Context.Portal>
  )

  return (
    <Menu.Context modal={false} class="contents">
      <div
        data-component="user-message"
        data-pending={waiting() ? "true" : undefined}
        data-timeline-part-id={props.text ? `${props.message.id}:text:0` : undefined}
      >
        {/* Kobalte binds `contextmenu` to its Trigger, not to the root, so the trigger is what makes the message a
            right-click target. `contents` on both wrappers leaves the box alone: this component's root is a
            flex column, and a real wrapper div between it and its children would become the flex item instead.
            The trigger also calls `preventDefault`, which is what suppresses Electron's own menu here -- and
            only here, so a right-click in a field still gets the native one. */}
        <Menu.Context.Trigger class="contents">
          {renderAttachments()}
          <Show
            when={props.text}
            fallback={
              <Show when={comments().length > 0}>
                <UserMessageComments comments={comments()} bounded={false} />
              </Show>
            }
          >
            <div data-slot="user-message-body" data-voice={props.voice ? "true" : undefined}>
              <Show when={props.voice}>
                <div data-slot="user-message-voice" role="img" aria-label={i18n.t("ui.message.voice")}>
                  <Tooltip appearance="compact" value={i18n.t("ui.message.voice")} placement="top" gutter={4}>
                    <Icon name="waveform" size="small" />
                  </Tooltip>
                </div>
              </Show>
              <div
                data-slot="user-message-text"
                dir="auto"
                data-editing={state.editing ? "true" : undefined}
                data-comments={comments().length > 0 ? "true" : undefined}
                onClick={state.editing ? undefined : startEditing}
              >
                <Show
                  when={state.editing}
                  fallback={
                    <>
                      <CurrentHighlightedText text={props.text} files={inlineFiles()} agents={agents()} />
                      <Show when={comments().length > 0}>
                        <UserMessageComments comments={comments()} bounded />
                      </Show>
                    </>
                  }
                >
                  <div
                    data-slot="user-message-editor"
                    class="flex flex-col"
                    onFocusOut={(event) => {
                      // Focus leaving the editor closes it. The containment test is what keeps the send button
                      // usable: clicking it moves focus within the wrapper, and only focus that lands outside is
                      // a dismissal.
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                      cancelEditing()
                    }}
                  >
                    <textarea
                      ref={draftInput}
                      data-slot="user-message-edit"
                      class="w-full resize-none bg-transparent outline-none"
                      rows={1}
                      value={draft()}
                      onInput={(event) => setDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault()
                          cancelEditing()
                        }
                        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                          event.preventDefault()
                          void resend()
                        }
                      }}
                    />
                    {/* Both controls carry their own `data-action` rather than the composer's, because those hooks are global
                    and unlayered: `composer-attach` would put the tray's 6px radius on a control meant to be
                    round, and `composer-submit` made this button the first document match for a lookup that
                    has to reach the tray's. The chrome is copied from the tray's rules instead -- see
                    `message-part.css`. A cancel button is deliberately absent: losing focus leaves the
                    editor, and a control that does what a click already does is a second way out of the same
                    place. */}
                    <div data-slot="user-message-editor-actions" class="flex items-center gap-1">
                      {/* The model. The composer's own chip, so the unpaid path, the mobile drawer and the provider
                      grouping are the ones the tray opens -- a second selector would be a second set of rules
                      for all three. `shrink-0` because the selector's own wrapper is a flex child that grows,
                      which would float the chip away from the leading edge. */}
                      <span class="flex shrink-0 items-center">{modelPicker()}</span>
                      <IconButton
                        data-action="message-edit-submit"
                        icon={<Icon name="arrow-up" />}
                        variant="ghost"
                        size="normal"
                        // `ms-auto`, not `justify-between`: the row's leading end holds two controls rather than
                        // one, and `justify-between` would set the space between them instead of pushing the send
                        // to the far edge.
                        class="ms-auto size-7 rounded-full p-1"
                        disabled={state.reverting || !draft().trim()}
                        aria-label={i18n.t("ui.message.resendMessage")}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation()
                          void resend()
                        }}
                      />
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </Menu.Context.Trigger>
        {actions()}
      </div>
    </Menu.Context>
  )
}

function CurrentHighlightedText(props: {
  text: string
  files: PromptFileAttachment[]
  agents: PromptAgentAttachment[]
}) {
  const segments = createMemo(() => {
    const references = [
      ...props.files.flatMap((file) =>
        file.mention ? [{ start: file.mention.start, end: file.mention.end, type: "file" as const }] : [],
      ),
      ...props.agents.flatMap((agent) =>
        agent.mention ? [{ start: agent.mention.start, end: agent.mention.end, type: "agent" as const }] : [],
      ),
    ].sort((a, b) => a.start - b.start)

    const result: HighlightSegment[] = []
    let last = 0
    references.forEach((reference) => {
      if (reference.start < last) return

      if (reference.start > last) result.push({ text: props.text.slice(last, reference.start) })
      result.push({ text: props.text.slice(reference.start, reference.end), type: reference.type })
      last = reference.end
    })

    if (last < props.text.length) result.push({ text: props.text.slice(last) })

    return result
  })

  return (
    <For each={segments()}>
      {(segment) => (
        <span data-highlight={segment.type}>
          <Show when={segment.type && segment.text.startsWith("@")} fallback={segment.text}>
            <span data-slot="user-message-mention-prefix">@</span>
            {segment.text.slice(1)}
          </Show>
        </span>
      )}
    </For>
  )
}

type HighlightSegment = { text: string; type?: "file" | "agent" }

/** A compaction the server admitted but has not started, drawn as the divider a started one opens with. */
export function SessionCompactionQueued() {
  const i18n = useI18n()

  return (
    <div data-component="session-compaction-message">
      <CompactionDivider label={i18n.t("ui.messagePart.compaction.queued")} />
    </div>
  )
}

function CompactionDivider(props: { label: string }) {
  return (
    <div class="py-2">
      <TimelineSeparator label={props.label} />
    </div>
  )
}

export function SessionCompactionMessage(props: { message: SessionMessageCompaction; error: string }) {
  const i18n = useI18n()
  const summary = () => (props.message.status === "failed" ? "" : props.message.summary)

  const error = () => {
    if (props.message.status !== "failed") return ""

    if (props.message.error.type === "aborted" || props.message.error.type === "compaction.interrupted") return ""

    return props.error
  }

  const compact = createMemo(
    () => new Intl.NumberFormat(i18n.locale(), { notation: "compact", maximumFractionDigits: 1 }),
  )

  // Usage of the compaction request itself; the resulting context size only shows on the next assistant step.
  const usage = () => {
    if (props.message.status === "running" || !props.message.tokens) return ""
    const tokens = props.message.tokens
    const input = tokens.input + tokens.cache.read + tokens.cache.write
    const output = tokens.output + tokens.reasoning

    if (input + output <= 0) return ""

    return i18n.t("ui.messagePart.compaction.usage", {
      input: compact().format(input),
      output: compact().format(output),
    })
  }

  const outcome = () => {
    if (props.message.status !== "failed")
      return props.message.status === "completed" && props.message.providerContext
        ? "ui.messagePart.providerCompaction"
        : "ui.messagePart.compaction"

    if (props.message.error.type === "aborted") return "ui.messagePart.compaction.cancelled"

    if (props.message.error.type === "compaction.interrupted") return "ui.messagePart.compaction.interrupted"

    return "ui.messagePart.compaction.failed"
  }

  const label = createMemo(() => [i18n.t(outcome()), usage()].filter(Boolean).join(" · "))

  return (
    <div data-component="session-compaction-message">
      <CompactionDivider label={i18n.t("ui.messagePart.compaction.started")} />
      <Show when={summary().trim()}>
        <div data-component="text-part" data-timeline-part-id={props.message.id}>
          <div data-slot="text-part-body">
            <PacedMarkdown
              text={summary()}
              cacheKey={props.message.id}
              streaming={props.message.status === "running"}
            />
          </div>
        </div>
      </Show>
      <Show when={props.message.status === "running"}>
        <div role="status" class="py-2">
          <BasicTool
            icon="archive"
            trigger={{ title: i18n.t("ui.messagePart.compaction.running") }}
            status="running"
            locked
            hideDetails
          />
        </div>
      </Show>
      <Show when={props.message.status !== "running"}>
        <div class="py-2">
          <TimelineSeparator label={label()} />
        </div>
      </Show>
      <Show when={error()}>
        <Card variant="error" class="error-card">
          {error()}
        </Card>
      </Show>
    </div>
  )
}

export function AssistantTextContent(props: {
  id: string
  text: string
  message: SessionMessageAssistant
  showCopy: boolean
  turnDurationMs?: number | null
}) {
  const data = useData()
  const i18n = useI18n()
  const numfmt = createMemo(() => new Intl.NumberFormat(i18n.locale()))

  const interrupted = () => {
    const type = props.message.error?.type.toLowerCase()

    return !!type && (type.includes("abort") || type.includes("interrupt"))
  }

  const model = createMemo(() => modelLabel(data, i18n, props.message.model))

  const duration = createMemo(() => {
    const completed = props.message.time.completed

    const ms =
      props.turnDurationMs === null
        ? -1
        : props.turnDurationMs !== undefined
          ? props.turnDurationMs
          : completed !== undefined
            ? completed - props.message.time.created
            : -1

    if (!(ms >= 0)) return ""
    const total = Math.round(ms / 1000)

    if (total < 60) return i18n.t("ui.message.duration.seconds", { count: numfmt().format(total) })

    return i18n.t("ui.message.duration.minutesSeconds", {
      minutes: numfmt().format(Math.floor(total / 60)),
      seconds: numfmt().format(total % 60),
    })
  })

  // Mobile omits the per-response agent and model; see CurrentUserMessageDisplay.
  const mobile = createMediaQuery("(max-width: 767px)")

  const meta = createMemo(() => {
    const agent = props.message.agent

    return [
      ...(mobile() ? [] : [agent ? agent[0]?.toUpperCase() + agent.slice(1) : "", model()]),
      duration(),
      interrupted() ? i18n.t("ui.message.interrupted") : "",
    ]
      .filter(Boolean)
      .join(" \u00B7 ")
  })

  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    if (!(await writeClipboard(props.text))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Show when={props.text}>
      <div data-component="text-part" data-timeline-part-id={props.id}>
        <div data-slot="text-part-body">
          <PacedMarkdown text={props.text} cacheKey={props.id} streaming={props.message.time.completed === undefined} />
        </div>
        <Show when={props.showCopy}>
          <div data-slot="text-part-copy-wrapper" data-interrupted={interrupted() ? "" : undefined}>
            <MessageActionButton
              icon={copied() ? "check" : "copy"}
              label={copied() ? i18n.t("ui.message.copied") : i18n.t("ui.message.copyResponse")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={copy}
              aria-label={copied() ? i18n.t("ui.message.copied") : i18n.t("ui.message.copyResponse")}
            />
            <Show when={meta()}>
              <span data-slot="text-part-meta" class="text-12-regular text-text-weak cursor-default">
                {meta()}
              </span>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}

export function AssistantReasoningContent(props: {
  id: string
  content: SessionMessageAssistantReasoning
  streaming: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onContentRendered?: () => void
}) {
  const i18n = useI18n()
  const [state, setState] = createStore<{ open?: boolean }>({})
  const open = () => props.open ?? state.open ?? props.defaultOpen ?? false

  // The label is the whole trigger. `BasicTool` put it in a row that stretches the full width of the turn,
  // which made the empty space beside it answer to a click as well; here the trigger is a button around the
  // label alone, so the name is the only thing that opens the reasoning.
  return (
    <div data-component="reasoning-part" data-timeline-part-id={props.id}>
      <Collapsible
        class="reasoning-collapsible"
        open={open()}
        onOpenChange={(value) => {
          setState("open", value)
          props.onOpenChange?.(value)
          props.onContentRendered?.()
        }}
      >
        <Collapsible.Trigger class="reasoning-collapsible-trigger">
          <TextShimmer
            text={i18n.t(props.streaming ? "ui.sessionTurn.status.thinking" : "ui.message.thought")}
            active={props.streaming}
          />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div data-slot="session-turn-thinking-body">
            <PacedMarkdown text={props.content.text} cacheKey={props.id} streaming={props.streaming} />
          </div>
        </Collapsible.Content>
      </Collapsible>
    </div>
  )
}
