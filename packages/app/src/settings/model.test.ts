import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { Persistence } from "@/runtime/persistence/schema"
import {
  settingsSchema,
  settingsPersistence,
  defaultSettings,
  monoDefault,
  monoFontFamily,
  sansDefault,
  sansFontFamily,
  terminalFontFamily,
} from "./model"

const schema = Persistence.withInitial(settingsPersistence, defaultSettings)

const decode = Schema.decodeUnknownSync(schema)

const encode = Schema.encodeSync(schema)

describe("the retired timeline density preference", () => {
  // The control that wrote it is gone, so every stored document still carries `timelineDetail` and the
  // booleans that used to feed it. The regression this guards is not a stale value being honoured -- the
  // schema drops it -- it is the read side losing its rest tolerance and rejecting the whole document,
  // which would take every unrelated setting with it.
  test("is discarded on read without taking the surrounding document with it", () => {
    const settings = decode({
      general: {
        timelineDetail: { shell: { placement: "separate", details: "expanded" } },
        shellToolPartsExpanded: true,
        editToolPartsExpanded: false,
        reasoningMode: "full",
        showReasoningSummaries: true,
        showTurnDiffs: true,
      },
      appearance: { fontSize: 16 },
    })

    expect(settings.general).not.toHaveProperty("timelineDetail")
    expect(settings.general).not.toHaveProperty("reasoningMode")
    expect(settings.general.showTurnDiffs).toBe(true)
    expect(settings.appearance.fontSize).toBe(16)
  })
})

