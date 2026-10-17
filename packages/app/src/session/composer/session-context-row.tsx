import { createMemo, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { Tooltip } from "@opencode/ui/tooltip"
import {
  displayName,
  getProjectAvatarSource,
  getProjectAvatarVariant,
  ProjectAvatar,
} from "@opencode/ui/project-avatar"
import { getFilename } from "@opencode/util/path"
import type { SessionModel } from "../model"

/**
 * Where this session runs, read-only, above the tray.
 *
 * The same three facts the draft composer names before a session exists — project, worktree, branch — carried
 * through the conversation rather than dropped the moment the first message is sent. They stay labels here
 * because a session is already bound to its location: switching the worktree mid-conversation would not move
 * the session, only the next one, so a picker would promise something it cannot deliver. `disabled` would be
 * worse, a control that looks live and refuses.
 *
 * No dependency on the new-session feature. It renders the same primitives from `@opencode/ui` rather than
 * importing its selectors, because that module owns the *draft* project's controller and its callbacks mean
 * nothing once a session exists.
 */
export function SessionContextRow(props: { session: SessionModel }) {
  const data = props.session.shared.data
  // The worktree the timeline already syncs VCS for, so the branch below resolves from data the session view
  // is already fetching rather than starting a sync of its own.
  const directory = createMemo(() => props.session.project()?.worktree ?? props.session.workspace.directory())
  const project = createMemo(() => props.session.project())
  const branch = createMemo(() => data.location.vcs.info({ directory: directory() })?.branch.current)
  const worktree = createMemo(() => getFilename(directory()) || directory())

  return (
    <div
      data-component="session-context-row"
      class="flex min-h-7 min-w-0 flex-row flex-wrap items-center justify-start gap-0 text-v2-text-text-faint"
    >
      <div class="flex h-7 min-w-0 max-w-[203px] items-center gap-1.5 px-1.5">
        <ProjectAvatar
          fallback={displayName(project() ?? { worktree: directory() })}
          src={getProjectAvatarSource(project()?.id, project()?.icon)}
          variant={getProjectAvatarVariant(project()?.icon?.color)}
        />
        <Tooltip placement="top" value={displayName(project() ?? { worktree: directory() })} disabled>
          <span class="min-w-0 truncate leading-5">{displayName(project() ?? { worktree: directory() })}</span>
        </Tooltip>
      </div>
      <Show when={branch()}>
        <span class="px-0.5 leading-none text-v2-text-text-faint">/</span>
        <div class="flex h-6 min-w-0 max-w-[203px] items-center gap-1.5 px-1.5">
          <Icon name="monitor" size="small" class="shrink-0 text-v2-icon-icon-muted" />
          <Tooltip placement="top" value={worktree()} disabled={worktree().length <= 24}>
            <span class="min-w-0 truncate leading-5">{worktree()}</span>
          </Tooltip>
        </div>
      </Show>
      <Show when={branch()}>
        <div
          data-slot="session-context-branch"
          class="ms-1 flex h-6 min-w-0 max-w-[220px] items-center gap-1.5 rounded-full bg-v2-background-bg-layer-02 px-2.5 text-[13px] leading-5 text-v2-text-text-faint"
        >
          <Icon name="branch" size="small" class="shrink-0 text-v2-icon-icon-muted" />
          <Tooltip placement="top" value={branch()!} disabled>
            <span class="min-w-0 truncate">{branch()}</span>
          </Tooltip>
        </div>
      </Show>
    </div>
  )
}
