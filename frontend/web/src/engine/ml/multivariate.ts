/**
 * Multivariate unusual pattern detector (experimental, machine learning).
 *
 * One detector per astronaut. Input features are STANDARDIZED already: the robust z of each
 * metric against the astronaut's own baseline of the current activity context (anomaly.ts).
 * The training window is the astronaut's own recent history (one vector per 5 sim minutes,
 * the same span as the baseline), admitted with the same gates as the baseline (no large z,
 * no active drift), so ongoing problems do not become "usual".
 *
 * The Isolation Forest learns which COMBINATIONS of deviations are usual for this person
 * (for example heart rate and breathing rate rising together during work). A point that is
 * easy to isolate scores high even when no single signal crosses its own rule.
 *
 * Guard rails (PROJECT_MASTER 9.1: explainable statistics first, machine learning after):
 *  - it never sets a status or a risk score; it only adds an "Unusual combination" flag;
 *  - the flag needs the score above the personal threshold for MULTIVARIATE.persistMin AND at
 *    least MULTIVARIATE.minAgreeing contributing signals whose EWMA drift (persistence rule)
 *    points the same way;
 *  - missing inputs give NO_DATA, never "typical";
 *  - every flag lists the signals that contributed most, the model version and the words
 *    "Experimental, machine learning".
 *
 * Cost: training (trees x psi x height) runs only when a feature baseline changed and at least
 * MULTIVARIATE.retrainMinHours passed; scoring is trees x height comparisons, no allocation.
 */
import type { EngineParam, MetricCode, MultivariateAssessment, MultivariateContribution } from '../../types/domain'
import { msg, said } from '../msg'
import { MULTIVARIATE, MULTIVARIATE_MODEL_VERSION } from '../config'
import { hashSeed } from '../random'
import { quantileSorted } from '../stats'
import { HOUR_MS, MIN_MS, fmtDuration, inlineLabel } from '../text'
import { IsolationForest } from './isolationForest'
import { fitWhitening, whiten, type Whitening } from './whitening'

export const ML_LABEL = 'Experimental, machine learning'

export interface MultivariateSettings {
  features: readonly MetricCode[]
  trees: number
  sampleSize: number
  windowSize: number
  minTrainingVectors: number
  retrainMinHours: number
  trainGateZ: number
  trainGateDrift: number
  scoreFloor: number
  calibrationQuantile: number
  calibrationSample: number
  persistMin: number
  whiteningFloor: number
  agreeDriftZ: number
  minAgreeing: number
  topContributors: number
  seed: number
}

/** Per feature deviation contribution: share of the squared robust z (sums to 1). */
export function deviationContributions(features: readonly MetricCode[], z: ArrayLike<number>): MultivariateContribution[] {
  let total = 0
  for (let i = 0; i < features.length; i++) total += z[i]! * z[i]!
  const out: MultivariateContribution[] = []
  for (let i = 0; i < features.length; i++) {
    out.push({ metric: features[i]!, z: z[i]!, share: total > 0 ? (z[i]! * z[i]!) / total : 0 })
  }
  return out.sort((a, b) => b.share - a.share)
}

function joinWords(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}

export class MultivariateDetector {
  readonly cfg: MultivariateSettings
  readonly subjectId: string
  private readonly dims: number
  private readonly buf: Float64Array
  private next = 0
  /** Training vectors currently in the window. */
  size = 0
  private forest: IsolationForest | null = null
  threshold: number | null = null
  trainedAt: number | null = null
  trainingSize = 0
  private trainedRevision = -1
  private readonly seed: number
  private aboveSince: number | null = null
  private readonly row: Float64Array
  private readonly white: Float64Array
  private whitening: Whitening | null = null
  /** Number of trainings so far (for tests and CPU accounting). */
  trainings = 0

  constructor(subjectId: string, engineSeed: number, cfg: MultivariateSettings = MULTIVARIATE) {
    this.cfg = cfg
    this.subjectId = subjectId
    this.dims = cfg.features.length
    this.buf = new Float64Array(cfg.windowSize * this.dims)
    this.row = new Float64Array(this.dims)
    this.white = new Float64Array(this.dims)
    this.seed = hashSeed('multivariate', cfg.seed, engineSeed, subjectId)
  }

  /**
   * Offer one vector for the training window. Rejected (returns false) when a value is missing
   * or outside the baseline gates, so the window holds only "usual" moments.
   */
  offer(z: ArrayLike<number | null>, drift: ArrayLike<number | null>): boolean {
    for (let i = 0; i < this.dims; i++) {
      const zi = z[i]
      const di = drift[i]
      if (zi === null || zi === undefined || !Number.isFinite(zi) || Math.abs(zi) >= this.cfg.trainGateZ) return false
      if (di !== null && di !== undefined && Math.abs(di) >= this.cfg.trainGateDrift) return false
    }
    const off = this.next * this.dims
    for (let i = 0; i < this.dims; i++) this.buf[off + i] = z[i] as number
    this.next = (this.next + 1) % this.cfg.windowSize
    if (this.size < this.cfg.windowSize) this.size++
    return true
  }

  get ready(): boolean {
    return this.forest !== null
  }

  /**
   * Retrain when the inputs' baselines changed (revision) and the minimum interval passed, or
   * when there is no model yet and enough vectors. Returns true when it trained.
   */
  maybeTrain(now: number, baselineRevision: number): boolean {
    if (this.size < this.cfg.minTrainingVectors) return false
    if (this.forest) {
      if (baselineRevision === this.trainedRevision) return false
      if (this.trainedAt !== null && now - this.trainedAt < this.cfg.retrainMinHours * HOUR_MS) return false
    }
    this.train(now)
    this.trainedRevision = baselineRevision
    return true
  }

