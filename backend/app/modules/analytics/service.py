"""Multivariate unusual pattern scoring with scikit-learn (server parity path of src/engine/ml).

Pipeline, identical in spirit to the browser detector:
1. PCA whitening fitted on the training window: w = diag(1 / sqrt(max(lambda, floor))) E^T (x - mean).
2. sklearn.ensemble.IsolationForest (seeded) on the whitened training window.
3. Score s(x) = 2^(-E[h(x)] / c(psi)) of Liu, Ting and Zhou (2008), with range aware isolation
   (a value outside a split node's own range ends its path there), as in the browser forest.
   With options.range_aware = false it is plain sklearn: s(x) = -score_samples(x).
4. Personal threshold = max(score_floor, calibration_quantile of the training scores).
5. Per feature contribution = z_i^2 / sum(z^2) of the submitted (unwhitened) vector.

The browser and the server use different random trees (mulberry32 vs numpy), so scores agree in
behavior and ranking, not to the decimal.
"""

import numpy as np
import sklearn
from sklearn.ensemble import IsolationForest

from app.modules.analytics.schemas import FeatureContribution, MultivariateRequest, MultivariateResponse, MultivariateResult

MODEL_VERSION = "ahi-iforest-sklearn v1 (experimental, PCA whitened)"

LIMITATIONS = [
    "Experimental, machine learning. Decision support only, not a diagnosis.",
    "Scores compare a combination of signals with the submitted training window only.",
    "above_threshold is not a flag: apply persistence rules (and missing data checks) before showing anything.",
    "Thresholds are demo configuration, not official limits. Validated on simulated data only.",
]


def fit_whitening(x: np.ndarray, floor: float) -> tuple[np.ndarray, np.ndarray]:
    """Return (mean, matrix) so that whitened = (x - mean) @ matrix.T."""
    mean = x.mean(axis=0)
    cov = np.cov(x - mean, rowvar=False, ddof=1) if x.shape[0] > 1 else np.eye(x.shape[1])
    cov = np.atleast_2d(cov)
    values, vectors = np.linalg.eigh(cov)
    scale = 1.0 / np.sqrt(np.maximum(values, floor))
    return mean, (vectors * scale).T


def _average_path_length(n: np.ndarray) -> np.ndarray:
    """c(n) of Liu, Ting and Zhou (2008), vectorized (c(1) = 0, c(2) = 1)."""
    n = np.asarray(n, dtype=float)
    out = np.zeros_like(n)
    two = n == 2
    big = n > 2
    out[two] = 1.0
    out[big] = 2.0 * (np.log(n[big] - 1.0) + np.euler_gamma) - 2.0 * (n[big] - 1.0) / n[big]
    return out


def range_aware_scores(forest: IsolationForest, train: np.ndarray, query: np.ndarray) -> np.ndarray:
    """Isolation scores with range aware isolation, the rule the browser forest uses.

    For every split node, the min and max of the node's own subsample on its split feature are
    computed from the fitted tree (decision_path of that tree's subsample). A query value outside
    that range ends its path at that node (depth + 1); otherwise the usual depth + c(leaf size).
    When the query stays inside the range of every node it visits this equals sklearn's
    score_samples (negated); otherwise its path is shorter, which is the point of the rule.
    """
    total = np.zeros(query.shape[0])
    rows = np.arange(query.shape[0])
    for est, samples, feats in zip(forest.estimators_, forest.estimators_samples_, forest.estimators_features_, strict=True):
        tree = est.tree_
        xs = train[samples][:, feats]
        xq = query[:, feats]
        feature = tree.feature
        # Node min / max on the split feature, from the samples that pass through each node.
        dp = est.decision_path(xs).tocsc()
        lo = np.full(tree.node_count, -np.inf)
        hi = np.full(tree.node_count, np.inf)
        for node in np.flatnonzero(feature >= 0):
            members = dp.indices[dp.indptr[node] : dp.indptr[node + 1]]
            vals = xs[members, feature[node]]
            lo[node], hi[node] = vals.min(), vals.max()
        node = np.zeros(query.shape[0], dtype=np.intp)
        depth = np.zeros(query.shape[0])
        path = np.full(query.shape[0], np.nan)
        active = np.ones(query.shape[0], dtype=bool)
        while active.any():
            f = feature[node]
            leaf = active & (f < 0)
            path[leaf] = depth[leaf] + _average_path_length(tree.n_node_samples[node[leaf]])
            active &= ~leaf
            if not active.any():
                break
            v = xq[rows, np.where(f >= 0, f, 0)]
            outside = active & ((v < lo[node]) | (v > hi[node]))
            path[outside] = depth[outside] + 1.0
            active &= ~outside
            go_left = v <= tree.threshold[node]
            node = np.where(active, np.where(go_left, tree.children_left[node], tree.children_right[node]), node)
            depth += active
        total += path
    mean_path = total / len(forest.estimators_)
    return np.power(2.0, -mean_path / _average_path_length(np.array([forest.max_samples_]))[0])


def contributions(features: list[str], z: np.ndarray) -> list[FeatureContribution]:
    sq = z * z
    total = float(sq.sum())
    out = [FeatureContribution(feature=f, z=float(v), share=(float(s) / total if total > 0 else 0.0)) for f, v, s in zip(features, z, sq, strict=True)]
    return sorted(out, key=lambda c: c.share, reverse=True)


def score_multivariate(req: MultivariateRequest) -> MultivariateResponse:
    opts = req.options
    train = np.asarray(req.training, dtype=float)
    query = np.asarray(req.score, dtype=float)
    if opts.whiten:
        mean, matrix = fit_whitening(train, opts.whitening_floor)
        train_w = (train - mean) @ matrix.T
        query_w = (query - mean) @ matrix.T
    else:
        train_w, query_w = train, query
    forest = IsolationForest(
        n_estimators=opts.n_estimators,
        max_samples=min(opts.max_samples, train.shape[0]),
        contamination="auto",
        random_state=opts.random_state,
    ).fit(train_w)
    if opts.range_aware:
        train_scores = range_aware_scores(forest, train_w, train_w)
        scores = range_aware_scores(forest, train_w, query_w)
    else:
        train_scores = -forest.score_samples(train_w)
        scores = -forest.score_samples(query_w)
    threshold = max(opts.score_floor, float(np.quantile(train_scores, opts.calibration_quantile)))
    results = [
        MultivariateResult(score=round(float(s), 6), above_threshold=bool(s >= threshold), contributions=contributions(req.features, row))
        for s, row in zip(scores, query, strict=True)
    ]
    return MultivariateResponse(
        subject_id=req.subject_id,
        model_version=MODEL_VERSION,
        engine=f"scikit-learn {sklearn.__version__} IsolationForest",
        features=list(req.features),
        training_size=int(train.shape[0]),
        threshold=round(threshold, 6),
        results=results,
        limitations=LIMITATIONS,
    )
