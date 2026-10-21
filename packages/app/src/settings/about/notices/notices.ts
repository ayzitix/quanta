import apache from "./apache-2.0.txt?raw"
import betterOfficeNotice from "./betteroffice-notice.txt?raw"
import ccBy4 from "./cc-by-4.0.txt?raw"
import { crates, crateTexts } from "./crates"

/**
 * Third-party software that ships inside the app, with the attribution its license asks redistributions to carry.
 * Notices and license texts are reproduced verbatim from each project, so they are not translated.
 */
export const notices = [
  {
    name: "BetterOffice",
    detail: "@betteroffice/docx, @betteroffice/xlsx, @betteroffice/pptx, @betteroffice/fonts",
    detailKey: undefined,
    url: "https://github.com/openooxml/betteroffice",
    license: "Apache License 2.0",
    notice: `${betterOfficeNotice.trim()}\nCopyright 2026 The OpenOOXML contributors`,
    text: apache,
  },
  {
    name: "eigenpal docx editor",
    detail: undefined,
    detailKey: "settings.about.notices.eigenpal" as const,
    url: "https://github.com/eigenpal/docx-editor",
    license: "Apache License 2.0",
    notice: "Copyright 2026 EigenPal Inc.",
    text: apache,
  },
  {
    name: "Solar Icons",
    detail: undefined,
    detailKey: undefined,
    url: "https://www.figma.com/community/file/1166831539721848736/solar-icons-set",
    license: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    // CC BY asks for the modification to be marked, and there is one to mark: Solar is drawn on a 24px grid and
    // this app's catalog is 16px, so an adopted glyph is redrawn rather than scaled. Said here rather than only in
    // `vendor/solar-icons/README.md`, because a source file is not a form appropriate to the medium -- the people
    // who receive the artwork are the ones who receive the app.
    notice: "Icons by 480 Design. Modified: redrawn on a 16px grid.",
    text: ccBy4,
  },
]

/**
 * The Rust crates the BetterOffice wasm engines compile in, generated from the published Cargo.lock and crate
 * tarballs. Each crate keeps its own copyright lines; license texts are stored once and referenced by id.
 */
export const crateNotices = {
  crates,
  texts: [...crateTexts, { id: "apache-2.0", license: "Apache-2.0", title: "Apache License 2.0", text: apache }],
}
