import { describe, expect, it } from 'vitest'
import { REGIONS } from '../../data/regions'
import { decodeShareState, encodeShareState, sanitizeDatasetForShare } from '../shareSnapshot'

describe('shareSnapshot', () => {
  const dataset = {
    id: 'kliste-2026',
    label: 'Klíšťová encefalitida',
    period: 'leden 2026',
    unit: 'both',
    values: { [REGIONS[0].name]: { count: '12', rate: 3.456 } },
  }

  it('snapshot přežije encode → decode včetně diakritiky', () => {
    const token = encodeShareState({ dataset, mode: 'embed', display: 'count' })
    const decoded = decodeShareState(token)
    expect(decoded.mode).toBe('embed')
    expect(decoded.display).toBe('count')
    expect(decoded.dataset.label).toBe('Klíšťová encefalitida')
    expect(decoded.dataset.values[REGIONS[0].name]).toEqual({ count: 12, rate: 3.5 })
  })

  it('doplní všechny kraje a zahodí neplatné hodnoty', () => {
    const clean = sanitizeDatasetForShare({ values: { [REGIONS[1].name]: { count: -5, rate: 'x' } } })
    expect(Object.keys(clean.values)).toHaveLength(REGIONS.length)
    expect(clean.values[REGIONS[1].name]).toEqual({ count: '', rate: '' })
    expect(clean.unit).toBe('both')
  })

  it('neplatný token vrátí null', () => {
    expect(decodeShareState('')).toBeNull()
    expect(decodeShareState('!!!')).toBeNull()
  })
})
