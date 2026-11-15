/**
 * Exam regions in the anatomy viewer: the eyes map to the atlas eye structures; the ears have no
 * structure (the ear is excluded from the atlas for license reasons) and are located by a marker
 * on the sides of the head. Also checks the region chips text and the keyboard navigator stop.
 */
import { describe, expect, it } from 'vitest'
import type { AppState, AstronautHealth, ExamMeasureResult, ExamRegionState, RegionState } from '../../../types/domain'
import { REGION_LABELS } from '../../../engine/catalog'
import { assessMeasure } from '../../../engine/exams'
import { FIXTURE_MANIFEST, fixtureStructure } from './__fixtures__/manifest.fixture'
import { REGION_RELATION, metricsOfRegion, primaryStructureOfRegion, regionOfStructure, structureStatus } from './health'
import type { AtlasManifest } from './types'
import { buildNavModel, moveCursor, targetOf } from '../a11y/keyboardNav'
import { describeRegion } from '../a11y/describe'
import { buildLayers, earAnchors, primaryStructures, regionAnchors, regionFocus } from '../viewer/layers'
import { EXAM_REGION_IDS, HAS_METRICS, REGIONS, examChangeText, examValueText, regionValueText } from '../regions'

// Head of the real atlas: eyes at the real manifest positions (meters, body facing +Z, left on +X).
const HEAD: AtlasManifest = {
  ...FIXTURE_MANIFEST,
  bounds: { min: [-0.34, 0, -0.147], max: [0.34, 1.7095, 0.147] },
  structures: [
    ...FIXTURE_MANIFEST.structures.filter((s) => s.tissue !== 'eye'),
    fixtureStructure('eye-left', 'Left eye', 'other', 'eye', { center: [0.03058, 1.59109, 0.06586], min: [0.01746, 1.578, 0.05219], max: [0.0437, 1.60419, 0.07953] }),
    fixtureStructure('eye-right', 'Right eye', 'other', 'eye', { center: [-0.03055, 1.59106, 0.06586], min: [-0.04364, 1.57794, 0.05219], max: [-0.01746, 1.60419, 0.07953] }),
  ],
}

describe('eyes region mapping', () => {
  it('maps the atlas eyes, and only them, to the eyes region with the exam metrics', () => {
    for (const s of HEAD.structures) expect(regionOfStructure(s) === 'eyes', s.id).toBe(s.tissue === 'eye')
    expect(primaryStructureOfRegion(HEAD, 'eyes')?.id).toBe('eye-left')
    expect(primaryStructures(HEAD, 'eyes').map((s) => s.id).sort()).toEqual(['eye-left', 'eye-right'])
    expect(metricsOfRegion('eyes')).toEqual(['RETINAL_THICKNESS', 'CHOROIDAL_FOLDS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY'])
    expect(metricsOfRegion('ears')).toEqual(['HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW', 'NOISE_EXPOSURE', 'NOISE_DOSE'])
    // the eyes layer holds the eye structures; selecting the region forces it on
    const layers = buildLayers(HEAD)
    expect(layers.regionLayers.eyes).toEqual(['eyes'])
    expect(layers.regionLayers.ears).toEqual([])
  })

  it('shows the eyes region status on an eye structure, NO_DATA without health', () => {
    const eye = HEAD.structures.find((s) => s.id === 'eye-right')!
    expect(structureStatus(undefined, eye)).toBe('NO_DATA')
    const h = { astronautId: 'AST-01', regions: { eyes: { region: 'eyes', status: 'MODERATE', metrics: [], summary: '' } } } as unknown as AstronautHealth
    expect(structureStatus(h, eye)).toBe('MODERATE')
  })

  it('frames the eyes on their structures, not on the whole body', () => {
    const f = regionFocus(HEAD, 'eyes')
    expect(f.full).toBe(false)
    expect(f.box.min[1]).toBeGreaterThan(1.5)
  })
})

