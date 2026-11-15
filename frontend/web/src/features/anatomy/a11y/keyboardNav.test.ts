import { describe, expect, it } from 'vitest'
import type { BodyRegionId, Status } from '../../../types/domain'
import { FIXTURE_MANIFEST } from '../atlas/__fixtures__/manifest.fixture'
import { isContextOnly } from '../atlas/health'
import { describeRegion, describeStructure, statusPhrase } from './describe'
import { NAV_START, buildNavModel, cursorOf, highlightOf, moveCursor, selectTarget, targetOf } from './keyboardNav'
import type { NavCursor } from './keyboardNav'

const model = buildNavModel(FIXTURE_MANIFEST)
const order = model.regions.map((g) => g.region)
const at = (region: BodyRegionId) => order.indexOf(region)

describe('buildNavModel', () => {
  it('lists the monitored regions in dashboard order', () => {
    expect(order).toEqual(['brain', 'heart', 'lungs', 'kidneys', 'muscles', 'bones', 'skin'])
  })

  it('holds monitored structures only, the representative organ first', () => {
    const all = model.regions.flatMap((g) => g.structures)
    expect(all.some(isContextOnly)).toBe(false)
    expect(all.map((s) => s.id)).not.toContain('teeth')
    expect(all.map((s) => s.id)).not.toContain('stomach')
    const heart = model.regions[at('heart')]!
    expect(heart.structures[0]!.id).toBe('heart')
    expect(heart.structures.map((s) => s.name)).toEqual(['Heart', 'Aorta', 'Superior vena cava'])
    expect(model.regions[at('muscles')]!.primary).toBeNull()
  })
})

describe('moveCursor', () => {
  it('cycles through regions with Up and Down, wrapping at both ends', () => {
    let c: NavCursor = NAV_START
    const seen: BodyRegionId[] = []
    for (let i = 0; i < order.length; i++) {
      seen.push(targetOf(model, c)!.region)
      c = moveCursor(model, c, 'ArrowDown')!
    }
    expect(seen).toEqual(order)
    expect(c).toEqual(NAV_START)
    expect(moveCursor(model, NAV_START, 'ArrowUp')).toEqual({ region: order.length - 1, structure: -1 })
  })

  it('cycles through the structures of a region with Left and Right, the region itself included', () => {
    const start: NavCursor = { region: at('heart'), structure: -1 }
    const names: string[] = []
    let c = start
    for (let i = 0; i < 4; i++) {
      c = moveCursor(model, c, 'ArrowRight')!
      names.push(targetOf(model, c)!.label)
    }
    expect(names).toEqual(['Heart', 'Aorta', 'Superior vena cava', 'Heart'])
    expect(moveCursor(model, start, 'ArrowLeft')).toEqual({ region: at('heart'), structure: 2 })
    expect(moveCursor(model, { region: at('heart'), structure: 0 }, 'ArrowLeft')).toEqual(start)
  })

  it('goes back to the region level when changing region', () => {
    expect(moveCursor(model, { region: at('heart'), structure: 2 }, 'ArrowDown')).toEqual({ region: at('lungs'), structure: -1 })
  })

  it('handles Home and End, and ignores other keys', () => {
    expect(moveCursor(model, { region: 3, structure: 1 }, 'Home')).toEqual(NAV_START)
    expect(moveCursor(model, NAV_START, 'End')).toEqual({ region: order.length - 1, structure: -1 })
    expect(moveCursor(model, NAV_START, 'Enter')).toBeNull()
    expect(moveCursor(model, NAV_START, 'a')).toBeNull()
    expect(moveCursor({ regions: [] }, NAV_START, 'ArrowDown')).toBeNull()
  })
})

describe('selection', () => {
  it('Enter on a structure selects it like a click, Enter on a region selects the region', () => {
    const calls: unknown[][] = []
    const app = { selectStructure: (...a: unknown[]) => void calls.push(['structure', ...a]), selectRegion: (r: unknown) => void calls.push(['region', r]) }
    selectTarget(targetOf(model, { region: at('lungs'), structure: 1 })!, app)
    selectTarget(targetOf(model, { region: at('bones'), structure: -1 })!, app)
    expect(calls).toEqual([
      ['structure', model.regions[at('lungs')]!.structures[1]!.id, 'lungs'],
      ['region', 'bones'],
    ])
  })

  it('starts on the current selection', () => {
    expect(cursorOf(model, 'heart', 'aorta')).toEqual({ region: at('heart'), structure: 1 })
    expect(cursorOf(model, 'kidneys', null)).toEqual({ region: at('kidneys'), structure: -1 })
    expect(cursorOf(model, null, null)).toBeNull()
  })

  it('highlights the organ of a region, or nothing for whole body systems', () => {
    expect(highlightOf(model, targetOf(model, { region: at('heart'), structure: -1 }))?.id).toBe('heart')
    expect(highlightOf(model, targetOf(model, { region: at('muscles'), structure: -1 }))).toBeNull()
    expect(highlightOf(model, targetOf(model, { region: at('heart'), structure: 1 }))?.id).toBe('aorta')
  })
})

describe('descriptions', () => {
  const statuses = { heart: 'MODERATE', lungs: 'NO_DATA' } as Partial<Record<BodyRegionId, Status>>

  it('never reads missing data as normal', () => {
    expect(statusPhrase('NO_DATA')).toBe('Status: no data')
    expect(statusPhrase(undefined)).toBe('Status: no data')
    expect(describeStructure(FIXTURE_MANIFEST.structures.find((s) => s.id === 'lung-left')!, statuses)).toBe('Left lung. Respiratory system, lungs region. Status: no data.')
  })

  it('names the structure, its region and the region status', () => {
    expect(describeRegion('heart', 'MODERATE', 3)).toBe('Heart region. Status: Watch. 3 structures.')
    expect(describeStructure(FIXTURE_MANIFEST.structures.find((s) => s.id === 'aorta')!, statuses)).toBe('Aorta. Cardiovascular system, heart region. Status: Watch.')
  })

  it('says when a structure is context only', () => {
    expect(describeStructure(FIXTURE_MANIFEST.structures.find((s) => s.id === 'stomach')!, statuses)).toBe('Stomach. Digestive system. Context only, not monitored.')
  })
})
