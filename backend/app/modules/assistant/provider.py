"""Language model providers behind one small seam.

`AssistantProvider` is the swap point: the demo uses `AnthropicProvider` (cloud, Claude API); an onboard
deployment would implement the same protocol over a local inference server (see
docs/assistant-architecture.md). The router never imports the Anthropic SDK directly.
"""

from collections.abc import AsyncIterator
from typing import Any, Protocol

import anthropic


class AssistantNotConfigured(Exception):
    """No usable credentials: the endpoint answers 503 and the web app shows its offline state."""


class AssistantUpstreamError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class OpenStream(Protocol):
    stop_reason: str | None

    def texts(self) -> AsyncIterator[str]: ...

    async def close(self) -> None: ...


class AssistantProvider(Protocol):
    name: str
    model: str

    async def open(self, system: str, messages: list[dict[str, str]]) -> OpenStream:
        """Start a generation. Raises before any text when the request is rejected."""
        ...


def _map_error(exc: Exception) -> Exception:
    if isinstance(exc, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return AssistantNotConfigured("The cloud model rejected the API key. Check ANTHROPIC_API_KEY in backend/.env.")
    if isinstance(exc, anthropic.RateLimitError):
        return AssistantUpstreamError(429, "The cloud model is busy (rate limited). Try again in a minute.")
    if isinstance(exc, anthropic.NotFoundError):
        return AssistantUpstreamError(502, "The configured model was not found. Check ASSISTANT_MODEL.")
    if isinstance(exc, anthropic.APIStatusError):
        return AssistantUpstreamError(502, f"The cloud model answered with an error (HTTP {exc.status_code}).")
    if isinstance(exc, anthropic.APIConnectionError):
        return AssistantUpstreamError(502, "The cloud model could not be reached.")
    return exc


class _AnthropicStream:
    def __init__(self, manager: Any, stream: Any) -> None:
        self._manager = manager
        self._stream = stream
        self._closed = False
        self.stop_reason: str | None = None

    async def texts(self) -> AsyncIterator[str]:
        try:
            async for text in self._stream.text_stream:
                yield text
            final = await self._stream.get_final_message()
            self.stop_reason = final.stop_reason
        except anthropic.APIError as exc:
            raise _map_error(exc) from exc

    async def close(self) -> None:
        if not self._closed:
            self._closed = True
            await self._manager.__aexit__(None, None, None)


class AnthropicProvider:
    """Claude API through the official SDK, streamed. Demo only: needs a network link to Earth."""

    name = "anthropic"
    REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01"

    def __init__(self, client: Any, *, model: str, max_tokens: int, effort: str, refusal_fallback: bool) -> None:
        self._client = client
        self.model = model
        self._max_tokens = max_tokens
        self._effort = effort
        self._refusal_fallback = refusal_fallback

    @classmethod
    def from_key(cls, api_key: str, *, timeout: float, **kwargs: Any) -> "AnthropicProvider":
        # The key is passed explicitly so no other local credential is ever picked up by accident.
        client = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout, max_retries=1)
        return cls(client, **kwargs)

    async def aclose(self) -> None:
        await self._client.close()

    def request_params(self, system: str, messages: list[dict[str, str]]) -> dict[str, Any]:
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": self._max_tokens,
            "system": system,
            "messages": messages,
            # Short conversational answers: low effort keeps latency and cost down.
            "output_config": {"effort": self._effort},
        }
        if self._refusal_fallback:
            # If the model declines (safety classifier), the API retries on a fallback model in the same call.
            params["betas"] = [self.REFUSAL_FALLBACK_BETA]
            params["fallbacks"] = "default"
        return params

    async def open(self, system: str, messages: list[dict[str, str]]) -> OpenStream:
        manager = self._client.beta.messages.stream(**self.request_params(system, messages))
        try:
            stream = await manager.__aenter__()
        except anthropic.APIError as exc:
            raise _map_error(exc) from exc
        return _AnthropicStream(manager, stream)
