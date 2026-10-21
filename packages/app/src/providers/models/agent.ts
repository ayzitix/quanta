/** The agent the server falls back to when nothing is configured, and the one the composer offers when the
    server reports none at all. Named once here because three places already reach for the same literal. */
export const defaultAgent = "build"

export function resolveAgent<T extends { name: string }>(items: T[], name?: string) {
  return items.find((item) => item.name === name) ?? items.find((item) => item.name === defaultAgent) ?? items[0]
}
