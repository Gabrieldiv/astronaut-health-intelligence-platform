"""Assistant module. The Anthropic client is always mocked: no test ever calls the real API."""

import json
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any

import anthropic
import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import build_assistant, create_app
from app.modules.assistant.prompt import SYSTEM_PROMPT, build_messages
from app.modules.assistant.provider import AnthropicProvider
from app.modules.assistant.ratelimit import RateLimiter
from app.modules.assistant.schemas import ChatRequest
from tests.conftest import DONKI, OSDR

DASHES = (chr(0x2014), chr(0x2013))  # em dash, en dash


def context(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "schema_version": "1",
        "data_origin": "SIMULATED",
        "sim_time_utc": "2026-11-14T10:00:00Z",
        "astronaut": {"id": "AST-01", "callsign": "ORION", "role": "Commander"},
        "overall": {"status": "MODERATE", "risk_score": 34, "headline": "Heart rate above your normal.", "contributing_factors": ["HR up"]},
        "metrics": [
            {"code": "HEART_RATE", "label": "Heart rate", "value": 96, "unit": "bpm", "status": "MODERATE",
             "normal_low": 58, "normal_high": 74, "baseline_ready": True, "data_origin": "SIMULATED"},
            {"code": "SPO2", "label": "Blood oxygen", "value": None, "unit": "%", "status": "NO_DATA", "data_origin": "SIMULATED"},
        ],
        "open_alerts": [{"severity": "MODERATE", "title": "Heart rate above personal range", "metric": "HEART_RATE", "minutes_open": 4}],
        "recommendations": [{"title": "Rest 20 minutes", "priority": "MODERATE", "audience": "CREW", "autonomy": "ONBOARD"}],
        "mission": {"profile": "ISS", "mission_day": 44, "scenario": "Nominal day", "earth_link": "ISS", "one_way_delay_seconds": 0.5},
    }
    base.update(overrides)
    return base


def chat_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {"question": "How is ORION doing?", "history": [], "context": context()}
    body.update(overrides)
    return body


# --- a fake of the Anthropic async client: client.beta.messages.stream(**params) -> async context manager


class FakeFinal:
    def __init__(self, stop_reason: str) -> None:
        self.stop_reason = stop_reason


class FakeStream:
    def __init__(self, chunks: list[str], stop_reason: str, fail_mid: Exception | None) -> None:
        self._chunks = chunks
        self._stop = stop_reason
        self._fail_mid = fail_mid

    @property
    def text_stream(self) -> AsyncIterator[str]:
        async def gen() -> AsyncIterator[str]:
            for c in self._chunks:
                yield c
            if self._fail_mid is not None:
                raise self._fail_mid

        return gen()

    async def get_final_message(self) -> FakeFinal:
        return FakeFinal(self._stop)


class FakeManager:
    def __init__(self, owner: "FakeClient") -> None:
        self._owner = owner

    async def __aenter__(self) -> FakeStream:
        if self._owner.fail_open is not None:
            raise self._owner.fail_open
        return FakeStream(self._owner.chunks, self._owner.stop_reason, self._owner.fail_mid)

    async def __aexit__(self, *args: object) -> None:
        self._owner.exited += 1


class FakeClient:
    def __init__(self, chunks: list[str] | None = None, stop_reason: str = "end_turn") -> None:
        self.chunks = chunks if chunks is not None else ["ORION is ", "a bit above normal. ", "The data is simulated."]
        self.stop_reason = stop_reason
        self.fail_open: Exception | None = None
        self.fail_mid: Exception | None = None
        self.calls: list[dict[str, Any]] = []
        self.exited = 0
        self.closed = False
        outer = self

        class _Messages:
            def stream(self, **params: Any) -> FakeManager:
                outer.calls.append(params)
                return FakeManager(outer)

        class _Beta:
            messages = _Messages()

        self.beta = _Beta()

    async def close(self) -> None:
        self.closed = True


def api_error(cls: type[anthropic.APIStatusError], status: int) -> anthropic.APIStatusError:
    req = httpx.Request("POST", "https://api.anthropic.test/v1/messages")
    return cls("error", response=httpx.Response(status, request=req), body=None)


