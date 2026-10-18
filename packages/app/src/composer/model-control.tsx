import { Show, createMemo } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { Keybind } from "@opencode/ui/keybind"
import { Tooltip } from "@opencode/ui/tooltip"
import { ModelSelectorPopover } from "@/providers/models/select-dialog"
import type { ComposerModel } from "./model"

/** The chip naming what a prompt will run as. Its own file because the composer's tray and a message being
    edited both render it, and a second copy of a selector would be a second set of rules for the unpaid path,
    the mobile drawer and the animation. */
export function ComposerModelControl(props: {
  loading: boolean
  paid: boolean
  title: string
  keybind: string[]
  model: ComposerModel["model"]["selection"]
  modelName: string
  onClose: () => void
  onUnpaidClick: () => void
}) {
  const shouldAnimate = createMemo<boolean>((previous) => previous ?? props.loading)
  const mobile = createMediaQuery("(max-width: 767px)")

  const content = () => (
    <>
      {/* No provider mark on the chip: it rides inside the text tray where the name alone reads cleanly. The
          mark belongs beside each name inside the selector, which already carries it per provider group. */}
      <span class="truncate leading-4">{props.modelName}</span>
      <span class="-ms-0.5 -me-1 flex shrink-0">
        <Icon name="chevron-down" />
      </span>
    </>
  )

  return (
    <Show when={!props.loading}>
      <Tooltip
        inactive={mobile()}
        placement="top"
        gutter={4}
        value={
          <>
            {props.title}
            <Keybind keys={props.keybind} variant="neutral" />
          </>
        }
      >
        <Show
          when={props.paid || mobile()}
          fallback={
            <Button
              data-action="composer-model"
              data-control-type="dialog"
              variant="ghost-muted"
              size="small"
              // The chip takes the tray's contour from editor.css, which is unlayered and therefore beats
              // the 4px radius `small` pins. A utility here would need `!rounded-full` to win that back,
              // which splits one contour across two files.
              class="min-w-0 max-w-[220px] justify-start ![font-weight:440] group"
              classList={{ "animate-in fade-in": shouldAnimate() }}
              onClick={props.onUnpaidClick}
            >
              {content()}
            </Button>
          }
        >
          <ModelSelectorPopover
            model={props.model}
            unpaid={!props.paid}
            trigger={(triggerProps) => (
              <Button
                {...triggerProps}
                variant="ghost-muted"
                size="small"
                class="min-w-0 max-w-[220px] justify-start ![font-weight:440] group"
                classList={{ "animate-in fade-in": shouldAnimate() }}
                data-action="composer-model"
                data-control-type={mobile() ? "drawer" : "popover"}
              >
                {content()}
              </Button>
            )}
            onClose={props.onClose}
          />
        </Show>
      </Tooltip>
    </Show>
  )
}
