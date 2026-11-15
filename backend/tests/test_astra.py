"""POST /analytics/deviation: ASTRA statistical detectors against the person's own baseline."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

URL = "/api/v1/analytics/deviation"
START = date(2026, 3, 1)
JITTER = [0, 1, -1, 2, -2, 1, -1, 0, 2, -2]  # small, deterministic day to day variation


def person(pre: int = 10, inn: int = 40, post: int = 7, change=None) -> dict:
    """A calm person: flat values with small jitter. `change(metric, in_day, value)` returns the value to send."""
    days = []
    for i in range(pre + inn + post):
        phase = "PRE_FLIGHT" if i < pre else "IN_FLIGHT" if i < pre + inn else "POST_FLIGHT"
        in_day = i - pre + 1
        j = JITTER[i % len(JITTER)]
        values = {
            "HEART_RATE": 66.0 + j,
            "SYSTOLIC_BP": 118.0 + j,
            "DIASTOLIC_BP": 72.0 + j,
            "RESPIRATORY_RATE": 16.0 + j * 0.2,
            "BODY_TEMPERATURE": 36.4 + j * 0.05,
            "BODY_WEIGHT": 80.0 + j * 0.05,
        }
        if change is not None:
            values = {m: change(m, in_day, v) for m, v in values.items()}
        days.append({"date": (START + timedelta(days=i)).isoformat(), "phase": phase, "values": values})
    return {"subject_id": "AST-07", "days": days}


def post(client: TestClient, body: dict):
    return client.post(URL, json=body)


def test_calm_person_stays_low(client: TestClient) -> None:
    res = post(client, person())
    assert res.status_code == 200, res.text
    out = res.json()
    assert {r["level"] for r in out["results"]} == {"LOW"}
    assert all(r["detectors"] == [] and r["message"] == "" for r in out["results"])
    # Only IN_FLIGHT and POST_FLIGHT days are judged; day 1 of IN_FLIGHT is rel_day 1, the day before baseline is -1.
    assert len(out["results"]) == 47
    assert out["results"][0]["rel_day"] == 1
    assert out["data_origin"] == "DERIVED"
    assert out["subject_id"] == "AST-07"
    assert out["model_version"].startswith("astra-deviation")
    assert {b["status"] for b in out["baselines"]} == {"READY"}
    assert any("not a diagnosis" in x for x in out["limitations"])


def test_sustained_fever_pattern_reaches_high(client: TestClient) -> None:
    def fever(metric: str, in_day: int, v: float) -> float:
        if 21 <= in_day <= 26:
            return v + {"HEART_RATE": 25.0, "BODY_TEMPERATURE": 1.2}.get(metric, 0.0)
        return v

    out = post(client, person(change=fever)).json()
    levels = {r["rel_day"]: r for r in out["results"]}
    assert all(levels[d]["level"] == "LOW" for d in range(1, 21))
    first = next(d for d in range(21, 48) if levels[d]["level"] != "LOW")
    assert first <= 23  # the Z-Score and the EWMA confirm within a few days
    assert any(levels[d]["level"] == "HIGH" for d in range(21, 30))
    high = next(levels[d] for d in range(21, 30) if levels[d]["level"] == "HIGH")
    assert len(high["detectors"]) >= 2
    assert high["main_indicator"] in ("HEART_RATE", "BODY_TEMPERATURE")
    assert high["deviation_u"] > 3
    assert "Alert" in high["message"]
    assert all(rule.startswith("R-ASTRA-") for rule in high["triggered_rules"])


def test_slow_weight_loss_is_caught_by_the_rate(client: TestClient) -> None:
    def loss(metric: str, in_day: int, v: float) -> float:
        if metric == "BODY_WEIGHT" and in_day > 5:
            return v * (1 - 0.004 * (in_day - 5))
        return v

    out = post(client, person(change=loss)).json()
    high = [r for r in out["results"] if r["level"] == "HIGH"]
    assert high, "a steady 0.4 percent per day loss must be flagged"
    assert any("weight_rate" in r["detectors"] and "R-ASTRA-WRATE-01" in r["triggered_rules"] for r in high)
    assert any(r["main_indicator"] == "BODY_WEIGHT" and "weight rate of change" in r["message"] for r in high)


def test_short_baseline_gives_no_data_never_low(client: TestClient) -> None:
    out = post(client, person(pre=5)).json()
    assert {b["status"] for b in out["baselines"]} == {"INSUFFICIENT_DATA"}
    assert all(b["pre_days"] == 5 and b["required"] == 7 for b in out["baselines"])
    assert {r["level"] for r in out["results"]} == {"NO_DATA"}
    assert all(r["main_indicator"] is None and "never read as normal" in r["message"] for r in out["results"])


def test_missing_values_stay_missing(client: TestClient) -> None:
    body = person()
    for d in body["days"][20:24]:
        d["values"]["HEART_RATE"] = None
    del body["days"][25]["values"]["SYSTOLIC_BP"]
    out = post(client, body).json()
    by_date = {r["date"]: r for r in out["results"]}
    gap = by_date[body["days"][21]["date"]]
    assert gap["deviations"]["HEART_RATE"] is None
    assert gap["deviations"]["SYSTOLIC_BP"] is not None  # one missing metric does not hide the others
    assert gap["level"] == "LOW"
    assert by_date[body["days"][25]["date"]]["deviations"]["SYSTOLIC_BP"] is None


def test_implausible_value_is_treated_as_missing(client: TestClient) -> None:
    body = person()
    body["days"][30]["values"]["HEART_RATE"] = 500.0
    out = post(client, body).json()
    assert out["invalid_values"] == 1
    assert {r["date"]: r for r in out["results"]}[body["days"][30]["date"]]["deviations"]["HEART_RATE"] is None


def test_only_baseline_days_returns_no_judged_days(client: TestClient) -> None:
    out = post(client, person(inn=0, post=0)).json()
    assert out["results"] == []
    assert {b["status"] for b in out["baselines"]} == {"READY"}


def test_in_flight_without_post_flight_is_accepted(client: TestClient) -> None:
    out = post(client, person(post=0)).json()
    assert len(out["results"]) == 40
    assert {r["phase"] for r in out["results"]} == {"IN_FLIGHT"}


@pytest.mark.parametrize(
    "mutate",
    [
        lambda b: b["days"][3]["values"].update({"HEART_RATE_X": 70.0}),  # unknown metric
        lambda b: b["days"][3].update({"date": b["days"][2]["date"]}),  # duplicate date
        lambda b: b["days"][3].update({"phase": "POST_FLIGHT"}),  # phase out of order
        lambda b: b["days"][3].update({"extra": 1}),  # unknown field
        lambda b: b.update({"subject_id": "real name!"}),  # not a pseudonymized id
        lambda b: b.update({"days": []}),
        lambda b: b["days"][3]["values"].update({"HEART_RATE": "high"}),
    ],
)
def test_invalid_requests_are_rejected(client: TestClient, mutate) -> None:
    body = person()
    mutate(body)
    assert post(client, body).status_code == 422


def test_too_many_days_is_rejected(client: TestClient) -> None:
    assert post(client, person(pre=10, inn=400, post=0)).status_code == 422


def test_unsorted_days_give_the_same_answer(client: TestClient) -> None:
    body = person()
    shuffled = {**body, "days": list(reversed(body["days"]))}
    assert post(client, shuffled).json()["results"] == post(client, body).json()["results"]


def test_endpoint_is_listed_in_openapi(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    assert "/api/v1/analytics/deviation" in schema["paths"]


# ----------------------------------------------------------------------------------------
# Isolation Forest (informational: score and flag, never the level)
# ----------------------------------------------------------------------------------------
def test_multivariate_fields_for_a_calm_person(client: TestClient) -> None:
    out = post(client, person()).json()
    assert 0.4 < out["multivariate_threshold"] < 0.7
    scores = [r["multivariate_score"] for r in out["results"]]
    assert all(s is not None and 0 < s < 1 for s in scores)
    assert max(scores) < out["multivariate_threshold"]
    assert not any(r["multivariate_flag"] for r in out["results"])
    assert any("informational" in x for x in out["limitations"])


def test_multivariate_flags_an_unusual_combination(client: TestClient) -> None:
    def odd(metric: str, in_day: int, v: float) -> float:
        if 21 <= in_day <= 26:
            return v + {"HEART_RATE": 25.0, "BODY_TEMPERATURE": 1.2, "SYSTOLIC_BP": -30.0, "RESPIRATORY_RATE": 6.0}.get(metric, 0.0)
        return v

    out = post(client, person(change=odd)).json()
    by_day = {r["rel_day"]: r for r in out["results"]}
    assert any(by_day[d]["multivariate_flag"] for d in range(21, 29))
    assert not any(by_day[d]["multivariate_flag"] for d in range(1, 20))
    scores = [by_day[d]["multivariate_score"] for d in range(21, 27)]
    assert max(scores) >= out["multivariate_threshold"]


def test_multivariate_never_changes_the_level(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from dataclasses import replace

    from app.modules.astra import service

    body = person()
    baseline = post(client, body).json()
    real_forest = service.load_forest()
    monkeypatch.setattr(service, "load_forest", lambda: replace(real_forest, threshold=0.0))  # flags every day
    flagged = post(client, body).json()
    assert all(r["multivariate_flag"] for r in flagged["results"][1:])
    assert [r["level"] for r in flagged["results"]] == [r["level"] for r in baseline["results"]]
    assert {r["level"] for r in flagged["results"]} == {"LOW"}


def test_multivariate_is_null_when_nothing_can_be_evaluated(client: TestClient) -> None:
    out = post(client, person(pre=5)).json()
    assert all(r["multivariate_score"] is None and r["multivariate_flag"] is False for r in out["results"])


def test_forest_score_matches_scikit_learn() -> None:
    """The numpy walk over the flattened trees gives the same score as IsolationForest.score_samples."""
    import numpy as np
    from sklearn.ensemble import IsolationForest

    from app.modules.astra.service import Forest, avg_path_length, forest_score

    rng = np.random.default_rng(3)
    train = rng.normal(size=(600, 11))
    model = IsolationForest(n_estimators=25, random_state=7, n_jobs=1).fit(train)
    feature: list[int] = []
    value: list[float] = []
    left: list[int] = []
    right: list[int] = []
    first: list[int] = []
    for est in model.estimators_:
        tree = est.tree_
        base = len(feature)
        first.append(base)
        depth = np.zeros(tree.node_count)
        for i in range(tree.node_count):
            if tree.children_left[i] != -1:
                depth[tree.children_left[i]] = depth[tree.children_right[i]] = depth[i] + 1
        for i in range(tree.node_count):
            is_leaf = tree.children_left[i] == -1
            feature.append(-1 if is_leaf else int(tree.feature[i]))
            value.append(float(depth[i] + avg_path_length(float(tree.n_node_samples[i]))) if is_leaf else float(tree.threshold[i]))
            left.append(-1 if is_leaf else base + int(tree.children_left[i]))
            right.append(-1 if is_leaf else base + int(tree.children_right[i]))
    forest = Forest(
        version="test",
        threshold=0.5,
        consec=2,
        max_samples=int(model.max_samples_),
        first_node=np.asarray(first),
        feature=np.asarray(feature),
        value=np.asarray(value),
        left=np.asarray(left),
        right=np.asarray(right),
    )
    x = rng.normal(scale=2.0, size=(200, 11))
    assert np.allclose(forest_score(forest, x), -model.score_samples(x), atol=1e-9)
