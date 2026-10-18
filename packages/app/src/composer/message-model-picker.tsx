import type { JSX } from "solid-js"
import { useDialog } from "@opencode/ui/context/dialog"
import { useCommand } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { DialogSelectModelUnpaid } from "@/providers/models/unpaid"
import { ComposerModelControl } from "./model-control"
import type { ComposerModel } from "./model"

/**
 * Hands a message being edited the model selector, which only the app can build. A render prop because the
 * selector needs hooks, which the transcript has no scope to call.
 *
 * The prompt is deliberately not part of this. Editing a message writes to a field on the message rather than
 * to the composer's draft: the tray holds whatever else the user is in the middle of, and one mirroring into
 * the other would overwrite it.
 */
export function MessageEditorScope(props: {
  model: ComposerModel
  children: (modelPicker: (input: { onClose: () => void }) => JSX.Element) => JSX.Element
}) {
  const language = useLanguage()
  const command = useCommand()
  const dialog = useDialog()

  return (
    <>
      {props.children((input) => (
        <ComposerModelControl
          loading={props.model.model.loading}
          paid={props.model.model.paid}
          title={language.t("command.model.choose")}
          keybind={command.keybindParts("model.choose")}
          model={props.model.model.selection}
          modelName={props.model.model.selection.current()?.name ?? language.t("dialog.model.select.title")}
          onClose={input.onClose}
          onUnpaidClick={() => dialog.show(() => <DialogSelectModelUnpaid model={props.model.model.selection} />)}
        />
      ))}
    </>
  )
}
