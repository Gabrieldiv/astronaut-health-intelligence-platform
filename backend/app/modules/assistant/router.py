"""Assistant endpoints. Answers stream as server sent events (text/event-stream).

Stream events, one JSON object per `data:` line:
  {"type": "meta", "provider": ..., "model": ..., "data_origin": ...}
  {"type": "delta", "text": "..."}            (many)
  {"type": "done", "stop_reason": "end_turn"}
  {"type": "error", "message": "..."}         (only if the model fails after the stream started)
Errors before the first byte are plain HTTP errors: 503 not configured, 429 rate limited, 413 too large,
422 invalid, 502 upstream failure.
"""

import json
import logging
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.config import Settings
from app.modules.assistant.prompt import SYSTEM_PROMPT, build_messages
from app.modules.assistant.provider import AssistantNotConfigured, AssistantProvider, AssistantUpstreamError, OpenStream
from app.modules.assistant.ratelimit import RateLimiter
from app.modules.assistant.schemas import MAX_REQUEST_BYTES, AssistantStatus, ChatRequest

router = APIRouter(tags=["assistant"])
log = logging.getLogger("ahi.assistant")

NOT_CONFIGURED = (
    "Assistant not configured: set ANTHROPIC_API_KEY in backend/.env and restart the API. The rest of the app works without it."
)
NOTE = "Demo: answers come from a cloud AI model. Not medical advice."

ERRORS = {
    413: {"description": "Request too large."},
    429: {"description": "Too many questions from this client, or the cloud model is rate limited."},
    502: {"description": "The cloud model failed or could not be reached."},
    503: {"description": "Assistant not configured (no API key)."},
}


def _sse(event: dict[str, object]) -> bytes:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode()


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.get("/assistant/status", response_model=AssistantStatus, summary="Whether the assistant can answer (no secrets returned)")
def status(request: Request) -> AssistantStatus:
    settings: Settings = request.app.state.settings
    provider: AssistantProvider | None = request.app.state.assistant
    return AssistantStatus(
        configured=provider is not None,
        provider=provider.name if provider else "anthropic",
        model=provider.model if provider else settings.assistant_model,
        note=NOTE if provider else NOT_CONFIGURED,
    )


@router.post(
    "/assistant/chat",
    responses=ERRORS,  # type: ignore[arg-type]
    summary="Ask the assistant about the selected astronaut. Streams server sent events.",
    response_class=StreamingResponse,
)
async def chat(request: Request, body: ChatRequest) -> StreamingResponse:
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_REQUEST_BYTES:
        raise HTTPException(413, f"Request too large (limit {MAX_REQUEST_BYTES} bytes).")

    provider: AssistantProvider | None = request.app.state.assistant
    if provider is None:
        raise HTTPException(503, NOT_CONFIGURED)

    limiter: RateLimiter = request.app.state.assistant_limiter
    wait = limiter.check(_client_key(request))
    if wait is not None:
        raise HTTPException(429, f"Too many questions. Try again in {int(wait) + 1} s.", headers={"Retry-After": str(int(wait) + 1)})

    try:
        stream = await provider.open(SYSTEM_PROMPT, build_messages(body))
    except AssistantNotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except AssistantUpstreamError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc

    started = time.monotonic()
    meta = {"type": "meta", "provider": provider.name, "model": provider.model, "data_origin": body.context.data_origin}
    return StreamingResponse(
        _events(stream, meta, started, len(body.history)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _events(stream: OpenStream, meta: dict[str, object], started: float, turns: int) -> AsyncIterator[bytes]:
    chars = 0
    outcome = "ok"
    try:
        yield _sse(meta)
        async for text in stream.texts():
            chars += len(text)
            yield _sse({"type": "delta", "text": text})
        if stream.stop_reason == "refusal":
            yield _sse({"type": "delta", "text": "\n\nI can't help with that one. Please ask the crew medical officer or the flight surgeon."})
        yield _sse({"type": "done", "stop_reason": stream.stop_reason})
    except (AssistantUpstreamError, AssistantNotConfigured) as exc:
        outcome = "upstream_error"
        yield _sse({"type": "error", "message": getattr(exc, "message", str(exc))})
    except Exception:
        outcome = "error"
        log.exception("assistant stream failed")
        yield _sse({"type": "error", "message": "The assistant stopped unexpectedly."})
    finally:
        await stream.close()
        # Metadata only: questions and answers are never logged.
        log.info(
            "assistant answer",
            extra={"outcome": outcome, "chars": chars, "history_turns": turns, "ms": int((time.monotonic() - started) * 1000)},
        )