describe('ears region (no anatomical structure)', () => {
  it('has no atlas structure and no primary structure', () => {
    expect(HEAD.structures.some((s) => regionOfStructure(s) === 'ears')).toBe(false)
    expect(primaryStructureOfRegion(HEAD, 'ears')).toBeNull()
    expect(primaryStructures(HEAD, 'ears')).toEqual([])
  })

  it('places the ear markers on both sides of the head, behind the eyes', () => {
    const ears = earAnchors(HEAD)!
    expect(ears.left[0]).toBeGreaterThan(0.06)
    expect(ears.left[0]).toBeLessThan(0.1)
    expect(ears.right[0]).toBeCloseTo(-ears.left[0], 6)
    expect(ears.left[1]).toBeGreaterThan(1.55)
    expect(ears.left[1]).toBeLessThan(1.62)
    expect(ears.left[2]).toBeLessThan(0.06586)
    expect(regionAnchors(HEAD).ears).toEqual(ears.left)
    const f = regionFocus(HEAD, 'ears')
    expect(f.full).toBe(false)
    expect(f.box.min[0]).toBeLessThan(ears.right[0])
    expect(f.box.max[0]).toBeGreaterThan(ears.left[0])
    // without a body surface there is nothing to anchor to
    expect(earAnchors({ ...HEAD, structures: HEAD.structures.filter((s) => s.system !== 'integumentary') })).toBeNull()
  })

  it('says in plain words that the ear is not modeled', () => {
    expect(REGION_RELATION.ears.caveat).toMatch(/not modeled/)
    expect(REGION_LABELS.ears.description).toMatch(/not modeled/)
    expect(describeRegion('ears', 'LOW', 0)).toMatch(/Not modeled in the 3D body/)
  })

  it('is a keyboard navigator stop with no structure ring', () => {
    const model = buildNavModel(HEAD)
    const i = model.regions.findIndex((g) => g.region === 'ears')
    expect(i).toBeGreaterThan(0)
    expect(model.regions[i]!.structures).toEqual([])
    const c = { region: i, structure: -1 }
    expect(moveCursor(model, c, 'ArrowRight')).toEqual(c)
    expect(moveCursor(model, c, 'ArrowLeft')).toEqual(c)
    expect(targetOf(model, c)).toEqual({ kind: 'region', region: 'ears', label: 'Ears' })
  })
})

describe('region list and chip text', () => {
  it('lists the exam regions among the monitored regions', () => {
    expect(REGIONS).toEqual(expect.arrayContaining(EXAM_REGION_IDS))
    expect(HAS_METRICS.eyes).toBe(true)
    expect(HAS_METRICS.ears).toBe(true)
  })

  const ex = (over: Partial<ExamRegionState>): ExamRegionState => ({
    region: 'eyes',
    astronautId: 'AST-01',
    status: 'NO_DATA',
    summary: '',
    baselineSessions: [],
    sessions: [],
    latest: null,
    nextDue: null,
    method: '',
    ...over,
  })
  const session = (results: ExamMeasureResult[]) => ({
    id: 'S',
    astronautId: 'AST-01',
    region: 'eyes' as const,
    kinds: [],
    label: 'FD 30',
    phase: 'IN_FLIGHT' as const,
    at: 0,
    flightDay: 30,
    isBaseline: false,
    device_id: 'SIM-OCT',
    data_origin: 'SIMULATED' as const,
    observations: [],
    results,
    status: 'LOW' as const,
  })

  it('says "No exam yet" before the first exam, never a normal value', () => {
    expect(examValueText(ex({}))).toBe('No exam yet')
  })

  it('shows the most notable change of the last exam', () => {
    const calm = session([assessMeasure('VISUAL_ACUITY', 'RIGHT', -0.08, -0.08), assessMeasure('RETINAL_THICKNESS', 'RIGHT', 393, 390)])
    expect(examValueText(ex({ latest: calm }))).toBe('Retina +3 µm')
    const flagged = session([assessMeasure('RETINAL_THICKNESS', 'RIGHT', 393, 390), assessMeasure('CHOROIDAL_FOLDS', 'LEFT', 1, 0)])
    expect(examValueText(ex({ latest: flagged }))).toBe('Folds new folds')
    expect(examChangeText(assessMeasure('VISUAL_ACUITY', 'LEFT', 0, -0.1))).toBe('+0.10 logMAR')
    expect(examChangeText(assessMeasure('RETINAL_THICKNESS', 'LEFT', 400, null))).toBe('no baseline')
  })

  it('uses the exam text for the eyes label of the selected astronaut', () => {
    const regions = { eyes: { region: 'eyes', status: 'LOW', metrics: [], summary: '' } } as unknown as Record<string, RegionState>
    const s = { selectedAstronautId: 'AST-01', health: { 'AST-01': { metrics: {}, regions, exams: { eyes: ex({}) } } } } as unknown as AppState
    expect(regionValueText(s, 'eyes')).toBe('No exam yet')
  })
})