@pytest.fixture
def assistant_settings(tmp_path: Path) -> Settings:
    # ANTHROPIC_API_KEY is set to empty on purpose: a developer's real key (env or .env) is never used by tests.
    return Settings(  # type: ignore[call-arg]
        _env_file=None,
        DATABASE_URL=f"sqlite:///{(tmp_path / 'ahi.db').as_posix()}",
        DONKI_BASE_URL=DONKI,
        OSDR_BASE_URL=OSDR,
        LOG_LEVEL="WARNING",
        ANTHROPIC_API_KEY="",
        ASSISTANT_RATE_LIMIT_PER_MINUTE=3,
    )


@pytest.fixture
def fake() -> FakeClient:
    return FakeClient()


@pytest.fixture
def api(assistant_settings: Settings, fake: FakeClient) -> Iterator[TestClient]:
    app = create_app(assistant_settings, migrate=False)
    app.state.assistant = AnthropicProvider(fake, model="claude-sonnet-5-5", max_tokens=1500, effort="low", refusal_fallback=True)
    with TestClient(app) as c:
        yield c


def events(resp: httpx.Response) -> list[dict[str, Any]]:
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


# --- configuration


def test_not_configured_returns_503(assistant_settings: Settings) -> None:
    assert build_assistant(assistant_settings) is None
    with TestClient(create_app(assistant_settings, migrate=False)) as c:
        r = c.post("/api/v1/assistant/chat", json=chat_body())
        assert r.status_code == 503
        assert "not configured" in r.json()["detail"].lower()
        s = c.get("/api/v1/assistant/status").json()
        assert s["configured"] is False and s["model"] == "claude-sonnet-5-5"


def test_status_when_configured_never_leaks_the_key(assistant_settings: Settings) -> None:
    settings = assistant_settings.model_copy(update={"anthropic_api_key": anthropic_key("sk-test-not-real")})
    provider = build_assistant(settings)
    assert isinstance(provider, AnthropicProvider)
    app = create_app(settings, migrate=False)
    with TestClient(app) as c:
        r = c.get("/api/v1/assistant/status")
        assert r.json()["configured"] is True
        assert "sk-test" not in r.text


def anthropic_key(value: str) -> Any:
    from pydantic import SecretStr

    return SecretStr(value)


# --- streaming happy path


def test_chat_streams_sse_and_sends_grounded_request(api: TestClient, fake: FakeClient) -> None:
    r = api.post("/api/v1/assistant/chat", json=chat_body())
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")
    ev = events(r)
    assert ev[0] == {"type": "meta", "provider": "anthropic", "model": "claude-sonnet-5-5", "data_origin": "SIMULATED"}
    assert "".join(e["text"] for e in ev if e["type"] == "delta") == "ORION is a bit above normal. The data is simulated."
    assert ev[-1] == {"type": "done", "stop_reason": "end_turn"}
    assert fake.exited == 1

    params = fake.calls[0]
    assert params["model"] == "claude-sonnet-5-5"
    assert params["system"] == SYSTEM_PROMPT
    assert params["output_config"] == {"effort": "low"}
    assert params["fallbacks"] == "default" and params["betas"] == ["server-side-fallback-2026-07-01"]
    last = params["messages"][-1]
    assert last["role"] == "user"
    assert "<app_context>" in last["content"] and '"callsign":"ORION"' in last["content"]
    assert last["content"].endswith("Question: How is ORION doing?")