describe("settings schema", () => {
  test("keeps the values extensions copy out once and discards retired preferences", () => {
    const settings = decode({
      general: {
        showStatus: true,
        showSearch: true,
        experimentalBrowser: false,
        showProjectIcon: true,
        releaseNotes: false,
        mobileDiffWrap: false,
      },
      appearance: { showProjectName: true },
      sessionSummary: { projectExpanded: false, serverExpanded: true },
    })

    expect(settings.general.showSearch).toBe(true)
    expect(settings.general).not.toHaveProperty("showStatus")
    expect(settings.general).not.toHaveProperty("experimentalBrowser")
    expect(settings.general).not.toHaveProperty("showProjectIcon")
    expect(settings.appearance).not.toHaveProperty("showProjectName")

    const copied = (value: typeof settings) => ({
      sessionSummary: value.sessionSummary,
      releaseNotes: value.general.releaseNotes,
      mobileDiffWrap: value.general.mobileDiffWrap,
    })

    expect(copied(decode(encode(settings)))).toEqual({
      sessionSummary: { projectExpanded: false, serverExpanded: true },
      releaseNotes: false,
      mobileDiffWrap: false,
    })
  })

  test("uses the supplied initial values independently of the current schema", () => {
    const initial = {
      ...defaultSettings,
      general: { ...defaultSettings.general, autoSave: false },
      appearance: { ...defaultSettings.appearance, fontSize: 20 },
    }

    const restore = Schema.decodeUnknownSync(Persistence.withInitial(settingsPersistence, initial))
    expect(restore({})).toEqual(initial)
    expect(restore({ general: { reasoningMode: "invalid", showReasoningSummaries: true } })).toEqual(initial)
    expect(() => Schema.decodeUnknownSync(settingsSchema)({})).toThrow()
  })

  test("supplies the existing defaults for an empty document", () => {
    expect(decode({})).toEqual({
      general: {
        showFileTree: false,
        showTurnDiffs: false,
        mobileTitlebarPosition: "top",
        terminalPlacement: "side",
        followUpBehavior: "steer",
      },
      appearance: {
        fontSize: 14,
        mono: "",
        sans: "",
        terminal: "",
        tabLayout: "horizontal",
      },
      keybinds: {},
      permissions: { autoApprove: false, autoApproveProjects: {} },
      workspaces: { defaultDestination: "last-used", lastUsed: {} },
      notifications: { agent: true, permissions: true, errors: false },
      sounds: {
        agentEnabled: true,
        agent: "staplebops-01",
        permissionsEnabled: true,
        permissions: "staplebops-02",
        errorsEnabled: true,
        errors: "nope-03",
      },
    })
  })

  test("defaults invalid preferences locally while retaining valid siblings", () => {
    const settings = decode({
      general: {
        showTerminal: true,
        autoSave: false,
        releaseNotes: undefined,
        reasoningMode: 3,
        followUpBehavior: "invalid",
      },
      appearance: { fontSize: "large", mono: "Custom Mono", tabLayout: "vertical", showProjectName: true },
      permissions: { autoApprove: true, autoApproveProjects: { on: true, off: false, bad: "yes" } },
      workspaces: { defaultDestination: "new", lastUsed: { good: "workspace", bad: true } },
      keybinds: { good: "ctrl+k", bad: 3 },
      notifications: { agent: false, permissions: "yes", errors: true },
      sounds: { agent: "custom", agentEnabled: false, permissions: 3 },
    })

    expect(settings.general).toMatchObject({
      showTerminal: true,
      autoSave: false,
      followUpBehavior: "steer",
    })
    expect(settings.appearance).toEqual({
      fontSize: 14,
      mono: "Custom Mono",
      sans: "",
      terminal: "",
      tabLayout: "vertical",
    })
    expect(settings.permissions).toEqual({ autoApprove: true, autoApproveProjects: { on: true, off: false } })
    expect(settings.workspaces).toEqual({ defaultDestination: "new", lastUsed: { good: "workspace" } })
    expect(settings.keybinds).toEqual({ good: "ctrl+k" })
    expect(settings.notifications).toEqual({ agent: false, permissions: true, errors: true })
    expect(settings.sounds).toMatchObject({ agent: "custom", agentEnabled: false, permissions: "staplebops-02" })
    expect(decode(encode(settings))).toEqual(settings)
  })

  test.each([undefined, null, false, 7, "invalid", []].map((invalid) => [invalid]))(
    "defaults malformed sections without losing other sections: %j",
    (invalid) => {
      const defaults = decode({})
      expect(
        decode({
          general: invalid,
          appearance: { fontSize: 18 },
          keybinds: invalid,
          permissions: invalid,
          workspaces: invalid,
          notifications: invalid,
          sounds: invalid,
        }),
      ).toEqual({
        ...defaults,
        appearance: { ...defaults.appearance, fontSize: 18 },
      })
    },
  )

  test("does not silently repair invalid values during encoding", () => {
    expect(() =>
      Schema.encodeUnknownSync(settingsSchema)({ ...decode({}), appearance: { fontSize: "large" } }),
    ).toThrow()
  })
})

test("font defaults are Inter and IBM Plex Mono", () => {
  expect(sansDefault).toBe("Inter")
  expect(monoDefault).toBe("IBM Plex Mono")
})

test.each([
  { name: "sans", family: sansFontFamily, font: undefined, prefix: '"Inter", ' },
  { name: "sans", family: sansFontFamily, font: "", prefix: '"Inter", ' },
  { name: "sans", family: sansFontFamily, font: "   ", prefix: '"Inter", ' },
  { name: "sans", family: sansFontFamily, font: "Custom Sans", prefix: '"Custom Sans", "Inter", ' },
  { name: "mono", family: monoFontFamily, font: undefined, prefix: '"IBM Plex Mono", ' },
  { name: "mono", family: monoFontFamily, font: "", prefix: '"IBM Plex Mono", ' },
  { name: "mono", family: monoFontFamily, font: "   ", prefix: '"IBM Plex Mono", ' },
  { name: "mono", family: monoFontFamily, font: "Custom Mono", prefix: '"Custom Mono", "IBM Plex Mono", ' },
  { name: "terminal", family: terminalFontFamily, font: undefined, prefix: '"JetBrainsMono Nerd Font Mono", ' },
])("$name font family for $font starts with $prefix", ({ family, font, prefix }) => {
  expect(family(font)).toStartWith(prefix)
})
