/**
 * PCA whitening (decorrelation) of the standardized features before the Isolation Forest.
 *
 * Why: an Isolation Forest splits on one axis at a time, so it barely notices a point whose
 * values are each ordinary but whose COMBINATION breaks a correlation the person usually has
 * (for example heart rate up while breathing rate goes down, when the two normally move
 * together). Rotating onto the principal axes of the person's own training window and scaling
 * each axis to unit variance turns "breaks the usual correlation" into "far along a quiet axis",
 * which the forest isolates easily.
 *
 *   w = diag(1 / sqrt(max(lambda_i, floor))) E^T (x - mean)
 *
 * E and lambda are the eigenvectors and eigenvalues of the training covariance (cyclic Jacobi,
 * deterministic). The eigenvalue floor keeps a nearly redundant pair of signals (systolic and
 * diastolic pressure) from turning tiny noise into huge whitened values.
 */

export interface Whitening {
  dims: number
  mean: Float64Array
  /** Row major d x d: row i = E[:, i] / sqrt(max(lambda_i, floor)). */
  matrix: Float64Array
  /** Eigenvalues of the covariance (before the floor). */
  eigenvalues: Float64Array
}

/** Eigen decomposition of a symmetric d x d matrix (row major) by cyclic Jacobi rotations. */
export function symmetricEigen(a: Float64Array, d: number): { values: Float64Array; vectors: Float64Array } {
  const m = Float64Array.from(a)
  const v = new Float64Array(d * d)
  for (let i = 0; i < d; i++) v[i * d + i] = 1
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < d; p++) for (let q = p + 1; q < d; q++) off += m[p * d + q]! ** 2
    if (off < 1e-20) break
    for (let p = 0; p < d; p++) {
      for (let q = p + 1; q < d; q++) {
        const apq = m[p * d + q]!
        if (Math.abs(apq) < 1e-300) continue
        const app = m[p * d + p]!
        const aqq = m[q * d + q]!
        const theta = (aqq - app) / (2 * apq)
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < d; k++) {
          const akp = m[k * d + p]!
          const akq = m[k * d + q]!
          m[k * d + p] = c * akp - s * akq
          m[k * d + q] = s * akp + c * akq
        }
        for (let k = 0; k < d; k++) {
          const apk = m[p * d + k]!
          const aqk = m[q * d + k]!
          m[p * d + k] = c * apk - s * aqk
          m[q * d + k] = s * apk + c * aqk
        }
        for (let k = 0; k < d; k++) {
          const vkp = v[k * d + p]!
          const vkq = v[k * d + q]!
          v[k * d + p] = c * vkp - s * vkq
          v[k * d + q] = s * vkp + c * vkq
        }
      }
    }
  }
  const values = new Float64Array(d)
  for (let i = 0; i < d; i++) values[i] = m[i * d + i]!
  return { values, vectors: v }
}

/** Fit on n rows of d features (row major). `floor` is the minimum variance per principal axis. */
export function fitWhitening(data: ArrayLike<number>, n: number, d: number, floor: number): Whitening {
  const mean = new Float64Array(d)
  for (let r = 0; r < n; r++) for (let j = 0; j < d; j++) mean[j] += data[r * d + j]!
  for (let j = 0; j < d; j++) mean[j] /= n
  const cov = new Float64Array(d * d)
  for (let r = 0; r < n; r++) {
    for (let i = 0; i < d; i++) {
      const xi = data[r * d + i]! - mean[i]!
      for (let j = i; j < d; j++) cov[i * d + j] += xi * (data[r * d + j]! - mean[j]!)
    }
  }
  const den = Math.max(1, n - 1)
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      cov[i * d + j] /= den
      cov[j * d + i] = cov[i * d + j]!
    }
  }
  const { values, vectors } = symmetricEigen(cov, d)
  const matrix = new Float64Array(d * d)
  for (let i = 0; i < d; i++) {
    const scale = 1 / Math.sqrt(Math.max(values[i]!, floor))
    for (let k = 0; k < d; k++) matrix[i * d + k] = vectors[k * d + i]! * scale
  }
  return { dims: d, mean, matrix, eigenvalues: values }
}

/** Whiten x (read at `offset`) into out. No allocation. */
export function whiten(w: Whitening, x: ArrayLike<number>, offset: number, out: Float64Array): Float64Array {
  const d = w.dims
  for (let i = 0; i < d; i++) {
    let s = 0
    for (let k = 0; k < d; k++) s += w.matrix[i * d + k]! * (x[offset + k]! - w.mean[k]!)
    out[i] = s
  }
  return out
}
