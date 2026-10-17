import { Show, createMemo, type ComponentProps, type JSX } from "solid-js"
import { ProgressCircle } from "@opencode/ui/progress-circle"
import { Button } from "@opencode/ui/button"
import { Tooltip } from "@opencode/ui/tooltip"
import { useI18n } from "@opencode/ui/context/i18n"
import { lastAssistantWithUsage } from "@opencode/client/solid"
import { useExtension, type MountedSession } from "../sdk"
import { catalogModel, syncCatalog } from "./catalog"

function ContextTooltipRow(props: { name: JSX.Element; value: JSX.Element }) {
  return (
    <div class="flex min-w-0 items-center gap-4">
      <span class="shrink-0 text-v2-text-text-muted">{props.name}</span>
      <span class="ml-auto min-w-0 truncate text-right text-v2-text-text-base">{props.value}</span>
    </div>
  )
}

export function SessionContextUsage(props: {
  session: MountedSession
  variant?: "button" | "indicator"
  /** The button without its figures, for a row that already spells out the numbers elsewhere. */
  iconOnly?: boolean
  placement?: ComponentProps<typeof Tooltip>["placement"]
}) {
  const ctx = useExtension()
  const layout = ctx.layout
  const i18n = useI18n()
  syncCatalog(() => props.session)

  const variant = createMemo(() => props.variant ?? "button")

  const messages = createMemo(() =>
    props.session.id ? props.session.server.data.session.message.list(props.session.id) : [],
  )

  const usd = createMemo(
    () =>
      new Intl.NumberFormat(i18n.locale(), {
        style: "currency",
        currency: "USD",
      }),
  )

  const info = createMemo(() =>
    props.session.id ? props.session.server.data.session.get(props.session.id) : undefined,
  )

  // Same step as the TUI: after the last completed compaction and before an undo boundary.
  const context = createMemo(() => {
    const message = lastAssistantWithUsage(messages(), info()?.revert?.messageID)

    if (!message) return
    const model = catalogModel(props.session, message.model)?.model

    const total =
      message.tokens.input +
      message.tokens.output +
      message.tokens.reasoning +
      message.tokens.cache.read +
      message.tokens.cache.write

    return {
      total,
      usage: model?.limit.context ? Math.round((total / model.limit.context) * 100) : null,
    }
  })

  const tokens = createMemo(() =>
    new Intl.NumberFormat(i18n.locale(), { notation: "compact", maximumFractionDigits: 0 })
      .format(context()?.total ?? 0)
      .toLocaleLowerCase(i18n.locale()),
  )

  // A root session's cost includes its subagent sessions, as in the TUI.
  const spent = createMemo(() => (props.session.id ? props.session.server.data.session.cost(props.session.id) : 0))

  const cost = createMemo(() => usd().format(spent()))

  // Spend anywhere in the family keeps the cost visible, even when this session's model is free.
  const showCost = createMemo(() => {
    if (spent() > 0) return true
    const ref = info()?.model ?? messages().findLast((item) => item.type === "assistant")?.model
    const model = ref ? catalogModel(props.session, ref)?.model : undefined

    if (!model) return true

    return model.cost.some((cost) => cost.input > 0 || cost.output > 0 || cost.cache.read > 0 || cost.cache.write > 0)
  })

  const openContext = () => {
    if (!props.session.id) return
    layout.toggle(`${ctx.id}:main`, props.session)
  }

  const circle = () => (
    <div class="flex items-center justify-center">
      <ProgressCircle
        appearance="indicator"
        size={16}
        strokeWidth={2}
        percentage={context()?.usage ?? 0}
        style={{
          "--progress-circle-background": "var(--v2-background-bg-layer-04, var(--border-weak-base))",
          "--progress-circle-background-overlay": "var(--v2-overlay-simple-overlay-pressed, transparent)",
          "--progress-circle-progress": "var(--v2-icon-icon-base, var(--icon-base))",
        }}
      />
    </div>
  )

  const compactCircle = () => (
    <div class="flex items-center justify-center">
      {/* Beside the model chip this ring is an icon, not a readout. The indicator appearance is used for its
          override hooks: compact pins both strokes to fixed tokens, so dimming the whole element would also dim
          the fill the user needs to read. A faint track with a solid arc keeps the widget quiet and the level
          legible at the same time. */}
      {/* The bar's ring is an icon in a 28px tray beside chips that carry text, and at 16px it filled its
          cell exactly — the one mark in the row with no air around it. Two pixels off puts the circle inside
          the tray the way the chips sit inside theirs, without shrinking it into illegibility. Scoped to
          `iconOnly` because the figures variant shows the number beside the ring and wants the larger one. */}
      <ProgressCircle
        appearance={props.iconOnly ? "indicator" : "compact"}
        size={props.iconOnly ? 14 : 16}
        strokeWidth={props.iconOnly ? 2 : undefined}
        percentage={context()?.usage ?? 0}
        style={
          props.iconOnly
            ? {
                "--progress-circle-background": "var(--v2-background-bg-layer-04)",
                "--progress-circle-progress": "var(--v2-text-text-base)",
              }
            : undefined
        }
      />
    </div>
  )

  const tooltipValue = () => (
    <div class="flex w-[120px] flex-col gap-2">
      <Show when={showCost()}>
        <ContextTooltipRow name={ctx.t("usage.cost")} value={cost()} />
      </Show>
      <ContextTooltipRow name={ctx.t("usage.usage")} value={`${context()?.usage ?? 0}%`} />
      <ContextTooltipRow name={ctx.t("usage.tokens")} value={context()?.total.toLocaleString(i18n.locale()) ?? "0"} />
    </div>
  )

  return (
    <Show when={props.session.id}>
      <Tooltip
        value={variant() === "indicator" ? tooltipValue() : ctx.t("usage.toggle")}
        placement={props.placement ?? "top"}
      >
        <Show
          when={variant() === "indicator"}
          fallback={
            <Button
              type="button"
              variant="ghost-muted"
              class="group shrink-0"
              style={{ padding: "0 6px", color: "var(--v2-text-text-faint)" }}
              onClick={openContext}
              aria-expanded={layout.state(`${ctx.id}:main`, props.session) === "visible"}
              aria-label={ctx.t("usage.toggle")}
            >
              <span class="flex items-center gap-2 whitespace-nowrap group-active:text-v2-text-text-muted">
                {/* Half opacity over an indicator-appearance ring. The two steps below are close (track #666, arc #fcfcfc),
                so dimming the whole element is what keeps the widget quiet, while the arc still reads about
                two and a half times brighter than its own track. Applied to the wrapper so the figures variant,
                which draws no ring, keeps its full strength. */}
                <span class={props.iconOnly ? "opacity-50" : undefined}>{compactCircle()}</span>
                <Show when={!props.iconOnly}>
                  <span>{tokens()}</span>
                  <Show when={showCost()}>
                    <span aria-hidden="true" class="flex w-1.5 shrink-0 items-center justify-center">
                      ·
                    </span>
                    <span>{cost()}</span>
                  </Show>
                </Show>
              </span>
            </Button>
          }
        >
          {circle()}
        </Show>
      </Tooltip>
    </Show>
  )
}
