// Search results cut descriptions at roughly 155-160 characters. Longer text is
// trimmed back to the last whole word and given an ellipsis, so the visible
// snippet ends cleanly instead of mid-word.
export const META_DESCRIPTION_MAX = 155

export function trimMeta(text: string, max?: number): string
export function trimMeta(text: string | null | undefined, max?: number): string | undefined
export function trimMeta(text: string | null | undefined, max = META_DESCRIPTION_MAX): string | undefined {
  if (!text) return undefined
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '')
  return `${base}…`
}
