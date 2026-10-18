import type { SessionMessageAssistant, SessionMessageInfo } from "@opencode/client/promise"
import { shellResultFailed } from "../message/current-tool-state"

export const timelineCategories = ["shell", "edit", "thinking", "subagents", "notices", "tools"] as const

export type TimelineCategory = (typeof timelineCategories)[number]

export type TimelinePlacement = "separate" | "grouped" | "hidden"

export type TimelineExpansion = "collapsed" | "expanded"

export type TimelineDetail = {
  shell: { placement: TimelinePlacement; details: TimelineExpansion }
  edit: { placement: TimelinePlacement; details: TimelineExpansion }
  thinking: { placement: TimelinePlacement; details: TimelineExpansion }
  subagents: { placement: TimelinePlacement }
  notices: { placement: TimelinePlacement }
  tools: { placement: TimelinePlacement }
}

export const timelinePresets = [
  {
    id: "everything",
    value: {
      shell: { placement: "separate", details: "expanded" },
      edit: { placement: "separate", details: "expanded" },
      thinking: { placement: "separate", details: "expanded" },
      subagents: { placement: "separate" },
      notices: { placement: "separate" },
      tools: { placement: "separate" },
    },
  },
  {
    id: "detailed",
    value: {
      shell: { placement: "separate", details: "expanded" },
      edit: { placement: "separate", details: "expanded" },
      thinking: { placement: "grouped", details: "collapsed" },
      subagents: { placement: "separate" },
      notices: { placement: "grouped" },
      tools: { placement: "grouped" },
    },
  },
  {
    id: "compact",
    value: {
      shell: { placement: "grouped", details: "collapsed" },
      edit: { placement: "grouped", details: "collapsed" },
      thinking: { placement: "grouped", details: "collapsed" },
      subagents: { placement: "grouped" },
      notices: { placement: "grouped" },
      tools: { placement: "grouped" },
    },
  },
  {
    id: "quiet",
    value: {
      shell: { placement: "hidden", details: "collapsed" },
      edit: { placement: "grouped", details: "collapsed" },
      thinking: { placement: "hidden", details: "collapsed" },
      subagents: { placement: "grouped" },
      notices: { placement: "hidden" },
      tools: { placement: "hidden" },
    },
  },
  {
    id: "text-only",
    value: {
      shell: { placement: "hidden", details: "collapsed" },
      edit: { placement: "hidden", details: "collapsed" },
      thinking: { placement: "hidden", details: "collapsed" },
      subagents: { placement: "hidden" },
      notices: { placement: "hidden" },
      tools: { placement: "hidden" },
    },
  },
] as const satisfies readonly { id: string; value: TimelineDetail }[]

/** The one density the timeline renders at. There is no longer a preference behind it: the control that chose
    between these was removed, so a stored `timelineDetail` is discarded on read and this is what every session
    gets. Referenced by id rather than by index so reordering the array cannot repoint it.

    `compact` with one exception: thinking is `separate` rather than `grouped`. Grouping it produced one line
    reading "Used 1 Thought", which names the count and shows nothing about what was thought. A row of its own
    says `Thought` and opens to the reasoning, so the count is gone and the content is one click away.

    Typed as `TimelineDetail` rather than as a literal shape: the timeline reads every branch of this value, and
    narrowing it here would have the compiler reject code that is correct the moment the density is variable
    again. */
export const defaultTimelineDetail: TimelineDetail = {
  ...timelinePresets.find((preset) => preset.id === "compact")!.value,
  thinking: { placement: "separate", details: "collapsed" },
}

export function timelinePreset(value: TimelineDetail) {
  return timelinePresets.find((preset) =>
    timelineCategories.every((category) => {
      const current = value[category]
      const expected = preset.value[category]

      return (
        current.placement === expected.placement &&
        (current.placement === "hidden" ||
          !("details" in current) ||
          ("details" in expected && current.details === expected.details))
      )
    }),
  )
}

export function timelineCategory(
  content: SessionMessageAssistant["content"][number],
): keyof TimelineDetail | undefined {
  if (content.type === "text") return

  if (content.type === "reasoning") return "thinking"

  if (["shell", "execute", "bash"].includes(content.name)) return "shell"

  if (["edit", "write", "patch", "apply_patch"].includes(content.name)) return "edit"

  if (["subagent", "task"].includes(content.name)) return "subagents"

  return "tools"
}

export function timelineNoticeRequired(message: SessionMessageInfo) {
  if (message.type === "compaction") return message.status !== "completed"

  if (message.type !== "synthetic") return false
  const metadata = message.metadata

  return (
    metadata?.state === "error" ||
    (metadata?.source === "shell" && metadata.state === "completed" && shellResultFailed(metadata))
  )
}
