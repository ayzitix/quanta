import { For, Show, createMemo, type JSX } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { Button } from "@opencode/ui/button"
import { useDialog } from "@opencode/ui/context/dialog"
import { Icon } from "@opencode/ui/icon"
import { Keybind } from "@opencode/ui/keybind"
import { ProviderModelIcon } from "@/providers/models/provider-group"
import { Tooltip } from "@opencode/ui/tooltip"
import { ComposerEditor } from "./editor/editor"
import { ModelSelectorPopover } from "@/providers/models/select-dialog"
import { DialogSelectModelUnpaid } from "@/providers/models/unpaid"
import { formatKeybind, useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import type { ComposerModel } from "./model"

export function Composer(props: {
  class?: string
  model: ComposerModel
  borderUnderlay?: boolean
  readOnly?: boolean
  suggestionBoundary?: () => HTMLElement | undefined
  /** Rendered in the bar before the model control; the caller decides what belongs there. */
  barSlot?: JSX.Element
}) {
  const dialog = useDialog()
  const command = useCommand()
  const language = useLanguage()

  // Reasoning effort is per model, so it only makes sense next to the model picker rather than
  // on the bar, where it read as a second global mode.
  const variant = () => props.model.model.selection.variant

  const variantOptions = createMemo(() =>
    ["default", ...variant().list()].map((value) => ({ id: value, label: value })),
  )

  const variantCurrent = () => variant().current() ?? "default"

  return (
    <div class="flex flex-col gap-3">
      <ComposerEditor
        controller={props.model}
        borderUnderlay={props.borderUnderlay}
        readOnly={props.readOnly}
        class={props.class}
        modelControlsVisible={!props.model.model.loading}
        barSlot={props.barSlot}
        attachKeybind={command.keybindParts("file.attach")}
        attachShortcut={command.keybind("file.attach")}
        alternateKeybind={[formatKeybind("mod", language.t), "↵"]}
        exitShellKeybind={[formatKeybind("esc", language.t)]}
        suggestionBoundary={props.suggestionBoundary}
        modelControl={
          <ComposerModelControl
            loading={props.model.model.loading}
            paid={props.model.model.paid}
            title={language.t("command.model.choose")}
            keybind={command.keybindParts("model.choose")}
            model={props.model.model.selection}
            provider={props.model.model.selection.current()?.provider}
            modelName={props.model.model.selection.current()?.name ?? language.t("dialog.model.select.title")}
            footer={
              <Show when={variantOptions().length > 1}>
                <div
                  class="flex items-center gap-1 px-1.5 py-1"
                  role="group"
                  aria-label={language.t("ui.promptInput.chooseVariant")}
                >
                  <For each={variantOptions()}>
                    {(option) => (
                      <button
                        type="button"
                        class="h-6 min-w-0 flex-1 truncate rounded-sm px-2 text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-faint transition-colors hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:text-v2-text-text-base focus-visible:outline-none"
                        classList={{
                          "bg-v2-overlay-simple-overlay-hover! text-v2-text-text-base!": variantCurrent() === option.id,
                        }}
                        onClick={() => variant().set(option.id === "default" ? undefined : option.id)}
                      >
                        {option.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            }
            onClose={props.model.restoreFocus}
            onUnpaidClick={() => dialog.show(() => <DialogSelectModelUnpaid model={props.model.model.selection} />)}
          />
        }
      />
    </div>
  )
}

function ComposerModelControl(props: {
  loading: boolean
  paid: boolean
  title: string
  keybind: string[]
  model: ComposerModel["model"]["selection"]
  provider?: { id: string; canonical?: string; name: string }
  modelName: string
  footer?: JSX.Element
  onClose: () => void
  onUnpaidClick: () => void
}) {
  const shouldAnimate = createMemo<boolean>((previous) => previous ?? props.loading)
  const mobile = createMediaQuery("(max-width: 767px)")

  const content = () => (
    <>
      <Show when={props.provider}>
        {(provider) => (
          <ProviderModelIcon
            provider={provider()}
            class="shrink-0 opacity-40 transition-opacity duration-150 group-hover:opacity-100"
          />
        )}
      </Show>
      <span class="truncate leading-4">{props.modelName}</span>
      <span class="-ml-0.5 -mr-1 flex shrink-0">
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
              size="normal"
              class="min-w-0 max-w-[220px] justify-start ![font-weight:440] group"
              classList={{ "animate-in fade-in": shouldAnimate() }}
              style={{ height: "28px" }}
              onClick={props.onUnpaidClick}
            >
              {content()}
            </Button>
          }
        >
          <ModelSelectorPopover
            model={props.model}
            unpaid={!props.paid}
            footer={props.footer}
            trigger={(triggerProps) => (
              <Button
                {...triggerProps}
                variant="ghost-muted"
                size="normal"
                style={{ height: "28px" }}
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