def test_history_is_forwarded_in_order(api: TestClient, fake: FakeClient) -> None:
    history = [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello. Based on: no matching data in the app"}]
    r = api.post("/api/v1/assistant/chat", json=chat_body(history=history, question="Why is this alert on?"))
    assert r.status_code == 200
    msgs = fake.calls[0]["messages"]
    assert [m["role"] for m in msgs] == ["user", "assistant", "user"]
    assert msgs[0]["content"] == "Hi"


def test_refusal_fallback_can_be_disabled(fake: FakeClient) -> None:
    p = AnthropicProvider(fake, model="m", max_tokens=500, effort="low", refusal_fallback=False)
    params = p.request_params("sys", [{"role": "user", "content": "q"}])
    assert "fallbacks" not in params and "betas" not in params


def test_refusal_adds_a_calm_note(api: TestClient, fake: FakeClient) -> None:
    fake.chunks = []
    fake.stop_reason = "refusal"
    ev = events(api.post("/api/v1/assistant/chat", json=chat_body()))
    text = "".join(e["text"] for e in ev if e["type"] == "delta")
    assert "flight surgeon" in text
    assert ev[-1]["stop_reason"] == "refusal"


# --- upstream failures


@pytest.mark.parametrize(
    ("error", "status"),
    [
        (api_error(anthropic.AuthenticationError, 401), 503),
        (api_error(anthropic.RateLimitError, 429), 429),
        (api_error(anthropic.NotFoundError, 404), 502),
        (api_error(anthropic.InternalServerError, 500), 502),
        (anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.test")), 502),
    ],
)
def test_upstream_errors_before_stream_map_to_http(api: TestClient, fake: FakeClient, error: Exception, status: int) -> None:
    fake.fail_open = error
    r = api.post("/api/v1/assistant/chat", json=chat_body())
    assert r.status_code == status
    assert r.json()["detail"]


def test_error_mid_stream_becomes_error_event(api: TestClient, fake: FakeClient) -> None:
    fake.fail_mid = api_error(anthropic.InternalServerError, 500)
    ev = events(api.post("/api/v1/assistant/chat", json=chat_body()))
    assert ev[-1]["type"] == "error"
    assert fake.exited == 1


# --- input limits and rate limit


@pytest.mark.parametrize(
    "body",
    [
        chat_body(question=""),
        chat_body(question="   "),
        chat_body(question="x" * 1001),
        chat_body(history=[{"role": "assistant", "content": "starts wrong"}]),
        chat_body(history=[{"role": "user", "content": "unanswered"}]),
        chat_body(history=[{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}] * 7),
        chat_body(context=context(metrics=[context()["metrics"][0]] * 31)),
        chat_body(context=context(astronaut={"id": "AST-01", "callsign": "X" * 121, "role": "Commander"})),
        chat_body(context=context(overall={"status": "FINE"})),
    ],
)
def test_invalid_input_is_rejected(api: TestClient, fake: FakeClient, body: dict[str, Any]) -> None:
    assert api.post("/api/v1/assistant/chat", json=body).status_code == 422
    assert fake.calls == []


def test_oversized_request_is_rejected(api: TestClient, fake: FakeClient) -> None:
    raw = json.dumps(chat_body()) + " " * 70_000
    r = api.post("/api/v1/assistant/chat", content=raw, headers={"content-type": "application/json"})
    assert r.status_code == 413
    assert fake.calls == []


def test_rate_limit_per_client(api: TestClient) -> None:
    for _ in range(3):
        assert api.post("/api/v1/assistant/chat", json=chat_body()).status_code == 200
    r = api.post("/api/v1/assistant/chat", json=chat_body())
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) >= 1


def test_rate_limiter_windows() -> None:
    now = [0.0]
    rl = RateLimiter(per_minute=2, per_hour=3, clock=lambda: now[0])
    assert rl.check("a") is None and rl.check("a") is None
    assert rl.check("a") is not None  # minute window full
    assert rl.check("b") is None  # other clients are independent
    now[0] = 61
    assert rl.check("a") is None
    now[0] = 122
    wait = rl.check("a")  # hour window full (3 hits)
    assert wait is not None and wait > 3000


# --- prompt


def test_system_prompt_guardrails() -> None:
    p = SYSTEM_PROMPT.lower()
    for phrase in ("never diagnose", "medication", "crew medical officer", "flight surgeon", "simulated", "based on:", "do not know"):
        assert phrase in p
    assert not any(d in SYSTEM_PROMPT for d in DASHES)


def test_context_omits_nulls_and_keeps_no_data_explicit() -> None:
    req = ChatRequest.model_validate(chat_body())
    content = build_messages(req)[-1]["content"]
    payload = json.loads(content.split("<app_context>\n", 1)[1].split("\n</app_context>", 1)[0])
    spo2 = next(m for m in payload["metrics"] if m["code"] == "SPO2")
    assert spo2["status"] == "NO_DATA" and "value" not in spo2  # missing stays missing, never zero
    assert payload["data_origin"] == "SIMULATED"


def test_unknown_context_fields_are_ignored() -> None:
    req = ChatRequest.model_validate(chat_body(context=context(future_field={"x": 1})))
    assert "future_field" not in build_messages(req)[-1]["content"]