  /** Train on the current window (deterministic for a given window, seed and time). */
  train(now: number): void {
    const n = this.size
    const d = this.dims
    const raw = this.buf.subarray(0, n * d)
    // Decorrelate on the person's own window, then grow the forest in the whitened space.
    const w = fitWhitening(raw, n, d, this.cfg.whiteningFloor)
    const data = new Float64Array(n * d)
    for (let r = 0; r < n; r++) data.set(whiten(w, raw, r * d, this.white), r * d)
    const forest = new IsolationForest(data, n, d, { trees: this.cfg.trees, sampleSize: this.cfg.sampleSize, seed: hashSeed(this.seed, now) })
    // Personal threshold: high quantile of the training scores on an evenly spaced sample.
    const m = Math.min(n, this.cfg.calibrationSample)
    const scores = new Float64Array(m)
    for (let j = 0; j < m; j++) scores[j] = forest.score(data, Math.floor((j * n) / m) * d)
    scores.sort()
    this.threshold = Math.max(this.cfg.scoreFloor, quantileSorted(scores, this.cfg.calibrationQuantile))
    this.whitening = w
    this.forest = forest
    this.trainedAt = now
    this.trainingSize = n
    this.trainings++
  }

  /** Score of a complete standardized vector (null without a model). */
  score(z: ArrayLike<number>): number | null {
    if (!this.forest || !this.whitening) return null
    return this.forest.score(whiten(this.whitening, z, 0, this.white))
  }

  private result(state: MultivariateAssessment['state'], explanation: string, score: number | null, contributions: MultivariateContribution[]): MultivariateAssessment {
    return {
      state,
      flagged: state === 'UNUSUAL',
      score: score === null ? null : Math.round(score * 1000) / 1000,
      threshold: this.threshold === null ? null : Math.round(this.threshold * 1000) / 1000,
      since: state === 'UNUSUAL' || state === 'ELEVATED' ? this.aboveSince : null,
      contributions,
      explanation,
      model_version: MULTIVARIATE_MODEL_VERSION,
      trained_at: this.trainedAt,
      training_size: this.trainingSize,
      label: ML_LABEL,
    }
  }

  /** Evaluate the current moment. `z` and `drift` follow cfg.features order; null means no data. */
  assess(now: number, z: ArrayLike<number | null>, drift: ArrayLike<number | null>): MultivariateAssessment {
    if (!this.forest) {
      this.aboveSince = null
      return this.result('NOT_READY', 'Still learning your usual combination of signals (needs about one day of complete data).', null, [])
    }
    const missing: MetricCode[] = []
    for (let i = 0; i < this.dims; i++) {
      const v = z[i]
      if (v === null || v === undefined || !Number.isFinite(v)) missing.push(this.cfg.features[i]!)
      else this.row[i] = v
    }
    if (missing.length) {
      this.aboveSince = null
      return this.result(
        'NO_DATA',
        said(
          `Not evaluated: no current data for ${joinWords(missing.map(inlineLabel))}. Missing data is never treated as typical.`,
          msg('mv.noData', { list: { list: missing.map((m): EngineParam => ({ metric: m, form: 'inline' })) } }),
        ),
        null,
        [],
      )
    }
    const score = this.score(this.row)!
    const contributions = deviationContributions(this.cfg.features, this.row)
    if (score < this.threshold!) {
      this.aboveSince = null
      return this.result('TYPICAL', said('The combination of your signals looks like your own recent days.', msg('mv.typical')), score, contributions)
    }
    if (this.aboveSince === null) this.aboveSince = now
    const top = contributions.slice(0, this.cfg.topContributors).filter((c) => c.share > 0)
    // Persistence agreement: contributing signals whose EWMA drift points the same way.
    const agreeing = top.filter((c) => {
      const d = drift[this.cfg.features.indexOf(c.metric)]
      return d !== null && d !== undefined && Math.sign(d) === Math.sign(c.z) && Math.abs(d) >= this.cfg.agreeDriftZ
    })
    const lasted = now - this.aboveSince
    const shares = top.map((c) => `${inlineLabel(c.metric)} ${Math.round(c.share * 100)}%`).join(', ')
    const sharesMsg: EngineParam = { list: top.map((c) => msg('mv.share', { metric: { metric: c.metric, form: 'inline' }, pct: Math.round(c.share * 100) })), comma: true }
    if (lasted >= this.cfg.persistMin * MIN_MS && agreeing.length >= this.cfg.minAgreeing) {
      const parts = agreeing.map((c) => `${inlineLabel(c.metric)} ${c.z > 0 ? 'above' : 'below'} your normal`)
      return this.result(
        'UNUSUAL',
        said(
          `Unusual combination: ${joinWords(parts)} at the same time for ${fmtDuration(Math.max(lasted, MIN_MS))}. This mix is rare in your own recent days (score ${score.toFixed(2)}, your threshold ${this.threshold!.toFixed(2)}). Signals that contributed most: ${shares}.`,
          msg('mv.unusual', {
            parts: { list: agreeing.map((c) => msg('mv.part', { metric: { metric: c.metric, form: 'inline' }, dev: msg(`dev.plain.${c.z > 0 ? 'above' : 'below'}`) })) },
            dur: { durationMs: Math.max(lasted, MIN_MS) },
            score: { num: score, decimals: 2 },
            threshold: { num: this.threshold!, decimals: 2 },
            shares: sharesMsg,
          }),
        ),
        score,
        contributions,
      )
    }
    return this.result(
      'ELEVATED',
      said(`Unusual mix of signals right now (${shares}). Not flagged: it must last and agree with the slower trend rules first.`, msg('mv.elevated', { shares: sharesMsg })),
      score,
      contributions,
    )
  }
}
