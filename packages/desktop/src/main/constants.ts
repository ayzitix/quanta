import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

// Electron 44 reports app.isPackaged as true for an unpackaged `electron .` run, so it cannot separate a
// dev build from a packaged one: a probe app logged defaultApp true, appPath at the source directory,
// and isPackaged true both before and after ready. Every dev-vs-packaged branch keyed on it then runs
// packaged behaviour, which costs the CLI resolution, the isolated state file and the source icons.
// process.defaultApp is set only when Electron was started with an app path and stays undefined in a
// packaged app, which is the distinction this process actually needs.
export const PACKAGED = process.defaultApp !== true

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = PACKAGED ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "Quanta Dev",
  beta: "Quanta Beta",
  prod: "Quanta",
}

const appIDs: Record<string, string> = {
  dev: "ai.opencode.desktop.dev",
  beta: "ai.opencode.desktop.beta",
  prod: "ai.opencode.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = PACKAGED ? appNames[CHANNEL] : "Quanta Dev"

export const APP_ID = PACKAGED ? appIDs[CHANNEL] : "ai.opencode.desktop.dev"
