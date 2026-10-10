// Email subject line and preview text (the grey line inboxes show after the
// subject) for a weekly newsletter. The curator can type either one in
// /admin/weekly-newsletter; when a box is left blank it's generated from that
// week's podcasts, so the subject changes every week instead of repeating
// the fixed issue title. Pure functions — used both by the admin page (to
// show the automatic version as a placeholder) and by the send itself.

export const DEFAULT_SUBJECT = '5 True Crime Podcasts Worth Listening To'
export const MAX_SUBJECT_LENGTH = 150
export const MAX_PREVIEW_TEXT_LENGTH = 200

// Most inboxes cut a subject off at around 60 characters on mobile.
const AUTO_SUBJECT_MAX = 60
const AUTO_PREVIEW_MAX = 150

function cleanNames(podcastNames: (string | null | undefined)[]): string[] {
  return podcastNames.map(n => n?.trim()).filter((n): n is string => Boolean(n))
}

function joinWithAnd(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function autoSubject(podcastNames: (string | null | undefined)[]): string {
  const names = cleanNames(podcastNames)
  if (names.length < 2) return DEFAULT_SUBJECT

  const more = (n: number) => `${n} more true crime podcast${n === 1 ? '' : 's'}`
  const candidates = names.length === 2
    ? [`${names[0]} and ${names[1]}`, `${names[0]} and ${more(1)}`]
    : [`${names[0]}, ${names[1]} and ${more(names.length - 2)}`, `${names[0]} and ${more(names.length - 1)}`]
  return candidates.find(s => s.length <= AUTO_SUBJECT_MAX) ?? DEFAULT_SUBJECT
}

export function autoPreviewText(podcastNames: (string | null | undefined)[]): string | null {
  const names = cleanNames(podcastNames)
  if (!names.length) return null

  const full = `This week: ${joinWithAnd(names)}.`
  if (full.length <= AUTO_PREVIEW_MAX) return full

  // Too long: keep as many whole names as fit, then "and N more".
  for (let keep = names.length - 1; keep >= 1; keep--) {
    const text = `This week: ${names.slice(0, keep).join(', ')} and ${names.length - keep} more.`
    if (text.length <= AUTO_PREVIEW_MAX) return text
  }
  return `${full.slice(0, AUTO_PREVIEW_MAX - 1).trimEnd()}…`
}

export function resolveSubject(typed: string | null | undefined, podcastNames: (string | null | undefined)[]): string {
  return typed?.trim() || autoSubject(podcastNames)
}

export function resolvePreviewText(typed: string | null | undefined, podcastNames: (string | null | undefined)[]): string | null {
  return typed?.trim() || autoPreviewText(podcastNames)
}
