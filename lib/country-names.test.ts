import { describe, it, expect } from 'vitest'
import { nameForCode, countryDisplayName } from './country-names'

describe('country names', () => {
  it('maps codes to full British-English names', () => {
    expect(nameForCode('DE')).toBe('Germany')
    expect(nameForCode('fr')).toBe('France')
    expect(nameForCode('UK')).toBe('United Kingdom')
  })
  it('returns null for anything that is not a real code', () => {
    expect(nameForCode('XX')).toBeNull()
    expect(nameForCode('Germany')).toBeNull()
    expect(nameForCode('')).toBeNull()
  })
  it('prefers an editor-entered name and never shows a raw code', () => {
    expect(countryDisplayName({ country: 'US', country_name: ' Canada ' })).toBe('Canada')
    expect(countryDisplayName({ country: null, country_name: null })).toBeNull()
    expect(countryDisplayName({ country: 'ZZ', country_name: null })).toBeNull()
  })
})

describe('overrides', () => {
  it('uses plain wording for awkward Intl names', () => {
    expect(nameForCode('HK')).toBe('Hong Kong')
    expect(nameForCode('TT')).toBe('Trinidad and Tobago')
  })
})
