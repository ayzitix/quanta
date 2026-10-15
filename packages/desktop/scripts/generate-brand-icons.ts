#!/usr/bin/env bun
// Quanta: regenerate the desktop brand icons from a single source SVG.
//
// Upstream ships the icon sets as opaque binaries produced by a Tauri + Image2Icon pipeline
// (see icons/README.md) that needs macOS tooling. This script produces the same file layout from
// one SVG so the fork can restyle every channel without that toolchain.
//
//   bun scripts/generate-brand-icons.ts [--check]
//
// --check reports the source and the file count, then exits.
import { existsSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")

const icons = path.join(root, "icons")

const source = path.join(icons, "source", "quanta.svg")

const channels = ["dev", "beta", "prod"] as const

const ink = "#131010"

const mark = 0.48 // mark width as a fraction of the icon canvas

const radius = 0.2 // corner radius as a fraction of the icon canvas

const square = [32, 64, 128] as const

const androidDensity = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 } as const

const androidForeground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 } as const

const iosIcons = {
  "AppIcon-20x20@1x": 20,
  "AppIcon-20x20@2x": 40,
  "AppIcon-20x20@2x-1": 40,
  "AppIcon-20x20@3x": 60,
  "AppIcon-29x29@1x": 29,
  "AppIcon-29x29@2x": 58,
  "AppIcon-29x29@2x-1": 58,
  "AppIcon-29x29@3x": 87,
  "AppIcon-40x40@1x": 40,
  "AppIcon-40x40@2x": 80,
  "AppIcon-40x40@2x-1": 80,
  "AppIcon-40x40@3x": 120,
  "AppIcon-60x60@2x": 120,
  "AppIcon-60x60@3x": 180,
  "AppIcon-76x76@1x": 76,
  "AppIcon-76x76@2x": 152,
  "AppIcon-83.5x83.5@2x": 167,
  "AppIcon-512@2x": 1024,
} satisfies Record<string, number>

const windowsLogos = [30, 44, 71, 89, 107, 142, 150, 284, 310] as const

// ICNS chunk types that accept PNG payloads. ImageMagick writes a bare PNG to a .icns path
// instead of a real container, so the container is assembled here.
const icnsChunks = {
  ic11: 32,
  ic12: 64,
  ic07: 128,
  ic13: 256,
  ic08: 256,
  ic14: 512,
  ic09: 512,
  ic10: 1024,
} satisfies Record<string, number>

const check = process.argv.includes("--check")

async function run(input: string[], output: string) {
  // -strip drops the tIME chunk so re-running does not churn every file in git. It has to
  // precede the output path, since ImageMagick reads any filename after it as another input.
  const proc = Bun.spawn(["magick", ...input, "-strip", output], { stdout: "pipe", stderr: "pipe" })
  const code = await proc.exited

  if (code !== 0) throw new Error(`magick failed (${code}): ${input.join(" ")} -> ${output}`)
}

// The mark alone, transparent, rendered at an exact pixel size.
async function renderMark(size: number, destination: string) {
  const proc = Bun.spawn(["rsvg-convert", "-w", String(size), "-h", String(size), "-b", "none", source, "-o", destination], {
    stdout: "pipe",
    stderr: "pipe",
  })

  if ((await proc.exited) !== 0) throw new Error(`rsvg-convert failed for ${destination}`)
}

// Full icon: rounded ink plate with the mark inset and centred. Android's round launcher
// variant swaps the plate for a circle.
async function renderIcon(size: number, destination: string, plate: "rounded" | "circle" = "rounded") {
  const inner = Math.max(1, Math.round(size * mark))
  const corner = Math.round(size * radius)
  const markFile = `${destination}.mark.png`

  await renderMark(inner, markFile)

  const draw =
    plate === "circle"
      ? ["-draw", `circle ${(size - 1) / 2},${(size - 1) / 2} ${(size - 1) / 2},0`]
      : ["-draw", `roundrectangle 0,0 ${size - 1},${size - 1} ${corner},${corner}`]

  await run(
    [
      "-size",
      `${size}x${size}`,
      "xc:none",
      "-fill",
      ink,
      ...draw,
      "(",
      markFile,
      "-gravity",
      "center",
      ")",
      "-composite",
    ],
    destination,
  )

  await Bun.$`rm -f ${markFile}`.quiet()
}

