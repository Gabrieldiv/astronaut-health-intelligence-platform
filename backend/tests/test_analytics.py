"""POST /analytics/multivariate: seeded scikit-learn Isolation Forest on standardized feature windows."""

import numpy as np
from fastapi.testclient import TestClient

from app.modules.analytics.service import fit_whitening

URL = "/api/v1/analytics/multivariate"
FEATURES = ["HEART_RATE", "RESPIRATORY_RATE", "SKIN_TEMPERATURE"]


def correlated_window(n: int = 800, seed: int = 5) -> list[list[float]]:
    """Synthetic person: heart rate and breathing rate move together, skin temperature is independent."""
    r = np.random.default_rng(seed)
    u = r.normal(size=n)
    x = np.c_[u + 0.25 * r.normal(size=n), u + 0.25 * r.normal(size=n), r.normal(size=n)]
    return x.round(4).tolist()


def body(score: list[list[float]], **options: object) -> dict:
    return {"subject_id": "AST-02", "features": FEATURES, "training": correlated_window(), "score": score, "options": options}


def test_scores_unusual_combination_above_threshold(client: TestClient) -> None:
    res = client.post(URL, json=body([[1.8, 1.8, 0.0], [1.8, -1.8, 0.0], [0.0, 0.0, 0.0]]))
    assert res.status_code == 200, res.text
    out = res.json()
    together, apart, center = out["results"]
    # Same sizes, but breaking the usual correlation is what makes a point unusual.
    assert apart["score"] > together["score"] > center["score"]
    assert apart["above_threshold"] is True
    assert together["above_threshold"] is False
    assert center["above_threshold"] is False
    assert out["label"] == "Experimental, machine learning"
    assert out["data_origin"] == "DERIVED"
    assert out["model_version"].startswith("ahi-iforest-sklearn")
    assert "scikit-learn" in out["engine"]
    assert out["training_size"] == 800
    assert out["subject_id"] == "AST-02"
    assert any("not a diagnosis" in x for x in out["limitations"])


def test_contributions_explain_the_deviation(client: TestClient) -> None:
    out = client.post(URL, json=body([[3.0, -1.0, 0.0]])).json()
    contrib = out["results"][0]["contributions"]
    assert [c["feature"] for c in contrib] == FEATURES
    assert abs(contrib[0]["share"] - 0.9) < 1e-9
    assert contrib[1]["z"] == -1.0
    assert abs(sum(c["share"] for c in contrib) - 1.0) < 1e-9


def test_deterministic_for_the_same_seed(client: TestClient) -> None:
    a = client.post(URL, json=body([[1.0, -0.5, 2.0]])).json()
    b = client.post(URL, json=body([[1.0, -0.5, 2.0]])).json()
    c = client.post(URL, json=body([[1.0, -0.5, 2.0]], random_state=7)).json()
    assert a == b
    assert c["results"][0]["score"] != a["results"][0]["score"]


def test_plain_sklearn_mode_saturates_far_points(client: TestClient) -> None:
    # Documented reason for range aware isolation: without it, far points score like the usual extremes.
    plain = client.post(URL, json=body([[1.8, -1.8, 0.0], [6.0, -6.0, 0.0]], range_aware=False)).json()
    aware = client.post(URL, json=body([[6.0, -6.0, 0.0]])).json()
    assert abs(plain["results"][0]["score"] - plain["results"][1]["score"]) < 0.02
    assert aware["results"][0]["score"] > plain["results"][1]["score"]


def test_rejects_bad_shapes(client: TestClient) -> None:
    ragged = body([[1.0, 2.0]])
    assert client.post(URL, json=ragged).status_code == 422
    short = body([[0.0, 0.0, 0.0]])
    short["training"] = short["training"][:10]
    assert client.post(URL, json=short).status_code == 422
    dup = body([[0.0, 0.0, 0.0]])
    dup["features"] = ["HEART_RATE", "HEART_RATE", "SKIN_TEMPERATURE"]
    assert client.post(URL, json=dup).status_code == 422
    extra = body([[0.0, 0.0, 0.0]])
    extra["name"] = "real name"
    assert client.post(URL, json=extra).status_code == 422
    bad_option = body([[0.0, 0.0, 0.0]], calibration_quantile=1.5)
    assert client.post(URL, json=bad_option).status_code == 422


def test_whitening_decorrelates() -> None:
    x = np.asarray(correlated_window(2000, seed=9))
    mean, matrix = fit_whitening(x, 1e-6)
    w = (x - mean) @ matrix.T
    assert np.allclose(np.cov(w, rowvar=False), np.eye(3), atol=1e-6)
