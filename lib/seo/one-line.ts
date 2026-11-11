/** First sentence of a description, trimmed to `max` characters at a word boundary. */
export function oneLine(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const first = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? clean
  if (first.length <= max) return first.replace(/\.$/, '')
  const cut = first.slice(0, max).replace(/\s+\S*$/, '')
  return `${cut}…`
}