// Windows Store and StoreLogo assets are the mark on transparency, with no ink plate.
async function renderGlyph(size: number, destination: string) {
  await renderMark(size, destination)
}

async function buildIcns(destination: string) {
  const chunks: Uint8Array[] = []

  for (const [type, size] of Object.entries(icnsChunks)) {
    const tmp = `${destination}.${type}.png`

    await renderIcon(size, tmp)

    const bytes = new Uint8Array(await Bun.file(tmp).arrayBuffer())
    const header = new Uint8Array(8)

    header.set(new TextEncoder().encode(type), 0)
    new DataView(header.buffer).setUint32(4, 8 + bytes.byteLength)
    chunks.push(header, bytes)

    await Bun.$`rm -f ${tmp}`.quiet()
  }

  const body = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0))
  let offset = 0

  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  const file = new Uint8Array(8 + body.byteLength)

  file.set(new TextEncoder().encode("icns"), 0)
  new DataView(file.buffer).setUint32(4, file.byteLength)
  file.set(body, 8)

  await Bun.write(destination, file)
}

async function buildIco(destination: string) {
  const master = `${destination}.master.png`

  await renderIcon(256, master)
  // The destination must stay out of the input list: ImageMagick would otherwise read the
  // half-written .ico back in and, having no output left, write a file named "undefined-0".
  await run(["-define", "icon:auto-resize=256,128,64,48,32,16", master], destination)

  await Bun.$`rm -f ${master}`.quiet()
}

if (!existsSync(source)) {
  console.error(`missing source SVG: ${source}`)
  console.error("drop the brand SVG there as icons/source/quanta.svg and re-run")
  process.exit(1)
}

if (check) {
  let count = 0

  for (const channel of channels) {
    count += 6 + 3 * Object.keys(androidDensity).length + Object.keys(iosIcons).length + windowsLogos.length + 1
  }

  console.log(`source: ${source}`)
  console.log(`would write ~${count} files across ${channels.join(", ")}`)
  process.exit(0)
}

for (const channel of channels) {
  const dir = path.join(icons, channel)

  await renderIcon(512, path.join(dir, "icon.png"))

  for (const size of square) await renderIcon(size, path.join(dir, `${size}x${size}.png`))

  await renderIcon(256, path.join(dir, "128x128@2x.png"))
  await renderIcon(256, path.join(dir, "dock.png"))
  await buildIco(path.join(dir, "icon.ico"))
  await buildIcns(path.join(dir, "icon.icns"))

  for (const [density, size] of Object.entries(androidDensity)) {
    const mipmap = path.join(dir, "android", `mipmap-${density}`)

    await renderIcon(size, path.join(mipmap, "ic_launcher.png"))
    await renderIcon(size, path.join(mipmap, "ic_launcher_round.png"), "circle")

    // SAFETY: Object.entries over androidDensity yields exactly its own keys.
    const foreground = androidForeground[density as keyof typeof androidForeground]

    await renderIcon(foreground, path.join(mipmap, "ic_launcher_foreground.png"))
  }

  await Bun.write(
    path.join(dir, "android", "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">${ink}</color>\n</resources>\n`,
  )

  const ios = path.join(dir, "ios")

  for (const [name, size] of Object.entries(iosIcons)) await renderIcon(size, path.join(ios, `${name}.png`))

  for (const size of windowsLogos) await renderGlyph(size, path.join(dir, `Square${size}x${size}Logo.png`))

  await renderGlyph(50, path.join(dir, "StoreLogo.png"))
  console.log(`${channel}: done`)
}

console.log("all channels written")