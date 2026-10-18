/**
 * Electron's own right-click menu, which offers Select All and Inspect Element and nothing a user of this app
 * asked for. Suppressed everywhere except inside a field, where its cut, copy and paste are real commands that
 * no menu of ours stands in for.
 *
 * Bubble phase at the document, and it checks `defaultPrevented` before cancelling. Both halves are load
 * bearing. On the capture phase this listener runs first, and Kobalte's context-menu trigger bails out when it
 * finds `event.defaultPrevented` already set -- so cancelling early does not merely fail to suppress the native
 * menu, it silently kills every menu in the app. Letting the trigger cancel first and then standing down is what
 * makes "cancel it unless something else already did" correct: the flag is the signal that a menu of ours took
 * this event.
 *
 * This lives in the desktop shell rather than in the app, because the app's own entry is the web and PWA build,
 * where there is no native menu to suppress and the listener would be dead weight.
 */
export function suppressNativeContextMenu() {
  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return

    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return

    event.preventDefault()
  })
}
