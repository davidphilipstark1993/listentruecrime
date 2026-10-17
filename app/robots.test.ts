import { describe, expect, it } from 'vitest'
import robots, { AI_USER_AGENTS } from './robots'

describe('robots', () => {
  const result = robots()
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules]

  it('allows every AI crawler we want to be cited by', () => {
    const required = [
      'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
      'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
    ]
    for (const agent of required) expect(AI_USER_AGENTS).toContain(agent)
    const aiRule = rules.find(r => Array.isArray(r.userAgent) && r.userAgent.includes('GPTBot'))!
    expect(aiRule.allow).toBe('/')
  })

  it('keeps private paths off limits to AI crawlers too', () => {
    const aiRule = rules.find(r => Array.isArray(r.userAgent) && r.userAgent.includes('ClaudeBot'))!
    expect(aiRule.disallow).toEqual(expect.arrayContaining(['/admin/', '/api/', '/auth/']))
  })

  it('includes a Sitemap line', () => {
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/)
  })
})
