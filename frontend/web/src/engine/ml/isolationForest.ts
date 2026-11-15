/**
 * Isolation Forest (Liu, Ting and Zhou, 2008), small and deterministic.
 *
 * Idea: unusual points are isolated by fewer random axis parallel splits than usual ones.
 * Each tree is grown on a random subsample of psi points, splitting on a random feature at a
 * uniform random value between the node's min and max, until the point is alone or the height
 * limit ceil(log2 psi) is reached. The anomaly score of x is
 *
 *   s(x) = 2 ^ ( -E[h(x)] / c(psi) )
 *
 * where h(x) is the path length (plus c(size) for an unresolved leaf) and
 * c(n) = 2 H(n - 1) - 2 (n - 1) / n is the average path length of an unsuccessful search in a
 * binary search tree (H(i) ~ ln(i) + Euler gamma). s close to 1: easy to isolate (unusual);
 * s well below 0.5: typical.
 *
 * Range aware isolation (deliberate, documented deviation from the original algorithm): every
 * split node also stores the min and max of its own points on the split feature. A query value
 * outside that range is already separated from every point of the node, so its path ends there
 * (depth + 1). In the original algorithm such a value just follows the most extreme training
 * point, so all far away points saturate at the score of the training extremes; with the range
 * check a point far outside the person's usual pattern scores clearly higher than the usual
 * extremes. Inside the training range the two are identical.
 *
 * Deterministic: all randomness comes from one seeded mulberry32 stream, so the same data and
 * seed always give the same forest and the same scores. All trees live in one set of flat typed
 * arrays and every leaf stores its final path value, so scoring one point is trees x height
 * comparisons with no allocation and no logarithm.
 */
import { mulberry32 } from '../random'

export interface IsolationForestOptions {
  trees: number
  sampleSize: number
  seed: number
}

const EULER_GAMMA = 0.5772156649015329

/** Average path length of an unsuccessful BST search over n points. */
export function averagePathLength(n: number): number {
  if (n <= 1) return 0
  if (n === 2) return 1
  return 2 * (Math.log(n - 1) + EULER_GAMMA) - (2 * (n - 1)) / n
}

export class IsolationForest {
  readonly dims: number
  readonly sampleSize: number
  readonly treeCount: number
  private readonly cNorm: number
  /** Root node index of each tree. */
  private readonly roots: Int32Array
  /** Split feature per node, -1 for a leaf. */
  private readonly feature: Int16Array
  /** Split value per node; for a leaf, depth + c(size) (the finished path length). */
  private readonly value: Float64Array
  private readonly left: Int32Array
  private readonly right: Int32Array
  /** Range of the node's own points on its split feature (range aware isolation). */
  private readonly lo: Float64Array
  private readonly hi: Float64Array

  /**
   * Train on `n` rows of `dims` features, row major in `data`. Rows are not modified or kept.
   * Throws on too little input: the caller decides when there is enough data.
   */
  constructor(data: ArrayLike<number>, n: number, dims: number, opts: IsolationForestOptions) {
    if (n < 2 || dims < 1 || opts.trees < 1) throw new Error('IsolationForest needs at least 2 rows, 1 feature and 1 tree')
    this.dims = dims
    this.treeCount = opts.trees
    const psi = Math.min(opts.sampleSize, n)
    this.sampleSize = psi
    this.cNorm = averagePathLength(psi)
    const rand = mulberry32(opts.seed)
    const heightLimit = Math.ceil(Math.log2(psi))
    const cap = opts.trees * (2 * psi - 1)
    const feature = new Int16Array(cap)
    const value = new Float64Array(cap)
    const left = new Int32Array(cap)
    const right = new Int32Array(cap)
    const loArr = new Float64Array(cap)
    const hiArr = new Float64Array(cap)
    this.roots = new Int32Array(opts.trees)
    const pool = new Int32Array(n)
    const idx = new Int32Array(psi)
    let count = 0

    const build = (lo: number, hi: number, depth: number): number => {
      const node = count++
      const size = hi - lo
      feature[node] = -1
      value[node] = depth + averagePathLength(size)
      if (size <= 1 || depth >= heightLimit) return node
      // Random feature among those that are not constant in this node (each tried at most once).
      const start = Math.floor(rand() * dims)
      let f = -1
      let fMin = 0
      let fMax = 0
      for (let k = 0; k < dims && f < 0; k++) {
        const cand = (start + k) % dims
        let mn = Infinity
        let mx = -Infinity
        for (let i = lo; i < hi; i++) {
          const v = data[idx[i]! * dims + cand]!
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
        if (mx > mn) {
          f = cand
          fMin = mn
          fMax = mx
        }
      }
      if (f < 0) return node // every feature constant here: leaf
      const split = fMin + rand() * (fMax - fMin)
      // Partition idx[lo..hi) in place: values < split go left.
      let mid = lo
      for (let i = lo; i < hi; i++) {
        const r = idx[i]!
        if (data[r * dims + f]! < split) {
          idx[i] = idx[mid]!
          idx[mid] = r
          mid++
        }
      }
      if (mid === lo || mid === hi) return node // degenerate split (floating point): leaf
      feature[node] = f
      value[node] = split
      loArr[node] = fMin
      hiArr[node] = fMax
      left[node] = build(lo, mid, depth + 1)
      right[node] = build(mid, hi, depth + 1)
      return node
    }

    for (let t = 0; t < opts.trees; t++) {
      // Subsample without replacement: partial Fisher-Yates on an index pool.
      for (let i = 0; i < n; i++) pool[i] = i
      for (let i = 0; i < psi; i++) {
        const j = i + Math.floor(rand() * (n - i))
        const tmp = pool[i]!
        pool[i] = pool[j]!
        pool[j] = tmp
        idx[i] = pool[i]!
      }
      this.roots[t] = build(0, psi, 0)
    }
    this.feature = feature
    this.value = value
    this.left = left
    this.right = right
    this.lo = loArr
    this.hi = hiArr
  }

  /** Mean path length of x over all trees. `offset` lets callers score a row inside a flat buffer. */
  meanPathLength(x: ArrayLike<number>, offset = 0): number {
    const { feature, value, left, right, roots, lo, hi } = this
    let s = 0
    for (let t = 0; t < roots.length; t++) {
      let node = roots[t]!
      let f = feature[node]!
      let depth = 0
      let path = -1
      while (f >= 0) {
        const v = x[offset + f]!
        if (v < lo[node]! || v > hi[node]!) {
          path = depth + 1 // outside every point of this node: isolated here
          break
        }
        node = v < value[node]! ? left[node]! : right[node]!
        f = feature[node]!
        depth++
      }
      s += path >= 0 ? path : value[node]!
    }
    return s / roots.length
  }

  /** Anomaly score in (0, 1]: about 0.5 or less is typical, close to 1 is easy to isolate. */
  score(x: ArrayLike<number>, offset = 0): number {
    if (this.cNorm === 0) return 0.5
    return Math.pow(2, -this.meanPathLength(x, offset) / this.cNorm)
  }
}
