import { sanitizeEnv } from '@/lib/utils'

// Structural subset of ScoredCandidate — lets callers (e.g. the admin
// "Replace" API route) build this from a podcast_discoveries DB row without
// needing to reconstruct a full ScoredCandidate/ResearchedCandidate/CandidateFeed chain.
export interface BlurbInput {
  podcastName: string
  description: string | null
  hosts: { name: string; verified: boolean }[] | null
  episodeCount: number | null
  latestEpisodeDate: string | null
  caseFocus: string[]
  pros: string[]
  cons: string[]
  editorialVerdict: string
  researchNotes: string[]
}

const BANNED_PHRASES = [
  'delve into',
  'in the realm of',
  'captivating',
  'gripping journey',
  'must-listen',
  'unparalleled',
  'takes listeners on a journey',
]

const SYSTEM_PROMPT = `You are drafting a short newsletter blurb for a true crime podcast recommendation email.

Ground rules — these are hard constraints, not suggestions:
- Use ONLY the facts provided below. Never invent hosts, episode counts, ratings, awards, case details, or listener statistics.
- The publication has NOT listened to this podcast. Never claim otherwise. Use framing like "Based on its format and published episodes..." rather than describing a listening experience.
- If a fact (e.g. hosts) is marked unverified or missing, say so plainly rather than working around it — do not paper over gaps with vague language.
- Do not use any of these phrases or close variants of them: ${BANNED_PHRASES.join(', ')}.
- Write like a measured, precise human editor — not promotional copy. Include a fair, specific note of criticism or limitation if one is available in the data (e.g. small catalogue, unverified host, inconsistent publishing).
- Keep it to 2-3 short paragraphs: what it is, why it was picked, who it's for.
- Output plain text only, no markdown, no headers.`

export interface DraftBlurbResult {
  text: string
  usedAI: boolean
  usage?: { inputTokens: number; outputTokens: number }
}

export async function draftBlurb(candidate: BlurbInput): Promise<DraftBlurbResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY ? sanitizeEnv(process.env.ANTHROPIC_API_KEY) : undefined
  if (!apiKey) {
    return { text: templateBlurb(candidate), usedAI: false }
  }

  const facts = {
    name: candidate.podcastName,
    description: candidate.description,
    hosts: candidate.hosts?.map(h => h.name).join(', ') ?? 'could not be verified',
    episodeCount: candidate.episodeCount ?? 'unknown',
    latestEpisodeDate: candidate.latestEpisodeDate ?? 'unknown',
    caseFocus: candidate.caseFocus.join(', ') || 'unspecified',
    pros: candidate.pros,
    cons: candidate.cons,
    editorialVerdict: candidate.editorialVerdict,
    researchNotes: candidate.researchNotes,
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        // Only needed for identity-linked personal API keys (Console keys
        // tied to a user login rather than a workspace); harmless to omit
        // for standard workspace API keys.
        ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } : {}),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Verified facts:\n${JSON.stringify(facts, null, 2)}` }],
      }),
    })

    if (!res.ok) {
      console.error(`Anthropic API error ${res.status}: ${await res.text()}`)
      return { text: templateBlurb(candidate), usedAI: false }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text?.trim()
    if (!text) return { text: templateBlurb(candidate), usedAI: false }

    const usage = data.usage
      ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
      : undefined
    if (usage) {
      console.log(`Anthropic usage for "${candidate.podcastName}": ${usage.inputTokens} in / ${usage.outputTokens} out`)
    }
    return { text, usedAI: true, usage }
  } catch (err) {
    console.error('Anthropic API request failed:', err)
    return { text: templateBlurb(candidate), usedAI: false }
  }
}

/** Fallback used when ANTHROPIC_API_KEY isn't configured or the API call fails. */
function templateBlurb(candidate: BlurbInput): string {
  const hostLine = candidate.hosts?.length
    ? `Hosted by ${candidate.hosts.map(h => h.name).join(', ')}.`
    : "The host(s) could not be verified from available sources."
  const episodeLine = candidate.episodeCount != null
    ? `${candidate.episodeCount} episodes published so far.`
    : 'Episode count could not be verified.'

  return [
    candidate.description ?? `${candidate.podcastName} is a true crime podcast.`,
    `${hostLine} ${episodeLine}`,
    `Based on its format and published episodes, ${candidate.editorialVerdict.toLowerCase()}`,
  ].join('\n\n')
}
