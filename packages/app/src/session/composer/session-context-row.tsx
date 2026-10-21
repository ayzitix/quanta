import { createMemo } from "solid-js"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import { useServer } from "@/runtime/server/current"
import { useTabs } from "@/shell/tabs/tabs"
import { createPromptProjectController, PromptProjectSelector } from "@/projects/picker"
import type { PromptProjectControls } from "@/projects/picker"
import type { SessionModel } from "../model"

/**
 * Which project this session runs in, above the tray.
 *
 * The draft composer names the project before a session exists; this keeps it live for the whole conversation
 * rather than locking it the moment the first message is sent. Sitting above the tray and hung off its leading
 * edge is where the draft puts it too — it is the sentence's own furniture, not a status line for the panel.
 * The window opens **upward**: a trigger this close to the bottom edge has no room below it.
 *
 * It reuses the draft's own picker window, so search, the add-folder action and the item treatment are one
 * control in two places rather than two controls that drift. Only the controls behind it differ.
 *
 * Choosing a project opens a **new** session in it and leaves this one alone. A session is bound to its
 * location, so "switching" here could only mean the next one — starting another is the honest version of the
 * same gesture. Unlocking the row is still worth it: the user can see and change where the next session runs
 * without leaving the conversation they are in.
 *
 * Projects come from this session's server alone. Another server's projects would mean a draft on a different
 * connection, which is what the home screen and titlebar are for; a composer control that silently crosses
 * connections is a worse answer than a shorter list.
 */
export function SessionContextRow(props: { session: SessionModel; onDone: () => void }) {
  const server = useServer()
  const tabs = useTabs()
  const pickDirectory = useDirectoryPicker()
  const directory = createMemo(() => props.session.project()?.worktree ?? props.session.workspace.directory())
  const project = createMemo(() => props.session.project())
  const openDraft = (worktree: string) => void tabs.newDraft({ server: server.key, directory: worktree }, "")

  const controller = createPromptProjectController({
    onDone: props.onDone,
    controls: () =>
      ({
        available: server.ctx.projects.list(),
        directory: directory(),
        projectID: project()?.id,
        select: openDraft,
        add: (title: string) => {
          pickDirectory({
            server: server.conn,
            title,
            onSelect: (result) => {
              const picked = Array.isArray(result) ? result[0] : result

              if (picked) openDraft(picked)
            },
          })
        },
      }) satisfies PromptProjectControls,
  })

  return (
    <div data-component="session-context-row" class="flex min-w-0 flex-row items-center text-v2-text-text-faint">
      <PromptProjectSelector controller={controller} placement="top-start" />
    </div>
  )
}
